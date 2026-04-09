import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { callClaudeJSON } from "@/lib/claude"
import type { DbEmailAccount, EmailCategory } from "@/types/db"

interface GmailMessage {
  id: string
  threadId: string
  payload?: {
    headers: Array<{ name: string; value: string }>
  }
  snippet?: string
  internalDate?: string
}

interface ClaudeEmailAnalysis {
  category: EmailCategory
  summary: string
  urgency: number
  suggested_action: string
  draft_reply: string
}

async function getHeader(msg: GmailMessage, name: string): Promise<string> {
  return (
    msg.payload?.headers?.find(
      (h) => h.name.toLowerCase() === name.toLowerCase(),
    )?.value ?? ""
  )
}

async function fetchWithToken(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Gmail API ${res.status}: ${url}`)
  return res.json()
}

/**
 * POST /api/email/sync
 * Syncs new emails for all active accounts.
 * Calls Claude to categorize + summarize each new email.
 * Creates tasks for urgent/investor/reply-needed emails.
 */
export async function POST() {
  const { data: accounts, error: accErr } = await supabaseAdmin
    .from("email_accounts")
    .select("*")
    .eq("is_active", true)
    .not("access_token", "is", null)

  if (accErr || !accounts) {
    return NextResponse.json({ error: "Failed to load accounts", code: "DB_ERROR" }, { status: 500 })
  }

  const results: Array<{ account: string; synced: number; errors: number }> = []

  for (const account of accounts as DbEmailAccount[]) {
    if (!account.access_token) continue

    let synced = 0
    let errors = 0

    try {
      // Fetch latest 20 messages
      const listData = await fetchWithToken(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox",
        account.access_token,
      )

      const messageIds: string[] = (listData.messages ?? []).map(
        (m: { id: string }) => m.id,
      )

      for (const messageId of messageIds) {
        // Skip if already saved
        const { data: existing } = await supabaseAdmin
          .from("emails")
          .select("id")
          .eq("gmail_message_id", messageId)
          .single()

        if (existing) continue

        try {
          const msg: GmailMessage = await fetchWithToken(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
            account.access_token,
          )

          const subject = await getHeader(msg, "Subject")
          const fromRaw = await getHeader(msg, "From")
          const fromMatch = fromRaw.match(/^(.*?)\s*<(.+)>$/)
          const fromName = fromMatch ? fromMatch[1].trim() : fromRaw
          const fromAddress = fromMatch ? fromMatch[2] : fromRaw
          const toRaw = await getHeader(msg, "To")
          const dateRaw = await getHeader(msg, "Date")

          const receivedAt = dateRaw
            ? new Date(dateRaw).toISOString()
            : msg.internalDate
              ? new Date(parseInt(msg.internalDate)).toISOString()
              : new Date().toISOString()

          // Ask Claude to categorize
          const businessName =
            account.business_id === "swiftfi"
              ? "SwiftFi (crypto onramp)"
              : account.business_id === "unbeatableloans"
                ? "UnbeatableLoans (mortgage app)"
                : "OllaCart (social shopping cart)"

          const analysis = await callClaudeJSON<ClaudeEmailAnalysis>(
            `Email for ${businessName}:
From: ${fromName} <${fromAddress}>
Subject: ${subject}
Snippet: ${msg.snippet ?? ""}

Categorize and summarize. Return JSON only:
{
  "category": "urgent|investor|reply-needed|customer|developer|fyi|spam",
  "summary": "one line summary",
  "urgency": 1-5,
  "suggested_action": "what to do",
  "draft_reply": "short reply draft if needed, else empty string"
}`,
            `You are processing email for ${businessName}. Be concise.`,
          )

          // Save email to Supabase
          const { data: savedEmail } = await supabaseAdmin
            .from("emails")
            .insert({
              account_id: account.id,
              business_id: account.business_id,
              gmail_message_id: messageId,
              gmail_thread_id: msg.threadId,
              from_address: fromAddress,
              from_name: fromName,
              to_addresses: toRaw ? [toRaw] : [],
              subject,
              body_plain: msg.snippet ?? "",
              received_at: receivedAt,
              is_read: false,
              claude_category: analysis.category,
              claude_summary: analysis.summary,
              claude_draft_reply: analysis.draft_reply || null,
            })
            .select()
            .single()

          // Auto-create task for actionable emails
          if (
            savedEmail &&
            ["urgent", "investor", "reply-needed"].includes(analysis.category)
          ) {
            const priority =
              analysis.category === "urgent" || analysis.urgency >= 4
                ? "urgent"
                : analysis.category === "investor"
                  ? "high"
                  : "medium"

            const { data: task } = await supabaseAdmin
              .from("tasks")
              .insert({
                business_id: account.business_id,
                title: `Reply to: ${subject || "(no subject)"}`,
                description: analysis.suggested_action,
                priority,
                category: analysis.category === "investor" ? "outreach" : "support",
                source: "email",
                source_id: savedEmail.id,
              })
              .select()
              .single()

            if (task) {
              await supabaseAdmin
                .from("emails")
                .update({ task_id: task.id })
                .eq("id", savedEmail.id)
            }
          }

          // Auto-create support ticket for customer/urgent emails (not dev account)
          if (
            savedEmail &&
            ["customer", "urgent"].includes(analysis.category) &&
            account.email_address !== "john@ollacart.com"
          ) {
            // Check if thread already has a ticket
            const { data: existingTicket } = await supabaseAdmin
              .from("support_tickets")
              .select("id")
              .eq("business_id", account.business_id)
              .eq("customer_email", fromAddress)
              .in("status", ["open", "in_progress", "waiting"])
              .order("created_at", { ascending: false })
              .limit(1)
              .single()

            if (!existingTicket) {
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/support/tickets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  business_id: account.business_id,
                  email_id: savedEmail.id,
                  customer_email: fromAddress,
                  customer_name: fromName || undefined,
                  subject: subject || "(no subject)",
                  first_message: msg.snippet ?? "",
                  received_at: receivedAt,
                }),
              }).catch((e) => console.error("Failed to create support ticket:", e))
            }
          }

          synced++
        } catch (msgErr) {
          console.error(`Error processing message ${messageId}:`, msgErr)
          errors++
        }
      }

      // Update last_synced_at
      await supabaseAdmin
        .from("email_accounts")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", account.id)
    } catch (accountErr) {
      console.error(`Error syncing account ${account.email_address}:`, accountErr)
      errors++
    }

    results.push({ account: account.email_address, synced, errors })
  }

  return NextResponse.json({ results, synced_at: new Date().toISOString() })
}

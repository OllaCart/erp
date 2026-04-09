import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

type Params = Promise<{ id: string }>

/**
 * POST /api/support/tickets/:id/reply
 * Sends a reply to the customer via Gmail and saves to ticket_messages.
 * Requires explicit user action — never auto-sends.
 */
export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params
  const body = await request.json().catch(() => null) as { body?: string } | null

  if (!body?.body?.trim()) {
    return NextResponse.json({ error: "Reply body is required", code: "MISSING_FIELDS" }, { status: 400 })
  }

  // Load ticket + linked email account
  const { data: ticket, error: ticketErr } = await supabaseAdmin
    .from("support_tickets")
    .select("*, emails(account_id, gmail_thread_id, from_address, subject, email_accounts(email_address, access_token, refresh_token))")
    .eq("id", id)
    .single()

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: "Ticket not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const email = ticket.emails as Record<string, unknown> | null
  const account = email?.email_accounts as Record<string, unknown> | null

  // Send via Gmail if we have a token
  if (account?.access_token) {
    const subject = String(ticket.subject ?? "")
    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`
    const threadId = email?.gmail_thread_id as string | undefined
    const toAddress = ticket.customer_email

    const rawMessage = [
      `From: ${account.email_address}`,
      `To: ${toAddress}`,
      `Subject: ${replySubject}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      "",
      body.body.trim(),
    ].join("\r\n")

    const encoded = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    const payload: Record<string, string> = { raw: encoded }
    if (threadId) payload.threadId = threadId

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const gmailErr = await res.json().catch(() => ({})) as { error?: { message?: string } }
      return NextResponse.json(
        { error: "Failed to send via Gmail", code: "GMAIL_ERROR", details: gmailErr },
        { status: res.status },
      )
    }
  }

  const now = new Date().toISOString()

  // Save outbound message
  await supabaseAdmin.from("ticket_messages").insert({
    ticket_id: id,
    direction: "outbound",
    from_address: (account?.email_address as string) ?? "support",
    body: body.body.trim(),
    claude_draft: false,
    sent_at: now,
  })

  // Update ticket status and first_response_at
  const updates: Record<string, unknown> = { status: "in_progress" }
  if (!ticket.first_response_at) updates.first_response_at = now

  await supabaseAdmin.from("support_tickets").update(updates).eq("id", id)

  return NextResponse.json({ ok: true })
}

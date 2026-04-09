import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * POST /api/email/reply
 * Sends a reply from the correct Gmail account.
 * Always requires explicit user action — never auto-sends.
 */
export async function POST(request: Request) {
  let body: { email_id: string; body: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 })
  }

  if (!body.email_id || !body.body?.trim()) {
    return NextResponse.json(
      { error: "email_id and body are required", code: "MISSING_FIELDS" },
      { status: 400 },
    )
  }

  // Load email + account
  const { data: email, error: emailErr } = await supabaseAdmin
    .from("emails")
    .select("*, email_accounts(email_address, access_token, refresh_token, token_expires_at)")
    .eq("id", body.email_id)
    .single()

  if (emailErr || !email) {
    return NextResponse.json({ error: "Email not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const account = email.email_accounts as {
    email_address: string
    access_token: string | null
    refresh_token: string | null
    token_expires_at: string | null
  }

  if (!account?.access_token) {
    return NextResponse.json(
      { error: "Gmail account not linked. Connect OAuth first.", code: "NO_TOKEN" },
      { status: 403 },
    )
  }

  // Build RFC 2822 message
  const to = email.from_address ?? ""
  const subject = email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject ?? ""}`
  const threadId = email.gmail_thread_id

  const rawMessage = [
    `From: ${account.email_address}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    body.body.trim(),
  ].join("\r\n")

  const encoded = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  const payload: Record<string, string> = { raw: encoded }
  if (threadId) payload.threadId = threadId

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  )

  if (!res.ok) {
    const gmailErr = await res.json().catch(() => ({}))
    console.error("Gmail send error:", gmailErr)
    return NextResponse.json(
      { error: "Failed to send via Gmail", code: "GMAIL_ERROR", details: gmailErr },
      { status: res.status },
    )
  }

  // Mark original as read
  await supabaseAdmin.from("emails").update({ is_read: true }).eq("id", body.email_id)

  const sent = await res.json()
  return NextResponse.json({ ok: true, gmail_message_id: sent.id })
}

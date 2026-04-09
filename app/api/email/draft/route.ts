import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { callClaudeDraft, BUSINESS_NAMES, BUSINESS_TONES } from "@/lib/claude"
import type { BusinessId } from "@/types/db"

/**
 * POST /api/email/draft
 * Calls Claude to draft a reply for a given email.
 * Returns the draft for user review — NEVER sends automatically.
 */
export async function POST(request: Request) {
  let body: { email_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 })
  }

  if (!body.email_id) {
    return NextResponse.json({ error: "email_id is required", code: "MISSING_FIELDS" }, { status: 400 })
  }

  const { data: email, error } = await supabaseAdmin
    .from("emails")
    .select("*, email_accounts(email_address, display_name, business_id)")
    .eq("id", body.email_id)
    .single()

  if (error || !email) {
    return NextResponse.json({ error: "Email not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const businessId = email.business_id as BusinessId
  const businessName = BUSINESS_NAMES[businessId]
  const tone = BUSINESS_TONES[businessId]

  const draft = await callClaudeDraft(
    `Draft a reply to this email.

Business: ${businessName}
Tone: ${tone}

Original email:
From: ${email.from_name} <${email.from_address}>
Subject: ${email.subject}
Body: ${email.body_plain ?? email.claude_summary ?? "(no body)"}

Write only the email body — no subject line, no "Here is the draft" preamble.`,
    `You are drafting a reply on behalf of the founder of ${businessName}. Match the tone: ${tone}. Be professional and concise.`,
  )

  // Save the draft back to the email record
  await supabaseAdmin
    .from("emails")
    .update({ claude_draft_reply: draft })
    .eq("id", body.email_id)

  return NextResponse.json({ draft, email_id: body.email_id })
}

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendOutreach, triggerWorkflow, type OutreachChannel } from "@/lib/ghl"
import { callClaudeDraft, BUSINESS_NAMES, BUSINESS_TONES } from "@/lib/claude"
import type { BusinessId } from "@/types/db"

/**
 * POST /api/crm/outreach
 * Two modes:
 *   action=draft   → Claude drafts outreach copy, returns for review (never sends)
 *   action=send    → Sends via GHL (email, SMS) — requires explicit call
 *   action=workflow → Triggers a GHL automation workflow
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    action: "draft" | "send" | "workflow"
    contact_id: string
    channel?: OutreachChannel
    message?: string
    subject?: string
    workflow_id?: string
    goal?: string
  } | null

  if (!body?.action || !body?.contact_id) {
    return NextResponse.json(
      { error: "action and contact_id are required", code: "MISSING_FIELDS" },
      { status: 400 },
    )
  }

  const { data: contact } = await supabaseAdmin
    .from("crm_contacts")
    .select("*")
    .eq("id", body.contact_id)
    .single()

  if (!contact) {
    return NextResponse.json({ error: "Contact not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const bizId = contact.business_id as BusinessId
  const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "there"

  // ── Draft mode ──────────────────────────────────────────────────────────────
  if (body.action === "draft") {
    const channel = body.channel ?? "email"
    const goal = body.goal ?? `move from "${contact.pipeline_stage ?? "current stage"}" to the next stage`

    const draft = await callClaudeDraft(
      `Draft a ${channel} outreach message for ${contactName}${contact.company ? ` at ${contact.company}` : ""}.

Business: ${BUSINESS_NAMES[bizId] ?? bizId}
Contact type: ${contact.contact_type}
Pipeline stage: ${contact.pipeline_stage ?? "not set"}
Last activity: ${contact.last_activity_at ? new Date(contact.last_activity_at).toLocaleDateString() : "unknown"}
Notes: ${contact.notes ?? "(none)"}
Goal: ${goal}

${channel === "sms" ? "Write an SMS (under 160 chars). No subject line." : "Write an email body (under 150 words). Include a clear call-to-action."}`,
      `You are drafting ${channel} outreach for ${BUSINESS_NAMES[bizId] ?? bizId}. Tone: ${BUSINESS_TONES[bizId] ?? "professional"}. Be personalized and specific — never sound like a template.`,
    )

    return NextResponse.json({ draft, channel, contact_id: body.contact_id })
  }

  // ── Send mode ───────────────────────────────────────────────────────────────
  if (body.action === "send") {
    if (!body.message?.trim()) {
      return NextResponse.json({ error: "message is required for send", code: "MISSING_FIELDS" }, { status: 400 })
    }
    if (!contact.ghl_contact_id) {
      return NextResponse.json({ error: "Contact not linked to GHL", code: "NO_GHL_CONTACT" }, { status: 400 })
    }

    const result = await sendOutreach(bizId, {
      contactId: contact.ghl_contact_id,
      type: body.channel ?? "email",
      subject: body.subject,
      message: body.message,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: "GHL_ERROR" }, { status: 500 })
    }

    // Update last_activity_at
    await supabaseAdmin
      .from("crm_contacts")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", body.contact_id)

    return NextResponse.json({ ok: true })
  }

  // ── Workflow trigger mode ────────────────────────────────────────────────────
  if (body.action === "workflow") {
    if (!body.workflow_id) {
      return NextResponse.json({ error: "workflow_id is required", code: "MISSING_FIELDS" }, { status: 400 })
    }
    if (!contact.ghl_contact_id) {
      return NextResponse.json({ error: "Contact not linked to GHL", code: "NO_GHL_CONTACT" }, { status: 400 })
    }

    const result = await triggerWorkflow(bizId, body.workflow_id, contact.ghl_contact_id)

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: "GHL_ERROR" }, { status: 500 })
    }

    await supabaseAdmin
      .from("crm_contacts")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", body.contact_id)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action", code: "INVALID_ACTION" }, { status: 400 })
}

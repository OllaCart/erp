import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { updateContact, updateOpportunityStage, getContactActivity } from "@/lib/ghl"
import { callClaudeDraft } from "@/lib/claude"
import type { BusinessId } from "@/types/db"

type Params = Promise<{ id: string }>

const BUSINESS_NAMES: Record<string, string> = {
  swiftfi:         "SwiftFi (crypto onramp)",
  unbeatableloans: "UnbeatableLoans (mortgage app)",
  ollacart:        "OllaCart (social shopping cart)",
}

/**
 * GET /api/crm/contacts/:id
 * Contact detail with GHL activity timeline + Claude recommendation.
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  const { id } = await params

  const { data: contact, error } = await supabaseAdmin
    .from("crm_contacts")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !contact) {
    return NextResponse.json({ error: "Contact not found", code: "NOT_FOUND" }, { status: 404 })
  }

  // Fetch GHL activity if connected
  let activity: unknown[] = []
  if (contact.ghl_contact_id) {
    activity = await getContactActivity(contact.business_id, contact.ghl_contact_id).catch(() => [])
  }

  // Claude recommendation
  const daysSinceActivity = contact.last_activity_at
    ? Math.floor((Date.now() - new Date(contact.last_activity_at).getTime()) / 86400000)
    : null

  const recommendation = await callClaudeDraft(
    `CRM contact for ${BUSINESS_NAMES[contact.business_id] ?? contact.business_id}:
Name: ${[contact.first_name, contact.last_name].filter(Boolean).join(" ")}
Company: ${contact.company ?? "(unknown)"}
Type: ${contact.contact_type}
Pipeline stage: ${contact.pipeline_stage ?? "(none)"}
Days since last activity: ${daysSinceActivity ?? "unknown"}
Notes: ${contact.notes ?? "(none)"}

In 2-3 sentences: what should be the next action with this contact and why?`,
    `You are a CRM advisor for ${BUSINESS_NAMES[contact.business_id] ?? contact.business_id}. Be specific and actionable.`,
  ).catch(() => null)

  return NextResponse.json({ contact, activity, recommendation })
}

/**
 * PATCH /api/crm/contacts/:id
 * Update contact locally and sync changes to GHL.
 */
export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id } = await params
  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  const { data: contact } = await supabaseAdmin
    .from("crm_contacts")
    .select("ghl_contact_id, business_id, opportunity_id")
    .eq("id", id)
    .single()

  // Allowed local fields
  const allowed = [
    "first_name", "last_name", "email", "phone", "company",
    "contact_type", "pipeline_stage", "notes", "tags", "last_activity_at",
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabaseAdmin
    .from("crm_contacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  // Sync to GHL
  if (contact?.ghl_contact_id) {
    const ghlUpdates: Record<string, unknown> = {}
    if (body.first_name) ghlUpdates.firstName = body.first_name
    if (body.last_name) ghlUpdates.lastName = body.last_name
    if (body.email) ghlUpdates.email = body.email
    if (body.phone) ghlUpdates.phone = body.phone
    if (body.company) ghlUpdates.companyName = body.company
    if (body.tags) ghlUpdates.tags = body.tags

    await updateContact(
      contact.business_id as BusinessId,
      contact.ghl_contact_id,
      ghlUpdates,
    ).catch(console.error)

    // Sync stage change to GHL opportunity
    if (body.pipeline_stage && contact.opportunity_id) {
      await updateOpportunityStage(
        contact.business_id as BusinessId,
        contact.opportunity_id,
        body.pipeline_stage as string,
      ).catch(console.error)
    }
  }

  return NextResponse.json({ contact: data })
}

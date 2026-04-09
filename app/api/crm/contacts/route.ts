import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { createContact } from "@/lib/ghl"

/**
 * GET /api/crm/contacts
 * List contacts with filters. Merged from Supabase (synced from GHL + manual).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const business_id = searchParams.get("business_id")
  const contact_type = searchParams.get("contact_type")
  const pipeline_stage = searchParams.get("pipeline_stage")
  const search = searchParams.get("search")
  const limit = parseInt(searchParams.get("limit") ?? "100", 10)
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)

  let query = supabaseAdmin
    .from("crm_contacts")
    .select("*")
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (business_id) query = query.eq("business_id", business_id)
  if (contact_type) query = query.eq("contact_type", contact_type)
  if (pipeline_stage) query = query.eq("pipeline_stage", pipeline_stage)
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ contacts: data ?? [], count: data?.length ?? 0 })
}

/**
 * POST /api/crm/contacts
 * Create a contact locally and sync to GHL if configured.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.business_id) {
    return NextResponse.json({ error: "business_id is required", code: "MISSING_FIELDS" }, { status: 400 })
  }

  // Try to create in GHL first
  let ghlContactId: string | null = null
  try {
    const ghlContact = await createContact(body.business_id, {
      firstName: body.first_name,
      lastName: body.last_name,
      email: body.email,
      phone: body.phone,
      companyName: body.company,
      tags: body.tags,
    })
    ghlContactId = ghlContact?.id ?? null
  } catch {
    // GHL not configured — save locally only
  }

  const { data, error } = await supabaseAdmin
    .from("crm_contacts")
    .insert({
      business_id: body.business_id,
      ghl_contact_id: ghlContactId,
      first_name: body.first_name ?? null,
      last_name: body.last_name ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      company: body.company ?? null,
      contact_type: body.contact_type ?? "lead",
      pipeline_stage: body.pipeline_stage ?? null,
      notes: body.notes ?? null,
      tags: body.tags ?? [],
      source: ghlContactId ? "ghl_sync" : "manual",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ contact: data }, { status: 201 })
}

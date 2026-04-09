import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import type { BusinessId } from "@/types/db"

/**
 * GET /api/calendar/events
 * Returns events for a date range, all or filtered by business.
 * Default: next 7 days.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const business_id = searchParams.get("business_id") as BusinessId | null
  const event_type = searchParams.get("event_type")

  const startDate = searchParams.get("start_date")
    ? new Date(searchParams.get("start_date")!)
    : new Date()
  const endDate = searchParams.get("end_date")
    ? new Date(searchParams.get("end_date")!)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  let query = supabaseAdmin
    .from("calendar_events")
    .select("*")
    .gte("start_time", startDate.toISOString())
    .lte("start_time", endDate.toISOString())
    .order("start_time", { ascending: true })

  if (business_id) query = query.eq("business_id", business_id)
  if (event_type) query = query.eq("event_type", event_type)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ events: data, count: data?.length ?? 0 })
}

/**
 * POST /api/calendar/events
 * Create a calendar event in Supabase (and optionally Google Calendar).
 */
export async function POST(request: Request) {
  let body: {
    business_id: BusinessId
    title: string
    start_time: string
    end_time: string
    description?: string
    location?: string
    event_type?: string
    attendees?: Array<{ email: string; name?: string }>
    push_to_google?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 })
  }

  if (!body.business_id || !body.title || !body.start_time || !body.end_time) {
    return NextResponse.json(
      { error: "business_id, title, start_time, end_time required", code: "MISSING_FIELDS" },
      { status: 400 },
    )
  }

  // Determine calendar_account from business_id
  const { data: account } = await supabaseAdmin
    .from("email_accounts")
    .select("email_address")
    .eq("business_id", body.business_id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  const calendarAccount = account?.email_address ?? `${body.business_id}@unknown.com`

  let googleEventId: string | null = null

  // Optionally push to Google Calendar
  if (body.push_to_google) {
    const { createEvent } = await import("@/lib/google-calendar")
    const gcal = await createEvent(body.business_id, {
      summary: body.title,
      description: body.description,
      location: body.location,
      start: { dateTime: body.start_time },
      end: { dateTime: body.end_time },
      attendees: body.attendees?.map((a) => ({ email: a.email, displayName: a.name })),
    })
    googleEventId = gcal?.id ?? null
  }

  const { data, error } = await supabaseAdmin
    .from("calendar_events")
    .insert({
      business_id: body.business_id,
      google_event_id: googleEventId,
      calendar_account: calendarAccount,
      title: body.title,
      description: body.description ?? null,
      start_time: body.start_time,
      end_time: body.end_time,
      location: body.location ?? null,
      event_type: body.event_type ?? "other",
      attendees: body.attendees ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ event: data }, { status: 201 })
}

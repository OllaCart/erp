import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import type { BusinessId, DbTask } from "@/types/db"

/**
 * POST /api/tasks/:id/schedule
 * Creates a calendar_events row linked to the task and stores scheduled_start/end on the task.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let body: { start_time: string; end_time: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 })
  }

  if (!body.start_time || !body.end_time) {
    return NextResponse.json(
      { error: "start_time and end_time are required (ISO strings)", code: "MISSING_FIELDS" },
      { status: 400 },
    )
  }

  const start = new Date(body.start_time)
  const end = new Date(body.end_time)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json(
      { error: "Invalid start_time / end_time", code: "INVALID_RANGE" },
      { status: 400 },
    )
  }

  const { data: task, error: taskErr } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single()

  if (taskErr?.code === "PGRST116" || !task) {
    return NextResponse.json({ error: "Task not found", code: "NOT_FOUND" }, { status: 404 })
  }
  if (taskErr) {
    console.error("POST schedule fetch task:", taskErr)
    return NextResponse.json({ error: taskErr.message, code: "DB_ERROR" }, { status: 500 })
  }

  const row = task as DbTask

  if (row.calendar_event_id) {
    const { error: delErr } = await supabaseAdmin
      .from("calendar_events")
      .delete()
      .eq("id", row.calendar_event_id)
    if (delErr) {
      console.error("POST schedule delete old event:", delErr)
    }
  }

  const { data: account } = await supabaseAdmin
    .from("email_accounts")
    .select("email_address")
    .eq("business_id", row.business_id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const calendarAccount =
    account?.email_address ?? `${row.business_id}@calendar.local`

  const isoStart = start.toISOString()
  const isoEnd = end.toISOString()

  const { data: event, error: insErr } = await supabaseAdmin
    .from("calendar_events")
    .insert({
      business_id: row.business_id as BusinessId,
      google_event_id: null,
      calendar_account: calendarAccount,
      title: row.title,
      description: row.description ?? null,
      start_time: isoStart,
      end_time: isoEnd,
      location: null,
      event_type: "internal",
      task_id: id,
    })
    .select("id")
    .single()

  if (insErr || !event) {
    console.error("POST schedule insert event:", insErr)
    return NextResponse.json(
      { error: insErr?.message ?? "Failed to create calendar event", code: "DB_ERROR" },
      { status: 500 },
    )
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("tasks")
    .update({
      scheduled_start: isoStart,
      scheduled_end: isoEnd,
      calendar_event_id: event.id,
    })
    .eq("id", id)
    .select()
    .single()

  if (updErr) {
    await supabaseAdmin.from("calendar_events").delete().eq("id", event.id)
    console.error("POST schedule update task:", updErr)
    return NextResponse.json({ error: updErr.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ task: updated as DbTask })
}

/**
 * DELETE /api/tasks/:id/schedule
 * Removes the linked calendar event and clears schedule fields on the task.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const { data: task, error: taskErr } = await supabaseAdmin
    .from("tasks")
    .select("calendar_event_id")
    .eq("id", id)
    .single()

  if (taskErr?.code === "PGRST116" || !task) {
    return NextResponse.json({ error: "Task not found", code: "NOT_FOUND" }, { status: 404 })
  }
  if (taskErr) {
    return NextResponse.json({ error: taskErr.message, code: "DB_ERROR" }, { status: 500 })
  }

  const calendarEventId = task.calendar_event_id as string | null
  if (calendarEventId) {
    const { error: delErr } = await supabaseAdmin
      .from("calendar_events")
      .delete()
      .eq("id", calendarEventId)
    if (delErr) {
      console.error("DELETE schedule:", delErr)
      return NextResponse.json({ error: delErr.message, code: "DB_ERROR" }, { status: 500 })
    }
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("tasks")
    .update({
      scheduled_start: null,
      scheduled_end: null,
      calendar_event_id: null,
    })
    .eq("id", id)
    .select()
    .single()

  if (updErr) {
    return NextResponse.json({ error: updErr.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ task: updated as DbTask })
}

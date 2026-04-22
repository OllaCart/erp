import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import type { DbTask, UpdateTaskInput, RecurrenceRule } from "@/types/db"

/** Advance a YYYY-MM-DD date string by one recurrence interval. */
function nextDueDate(from: string, rule: RecurrenceRule, interval: number): string {
  const d = new Date(from + "T12:00:00Z") // noon UTC avoids DST edge cases
  switch (rule) {
    case "daily":
      d.setUTCDate(d.getUTCDate() + interval)
      break
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7 * interval)
      break
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + interval)
      break
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + interval)
      break
  }
  return d.toISOString().split("T")[0]
}

/**
 * PATCH /api/tasks/:id
 * Update a task's status, priority, notes, assignee, due_date, recurrence, etc.
 * If marking a recurring task done, auto-spawns the next occurrence.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let body: UpdateTaskInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 })
  }

  // Stamp completed_at when marking done
  const patch: UpdateTaskInput & { completed_at?: string | null } = { ...body }
  if (body.status === "done" && !body.completed_at) {
    patch.completed_at = new Date().toISOString()
  }
  if (body.status && body.status !== "done") {
    patch.completed_at = null
  }

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Task not found", code: "NOT_FOUND" }, { status: 404 })
    }
    console.error("PATCH /api/tasks/:id error:", error)
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  const task = data as DbTask

  // Spawn next occurrence when a recurring task is marked done
  if (body.status === "done" && task.recurrence_rule) {
    const interval = task.recurrence_interval ?? 1
    const baseDue = task.due_date ?? new Date().toISOString().split("T")[0]
    const newDue = nextDueDate(baseDue, task.recurrence_rule, interval)

    await supabaseAdmin.from("tasks").insert({
      business_id: task.business_id,
      title: task.title,
      description: task.description,
      status: "todo",
      priority: task.priority,
      category: task.category,
      source: task.source,
      assignee: task.assignee,
      due_date: newDue,
      notes: task.notes,
      recurrence_rule: task.recurrence_rule,
      recurrence_interval: task.recurrence_interval,
      recurrence_parent_id: task.id,
    })
  }

  return NextResponse.json({ task })
}

/**
 * DELETE /api/tasks/:id
 * Soft delete — sets status to "archived".
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update({ status: "archived" })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Task not found", code: "NOT_FOUND" }, { status: 404 })
    }
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ task: data })
}

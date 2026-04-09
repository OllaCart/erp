import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import type { UpdateTaskInput } from "@/types/db"

/**
 * PATCH /api/tasks/:id
 * Update a task's status, priority, notes, assignee, or due_date.
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

  // If marking done, stamp completed_at
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

  return NextResponse.json({ task: data })
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

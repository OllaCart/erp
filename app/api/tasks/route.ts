import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import type { BusinessId, TaskStatus, TaskPriority, TaskCategory, CreateTaskInput, DbTask } from "@/types/db"

/**
 * GET /api/tasks
 * Returns tasks filtered by business_id, status, priority, category, assignee.
 * Default: all non-archived tasks, sorted by priority then created_at.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const business_id = searchParams.get("business_id") as BusinessId | null
  const status = searchParams.get("status") as TaskStatus | null
  const priority = searchParams.get("priority") as TaskPriority | null
  const category = searchParams.get("category") as TaskCategory | null
  const assignee = searchParams.get("assignee")
  const limit = parseInt(searchParams.get("limit") ?? "50", 10)
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)

  let query = supabaseAdmin
    .from("tasks")
    .select("*")
    .neq("status", "archived")
    .order("priority", { ascending: true })  // urgent < high < medium < low alphabetically — use CASE in prod
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (business_id) query = query.eq("business_id", business_id)
  if (status) query = query.eq("status", status)
  if (priority) query = query.eq("priority", priority)
  if (category) query = query.eq("category", category)
  if (assignee) query = query.eq("assignee", assignee)

  const { data, error } = await query

  if (error) {
    console.error("GET /api/tasks error:", error)
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ tasks: data as DbTask[] })
}

/**
 * POST /api/tasks
 * Create a new task.
 */
export async function POST(request: Request) {
  let body: CreateTaskInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 })
  }

  if (!body.business_id || !body.title?.trim()) {
    return NextResponse.json(
      { error: "business_id and title are required", code: "MISSING_FIELDS" },
      { status: 400 },
    )
  }

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      business_id: body.business_id,
      title: body.title.trim(),
      description: body.description ?? null,
      priority: body.priority ?? "medium",
      category: body.category ?? null,
      due_date: body.due_date ?? null,
      notes: body.notes ?? null,
      source: body.source ?? "manual",
      source_id: body.source_id ?? null,
      assignee: body.assignee ?? "founder",
      recurrence_rule: body.recurrence_rule ?? null,
      recurrence_interval: body.recurrence_interval ?? null,
      follows_up_on: body.follows_up_on ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error("POST /api/tasks error:", error)
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ task: data as DbTask }, { status: 201 })
}

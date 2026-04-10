import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { callClaudeJSON } from "@/lib/claude"
import type { DbTask, BusinessId } from "@/types/db"
import { sortTasksForDisplay } from "@/lib/task-sort"

interface PrioritizeResult {
  task_id: string
  priority: "urgent" | "high" | "medium" | "low"
  reasoning: string
}

/**
 * POST /api/tasks/prioritize
 * Asks Claude to re-rank all open tasks across businesses.
 * Updates priorities in Supabase and returns sorted task list.
 */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error: "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI prioritization.",
        code: "MISSING_API_KEY",
      },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const business_id = body.business_id as BusinessId | undefined

  // Fetch all non-archived, non-done tasks
  let query = supabaseAdmin
    .from("tasks")
    .select("*")
    .not("status", "in", '("done","archived")')
    .order("created_at", { ascending: false })

  if (business_id) query = query.eq("business_id", business_id)

  const { data: tasks, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ tasks: [] })
  }

  const taskList = (tasks as DbTask[])
    .map((t) => {
      const sched =
        t.scheduled_start != null
          ? ` [scheduled ${t.scheduled_start}]`
          : " [needs scheduling]"
      return `[${t.id}] [${t.business_id}] [${t.category ?? "general"}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}${sched}`
    })
    .join("\n")

  const systemPrompt = `You are Dash, prioritizing tasks for a founder who runs three startups.

Priority rules:
- SwiftFi tasks > others (it's the revenue-generating business)
- Anything blocking the developer is urgent
- Investor follow-ups older than 48h are urgent
- Support tickets from paying customers are high priority
- UnbeatableLoans tasks happen at night — don't mark them urgent during day
- OllaCart Rye API integration is the current active afternoon project
- Tasks marked [needs scheduling] have no calendar block yet — favor giving them actionable priority when they are important

Return ONLY a valid JSON array, no markdown:
[{ "task_id": "uuid", "priority": "urgent|high|medium|low", "reasoning": "one sentence" }]`

  let rankings: PrioritizeResult[]
  try {
    rankings = await callClaudeJSON<PrioritizeResult[]>(
      `Rank these tasks by priority:\n\n${taskList}`,
      systemPrompt,
    )
  } catch (err) {
    console.error("Claude prioritization failed:", err)
    const message =
      err instanceof SyntaxError
        ? "Claude returned invalid JSON. Try again or shorten the task list."
        : err instanceof Error
          ? err.message
          : "Claude request failed"
    return NextResponse.json({ error: message, code: "CLAUDE_ERROR" }, { status: 500 })
  }

  if (!Array.isArray(rankings)) {
    return NextResponse.json(
      { error: "Claude returned a non-array response. Try again.", code: "INVALID_SHAPE" },
      { status: 422 },
    )
  }

  // Apply updates in parallel (fire and forget errors on individual rows)
  await Promise.all(
    rankings.map(({ task_id, priority }) =>
      supabaseAdmin.from("tasks").update({ priority }).eq("id", task_id),
    ),
  )

  // Return updated tasks in priority order
  const updatedTasks = (tasks as DbTask[]).map((t) => {
    const ranked = rankings.find((r) => r.task_id === t.id)
    return ranked ? { ...t, priority: ranked.priority, _reasoning: ranked.reasoning } : t
  })
  const sorted = sortTasksForDisplay(updatedTasks)

  return NextResponse.json({ tasks: sorted, count: sorted.length })
}

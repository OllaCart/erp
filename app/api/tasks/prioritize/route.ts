import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { callClaudeJSON } from "@/lib/claude"
import type { DbTask, BusinessId } from "@/types/db"
import { sortTasksForDisplay } from "@/lib/task-sort"

interface PrioritizeResult {
  task_id: string
  priority: "urgent" | "high" | "medium" | "low"
  reasoning: string
  /** Suggested calendar date — YYYY-MM-DD. Optional; only for important unscheduled tasks. */
  schedule_date?: string
  /** Suggested start hour (0-23) on schedule_date. */
  schedule_hour?: number
  /** Suggested duration in minutes. */
  schedule_duration_min?: number
}

/**
 * POST /api/tasks/prioritize
 * Asks Claude to re-rank all open tasks, returns priority order,
 * and optionally schedules high-priority unscheduled tasks.
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

  const today = new Date().toISOString().split("T")[0]
  const hour = new Date().getHours()

  const taskList = (tasks as DbTask[])
    .map((t) => {
      const sched =
        t.scheduled_start != null
          ? ` [scheduled ${t.scheduled_start.slice(0, 10)}]`
          : " [needs scheduling]"
      const rec = t.recurrence_rule ? ` [recurring: ${t.recurrence_rule}]` : ""
      return `[${t.id}] [${t.business_id}] [${t.category ?? "general"}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}${sched}${rec}`
    })
    .join("\n")

  const systemPrompt = `You are Dash, prioritizing tasks for a founder managing multiple contexts.

CONTEXTS:
- personal: personal life tasks — schedule during evenings/weekends
- mortgage: day-job at a mortgage company (employment) — schedule during 9-5 weekday hours
- swiftfi: crypto onramp startup (revenue-generating) — highest business priority
- unbeatableloans: mortgage startup he is building — pitch/dev tasks
- ollacart: social shopping startup — active afternoon dev project
- projects: software development side projects

PRIORITY RULES:
- SwiftFi tasks involving revenue or paying users → urgent
- Anything blocking a developer or deployment → urgent
- Investor follow-ups older than 48h → urgent
- UnbeatableLoans + OllaCart dev work → high
- Mortgage day-job tasks → medium unless there is a deadline
- Personal tasks → low unless time-sensitive
- Recurring tasks with no schedule → bump one priority level (they need a home)

SCHEDULING: Today is ${today}, current hour is ${hour}:00.
For tasks marked [needs scheduling] that you rate urgent or high, suggest a schedule_date (YYYY-MM-DD) and schedule_hour (0-23) based on context.
- mortgage job tasks: 9-17 on weekdays
- personal tasks: 18-22 or weekend
- startup tasks: 8-12 or 13-17 on weekdays

Return ONLY a valid JSON array, no markdown:
[{
  "task_id": "uuid",
  "priority": "urgent|high|medium|low",
  "reasoning": "one sentence",
  "schedule_date": "YYYY-MM-DD",
  "schedule_hour": 9,
  "schedule_duration_min": 60
}]
schedule_date, schedule_hour, and schedule_duration_min are optional — only include when the task is important AND unscheduled.`

  let rankings: PrioritizeResult[]
  try {
    rankings = await callClaudeJSON<PrioritizeResult[]>(
      `Rank these tasks by priority and suggest schedules for urgent/high unscheduled ones:\n\n${taskList}`,
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

  // Apply priority + schedule updates in parallel
  await Promise.all(
    rankings.map(({ task_id, priority, schedule_date, schedule_hour, schedule_duration_min }) => {
      const patch: Record<string, unknown> = { priority }

      // Only schedule if Claude provided a date AND task isn't already scheduled
      const originalTask = (tasks as DbTask[]).find((t) => t.id === task_id)
      if (
        schedule_date &&
        typeof schedule_hour === "number" &&
        originalTask &&
        !originalTask.scheduled_start
      ) {
        const dur = schedule_duration_min ?? 60
        const pad = (n: number) => String(n).padStart(2, "0")
        const startIso = `${schedule_date}T${pad(schedule_hour)}:00:00.000Z`
        const endIso = new Date(
          new Date(startIso).getTime() + dur * 60 * 1000,
        ).toISOString()
        patch.scheduled_start = startIso
        patch.scheduled_end = endIso
      }

      return supabaseAdmin.from("tasks").update(patch).eq("id", task_id)
    }),
  )

  // Return updated tasks in priority order
  const updatedTasks = (tasks as DbTask[]).map((t) => {
    const ranked = rankings.find((r) => r.task_id === t.id)
    if (!ranked) return t
    const result: DbTask & { _reasoning?: string } = {
      ...t,
      priority: ranked.priority,
      _reasoning: ranked.reasoning,
    }
    // Reflect the schedule suggestion in the returned object
    if (ranked.schedule_date && typeof ranked.schedule_hour === "number" && !t.scheduled_start) {
      const dur = ranked.schedule_duration_min ?? 60
      const pad = (n: number) => String(n).padStart(2, "0")
      result.scheduled_start = `${ranked.schedule_date}T${pad(ranked.schedule_hour)}:00:00.000Z`
      result.scheduled_end = new Date(
        new Date(result.scheduled_start).getTime() + dur * 60 * 1000,
      ).toISOString()
    }
    return result
  })

  const sorted = sortTasksForDisplay(updatedTasks)
  return NextResponse.json({ tasks: sorted, count: sorted.length })
}

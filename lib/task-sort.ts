import type { DbTask, TaskPriority } from "@/types/db"

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

/**
 * Open-task list order: priority (urgent→low), then unscheduled first,
 * then scheduled by start time ascending, then created_at.
 */
export function sortTasksForDisplay(tasks: DbTask[]): DbTask[] {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority as TaskPriority] ?? 99
    const pb = PRIORITY_ORDER[b.priority as TaskPriority] ?? 99
    if (pa !== pb) return pa - pb

    const aSched = Boolean(a.scheduled_start && a.scheduled_end)
    const bSched = Boolean(b.scheduled_start && b.scheduled_end)
    if (aSched !== bSched) return aSched ? 1 : -1

    if (aSched && bSched && a.scheduled_start && b.scheduled_start) {
      return (
        new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
      )
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

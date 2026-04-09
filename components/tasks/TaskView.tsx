"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Loader2,
  Sparkles,
  Plus,
  Mail,
  Github,
  Calendar,
  Bot,
  MessageSquare,
  Pencil,
} from "lucide-react"
import type { DbTask, BusinessId, TaskPriority, TaskStatus } from "@/types/db"

const BUSINESSES: Array<{ id: BusinessId | "all"; label: string; color: string }> = [
  { id: "all", label: "All", color: "bg-zinc-500" },
  { id: "swiftfi", label: "SwiftFi", color: "bg-blue-500" },
  { id: "unbeatableloans", label: "UnbeatableLoans", color: "bg-amber-500" },
  { id: "ollacart", label: "OllaCart", color: "bg-orange-500" },
]

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-zinc-100 text-zinc-600 border-zinc-200",
}

const SOURCE_ICON: Record<string, React.ReactNode> = {
  email: <Mail className="h-3 w-3" />,
  github: <Github className="h-3 w-3" />,
  calendar: <Calendar className="h-3 w-3" />,
  claude: <Bot className="h-3 w-3" />,
  chat: <MessageSquare className="h-3 w-3" />,
}

const BUSINESS_BADGE: Record<BusinessId, string> = {
  swiftfi: "bg-blue-100 text-blue-700",
  unbeatableloans: "bg-amber-100 text-amber-700",
  ollacart: "bg-orange-100 text-orange-700",
  personal: "bg-zinc-100 text-zinc-600",
}

export function TaskView() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<DbTask[]>([])
  const [activeBusiness, setActiveBusiness] = useState<BusinessId | "all">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isPrioritizing, setIsPrioritizing] = useState(false)
  const [quickAdd, setQuickAdd] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (activeBusiness !== "all") params.set("business_id", activeBusiness)
      const res = await fetch(`/api/tasks?${params}`)
      if (!res.ok) throw new Error("Failed to fetch tasks")
      const data = await res.json()
      setTasks(
        (data.tasks as DbTask[]).sort(
          (a, b) =>
            (PRIORITY_ORDER[a.priority as TaskPriority] ?? 99) -
            (PRIORITY_ORDER[b.priority as TaskPriority] ?? 99) ||
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
      )
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  async function toggleDone(task: DbTask) {
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done"
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
    )
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickAdd.trim() || isAdding) return

    const business_id: BusinessId =
      activeBusiness === "all" ? "ollacart" : activeBusiness

    setIsAdding(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id,
          title: quickAdd.trim(),
          source: "manual",
        }),
      })
      if (!res.ok) throw new Error("Failed to create task")
      const { task } = await res.json()
      setTasks((prev) =>
        [task as DbTask, ...prev].sort(
          (a, b) =>
            (PRIORITY_ORDER[a.priority as TaskPriority] ?? 99) -
            (PRIORITY_ORDER[b.priority as TaskPriority] ?? 99),
        ),
      )
      setQuickAdd("")
    } catch (err) {
      console.error(err)
    } finally {
      setIsAdding(false)
    }
  }

  async function handlePrioritize() {
    setIsPrioritizing(true)
    try {
      const res = await fetch("/api/tasks/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          activeBusiness !== "all" ? { business_id: activeBusiness } : {},
        ),
      })
      const body = (await res.json().catch(() => ({}))) as {
        tasks?: DbTask[]
        error?: string
        code?: string
      }
      if (!res.ok) {
        const msg =
          body.error ??
          (res.status === 503
            ? "AI prioritization is not configured (missing API key)."
            : "Prioritization failed.")
        toast({
          title: "Could not prioritize",
          description: body.code ? `${msg} (${body.code})` : msg,
          variant: "destructive",
        })
        return
      }
      setTasks(body.tasks ?? [])
    } catch (err) {
      console.error(err)
      toast({
        title: "Could not prioritize",
        description: err instanceof Error ? err.message : "Network error",
        variant: "destructive",
      })
    } finally {
      setIsPrioritizing(false)
    }
  }

  // Group by priority sections
  const sections: Array<{ priority: TaskPriority; label: string }> = [
    { priority: "urgent", label: "Urgent" },
    { priority: "high", label: "High" },
    { priority: "medium", label: "Medium" },
    { priority: "low", label: "Low" },
  ]

  const activeTasks = tasks.filter((t) => t.status !== "done" && t.status !== "archived")
  const doneTasks = tasks.filter((t) => t.status === "done")

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Business tabs */}
      <div className="flex gap-2 flex-wrap">
        {BUSINESSES.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBusiness(b.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeBusiness === b.id
                ? `${b.color} text-white`
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {b.label}
            {b.id !== "all" && (
              <span className="ml-1.5 opacity-75 text-xs">
                {tasks.filter((t) => t.business_id === b.id && t.status !== "done" && t.status !== "archived").length}
              </span>
            )}
          </button>
        ))}

        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={handlePrioritize}
          disabled={isPrioritizing}
        >
          {isPrioritizing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Ask Claude to prioritize
        </Button>
      </div>

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <Input
          placeholder={`Add a task${activeBusiness !== "all" ? ` to ${activeBusiness}` : ""}...`}
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          disabled={isAdding}
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={!quickAdd.trim() || isAdding}>
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </form>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            No open tasks. Add one above or ask Claude to create some.
          </p>
        ) : (
          sections.map(({ priority, label }) => {
            const sectionTasks = activeTasks.filter((t) => t.priority === priority)
            if (sectionTasks.length === 0) return null
            return (
              <div key={priority}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({sectionTasks.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {sectionTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      expanded={expandedId === task.id}
                      onToggleExpand={() =>
                        setExpandedId(expandedId === task.id ? null : task.id)
                      }
                      onToggleDone={() => toggleDone(task)}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}

        {/* Done section */}
        {doneTasks.length > 0 && (
          <details className="group">
            <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none">
              Done ({doneTasks.length})
            </summary>
            <div className="mt-2 space-y-1 opacity-50">
              {doneTasks.slice(0, 10).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  expanded={false}
                  onToggleExpand={() => {}}
                  onToggleDone={() => toggleDone(task)}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

function TaskRow({
  task,
  expanded,
  onToggleExpand,
  onToggleDone,
}: {
  task: DbTask
  expanded: boolean
  onToggleExpand: () => void
  onToggleDone: () => void
}) {
  const isDone = task.status === "done"

  return (
    <div className="rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <button
          onClick={onToggleDone}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
        >
          {isDone ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : task.status === "blocked" ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : task.status === "in_progress" ? (
            <Clock className="h-4 w-4 text-blue-500" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`text-sm font-medium cursor-pointer ${isDone ? "line-through text-muted-foreground" : ""}`}
              onClick={onToggleExpand}
            >
              {task.title}
            </span>

            {/* Business badge */}
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${BUSINESS_BADGE[task.business_id]}`}
            >
              {task.business_id === "unbeatableloans" ? "UBL" : task.business_id}
            </span>

            {/* Priority badge */}
            <span
              className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_STYLES[task.priority]}`}
            >
              {task.priority}
            </span>

            {/* Category */}
            {task.category && (
              <span className="text-xs text-muted-foreground">{task.category}</span>
            )}

            {/* Source icon */}
            {task.source !== "manual" && SOURCE_ICON[task.source] && (
              <span className="text-muted-foreground" title={`From ${task.source}`}>
                {SOURCE_ICON[task.source]}
              </span>
            )}
          </div>

          {/* Due date */}
          {task.due_date && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Due {new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}

          {/* Expanded details */}
          {expanded && (
            <div className="mt-2 text-sm text-muted-foreground space-y-1 border-t pt-2">
              {task.description && <p>{task.description}</p>}
              {task.notes && (
                <p className="italic text-xs">{task.notes}</p>
              )}
              <p className="text-xs">
                Created {new Date(task.created_at).toLocaleDateString()} · Assignee: {task.assignee}
              </p>
            </div>
          )}
        </div>

        {/* Expand toggle */}
        {(task.description || task.notes) && (
          <button
            onClick={onToggleExpand}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

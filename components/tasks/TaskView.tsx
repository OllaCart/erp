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
  X,
  Save,
  RefreshCw,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import type { DbTask, BusinessId, TaskPriority, TaskStatus, TaskCategory, RecurrenceRule } from "@/types/db"
import { sortTasksForDisplay } from "@/lib/task-sort"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

const BUSINESSES: Array<{ id: BusinessId | "all"; label: string; color: string; subtitle?: string }> = [
  { id: "all",            label: "All",              color: "bg-zinc-500" },
  { id: "personal",       label: "Personal",          color: "bg-purple-500" },
  { id: "mortgage",       label: "Mortgage Job",      color: "bg-green-600",  subtitle: "employment" },
  { id: "swiftfi",        label: "SwiftFi",           color: "bg-blue-500",   subtitle: "startup" },
  { id: "unbeatableloans",label: "UnbeatableLoans",   color: "bg-amber-500",  subtitle: "startup" },
  { id: "ollacart",       label: "OllaCart",          color: "bg-orange-500", subtitle: "startup" },
  { id: "projects",       label: "Projects",          color: "bg-indigo-500", subtitle: "dev" },
]

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
  swiftfi:         "bg-blue-100 text-blue-700",
  unbeatableloans: "bg-amber-100 text-amber-700",
  ollacart:        "bg-orange-100 text-orange-700",
  personal:        "bg-purple-100 text-purple-700",
  mortgage:        "bg-green-100 text-green-700",
  projects:        "bg-indigo-100 text-indigo-700",
}

const BUSINESS_SHORT: Record<BusinessId, string> = {
  swiftfi:         "SwiftFi",
  unbeatableloans: "UBL",
  ollacart:        "OllaCart",
  personal:        "Personal",
  mortgage:        "Mortgage",
  projects:        "Projects",
}

const RECURRENCE_LABEL: Record<RecurrenceRule, string> = {
  daily:   "Daily",
  weekly:  "Weekly",
  monthly: "Monthly",
  yearly:  "Yearly",
}

function defaultScheduleInputs() {
  const next = new Date(Date.now() + 30 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`,
    time: `${pad(next.getHours())}:${pad(next.getMinutes())}`,
  }
}

function formatScheduleRange(startIso: string, endIso: string): string {
  const s = new Date(startIso)
  const e = new Date(endIso)
  const sameDay = s.toDateString() === e.toDateString()
  const dOpts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }
  const tOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" }
  if (sameDay) {
    return `${s.toLocaleString("en-US", { ...dOpts, ...tOpts })} — ${e.toLocaleString("en-US", tOpts)}`
  }
  return `${s.toLocaleString("en-US", { ...dOpts, ...tOpts })} — ${e.toLocaleString("en-US", { ...dOpts, ...tOpts })}`
}

// ── NewTaskDialog ─────────────────────────────────────────────────────────────

function NewTaskDialog({
  open,
  defaultBusiness,
  onClose,
  onCreated,
}: {
  open: boolean
  defaultBusiness: BusinessId | "all"
  onClose: () => void
  onCreated: (task: DbTask) => void
}) {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [business, setBusiness] = useState<BusinessId>(
    defaultBusiness === "all" ? "personal" : defaultBusiness,
  )
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [category, setCategory] = useState<TaskCategory | "">("")
  const [dueDate, setDueDate] = useState("")
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | "">("")
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setTitle("")
      setBusiness(defaultBusiness === "all" ? "personal" : defaultBusiness)
      setPriority("medium")
      setCategory("")
      setDueDate("")
      setRecurrenceRule("")
      setRecurrenceInterval(1)
      setNotes("")
    }
  }, [open, defaultBusiness])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business,
          title: title.trim(),
          priority,
          category: category || null,
          due_date: dueDate || null,
          notes: notes.trim() || null,
          source: "manual",
          recurrence_rule: recurrenceRule || null,
          recurrence_interval: recurrenceRule ? recurrenceInterval : null,
        }),
      })
      if (!res.ok) throw new Error("Failed to create task")
      const { task } = (await res.json()) as { task: DbTask }
      onCreated(task)
      toast({
        title: recurrenceRule
          ? `Recurring task created (${recurrenceRule})`
          : "Task created",
      })
      onClose()
    } catch (err) {
      toast({ title: "Could not create task", description: String(err), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-indigo-500" />
            New task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Input
              autoFocus
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Row: Business + Priority */}
          <div className="flex gap-3">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Business</Label>
              <select
                value={business}
                onChange={(e) => setBusiness(e.target.value as BusinessId)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {BUSINESSES.filter((b) => b.id !== "all").map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Row: Category + Due date */}
          <div className="flex gap-3">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory | "")}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">None</option>
                <option value="dev">Dev</option>
                <option value="outreach">Outreach</option>
                <option value="pitch">Pitch</option>
                <option value="support">Support</option>
                <option value="ops">Ops</option>
                <option value="finance">Finance</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-sm w-[148px]"
              />
            </div>
          </div>

          {/* Recurrence */}
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
            <Label className="text-xs flex items-center gap-1.5 text-indigo-700">
              <RefreshCw className="h-3 w-3" /> Recurrence
            </Label>
            <div className="flex gap-3 items-end">
              <div className="space-y-1 flex-1">
                <Label className="text-[10px] text-muted-foreground">Repeat</Label>
                <select
                  value={recurrenceRule}
                  onChange={(e) => setRecurrenceRule(e.target.value as RecurrenceRule | "")}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              {recurrenceRule && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Every N</Label>
                  <Input
                    type="number"
                    min={1}
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value)))}
                    className="h-9 text-sm w-[72px]"
                  />
                </div>
              )}
            </div>
            {recurrenceRule && (
              <p className="text-[11px] text-indigo-600">
                Repeats every {recurrenceInterval > 1 ? `${recurrenceInterval} ` : ""}
                {recurrenceRule}{recurrenceInterval > 1 ? "s" : ""}.
                The next occurrence is created automatically when you complete this one.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Optional notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm min-h-[56px] resize-none"
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!title.trim() || isSaving}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : recurrenceRule ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {recurrenceRule ? "Create recurring task" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── TaskView ──────────────────────────────────────────────────────────────────

export function TaskView() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<DbTask[]>([])
  const [activeBusiness, setActiveBusiness] = useState<BusinessId | "all">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isPrioritizing, setIsPrioritizing] = useState(false)
  const [quickAdd, setQuickAdd] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (activeBusiness !== "all") params.set("business_id", activeBusiness)
      const res = await fetch(`/api/tasks?${params}`)
      if (!res.ok) throw new Error("Failed to fetch tasks")
      const data = await res.json()
      setTasks(sortTasksForDisplay((data.tasks as DbTask[]) ?? []))
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  function handleTaskCreated(task: DbTask) {
    setTasks((prev) => sortTasksForDisplay([task, ...prev]))
  }

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
      setTasks((prev) => sortTasksForDisplay([task as DbTask, ...prev]))
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
      setTasks(sortTasksForDisplay((body.tasks as DbTask[]) ?? []))
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

  const mergeTaskIntoList = useCallback((updated: DbTask) => {
    setTasks((prev) =>
      sortTasksForDisplay(prev.map((t) => (t.id === updated.id ? updated : t))),
    )
  }, [])

  const activeTasks = tasks.filter((t) => t.status !== "done" && t.status !== "archived")
  const doneTasks = tasks.filter((t) => t.status === "done")
  // Recurring "templates" — the parent tasks that drive a series
  const recurringTasks = tasks.filter(
    (t) => t.recurrence_rule && !t.recurrence_parent_id && t.status !== "archived",
  )

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <NewTaskDialog
        open={showNewTask}
        defaultBusiness={activeBusiness}
        onClose={() => setShowNewTask(false)}
        onCreated={handleTaskCreated}
      />
      {/* Business tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {BUSINESSES.map((b) => {
          const count = b.id !== "all"
            ? tasks.filter((t) => t.business_id === b.id && t.status !== "done" && t.status !== "archived").length
            : null
          return (
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
              {count !== null && (
                <span className="ml-1.5 opacity-75 text-xs">{count}</span>
              )}
            </button>
          )
        })}

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowNewTask(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New task
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handlePrioritize}
            disabled={isPrioritizing}
          >
            {isPrioritizing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Prioritize
          </Button>
        </div>
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
                      onTaskUpdated={mergeTaskIntoList}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}

        {/* Recurring section */}
        {recurringTasks.length > 0 && (
          <details className="group" open>
            <summary className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wide cursor-pointer select-none">
              <RefreshCw className="h-3 w-3" />
              Recurring ({recurringTasks.length})
            </summary>
            <div className="mt-2 space-y-1">
              {recurringTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  expanded={expandedId === task.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === task.id ? null : task.id)
                  }
                  onToggleDone={() => toggleDone(task)}
                  onTaskUpdated={mergeTaskIntoList}
                />
              ))}
            </div>
          </details>
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
                  onTaskUpdated={mergeTaskIntoList}
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
  onTaskUpdated,
}: {
  task: DbTask
  expanded: boolean
  onToggleExpand: () => void
  onToggleDone: () => void
  onTaskUpdated: (t: DbTask) => void
}) {
  const { toast } = useToast()
  const isDone = task.status === "done"
  const isScheduled = Boolean(task.scheduled_start && task.scheduled_end)

  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [durationMin, setDurationMin] = useState(30)
  const [isScheduling, setIsScheduling] = useState(false)

  // Edit state
  const [showEdit, setShowEdit] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDescription, setEditDescription] = useState(task.description ?? "")
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority)
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status)
  const [editDueDate, setEditDueDate] = useState(task.due_date ?? "")
  const [editNotes, setEditNotes] = useState(task.notes ?? "")
  const [editCategory, setEditCategory] = useState<TaskCategory | "">(task.category ?? "")
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceRule | "">(task.recurrence_rule ?? "")
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState(task.recurrence_interval ?? 1)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // AI agent state
  const [isAssigningAI, setIsAssigningAI] = useState(false)
  const [aiNote, setAiNote] = useState<string | null>(null)

  useEffect(() => {
    const d = defaultScheduleInputs()
    setScheduleDate(d.date)
    setScheduleTime(d.time)
    setShowScheduleForm(false)
  }, [task.id, task.scheduled_start])

  async function submitSchedule() {
    if (!scheduleDate || !scheduleTime) return
    const startLocal = new Date(`${scheduleDate}T${scheduleTime}:00`)
    if (Number.isNaN(startLocal.getTime())) {
      toast({
        title: "Invalid date or time",
        variant: "destructive",
      })
      return
    }
    const endLocal = new Date(startLocal.getTime() + durationMin * 60 * 1000)
    setIsScheduling(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_time: startLocal.toISOString(),
          end_time: endLocal.toISOString(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        task?: DbTask
        error?: string
        code?: string
      }
      if (!res.ok) {
        toast({
          title: "Could not schedule",
          description: data.error ?? "Request failed",
          variant: "destructive",
        })
        return
      }
      if (data.task) onTaskUpdated(data.task)
      setShowScheduleForm(false)
      toast({ title: "Added to calendar" })
    } finally {
      setIsScheduling(false)
    }
  }

  async function clearSchedule() {
    setIsScheduling(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/schedule`, { method: "DELETE" })
      const data = (await res.json().catch(() => ({}))) as {
        task?: DbTask
        error?: string
      }
      if (!res.ok) {
        toast({
          title: "Could not unschedule",
          description: data.error ?? "Request failed",
          variant: "destructive",
        })
        return
      }
      if (data.task) onTaskUpdated(data.task)
      toast({ title: "Removed from calendar" })
    } finally {
      setIsScheduling(false)
    }
  }

  function openScheduleForm() {
    const d = defaultScheduleInputs()
    setScheduleDate(d.date)
    setScheduleTime(d.time)
    setShowScheduleForm(true)
  }

  function openEdit() {
    setEditTitle(task.title)
    setEditDescription(task.description ?? "")
    setEditPriority(task.priority)
    setEditStatus(task.status)
    setEditDueDate(task.due_date ?? "")
    setEditNotes(task.notes ?? "")
    setEditCategory(task.category ?? "")
    setShowEdit(true)
  }

  async function saveEdit() {
    if (!editTitle.trim()) return
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          priority: editPriority,
          status: editStatus,
          due_date: editDueDate || null,
          notes: editNotes.trim() || null,
          category: editCategory || null,
          recurrence_rule: editRecurrence || null,
          recurrence_interval: editRecurrence ? editRecurrenceInterval : null,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { task?: DbTask; error?: string }
      if (!res.ok) {
        toast({ title: "Could not save", description: data.error ?? "Request failed", variant: "destructive" })
        return
      }
      if (data.task) onTaskUpdated(data.task)
      setShowEdit(false)
      toast({ title: "Task updated" })
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function assignToAI() {
    setIsAssigningAI(true)
    setAiNote(null)
    try {
      // Set assignee to "claude"
      const patchRes = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee: "claude" }),
      })
      const patchData = (await patchRes.json().catch(() => ({}))) as { task?: DbTask }
      if (patchData.task) onTaskUpdated(patchData.task)

      // Ask Claude to analyze the task
      const claudeRes = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `I've assigned you this task: "${task.title}"${task.description ? `\n\nDescription: ${task.description}` : ""}${task.notes ? `\n\nNotes: ${task.notes}` : ""}\n\nIn 2-3 sentences: what is the most important next action to make progress, and any blockers to anticipate?`,
          business_id: task.business_id,
          module: "tasks",
          stream: false,
        }),
      })
      const claudeData = (await claudeRes.json().catch(() => ({}))) as { text?: string }
      if (claudeData.text) setAiNote(claudeData.text)
      toast({ title: "Assigned to Claude" })
    } catch {
      toast({ title: "Failed to assign to AI", variant: "destructive" })
    } finally {
      setIsAssigningAI(false)
    }
  }

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
              {BUSINESS_SHORT[task.business_id] ?? task.business_id}
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

          {/* Due date + recurrence */}
          {(task.due_date || task.recurrence_rule) && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              {task.due_date && (
                <span>Due {new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              )}
              {task.recurrence_rule && (
                <span className="flex items-center gap-0.5 text-indigo-500">
                  <RefreshCw className="h-2.5 w-2.5" />
                  {RECURRENCE_LABEL[task.recurrence_rule]}{task.recurrence_interval && task.recurrence_interval > 1 ? ` ×${task.recurrence_interval}` : ""}
                </span>
              )}
            </p>
          )}

          {/* Expanded details or edit form */}
          {expanded && !showEdit && (
            <div className="mt-2 text-sm text-muted-foreground space-y-1 border-t pt-2">
              {task.description && <p>{task.description}</p>}
              {task.notes && (
                <p className="italic text-xs">{task.notes}</p>
              )}
              <p className="text-xs">
                Created {new Date(task.created_at).toLocaleDateString()} · Assignee: {task.assignee}
              </p>
              {aiNote && (
                <div className="mt-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-2 text-xs text-blue-800 dark:text-blue-200 flex gap-1.5">
                  <Bot className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
                  <span>{aiNote}</span>
                </div>
              )}
              <button
                onClick={openEdit}
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                Edit task
              </button>
            </div>
          )}

          {/* Inline edit form */}
          {showEdit && (
            <div className="mt-2 border-t pt-2 space-y-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Task title"
                className="h-8 text-sm"
              />
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                className="text-xs min-h-[60px] resize-none"
              />
              <div className="flex flex-wrap gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Priority</Label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs w-[90px]"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Status</Label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs w-[110px]"
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Category</Label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as TaskCategory | "")}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs w-[100px]"
                  >
                    <option value="">None</option>
                    <option value="dev">Dev</option>
                    <option value="outreach">Outreach</option>
                    <option value="pitch">Pitch</option>
                    <option value="support">Support</option>
                    <option value="ops">Ops</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Due date</Label>
                  <Input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="h-8 text-xs w-[140px]"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Repeat</Label>
                  <select
                    value={editRecurrence}
                    onChange={(e) => setEditRecurrence(e.target.value as RecurrenceRule | "")}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs w-[100px]"
                  >
                    <option value="">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {editRecurrence && (
                  <div className="space-y-0.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Every N</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editRecurrenceInterval}
                      onChange={(e) => setEditRecurrenceInterval(Math.max(1, Number(e.target.value)))}
                      className="h-8 text-xs w-[64px]"
                    />
                  </div>
                )}
              </div>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="text-xs min-h-[48px] resize-none"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={isSavingEdit || !editTitle.trim()}
                  onClick={() => void saveEdit()}
                >
                  {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={isSavingEdit}
                  onClick={() => setShowEdit(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-start gap-1 shrink-0">
          {/* AI agent assignment */}
          <button
            onClick={() => task.assignee === "claude" ? null : void assignToAI()}
            disabled={isAssigningAI}
            title={task.assignee === "claude" ? "Assigned to Claude" : "Assign to AI agent"}
            className={`p-1 rounded transition-colors ${
              task.assignee === "claude"
                ? "text-blue-500"
                : "text-muted-foreground hover:text-blue-500"
            }`}
          >
            {isAssigningAI ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bot className="h-3.5 w-3.5" />
            )}
          </button>
          {/* Edit toggle */}
          <button
            onClick={() => showEdit ? setShowEdit(false) : openEdit()}
            title="Edit task"
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!isDone && (
        <div className="border-t border-border/80 bg-muted/25 px-3 py-2.5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {isScheduled && task.scheduled_start && task.scheduled_end ? (
              <>
                <span className="text-xs text-foreground font-medium">
                  {formatScheduleRange(task.scheduled_start, task.scheduled_end)}
                </span>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Calendar
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive ml-auto"
                  disabled={isScheduling}
                  onClick={() => void clearSchedule()}
                >
                  {isScheduling ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Unschedule
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {!isScheduled && (
                  <Badge variant="outline" className="text-[10px] font-normal border-dashed">
                    Needs time
                  </Badge>
                )}
                {!showScheduleForm ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs ml-auto"
                    onClick={openScheduleForm}
                  >
                    Schedule
                  </Button>
                ) : null}
              </>
            )}
          </div>

          {!isScheduled && showScheduleForm && (
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`d-${task.id}`} className="text-[10px] uppercase text-muted-foreground">
                    Date
                  </Label>
                  <Input
                    id={`d-${task.id}`}
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="h-8 text-xs w-[140px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`t-${task.id}`} className="text-[10px] uppercase text-muted-foreground">
                    Start
                  </Label>
                  <Input
                    id={`t-${task.id}`}
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="h-8 text-xs w-[110px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`dur-${task.id}`} className="text-[10px] uppercase text-muted-foreground">
                    Duration
                  </Label>
                  <select
                    id={`dur-${task.id}`}
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs w-[100px]"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hr</option>
                    <option value={90}>1.5 hr</option>
                    <option value={120}>2 hr</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={isScheduling}
                  onClick={() => void submitSchedule()}
                >
                  {isScheduling ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save to calendar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={isScheduling}
                  onClick={() => setShowScheduleForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { Initiative, Project, Task, TaskStatus } from "@/types/erp"
import {
  WorkHierarchyService,
  loadWorkHierarchy,
  taskIsBlockedByDependencies,
} from "@/lib/work-hierarchy-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import {
  FolderKanbanIcon,
  LayersIcon,
  PlusIcon,
  CheckIcon,
  ClockIcon,
  Link2Icon,
  Trash2Icon,
} from "lucide-react"

const userId = "user-123"

export const WorkHierarchyTasks: React.FC = () => {
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [initiativeId, setInitiativeId] = useState<string>("")
  const [projectId, setProjectId] = useState<string>("")

  const [newInitiativeName, setNewInitiativeName] = useState("")
  const [newProjectName, setNewProjectName] = useState("")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState("3")
  const [newTaskDeps, setNewTaskDeps] = useState<string[]>([])

  const [depsDialogTask, setDepsDialogTask] = useState<Task | null>(null)
  const [depsDraft, setDepsDraft] = useState<string[]>([])

  const refresh = useCallback(() => {
    const s = loadWorkHierarchy(userId)
    setInitiatives(s.initiatives)
    setProjects(s.projects)
    setTasks(s.tasks)
    if (!initiativeId && s.initiatives[0]) setInitiativeId(s.initiatives[0].id)
    if (initiativeId && !s.initiatives.some((i) => i.id === initiativeId) && s.initiatives[0]) {
      setInitiativeId(s.initiatives[0].id)
    }
  }, [initiativeId])

  useEffect(() => {
    refresh()
  }, [])

  const projectsInInitiative = useMemo(
    () => projects.filter((p) => p.initiativeId === initiativeId),
    [projects, initiativeId],
  )

  useEffect(() => {
    if (!projectId || !projectsInInitiative.some((p) => p.id === projectId)) {
      const first = projectsInInitiative[0]?.id ?? ""
      setProjectId(first)
    }
  }, [initiativeId, projectsInInitiative, projectId])

  const tasksInProject = useMemo(
    () => tasks.filter((t) => t.projectId === projectId),
    [tasks, projectId],
  )

  const selectedInitiative = initiatives.find((i) => i.id === initiativeId)
  const selectedProject = projects.find((p) => p.id === projectId)

  const addInitiative = () => {
    const n = newInitiativeName.trim()
    if (!n) return
    WorkHierarchyService.addInitiative(userId, { name: n })
    setNewInitiativeName("")
    refresh()
    const s = loadWorkHierarchy(userId)
    setInitiativeId(s.initiatives[s.initiatives.length - 1]?.id ?? "")
    toast({ title: "Initiative created", description: n })
  }

  const addProject = () => {
    if (!initiativeId) {
      toast({ title: "Select an initiative first", variant: "destructive" })
      return
    }
    const n = newProjectName.trim()
    if (!n) return
    const p = WorkHierarchyService.addProject(userId, { initiativeId, name: n })
    if (!p) {
      toast({ title: "Could not create project", variant: "destructive" })
      return
    }
    setNewProjectName("")
    refresh()
    setProjectId(p.id)
    toast({ title: "Project created", description: n })
  }

  const addTask = () => {
    if (!projectId) return
    const title = newTaskTitle.trim()
    if (!title) return
    const { task, error } = WorkHierarchyService.addTask(userId, {
      projectId,
      title,
      priority: Number.parseInt(newTaskPriority, 10) || 3,
      dependsOnTaskIds: newTaskDeps,
    })
    if (!task) {
      toast({ title: "Cannot add task", description: error, variant: "destructive" })
      return
    }
    setNewTaskTitle("")
    setNewTaskDeps([])
    refresh()
    toast({ title: "Task added", description: title })
  }

  const setStatus = (taskId: string, status: TaskStatus) => {
    const res = WorkHierarchyService.updateTaskStatus(userId, taskId, status)
    if (!res.ok) {
      if (res.reason === "blocked") {
        toast({
          title: "Blocked by dependencies",
          description: "Complete prerequisite tasks first.",
          variant: "destructive",
        })
      }
      return
    }
    refresh()
  }

  const openDepsEditor = (t: Task) => {
    setDepsDialogTask(t)
    setDepsDraft([...(t.dependsOnTaskIds ?? [])])
  }

  const saveDeps = () => {
    if (!depsDialogTask) return
    const r = WorkHierarchyService.setTaskDependencies(userId, depsDialogTask.id, depsDraft)
    if (!r.ok) {
      toast({ title: "Invalid dependencies", description: r.error, variant: "destructive" })
      return
    }
    setDepsDialogTask(null)
    refresh()
    toast({ title: "Dependencies updated" })
  }

  const removeTask = (taskId: string) => {
    WorkHierarchyService.deleteTask(userId, taskId)
    refresh()
    toast({ title: "Task removed" })
  }

  const taskTitle = (id: string) => tasksInProject.find((t) => t.id === id)?.title ?? id.slice(0, 8)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayersIcon className="h-5 w-5" />
            Initiatives &amp; projects
          </CardTitle>
          <CardDescription>
            Tasks belong to projects; projects belong to initiatives. Dependencies are within a project only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Initiative</Label>
              <div className="flex gap-2">
                <Select value={initiativeId || "__none__"} onValueChange={(v) => setInitiativeId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose initiative" />
                  </SelectTrigger>
                  <SelectContent>
                    {initiatives.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No initiatives yet
                      </SelectItem>
                    ) : (
                      initiatives.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="New initiative name"
                  value={newInitiativeName}
                  onChange={(e) => setNewInitiativeName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addInitiative()}
                />
                <Button type="button" variant="secondary" onClick={addInitiative}>
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId || "__none__"} onValueChange={(v) => setProjectId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose project" />
                </SelectTrigger>
                <SelectContent>
                  {projectsInInitiative.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No projects in this initiative
                    </SelectItem>
                  ) : (
                    projectsInInitiative.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  placeholder="New project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addProject()}
                  disabled={!initiativeId}
                />
                <Button type="button" variant="secondary" onClick={addProject} disabled={!initiativeId}>
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {selectedInitiative && selectedProject && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedInitiative.name}</span>
              <span className="mx-1">→</span>
              <span className="font-medium text-foreground">{selectedProject.name}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanbanIcon className="h-5 w-5" />
            Tasks in project
          </CardTitle>
          <CardDescription>Add tasks and mark which must finish before others.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!projectId ? (
            <p className="text-sm text-muted-foreground">Create a project to add tasks.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-lg border p-4">
                <Label>New task</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Task title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    className="flex-1"
                  />
                  <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          P{n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={addTask}>
                    Add task
                  </Button>
                </div>
                {tasksInProject.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Depends on (optional)</Label>
                    <ScrollArea className="h-28 rounded border p-2">
                      <div className="space-y-2">
                        {tasksInProject.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={newTaskDeps.includes(t.id)}
                              onCheckedChange={(c) => {
                                setNewTaskDeps((prev) =>
                                  c ? [...prev, t.id] : prev.filter((x) => x !== t.id),
                                )
                              }}
                            />
                            <span className="truncate">{t.title}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              <ul className="space-y-2">
                {tasksInProject.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No tasks yet.</p>
                ) : (
                  tasksInProject.map((t) => {
                    const blocked = taskIsBlockedByDependencies(t, tasksInProject)
                    const deps = t.dependsOnTaskIds ?? []
                    return (
                      <li
                        key={t.id}
                        className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{t.title}</div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="outline">{t.status}</Badge>
                            {blocked && t.status !== "completed" && (
                              <Badge variant="secondary" className="text-amber-800 bg-amber-100">
                                Blocked
                              </Badge>
                            )}
                            {deps.length > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Link2Icon className="h-3 w-3 shrink-0" />
                                After: {deps.map((d) => taskTitle(d)).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => openDepsEditor(t)}>
                            Deps
                          </Button>
                          {t.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={blocked}
                              onClick={() => setStatus(t.id, "in-progress")}
                            >
                              <ClockIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {t.status === "in-progress" && (
                            <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "completed")}>
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {t.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "completed")}>
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => removeTask(t.id)}>
                            <Trash2Icon className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    )
                  })
                )}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!depsDialogTask} onOpenChange={(o) => !o && setDepsDialogTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task dependencies</DialogTitle>
            <DialogDescription>
              This task cannot start until selected tasks are completed. Only tasks in the same project.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-60 pr-4">
            <div className="space-y-2">
              {tasksInProject
                .filter((x) => x.id !== depsDialogTask?.id)
                .map((x) => (
                  <label key={x.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={depsDraft.includes(x.id)}
                      onCheckedChange={(c) =>
                        setDepsDraft((prev) => (c ? [...prev, x.id] : prev.filter((i) => i !== x.id)))
                      }
                    />
                    <span>{x.title}</span>
                  </label>
                ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepsDialogTask(null)}>
              Cancel
            </Button>
            <Button onClick={saveDeps}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

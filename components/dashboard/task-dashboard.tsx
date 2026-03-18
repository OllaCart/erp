"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import type { Task, TaskStatus } from "@/types/erp"
import { TaskService } from "@/lib/task-service"
import { loadWorkHierarchy, WorkHierarchyService } from "@/lib/work-hierarchy-service"
import { WorkHierarchyTasks } from "@/components/dashboard/work-hierarchy-tasks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckIcon, ClockIcon, XIcon, LayoutGridIcon, LayersIcon } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"

export const TaskDashboard: React.FC = () => {
  const [mainTab, setMainTab] = useState<"hierarchy" | "board">("hierarchy")
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksByStatus, setTasksByStatus] = useState<Record<TaskStatus, Task[]>>({
    pending: [],
    "in-progress": [],
    completed: [],
    cancelled: [],
  })
  const userId = "user-123"

  const applyGrouping = useCallback((userTasks: Task[]) => {
    setTasks(userTasks)
    const grouped = userTasks.reduce(
      (acc, task) => {
        if (!acc[task.status]) acc[task.status] = []
        acc[task.status].push(task)
        return acc
      },
      {} as Record<TaskStatus, Task[]>,
    )
    const statuses: TaskStatus[] = ["pending", "in-progress", "completed", "cancelled"]
    statuses.forEach((status) => {
      if (!grouped[status]) grouped[status] = []
    })
    setTasksByStatus(grouped)
  }, [])

  const loadBoardTasks = useCallback(async () => {
    const hierarchyTasks = loadWorkHierarchy(userId).tasks
    const adhoc = await TaskService.getUserTasks(userId)
    const hIds = new Set(hierarchyTasks.map((t) => t.id))
    const merged = [...hierarchyTasks, ...adhoc.filter((t) => !hIds.has(t.id))]
    applyGrouping(merged)
  }, [userId, applyGrouping])

  useEffect(() => {
    if (mainTab === "board") {
      void loadBoardTasks()
    }
  }, [mainTab, loadBoardTasks])

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId)

    if (task?.projectId) {
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
      const updatedTask = res.task
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)))
      setTasksByStatus((prev) => {
        const next = { ...prev }
        for (const k of Object.keys(next) as TaskStatus[]) {
          next[k] = next[k].filter((t) => t.id !== taskId)
        }
        next[status].push(updatedTask)
        return next
      })
      return
    }

    const updatedTask = await TaskService.updateTaskStatus(taskId, status)
    if (updatedTask) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)))
      setTasksByStatus((prev) => {
        const next = { ...prev }
        for (const k of Object.keys(next) as TaskStatus[]) {
          next[k] = next[k].filter((t) => t.id !== taskId)
        }
        next[status].push(updatedTask)
        return next
      })
    }
  }

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return <Badge className="bg-gray-100 text-gray-800">Low</Badge>
      case 2:
        return <Badge className="bg-blue-100 text-blue-800">Medium-Low</Badge>
      case 3:
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
      case 4:
        return <Badge className="bg-orange-100 text-orange-800">Medium-High</Badge>
      case 5:
        return <Badge className="bg-red-100 text-red-800">High</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Priority {priority}</Badge>
    }
  }

  const hierarchyBlocked = (task: Task): boolean => {
    if (!task.projectId) return false
    const projectTasks = loadWorkHierarchy(userId).tasks.filter((t) => t.projectId === task.projectId)
    const deps = task.dependsOnTaskIds ?? []
    if (deps.length === 0) return false
    const byId = new Map(projectTasks.map((t) => [t.id, t]))
    return deps.some((id) => {
      const d = byId.get(id)
      return !d || d.status !== "completed"
    })
  }

  const totalTasks = tasks.length
  const completedTasks = tasksByStatus.completed.length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "hierarchy" | "board")} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="hierarchy" className="gap-2">
            <LayersIcon className="h-4 w-4" />
            Initiatives &amp; projects
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-2">
            <LayoutGridIcon className="h-4 w-4" />
            Board
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy" className="mt-6 space-y-6">
          <WorkHierarchyTasks />
        </TabsContent>

        <TabsContent value="board" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Task board</CardTitle>
              <CardDescription>
                All tasks from initiatives &amp; projects, plus ad-hoc tasks. Refresh by switching away and back.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Completion</span>
                  <span className="text-sm font-medium">{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tasksByStatus.pending.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No pending tasks</p>
                    ) : (
                      <div className="space-y-3">
                        {tasksByStatus.pending
                          .sort((a, b) => {
                            if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime()
                            if (a.dueDate) return -1
                            if (b.dueDate) return 1
                            return b.priority - a.priority
                          })
                          .map((task) => {
                            const blocked = hierarchyBlocked(task)
                            return (
                              <div key={task.id} className="p-3 border rounded-md">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium">{task.title}</div>
                                    {task.description && (
                                      <div className="text-sm text-muted-foreground">{task.description}</div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      {getPriorityBadge(task.priority)}
                                      {task.projectId && (
                                        <Badge variant="secondary" className="text-xs">
                                          Project
                                        </Badge>
                                      )}
                                      {blocked && (
                                        <Badge className="text-xs bg-amber-100 text-amber-900">Blocked</Badge>
                                      )}
                                      {task.dueDate && (
                                        <span className="text-xs text-muted-foreground">
                                          Due: {task.dueDate.toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-1 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0"
                                      disabled={blocked}
                                      onClick={() => updateTaskStatus(task.id, "in-progress")}
                                    >
                                      <ClockIcon className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0"
                                      disabled={blocked}
                                      onClick={() => updateTaskStatus(task.id, "completed")}
                                    >
                                      <CheckIcon className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">In progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tasksByStatus["in-progress"].length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No tasks in progress</p>
                    ) : (
                      <div className="space-y-3">
                        {tasksByStatus["in-progress"]
                          .sort((a, b) => {
                            if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime()
                            if (a.dueDate) return -1
                            if (b.dueDate) return 1
                            return b.priority - a.priority
                          })
                          .map((task) => (
                            <div key={task.id} className="p-3 border rounded-md">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{task.title}</div>
                                  {task.description && (
                                    <div className="text-sm text-muted-foreground">{task.description}</div>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    {getPriorityBadge(task.priority)}
                                    {task.projectId && (
                                      <Badge variant="secondary" className="text-xs">
                                        Project
                                      </Badge>
                                    )}
                                    {task.dueDate && (
                                      <span className="text-xs text-muted-foreground">
                                        Due: {task.dueDate.toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex space-x-1 shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => updateTaskStatus(task.id, "completed")}
                                  >
                                    <CheckIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => updateTaskStatus(task.id, "cancelled")}
                                  >
                                    <XIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

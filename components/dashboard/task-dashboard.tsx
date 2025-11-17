"use client"

import type React from "react"
import { useEffect, useState } from "react"
import type { Task, TaskStatus } from "@/types/erp"
import { TaskService } from "@/lib/task-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckIcon, ClockIcon, XIcon } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export const TaskDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksByStatus, setTasksByStatus] = useState<Record<TaskStatus, Task[]>>({
    pending: [],
    "in-progress": [],
    completed: [],
    cancelled: [],
  })
  const userId = "user-123" // In a real app, get from auth

  useEffect(() => {
    const fetchTasks = async () => {
      const userTasks = await TaskService.getUserTasks(userId)
      setTasks(userTasks)

      // Group tasks by status
      const grouped = userTasks.reduce(
        (acc, task) => {
          if (!acc[task.status]) {
            acc[task.status] = []
          }
          acc[task.status].push(task)
          return acc
        },
        {} as Record<TaskStatus, Task[]>,
      )

      // Ensure all statuses exist
      const statuses: TaskStatus[] = ["pending", "in-progress", "completed", "cancelled"]
      statuses.forEach((status) => {
        if (!grouped[status]) {
          grouped[status] = []
        }
      })

      setTasksByStatus(grouped)
    }

    fetchTasks()
  }, [userId])

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const updatedTask = await TaskService.updateTaskStatus(taskId, status)

    if (updatedTask) {
      // Update local state
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updatedTask : task)))

      // Update grouped tasks
      setTasksByStatus((prev) => {
        const newGrouped = { ...prev }

        // Remove from old status group
        Object.keys(newGrouped).forEach((key) => {
          newGrouped[key as TaskStatus] = newGrouped[key as TaskStatus].filter((task) => task.id !== taskId)
        })

        // Add to new status group
        newGrouped[status].push(updatedTask)

        return newGrouped
      })
    }
  }

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending
          </Badge>
        )
      case "in-progress":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            In Progress
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Completed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            Cancelled
          </Badge>
        )
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

  // Calculate completion percentage
  const totalTasks = tasks.length
  const completedTasks = tasksByStatus.completed.length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Task Management</CardTitle>
          <CardDescription>Track and manage your tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Task Completion</span>
              <span className="text-sm font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Pending Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {tasksByStatus.pending.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No pending tasks</p>
                ) : (
                  <div className="space-y-3">
                    {tasksByStatus.pending
                      .sort((a, b) => {
                        // Sort by due date (if available), then by priority
                        if (a.dueDate && b.dueDate) {
                          return a.dueDate.getTime() - b.dueDate.getTime()
                        }
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
                              <div className="flex items-center mt-2 space-x-2">
                                {getPriorityBadge(task.priority)}
                                {task.dueDate && (
                                  <span className="text-xs text-muted-foreground">
                                    Due: {task.dueDate.toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => updateTaskStatus(task.id, "in-progress")}
                              >
                                <ClockIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => updateTaskStatus(task.id, "completed")}
                              >
                                <CheckIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {tasksByStatus["in-progress"].length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No tasks in progress</p>
                ) : (
                  <div className="space-y-3">
                    {tasksByStatus["in-progress"]
                      .sort((a, b) => {
                        if (a.dueDate && b.dueDate) {
                          return a.dueDate.getTime() - b.dueDate.getTime()
                        }
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
                              <div className="flex items-center mt-2 space-x-2">
                                {getPriorityBadge(task.priority)}
                                {task.dueDate && (
                                  <span className="text-xs text-muted-foreground">
                                    Due: {task.dueDate.toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-1">
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
    </div>
  )
}

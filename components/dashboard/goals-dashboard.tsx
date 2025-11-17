"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  PlusIcon,
  TargetIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  TrashIcon,
  SparklesIcon,
  PlayIcon,
  PauseIcon,
} from "lucide-react"
import {
  generateTasksForGoal,
  calculateGoalProgress,
  getNextPriorityTasks,
  type Goal,
  type GoalTask,
} from "@/lib/ai-goal-service"

export const GoalsDashboard: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [isCreatingGoal, setIsCreatingGoal] = useState(false)
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    timeline: "",
    skillLevel: "intermediate" as "beginner" | "intermediate" | "advanced",
    availableHoursPerWeek: 10,
  })

  // Load goals from localStorage on mount
  useEffect(() => {
    const savedGoals = localStorage.getItem("personal-erp-goals")
    if (savedGoals) {
      const parsedGoals = JSON.parse(savedGoals).map((goal: any) => ({
        ...goal,
        startDate: new Date(goal.startDate),
        endDate: new Date(goal.endDate),
        tasks: goal.tasks.map((task: any) => ({
          ...task,
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        })),
      }))
      setGoals(parsedGoals)
    }
  }, [])

  // Save goals to localStorage whenever goals change
  useEffect(() => {
    if (goals.length > 0) {
      localStorage.setItem("personal-erp-goals", JSON.stringify(goals))
    }
  }, [goals])

  const handleCreateGoal = async () => {
    if (!newGoal.title || !newGoal.description || !newGoal.timeline) return

    setIsGeneratingTasks(true)

    try {
      const tasks = await generateTasksForGoal(
        newGoal.title,
        newGoal.description,
        newGoal.timeline,
        newGoal.skillLevel,
        newGoal.availableHoursPerWeek,
      )

      const goal: Goal = {
        id: `goal-${Date.now()}`,
        title: newGoal.title,
        description: newGoal.description,
        timeline: newGoal.timeline,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        tasks,
        progress: 0,
        status: "planning",
        skillLevel: newGoal.skillLevel,
        availableHoursPerWeek: newGoal.availableHoursPerWeek,
      }

      setGoals((prev) => [...prev, goal])
      setSelectedGoal(goal)
      setIsCreatingGoal(false)
      setNewGoal({
        title: "",
        description: "",
        timeline: "",
        skillLevel: "intermediate",
        availableHoursPerWeek: 10,
      })
    } catch (error) {
      console.error("Error creating goal:", error)
    } finally {
      setIsGeneratingTasks(false)
    }
  }

  const toggleTaskCompletion = (goalId: string, taskId: string) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id === goalId) {
          const updatedTasks = goal.tasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task,
          )
          const updatedGoal = {
            ...goal,
            tasks: updatedTasks,
            progress: calculateGoalProgress(updatedTasks),
          }
          if (selectedGoal?.id === goalId) {
            setSelectedGoal(updatedGoal)
          }
          return updatedGoal
        }
        return goal
      }),
    )
  }

  const addCustomTask = (goalId: string, taskTitle: string, taskDescription: string) => {
    const newTask: GoalTask = {
      id: `task-${Date.now()}`,
      title: taskTitle,
      description: taskDescription,
      priority: "medium",
      estimatedHours: 1,
      category: "Custom",
      completed: false,
    }

    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id === goalId) {
          const updatedTasks = [...goal.tasks, newTask]
          const updatedGoal = {
            ...goal,
            tasks: updatedTasks,
            progress: calculateGoalProgress(updatedTasks),
          }
          if (selectedGoal?.id === goalId) {
            setSelectedGoal(updatedGoal)
          }
          return updatedGoal
        }
        return goal
      }),
    )
  }

  const deleteTask = (goalId: string, taskId: string) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id === goalId) {
          const updatedTasks = goal.tasks.filter((task) => task.id !== taskId)
          const updatedGoal = {
            ...goal,
            tasks: updatedTasks,
            progress: calculateGoalProgress(updatedTasks),
          }
          if (selectedGoal?.id === goalId) {
            setSelectedGoal(updatedGoal)
          }
          return updatedGoal
        }
        return goal
      }),
    )
  }

  const updateGoalStatus = (goalId: string, status: Goal["status"]) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id === goalId) {
          const updatedGoal = { ...goal, status }
          if (selectedGoal?.id === goalId) {
            setSelectedGoal(updatedGoal)
          }
          return updatedGoal
        }
        return goal
      }),
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "paused":
        return "bg-orange-100 text-orange-800"
      case "planning":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <TargetIcon className="h-5 w-5 mr-2" />
                Goals & AI Task Generation
              </CardTitle>
              <CardDescription>Set goals and let AI generate actionable task lists</CardDescription>
            </div>
            <Dialog open={isCreatingGoal} onOpenChange={setIsCreatingGoal}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Goal</DialogTitle>
                  <DialogDescription>
                    Describe your goal and AI will generate a comprehensive task list
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="goalTitle">Goal Title</Label>
                    <Input
                      id="goalTitle"
                      value={newGoal.title}
                      onChange={(e) => setNewGoal((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Learn Spanish, Start a Business, Get Fit"
                    />
                  </div>
                  <div>
                    <Label htmlFor="goalDescription">Goal Description</Label>
                    <Textarea
                      id="goalDescription"
                      value={newGoal.description}
                      onChange={(e) => setNewGoal((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your goal in detail..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeline">Timeline</Label>
                    <Input
                      id="timeline"
                      value={newGoal.timeline}
                      onChange={(e) => setNewGoal((prev) => ({ ...prev, timeline: e.target.value }))}
                      placeholder="e.g., 3 months, 6 weeks, 1 year"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="skillLevel">Current Skill Level</Label>
                      <Select
                        value={newGoal.skillLevel}
                        onValueChange={(value: "beginner" | "intermediate" | "advanced") =>
                          setNewGoal((prev) => ({ ...prev, skillLevel: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="availableHours">Hours per Week</Label>
                      <Input
                        id="availableHours"
                        type="number"
                        value={newGoal.availableHoursPerWeek}
                        onChange={(e) =>
                          setNewGoal((prev) => ({
                            ...prev,
                            availableHoursPerWeek: Number.parseInt(e.target.value) || 10,
                          }))
                        }
                        min="1"
                        max="40"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreatingGoal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateGoal} disabled={isGeneratingTasks}>
                      {isGeneratingTasks ? (
                        <>
                          <SparklesIcon className="h-4 w-4 mr-2 animate-spin" />
                          Generating Tasks...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-4 w-4 mr-2" />
                          Create Goal
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {goals.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <TargetIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No goals yet</h3>
                <p className="text-muted-foreground mb-4">Create your first goal and let AI generate a task list</p>
                <Button onClick={() => setIsCreatingGoal(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Your First Goal
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="flex-shrink-0">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Goal Details</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 overflow-auto">
                <div className="grid gap-4">
                  {goals.map((goal) => (
                    <Card
                      key={goal.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedGoal(goal)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">{goal.title}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(goal.status)}>{goal.status}</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                updateGoalStatus(goal.id, goal.status === "active" ? "paused" : "active")
                              }}
                            >
                              {goal.status === "active" ? (
                                <PauseIcon className="h-4 w-4" />
                              ) : (
                                <PlayIcon className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3">{goal.description}</p>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Progress</span>
                          <span className="text-sm font-medium">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="mb-3" />
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {goal.timeline}
                          </div>
                          <div className="flex items-center">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            {goal.tasks.filter((t) => t.completed).length} / {goal.tasks.length} tasks
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="details" className="flex-1 overflow-hidden">
                {selectedGoal ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-shrink-0 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-bold">{selectedGoal.title}</h2>
                        <Badge className={getStatusColor(selectedGoal.status)}>{selectedGoal.status}</Badge>
                      </div>
                      <p className="text-muted-foreground mb-4">{selectedGoal.description}</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Overall Progress</span>
                        <span className="text-sm font-medium">{selectedGoal.progress}%</span>
                      </div>
                      <Progress value={selectedGoal.progress} className="mb-4" />
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <Tabs defaultValue="tasks" className="h-full flex flex-col">
                        <TabsList className="flex-shrink-0">
                          <TabsTrigger value="tasks">All Tasks</TabsTrigger>
                          <TabsTrigger value="priority">Priority Tasks</TabsTrigger>
                        </TabsList>

                        <TabsContent value="tasks" className="flex-1 overflow-auto">
                          <ScrollArea className="h-full">
                            <div className="space-y-2">
                              {selectedGoal.tasks.map((task) => (
                                <Card key={task.id}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start space-x-3">
                                      <Checkbox
                                        checked={task.completed}
                                        onCheckedChange={() => toggleTaskCompletion(selectedGoal.id, task.id)}
                                        className="mt-1"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                          <h4
                                            className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}
                                          >
                                            {task.title}
                                          </h4>
                                          <div className="flex items-center space-x-2">
                                            <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => deleteTask(selectedGoal.id, task.id)}
                                            >
                                              <TrashIcon className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                        <p
                                          className={`text-sm text-muted-foreground mb-2 ${task.completed ? "line-through" : ""}`}
                                        >
                                          {task.description}
                                        </p>
                                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                          <div className="flex items-center">
                                            <ClockIcon className="h-3 w-3 mr-1" />
                                            {task.estimatedHours}h
                                          </div>
                                          <Badge variant="outline" className="text-xs">
                                            {task.category}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </ScrollArea>
                        </TabsContent>

                        <TabsContent value="priority" className="flex-1 overflow-auto">
                          <div className="space-y-2">
                            {getNextPriorityTasks(selectedGoal.tasks, 5).map((task) => (
                              <Card key={task.id} className="border-l-4 border-l-blue-500">
                                <CardContent className="p-4">
                                  <div className="flex items-start space-x-3">
                                    <Checkbox
                                      checked={task.completed}
                                      onCheckedChange={() => toggleTaskCompletion(selectedGoal.id, task.id)}
                                      className="mt-1"
                                    />
                                    <div className="flex-1">
                                      <h4 className="font-medium mb-1">{task.title}</h4>
                                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                        <Badge className={getPriorityColor(task.priority)}>
                                          {task.priority} priority
                                        </Badge>
                                        <div className="flex items-center">
                                          <ClockIcon className="h-3 w-3 mr-1" />
                                          {task.estimatedHours}h estimated
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <TargetIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Select a goal</h3>
                      <p className="text-muted-foreground">
                        Choose a goal from the overview to see its details and tasks
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

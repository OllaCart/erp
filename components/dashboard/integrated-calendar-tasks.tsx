"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { format, addDays, startOfDay, endOfDay, isSameDay } from "date-fns"
import { CalendarService } from "@/lib/calendar-service"
import { TaskService } from "@/lib/task-service"
import type { CalendarEvent, Task, TaskStatus } from "@/types/erp"
import {
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FilterIcon,
} from "lucide-react"

export const IntegratedCalendarTasks: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [eventsForDate, setEventsForDate] = useState<CalendarEvent[]>([])
  const [tasksForDate, setTasksForDate] = useState<Task[]>([])
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("day")
  const [taskView, setTaskView] = useState<"all" | "today" | "upcoming" | "completed">("today")
  const [taskFilter, setTaskFilter] = useState<TaskStatus | "all">("all")
  const [taskSortBy, setTaskSortBy] = useState<"priority" | "dueDate">("priority")
  const [taskSortOrder, setTaskSortOrder] = useState<"asc" | "desc">("desc")
  const [showTaskDetails, setShowTaskDetails] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const userId = "user-123" // In a real app, get from auth

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all events
      const userEvents = await CalendarService.getUserEvents(userId)
      setEvents(userEvents)

      // Fetch all tasks
      const userTasks = await TaskService.getUserTasks(userId)
      setTasks(userTasks)

      // Update events and tasks for selected date
      updateEventsAndTasksForDate(selectedDate, userEvents, userTasks)
    }

    fetchData()
  }, [userId, selectedDate])

  const updateEventsAndTasksForDate = (date: Date, eventsList: CalendarEvent[] = events, tasksList: Task[] = tasks) => {
    const startOfSelectedDay = startOfDay(date)
    const endOfSelectedDay = endOfDay(date)

    // Filter events for the selected date
    const filteredEvents = eventsList.filter(
      (event) => event.startDate >= startOfSelectedDay && event.startDate <= endOfSelectedDay,
    )
    setEventsForDate(filteredEvents)

    // Filter tasks based on the view
    let filteredTasks: Task[] = []

    if (taskView === "today") {
      // Tasks due today
      filteredTasks = tasksList.filter((task) => task.dueDate && isSameDay(new Date(task.dueDate), date))
    } else if (taskView === "upcoming") {
      // Tasks due in the future
      filteredTasks = tasksList.filter((task) => task.dueDate && new Date(task.dueDate) >= startOfSelectedDay)
    } else if (taskView === "completed") {
      // Completed tasks
      filteredTasks = tasksList.filter((task) => task.status === "completed")
    } else {
      // All tasks
      filteredTasks = [...tasksList]
    }

    // Apply status filter if not "all"
    if (taskFilter !== "all") {
      filteredTasks = filteredTasks.filter((task) => task.status === taskFilter)
    }

    // Sort tasks
    filteredTasks.sort((a, b) => {
      if (taskSortBy === "priority") {
        return taskSortOrder === "desc" ? b.priority - a.priority : a.priority - b.priority
      } else {
        // Sort by due date
        if (!a.dueDate) return taskSortOrder === "desc" ? 1 : -1
        if (!b.dueDate) return taskSortOrder === "desc" ? -1 : 1
        return taskSortOrder === "desc"
          ? new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
          : new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
    })

    setTasksForDate(filteredTasks)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      updateEventsAndTasksForDate(date)
    }
  }

  const handlePrevDay = () => {
    const prevDay = addDays(selectedDate, -1)
    setSelectedDate(prevDay)
    updateEventsAndTasksForDate(prevDay)
  }

  const handleNextDay = () => {
    const nextDay = addDays(selectedDate, 1)
    setSelectedDate(nextDay)
    updateEventsAndTasksForDate(nextDay)
  }

  const handleTaskViewChange = (view: "all" | "today" | "upcoming" | "completed") => {
    setTaskView(view)
    updateEventsAndTasksForDate(selectedDate, events, tasks)
  }

  const handleTaskFilterChange = (filter: TaskStatus | "all") => {
    setTaskFilter(filter)
    updateEventsAndTasksForDate(selectedDate, events, tasks)
  }

  const handleTaskSortChange = (sortBy: "priority" | "dueDate") => {
    if (sortBy === taskSortBy) {
      // Toggle sort order if clicking the same sort option
      setTaskSortOrder(taskSortOrder === "asc" ? "desc" : "asc")
    } else {
      setTaskSortBy(sortBy)
      // Default to descending for priority, ascending for due date
      setTaskSortOrder(sortBy === "priority" ? "desc" : "asc")
    }
    updateEventsAndTasksForDate(selectedDate, events, tasks)
  }

  const handleAddQuickTask = async () => {
    if (!newTaskTitle.trim()) return

    try {
      const newTask = await TaskService.addTask({
        userId,
        title: newTaskTitle,
        description: "",
        status: "pending",
        priority: 3,
        dueDate: selectedDate,
        tags: [],
      })

      // Update local state
      const updatedTasks = [...tasks, newTask]
      setTasks(updatedTasks)
      setNewTaskTitle("")
      updateEventsAndTasksForDate(selectedDate, events, updatedTasks)
    } catch (error) {
      console.error("Error adding task:", error)
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const updatedTask = await TaskService.updateTaskStatus(taskId, status)

      if (updatedTask) {
        // Update local state
        const updatedTasks = tasks.map((task) => (task.id === taskId ? updatedTask : task))
        setTasks(updatedTasks)
        updateEventsAndTasksForDate(selectedDate, events, updatedTasks)
      }
    } catch (error) {
      console.error("Error updating task status:", error)
    }
  }

  // Function to check if a date has events
  const hasEventsOnDate = (date: Date) => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return events.some((event) => event.startDate >= startOfDay && event.startDate <= endOfDay)
  }

  // Function to check if a date has tasks
  const hasTasksOnDate = (date: Date) => {
    return tasks.some((task) => task.dueDate && isSameDay(new Date(task.dueDate), date))
  }

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case "meeting":
        return <Badge className="bg-blue-100 text-blue-800">Meeting</Badge>
      case "reminder":
        return <Badge className="bg-yellow-100 text-yellow-800">Reminder</Badge>
      case "deadline":
        return <Badge className="bg-red-100 text-red-800">Deadline</Badge>
      case "personal":
        return <Badge className="bg-green-100 text-green-800">Personal</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Other</Badge>
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

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
      {/* Calendar Section */}
      <Card className="lg:col-span-2 flex flex-col overflow-hidden">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex justify-between items-center">
            <CardTitle>Calendar</CardTitle>
            <div className="flex space-x-2">
              <Select value={calendarView} onValueChange={(value: "day" | "week" | "month") => setCalendarView(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handlePrevDay}>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextDay}>
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            {calendarView === "day"
              ? format(selectedDate, "MMMM d, yyyy")
              : calendarView === "week"
                ? `Week of ${format(selectedDate, "MMMM d, yyyy")}`
                : format(selectedDate, "MMMM yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <div className="mb-4 flex-shrink-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-md border"
              modifiers={{
                hasEvent: (date) => hasEventsOnDate(date),
                hasTask: (date) => hasTasksOnDate(date),
              }}
              modifiersClassNames={{
                hasEvent: "bg-primary/10 font-bold",
                hasTask: "border-2 border-primary/30",
              }}
            />
          </div>

          <div className="flex-1 overflow-auto">
            <h3 className="font-medium mb-2">{calendarView === "day" ? "Schedule" : "Upcoming Events"}</h3>

            {eventsForDate.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No events scheduled for {format(selectedDate, "MMMM d")}
              </p>
            ) : (
              <div className="space-y-3">
                {eventsForDate
                  .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
                  .map((event) => (
                    <div key={event.id} className="p-3 border rounded-md">
                      <div className="font-medium">{event.title}</div>
                      {event.description && <div className="text-sm text-muted-foreground">{event.description}</div>}
                      <div className="flex items-center mt-2 space-x-2">{getEventTypeBadge(event.type)}</div>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <ClockIcon className="h-4 w-4 mr-2" />
                          {format(event.startDate, "h:mm a")}
                          {event.endDate && ` - ${format(event.endDate, "h:mm a")}`}
                        </div>
                        {event.location && (
                          <div className="flex items-center text-muted-foreground">
                            <MapPinIcon className="h-4 w-4 mr-2" />
                            {event.location}
                          </div>
                        )}
                        {event.participants && event.participants.length > 0 && (
                          <div className="flex items-center text-muted-foreground">
                            <UsersIcon className="h-4 w-4 mr-2" />
                            {event.participants.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tasks Section */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex justify-between items-center">
            <CardTitle>Tasks</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowTaskDetails(!showTaskDetails)}>
              {showTaskDetails ? "Minimize" : "Expand"}
            </Button>
          </div>
          <CardDescription>Manage your to-do list</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <div className="mb-4 flex-shrink-0">
            <div className="flex items-center space-x-2 mb-2">
              <Input
                placeholder="Add a quick task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddQuickTask} disabled={!newTaskTitle.trim()}>
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center mb-4">
              <Tabs defaultValue="today" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="today" onClick={() => handleTaskViewChange("today")}>
                    Today
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" onClick={() => handleTaskViewChange("upcoming")}>
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger value="completed" onClick={() => handleTaskViewChange("completed")}>
                    Done
                  </TabsTrigger>
                  <TabsTrigger value="all" onClick={() => handleTaskViewChange("all")}>
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => handleTaskSortChange("priority")}
                >
                  Priority
                  {taskSortBy === "priority" &&
                    (taskSortOrder === "desc" ? (
                      <ArrowDownIcon className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowUpIcon className="ml-1 h-3 w-3" />
                    ))}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => handleTaskSortChange("dueDate")}
                >
                  Due Date
                  {taskSortBy === "dueDate" &&
                    (taskSortOrder === "desc" ? (
                      <ArrowDownIcon className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowUpIcon className="ml-1 h-3 w-3" />
                    ))}
                </Button>
              </div>

              <Select value={taskFilter} onValueChange={(value: TaskStatus | "all") => handleTaskFilterChange(value)}>
                <SelectTrigger className="w-[130px] h-7 text-xs">
                  <FilterIcon className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {tasksForDate.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No tasks found. Add a task to get started.</p>
            ) : (
              <div className="space-y-3">
                {tasksForDate.map((task) => (
                  <div key={task.id} className="p-3 border rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id={`task-${task.id}`}
                          checked={task.status === "completed"}
                          onCheckedChange={(checked) => {
                            handleUpdateTaskStatus(task.id, checked ? "completed" : "pending")
                          }}
                          className="mt-1"
                        />
                        <div>
                          <label
                            htmlFor={`task-${task.id}`}
                            className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                          >
                            {task.title}
                          </label>

                          {showTaskDetails && (
                            <>
                              {task.description && (
                                <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                              )}
                              <div className="flex items-center mt-2 space-x-2">
                                {getPriorityBadge(task.priority)}
                                {getStatusBadge(task.status)}
                              </div>
                              {task.dueDate && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {showTaskDetails && task.status !== "completed" && task.status !== "cancelled" && (
                        <div className="flex space-x-1">
                          {task.status !== "in-progress" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => handleUpdateTaskStatus(task.id, "in-progress")}
                            >
                              <ClockIcon className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                          >
                            <CheckIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => handleUpdateTaskStatus(task.id, "cancelled")}
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

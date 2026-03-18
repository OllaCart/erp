import type { Task, TaskStatus } from "@/types/erp"
import { v4 as uuidv4 } from "uuid"

// In-memory storage for demo purposes
const tasks: Task[] = []

export const TaskService = {
  // Add a new task
  addTask: async (task: Omit<Task, "id">): Promise<Task> => {
    const newTask: Task = {
      id: uuidv4(),
      ...task,
      dependsOnTaskIds: task.dependsOnTaskIds ?? [],
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      completedDate: task.completedDate ? new Date(task.completedDate) : undefined,
    }

    tasks.push(newTask)
    return newTask
  },

  // Get all tasks for a user
  getUserTasks: async (userId: string): Promise<Task[]> => {
    return tasks.filter((t) => t.userId === userId)
  },

  // Get tasks by status
  getTasksByStatus: async (userId: string, status: TaskStatus): Promise<Task[]> => {
    return tasks.filter((t) => t.userId === userId && t.status === status)
  },

  // Get tasks by priority
  getTasksByPriority: async (userId: string, priority: number): Promise<Task[]> => {
    return tasks.filter((t) => t.userId === userId && t.priority === priority)
  },

  // Get tasks due today
  getTasksDueToday: async (userId: string): Promise<Task[]> => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return tasks.filter((t) => t.userId === userId && t.dueDate && t.dueDate >= today && t.dueDate < tomorrow)
  },

  // Update task status
  updateTaskStatus: async (taskId: string, status: TaskStatus): Promise<Task | null> => {
    const index = tasks.findIndex((t) => t.id === taskId)

    if (index === -1) return null

    const updatedTask = { ...tasks[index], status }

    if (status === "completed" && !updatedTask.completedDate) {
      updatedTask.completedDate = new Date()
    }

    tasks[index] = updatedTask
    return updatedTask
  },
}

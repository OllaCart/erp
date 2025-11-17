import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export interface GoalTask {
  id: string
  title: string
  description: string
  priority: "low" | "medium" | "high"
  estimatedHours: number
  category: string
  completed: boolean
  dueDate?: Date
  dependencies?: string[]
}

export interface Goal {
  id: string
  title: string
  description: string
  timeline: string
  startDate: Date
  endDate: Date
  tasks: GoalTask[]
  progress: number
  status: "planning" | "active" | "completed" | "paused"
  skillLevel: "beginner" | "intermediate" | "advanced"
  availableHoursPerWeek: number
}

export async function generateTasksForGoal(
  goalTitle: string,
  goalDescription: string,
  timeline: string,
  skillLevel: "beginner" | "intermediate" | "advanced" = "intermediate",
  availableHoursPerWeek = 10,
): Promise<GoalTask[]> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: `You are an expert goal achievement coach. Generate a comprehensive, actionable task list to help someone achieve their goal. 

Rules:
- Break down the goal into specific, measurable tasks
- Consider the user's skill level and available time
- Assign realistic priorities (high, medium, low)
- Estimate hours needed for each task
- Categorize tasks logically
- Include both learning and doing tasks
- Make tasks specific and actionable
- Order tasks logically with dependencies in mind

Return ONLY a valid JSON array of tasks with this exact structure:
[
  {
    "title": "Task title",
    "description": "Detailed description of what to do",
    "priority": "high|medium|low",
    "estimatedHours": number,
    "category": "category name"
  }
]`,
      prompt: `Goal: ${goalTitle}
Description: ${goalDescription}
Timeline: ${timeline}
Skill Level: ${skillLevel}
Available Hours Per Week: ${availableHoursPerWeek}

Generate a comprehensive task list to achieve this goal.`,
    })

    // Parse the AI response
    const cleanedText = text.trim().replace(/```json\n?|\n?```/g, "")
    const tasksData = JSON.parse(cleanedText)

    // Convert to our task format
    const tasks: GoalTask[] = tasksData.map((task: any, index: number) => ({
      id: `task-${Date.now()}-${index}`,
      title: task.title,
      description: task.description,
      priority: task.priority,
      estimatedHours: task.estimatedHours,
      category: task.category,
      completed: false,
      dependencies: task.dependencies || [],
    }))

    return tasks
  } catch (error) {
    console.error("Error generating tasks:", error)
    // Return fallback tasks
    return [
      {
        id: `task-${Date.now()}-1`,
        title: "Define specific objectives",
        description: "Break down your goal into specific, measurable objectives",
        priority: "high",
        estimatedHours: 2,
        category: "Planning",
        completed: false,
      },
      {
        id: `task-${Date.now()}-2`,
        title: "Research and gather resources",
        description: "Find and collect all necessary resources, tools, and information",
        priority: "high",
        estimatedHours: 4,
        category: "Research",
        completed: false,
      },
      {
        id: `task-${Date.now()}-3`,
        title: "Create action plan",
        description: "Develop a detailed step-by-step action plan",
        priority: "medium",
        estimatedHours: 3,
        category: "Planning",
        completed: false,
      },
    ]
  }
}

export function calculateGoalProgress(tasks: GoalTask[]): number {
  if (tasks.length === 0) return 0
  const completedTasks = tasks.filter((task) => task.completed).length
  return Math.round((completedTasks / tasks.length) * 100)
}

export function getNextPriorityTasks(tasks: GoalTask[], limit = 3): GoalTask[] {
  return tasks
    .filter((task) => !task.completed)
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    .slice(0, limit)
}

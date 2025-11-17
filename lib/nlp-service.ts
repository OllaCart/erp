import type { MessageIntent } from "@/types/erp"

// This is a simplified mock implementation
// In a real app, you would use OpenAI or another NLP service
export const NLPService = {
  // Parse user message to detect intent
  parseIntent: async (message: string): Promise<MessageIntent> => {
    const lowerMessage = message.toLowerCase()

    // Basic pattern matching for demo purposes
    if (lowerMessage.includes("log") || lowerMessage.includes("add") || lowerMessage.includes("record")) {
      if (lowerMessage.includes("expense") || lowerMessage.includes("spent") || lowerMessage.includes("paid")) {
        return {
          type: "command",
          action: "log",
          entity: "transaction",
          parameters: extractExpenseParameters(message),
        }
      }

      if (lowerMessage.includes("income") || lowerMessage.includes("earned") || lowerMessage.includes("received")) {
        return {
          type: "command",
          action: "log",
          entity: "transaction",
          parameters: extractIncomeParameters(message),
        }
      }

      if (lowerMessage.includes("task") || lowerMessage.includes("todo")) {
        return {
          type: "command",
          action: "log",
          entity: "task",
          parameters: extractTaskParameters(message),
        }
      }
    }

    if (lowerMessage.includes("schedule") || lowerMessage.includes("meeting") || lowerMessage.includes("appointment")) {
      return {
        type: "command",
        action: "schedule",
        entity: "event",
        parameters: extractEventParameters(message),
      }
    }

    if (lowerMessage.includes("remind") || lowerMessage.includes("reminder")) {
      return {
        type: "command",
        action: "remind",
        entity: "event",
        parameters: extractReminderParameters(message),
      }
    }

    if (lowerMessage.includes("show") || lowerMessage.includes("view") || lowerMessage.includes("get")) {
      if (lowerMessage.includes("expense") || lowerMessage.includes("spending")) {
        return {
          type: "query",
          action: "view",
          entity: "transaction",
          parameters: { type: "expense" },
        }
      }

      if (lowerMessage.includes("income") || lowerMessage.includes("earnings")) {
        return {
          type: "query",
          action: "view",
          entity: "transaction",
          parameters: { type: "income" },
        }
      }

      if (lowerMessage.includes("task") || lowerMessage.includes("todo")) {
        return {
          type: "query",
          action: "view",
          entity: "task",
        }
      }

      if (lowerMessage.includes("schedule") || lowerMessage.includes("calendar") || lowerMessage.includes("event")) {
        return {
          type: "query",
          action: "view",
          entity: "event",
        }
      }
    }

    // Default to conversation
    return {
      type: "conversation",
    }
  },
}

// Helper functions to extract parameters from messages
function extractExpenseParameters(message: string): Record<string, any> {
  const amountMatch = message.match(/\$(\d+(\.\d+)?)/)
  const amount = amountMatch ? Number.parseFloat(amountMatch[1]) : 0

  const categoryMatches = [
    { pattern: /groceries|food|supermarket/i, category: "Groceries" },
    { pattern: /rent|mortgage|housing/i, category: "Housing" },
    { pattern: /transport|gas|uber|lyft|taxi/i, category: "Transportation" },
    { pattern: /utilities|electric|water|internet|phone/i, category: "Utilities" },
    { pattern: /entertainment|movie|dining|restaurant/i, category: "Entertainment" },
  ]

  let category = "Other"
  for (const match of categoryMatches) {
    if (match.pattern.test(message)) {
      category = match.category
      break
    }
  }

  return {
    amount,
    type: "expense",
    category,
    description: message,
  }
}

function extractIncomeParameters(message: string): Record<string, any> {
  const amountMatch = message.match(/\$(\d+(\.\d+)?)/)
  const amount = amountMatch ? Number.parseFloat(amountMatch[1]) : 0

  const categoryMatches = [
    { pattern: /salary|paycheck|wage/i, category: "Salary" },
    { pattern: /freelance|contract/i, category: "Freelance" },
    { pattern: /gift|present/i, category: "Gift" },
    { pattern: /investment|dividend|interest/i, category: "Investment" },
  ]

  let category = "Other Income"
  for (const match of categoryMatches) {
    if (match.pattern.test(message)) {
      category = match.category
      break
    }
  }

  return {
    amount,
    type: "income",
    category,
    description: message,
  }
}

function extractTaskParameters(message: string): Record<string, any> {
  const priorityMatch = message.match(/priority\s*(\d)/i)
  const priority = priorityMatch ? Number.parseInt(priorityMatch[1], 10) : 3

  const dueDateMatch = message.match(/due\s*(today|tomorrow|on\s*([a-zA-Z]+\s*\d+))/i)
  let dueDate: Date | undefined

  if (dueDateMatch) {
    if (dueDateMatch[1].toLowerCase() === "today") {
      dueDate = new Date()
    } else if (dueDateMatch[1].toLowerCase() === "tomorrow") {
      dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 1)
    }
    // More complex date parsing would be done here in a real app
  }

  return {
    title: message
      .replace(/log|add|task|todo|priority\s*\d|due\s*(today|tomorrow|on\s*([a-zA-Z]+\s*\d+))/gi, "")
      .trim(),
    priority,
    dueDate,
    status: "pending",
  }
}

function extractEventParameters(message: string): Record<string, any> {
  const timeMatch = message.match(/at\s*(\d+)(?::(\d+))?\s*(am|pm)?/i)
  let startDate: Date | undefined

  if (timeMatch) {
    startDate = new Date()
    let hours = Number.parseInt(timeMatch[1], 10)
    const minutes = timeMatch[2] ? Number.parseInt(timeMatch[2], 10) : 0
    const period = timeMatch[3]?.toLowerCase()

    if (period === "pm" && hours < 12) {
      hours += 12
    } else if (period === "am" && hours === 12) {
      hours = 0
    }

    startDate.setHours(hours, minutes, 0, 0)
  }

  const dateMatch = message.match(/on\s*(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
  if (dateMatch && startDate) {
    const day = dateMatch[1].toLowerCase()

    if (day === "today") {
      // Already set to today
    } else if (day === "tomorrow") {
      startDate.setDate(startDate.getDate() + 1)
    } else {
      // Handle days of the week
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
      const targetDay = daysOfWeek.indexOf(day)
      const currentDay = startDate.getDay()
      let daysToAdd = targetDay - currentDay

      if (daysToAdd <= 0) {
        daysToAdd += 7
      }

      startDate.setDate(startDate.getDate() + daysToAdd)
    }
  }

  return {
    title: message
      .replace(
        /schedule|meeting|appointment|at\s*\d+(?::\d+)?\s*(am|pm)?|on\s*(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
        "",
      )
      .trim(),
    startDate,
    type: message.includes("meeting") ? "meeting" : "other",
  }
}

function extractReminderParameters(message: string): Record<string, any> {
  const timeMatch = message.match(/at\s*(\d+)(?::(\d+))?\s*(am|pm)?/i)
  let startDate: Date | undefined

  if (timeMatch) {
    startDate = new Date()
    let hours = Number.parseInt(timeMatch[1], 10)
    const minutes = timeMatch[2] ? Number.parseInt(timeMatch[2], 10) : 0
    const period = timeMatch[3]?.toLowerCase()

    if (period === "pm" && hours < 12) {
      hours += 12
    } else if (period === "am" && hours === 12) {
      hours = 0
    }

    startDate.setHours(hours, minutes, 0, 0)
  }

  const dateMatch = message.match(/on\s*(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
  if (dateMatch && startDate) {
    const day = dateMatch[1].toLowerCase()

    if (day === "today") {
      // Already set to today
    } else if (day === "tomorrow") {
      startDate.setDate(startDate.getDate() + 1)
    } else {
      // Handle days of the week
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
      const targetDay = daysOfWeek.indexOf(day)
      const currentDay = startDate.getDay()
      let daysToAdd = targetDay - currentDay

      if (daysToAdd <= 0) {
        daysToAdd += 7
      }

      startDate.setDate(startDate.getDate() + daysToAdd)
    }
  }

  return {
    title: message
      .replace(
        /remind|reminder|at\s*\d+(?::\d+)?\s*(am|pm)?|on\s*(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
        "",
      )
      .trim(),
    startDate,
    type: "reminder",
  }
}

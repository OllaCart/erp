import { v4 as uuidv4 } from "uuid"
import { neo4jService } from "./neo4j-service"
import { FinancialService } from "./financial-service"
import { TaskService } from "./task-service"
import { CalendarService } from "./calendar-service"
import { MemoryService } from "./memory-service"

interface ContextualEntity {
  type: "transaction" | "task" | "event" | "memory"
  id: string
  data: any
}

interface ContextData {
  id: string
  name: string
  description: string
  type: string
  entities: ContextualEntity[]
  followUpQuestions: string[]
  suggestedTasks: {
    title: string
    description: string
    priority: number
    dueDate?: Date
  }[]
}

export class ContextAnalyzer {
  // Analyze a message to extract contextual information
  static async analyzeMessage(userId: string, message: string): Promise<ContextData | null> {
    try {
      // Ensure user exists in Neo4j
      await neo4jService.ensureUserExists(userId)

      // Check for travel context
      const travelContext = this.detectTravelContext(message)
      if (travelContext) {
        return await this.processTravelContext(userId, message, travelContext)
      }

      // Check for financial planning context
      const financialContext = this.detectFinancialContext(message)
      if (financialContext) {
        return await this.processFinancialContext(userId, message, financialContext)
      }

      // Check for event planning context
      const eventContext = this.detectEventContext(message)
      if (eventContext) {
        return await this.processEventContext(userId, message, eventContext)
      }

      // No specific context detected
      return null
    } catch (error) {
      console.error("Error in context analysis:", error)
      // Return null instead of throwing an error to allow the application to continue
      return null
    }
  }

  // Detect if message contains travel-related context
  private static detectTravelContext(message: string): any | null {
    const travelKeywords = ["trip", "travel", "vacation", "flight", "hotel", "booking", "visit"]
    const locationPattern = /\b(to|in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g

    // Check for travel keywords
    const hasTravelKeyword = travelKeywords.some((keyword) => message.toLowerCase().includes(keyword))

    if (!hasTravelKeyword) return null

    // Extract potential locations
    const locations: string[] = []
    let match
    while ((match = locationPattern.exec(message)) !== null) {
      locations.push(match[2])
    }

    // Extract potential dates
    const datePattern =
      /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|summer|winter|spring|fall|autumn)\b/gi
    const dateMatches = message.match(datePattern) || []

    // Extract potential duration
    const durationPattern = /\b(\d+)\s+(day|days|week|weeks|month|months)\b/gi
    const durationMatches = message.match(durationPattern) || []

    // Extract potential budget
    const budgetPattern = /\$(\d+(?:,\d+)*(?:\.\d+)?)/g
    const budgetMatches = []
    while ((match = budgetPattern.exec(message)) !== null) {
      budgetMatches.push(Number.parseFloat(match[1].replace(/,/g, "")))
    }

    if (locations.length > 0 || dateMatches.length > 0 || budgetMatches.length > 0) {
      return {
        locations,
        dates: dateMatches,
        duration: durationMatches,
        budget: budgetMatches.length > 0 ? Math.max(...budgetMatches) : null,
      }
    }

    return null
  }

  // Process travel context and create related entities
  private static async processTravelContext(userId: string, message: string, contextData: any): Promise<ContextData> {
    const contextId = uuidv4()
    const entities: ContextualEntity[] = []
    const followUpQuestions: string[] = []
    const suggestedTasks: any[] = []

    // Create a memory for this travel plan
    const memoryId = uuidv4()
    await MemoryService.storeMemory({
      id: memoryId,
      userId,
      text: message,
      timestamp: new Date(),
      tags: ["travel", "trip", ...(contextData.locations || [])],
      emotion: "excited",
      context: "travel",
      confidence: 0.9,
    })

    // Store in Neo4j
    try {
      await neo4jService.createMemory(userId, memoryId, message, "excited", "travel", 0.9, [
        "travel",
        "trip",
        ...(contextData.locations || []),
      ])
    } catch (error) {
      console.error("Error creating memory in Neo4j:", error)
      // Continue execution even if Neo4j operation fails
    }

    entities.push({
      type: "memory",
      id: memoryId,
      data: {
        text: message,
        tags: ["travel", "trip", ...(contextData.locations || [])],
      },
    })

    // Create a budget transaction if amount is mentioned
    if (contextData.budget) {
      const transactionId = uuidv4()
      const transaction = await FinancialService.addTransaction({
        userId,
        amount: contextData.budget,
        type: "expense",
        category: "Travel",
        description: `Travel budget for ${contextData.locations.join(", ")}`,
        date: new Date(),
      })

      // Store in Neo4j
      try {
        await neo4jService.createFinancialTransaction(
          userId,
          transactionId,
          contextData.budget,
          "expense",
          "Travel",
          `Travel budget for ${contextData.locations.join(", ")}`,
          new Date(),
        )
      } catch (error) {
        console.error("Error creating transaction in Neo4j:", error)
      }

      entities.push({
        type: "transaction",
        id: transactionId,
        data: transaction,
      })
    } else {
      followUpQuestions.push("What's your budget for this trip?")
    }

    // Create suggested tasks
    const locations = contextData.locations || []
    if (locations.length > 0) {
      for (const location of locations) {
        // Create accommodation task
        const accommodationTaskId = uuidv4()
        const accommodationTask = await TaskService.addTask({
          userId,
          title: `Book accommodation in ${location}`,
          description: `Find and book suitable accommodation for the trip to ${location}`,
          status: "pending",
          priority: 4,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        })

        // Store in Neo4j
        try {
          await neo4jService.createTask(
            userId,
            accommodationTaskId,
            `Book accommodation in ${location}`,
            `Find and book suitable accommodation for the trip to ${location}`,
            "pending",
            4,
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          )
        } catch (error) {
          console.error("Error creating task in Neo4j:", error)
        }

        entities.push({
          type: "task",
          id: accommodationTaskId,
          data: accommodationTask,
        })

        // Create research task
        const researchTaskId = uuidv4()
        const researchTask = await TaskService.addTask({
          userId,
          title: `Research attractions in ${location}`,
          description: `Find popular attractions, activities, and places to visit in ${location}`,
          status: "pending",
          priority: 3,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        })

        // Store in Neo4j
        try {
          await neo4jService.createTask(
            userId,
            researchTaskId,
            `Research attractions in ${location}`,
            `Find popular attractions, activities, and places to visit in ${location}`,
            "pending",
            3,
            new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          )
        } catch (error) {
          console.error("Error creating task in Neo4j:", error)
        }

        entities.push({
          type: "task",
          id: researchTaskId,
          data: researchTask,
        })

        suggestedTasks.push({
          title: `Book accommodation in ${location}`,
          description: `Find and book suitable accommodation for the trip to ${location}`,
          priority: 4,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })

        suggestedTasks.push({
          title: `Research attractions in ${location}`,
          description: `Find popular attractions, activities, and places to visit in ${location}`,
          priority: 3,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        })
      }
    }

    // Add follow-up questions if needed
    if (!contextData.dates || contextData.dates.length === 0) {
      followUpQuestions.push("When are you planning to travel?")
    } else {
      // Create calendar event for the trip
      const eventId = uuidv4()
      const startDate = new Date() // This would be parsed from contextData.dates in a real implementation
      startDate.setDate(startDate.getDate() + 30) // Placeholder: 1 month from now

      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 14) // Placeholder: 2 weeks duration

      const event = await CalendarService.addEvent({
        userId,
        title: `Trip to ${contextData.locations.join(", ")}`,
        description: `Vacation trip to ${contextData.locations.join(", ")}`,
        type: "personal",
        startDate,
        endDate,
        location: contextData.locations[0],
      })

      // Store in Neo4j
      try {
        await neo4jService.createCalendarEvent(
          userId,
          eventId,
          `Trip to ${contextData.locations.join(", ")}`,
          `Vacation trip to ${contextData.locations.join(", ")}`,
          "personal",
          startDate,
          endDate,
          contextData.locations[0],
        )
      } catch (error) {
        console.error("Error creating calendar event in Neo4j:", error)
      }

      entities.push({
        type: "event",
        id: eventId,
        data: event,
      })
    }

    if (!contextData.duration || contextData.duration.length === 0) {
      followUpQuestions.push("How long are you planning to stay?")
    }

    // Create context in Neo4j
    try {
      await neo4jService.createContext(
        userId,
        contextId,
        `Trip to ${contextData.locations?.join(", ") || "destination"}`,
        `Travel plans for ${contextData.locations?.join(", ") || "destination"}`,
        "travel",
        entities.map((e) => e.id),
      )
    } catch (error) {
      console.error("Error creating context in Neo4j:", error)
    }

    // Create additional suggested tasks
    suggestedTasks.push({
      title: "Check passport and visa requirements",
      description: "Ensure your passport is valid and check if you need any visas for your destination",
      priority: 5,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    })

    suggestedTasks.push({
      title: "Purchase travel insurance",
      description: "Research and buy appropriate travel insurance for your trip",
      priority: 4,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    })

    return {
      id: contextId,
      name: `Trip to ${contextData.locations?.join(", ") || "destination"}`,
      description: `Travel plans for ${contextData.locations?.join(", ") || "destination"}`,
      type: "travel",
      entities,
      followUpQuestions,
      suggestedTasks,
    }
  }

  // Detect if message contains financial planning context
  private static detectFinancialContext(message: string): any | null {
    const financialKeywords = ["budget", "spend", "cost", "expense", "save", "invest", "money", "financial", "finance"]

    // Check for financial keywords
    const hasFinancialKeyword = financialKeywords.some((keyword) => message.toLowerCase().includes(keyword))

    if (!hasFinancialKeyword) return null

    // Extract potential amounts
    const amountPattern = /\$(\d+(?:,\d+)*(?:\.\d+)?)/g
    const amounts: number[] = []
    let match
    while ((match = amountPattern.exec(message)) !== null) {
      amounts.push(Number.parseFloat(match[1].replace(/,/g, "")))
    }

    // Extract potential categories
    const categoryPattern =
      /\b(groceries|rent|mortgage|utilities|entertainment|dining|travel|shopping|healthcare|education)\b/gi
    const categoryMatches = message.match(categoryPattern) || []

    // Extract potential timeframes
    const timeframePattern = /\b(daily|weekly|monthly|yearly|annual|quarter|quarterly|year)\b/gi
    const timeframeMatches = message.match(timeframePattern) || []

    if (amounts.length > 0 || categoryMatches.length > 0) {
      return {
        amounts,
        categories: categoryMatches.map((c) => c.toLowerCase()),
        timeframes: timeframeMatches.map((t) => t.toLowerCase()),
      }
    }

    return null
  }

  // Process financial context and create related entities
  private static async processFinancialContext(
    userId: string,
    message: string,
    contextData: any,
  ): Promise<ContextData> {
    const contextId = uuidv4()
    const entities: ContextualEntity[] = []
    const followUpQuestions: string[] = []
    const suggestedTasks: any[] = []

    // Create a memory for this financial plan
    const memoryId = uuidv4()
    await MemoryService.storeMemory({
      id: memoryId,
      userId,
      text: message,
      timestamp: new Date(),
      tags: ["finance", "budget", ...(contextData.categories || [])],
      emotion: "neutral",
      context: "finance",
      confidence: 0.9,
    })

    // Store in Neo4j
    try {
      await neo4jService.createMemory(userId, memoryId, message, "neutral", "finance", 0.9, [
        "finance",
        "budget",
        ...(contextData.categories || []),
      ])
    } catch (error) {
      console.error("Error creating memory in Neo4j:", error)
    }

    entities.push({
      type: "memory",
      id: memoryId,
      data: {
        text: message,
        tags: ["finance", "budget", ...(contextData.categories || [])],
      },
    })

    // Create transactions if amounts are mentioned
    if (contextData.amounts && contextData.amounts.length > 0) {
      for (let i = 0; i < contextData.amounts.length; i++) {
        const amount = contextData.amounts[i]
        const category =
          contextData.categories && i < contextData.categories.length ? contextData.categories[i] : "Other"

        const transactionId = uuidv4()
        const transaction = await FinancialService.addTransaction({
          userId,
          amount,
          type: "expense",
          category: category.charAt(0).toUpperCase() + category.slice(1),
          description: `Expense for ${category}`,
          date: new Date(),
        })

        // Store in Neo4j
        try {
          await neo4jService.createFinancialTransaction(
            userId,
            transactionId,
            amount,
            "expense",
            category.charAt(0).toUpperCase() + category.slice(1),
            `Expense for ${category}`,
            new Date(),
          )
        } catch (error) {
          console.error("Error creating transaction in Neo4j:", error)
        }

        entities.push({
          type: "transaction",
          id: transactionId,
          data: transaction,
        })
      }
    } else {
      followUpQuestions.push("What amount do you want to budget for this?")
    }

    // Create budget planning task
    const budgetTaskId = uuidv4()
    const budgetTask = await TaskService.addTask({
      userId,
      title: "Create a detailed budget plan",
      description: "Break down your expenses and create a comprehensive budget plan",
      status: "pending",
      priority: 4,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    })

    // Store in Neo4j
    try {
      await neo4jService.createTask(
        userId,
        budgetTaskId,
        "Create a detailed budget plan",
        "Break down your expenses and create a comprehensive budget plan",
        "pending",
        4,
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      )
    } catch (error) {
      console.error("Error creating task in Neo4j:", error)
    }

    entities.push({
      type: "task",
      id: budgetTaskId,
      data: budgetTask,
    })

    suggestedTasks.push({
      title: "Create a detailed budget plan",
      description: "Break down your expenses and create a comprehensive budget plan",
      priority: 4,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    })

    // Create expense tracking task
    const trackingTaskId = uuidv4()
    const trackingTask = await TaskService.addTask({
      userId,
      title: "Track daily expenses",
      description: "Keep a record of all your daily expenses to stay within budget",
      status: "pending",
      priority: 3,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    })

    // Store in Neo4j
    try {
      await neo4jService.createTask(
        userId,
        trackingTaskId,
        "Track daily expenses",
        "Keep a record of all your daily expenses to stay within budget",
        "pending",
        3,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      )
    } catch (error) {
      console.error("Error creating task in Neo4j:", error)
    }

    entities.push({
      type: "task",
      id: trackingTaskId,
      data: trackingTask,
    })

    suggestedTasks.push({
      title: "Track daily expenses",
      description: "Keep a record of all your daily expenses to stay within budget",
      priority: 3,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    // Create context in Neo4j
    try {
      await neo4jService.createContext(
        userId,
        contextId,
        "Financial Planning",
        "Budget and expense tracking plan",
        "finance",
        entities.map((e) => e.id),
      )
    } catch (error) {
      console.error("Error creating context in Neo4j:", error)
    }

    // Add follow-up questions if needed
    if (!contextData.timeframes || contextData.timeframes.length === 0) {
      followUpQuestions.push("What timeframe are you planning this budget for?")
    }

    // Create additional suggested tasks
    suggestedTasks.push({
      title: "Review recurring subscriptions",
      description: "Identify and evaluate all recurring subscriptions to reduce unnecessary expenses",
      priority: 3,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    })

    suggestedTasks.push({
      title: "Set up savings goal",
      description: "Define a specific savings goal and timeline",
      priority: 4,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    })

    return {
      id: contextId,
      name: "Financial Planning",
      description: "Budget and expense tracking plan",
      type: "finance",
      entities,
      followUpQuestions,
      suggestedTasks,
    }
  }

  // Detect if message contains event planning context
  private static detectEventContext(message: string): any | null {
    const eventKeywords = ["event", "meeting", "appointment", "schedule", "calendar", "plan", "organize"]

    // Check for event keywords
    const hasEventKeyword = eventKeywords.some((keyword) => message.toLowerCase().includes(keyword))

    if (!hasEventKeyword) return null

    // Extract potential dates
    const datePattern =
      /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/gi
    const dateMatches = message.match(datePattern) || []

    // Extract potential times
    const timePattern = /\b(\d{1,2})(:\d{2})?\s*(am|pm)?\b/gi
    const timeMatches = message.match(timePattern) || []

    // Extract potential locations
    const locationPattern = /\b(at|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g
    const locations: string[] = []
    let match
    while ((match = locationPattern.exec(message)) !== null) {
      locations.push(match[2])
    }

    // Extract potential participants
    const participantPattern = /\b(with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g
    const participants: string[] = []
    while ((match = participantPattern.exec(message)) !== null) {
      participants.push(match[2])
    }

    if (dateMatches.length > 0 || timeMatches.length > 0 || locations.length > 0 || participants.length > 0) {
      return {
        dates: dateMatches,
        times: timeMatches,
        locations,
        participants,
      }
    }

    return null
  }

  // Process event context and create related entities
  private static async processEventContext(userId: string, message: string, contextData: any): Promise<ContextData> {
    const contextId = uuidv4()
    const entities: ContextualEntity[] = []
    const followUpQuestions: string[] = []
    const suggestedTasks: any[] = []

    // Create a memory for this event plan
    const memoryId = uuidv4()
    await MemoryService.storeMemory({
      id: memoryId,
      userId,
      text: message,
      timestamp: new Date(),
      tags: ["event", "schedule", ...(contextData.participants || [])],
      emotion: "neutral",
      context: "event",
      confidence: 0.9,
    })

    // Store in Neo4j
    try {
      await neo4jService.createMemory(userId, memoryId, message, "neutral", "event", 0.9, [
        "event",
        "schedule",
        ...(contextData.participants || []),
      ])
    } catch (error) {
      console.error("Error creating memory in Neo4j:", error)
    }

    entities.push({
      type: "memory",
      id: memoryId,
      data: {
        text: message,
        tags: ["event", "schedule", ...(contextData.participants || [])],
      },
    })

    // Parse date and time information
    let startDate = new Date()

    // If we have date information, try to parse it
    if (contextData.dates && contextData.dates.length > 0) {
      const dateStr = contextData.dates[0].toLowerCase()

      if (dateStr.includes("today")) {
        startDate = new Date()
      } else if (dateStr.includes("tomorrow")) {
        startDate = new Date()
        startDate.setDate(startDate.getDate() + 1)
      } else if (dateStr.includes("monday")) {
        startDate = this.getNextDayOfWeek(startDate, 1)
      } else if (dateStr.includes("tuesday")) {
        startDate = this.getNextDayOfWeek(startDate, 2)
      } else if (dateStr.includes("wednesday")) {
        startDate = this.getNextDayOfWeek(startDate, 3)
      } else if (dateStr.includes("thursday")) {
        startDate = this.getNextDayOfWeek(startDate, 4)
      } else if (dateStr.includes("friday")) {
        startDate = this.getNextDayOfWeek(startDate, 5)
      } else if (dateStr.includes("saturday")) {
        startDate = this.getNextDayOfWeek(startDate, 6)
      } else if (dateStr.includes("sunday")) {
        startDate = this.getNextDayOfWeek(startDate, 0)
      }
      // More date parsing could be added here
    }

    // If we have time information, try to parse it
    if (contextData.times && contextData.times.length > 0) {
      const timeStr = contextData.times[0].toLowerCase()
      const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)

      if (timeMatch) {
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
    }

    // Create end date (default to 1 hour after start)
    const endDate = new Date(startDate)
    endDate.setHours(endDate.getHours() + 1)

    const location = contextData.locations && contextData.locations.length > 0 ? contextData.locations[0] : undefined
    const participants = contextData.participants || []

    // Create calendar event
    const eventId = uuidv4()
    const eventTitle = `Event with ${participants.join(", ") || "participants"}`

    const event = await CalendarService.addEvent({
      userId,
      title: eventTitle,
      description: message,
      type: "meeting",
      startDate,
      endDate,
      location,
      participants,
    })

    // Store in Neo4j
    try {
      await neo4jService.createCalendarEvent(
        userId,
        eventId,
        eventTitle,
        message,
        "meeting",
        startDate,
        endDate,
        location,
      )
    } catch (error) {
      console.error("Error creating calendar event in Neo4j:", error)
    }

    entities.push({
      type: "event",
      id: eventId,
      data: event,
    })

    // Create preparation tasks based on event type
    const prepTaskId = uuidv4()
    const prepTaskTitle = `Prepare for ${eventTitle}`
    const prepTaskDescription = `Get ready for the upcoming event: ${message}`

    // Set the preparation task due date to 1 day before the event
    const prepTaskDueDate = new Date(startDate)
    prepTaskDueDate.setDate(prepTaskDueDate.getDate() - 1)

    const prepTask = await TaskService.addTask({
      userId,
      title: prepTaskTitle,
      description: prepTaskDescription,
      status: "pending",
      priority: 4,
      dueDate: prepTaskDueDate,
    })

    // Store in Neo4j
    try {
      await neo4jService.createTask(
        userId,
        prepTaskId,
        prepTaskTitle,
        prepTaskDescription,
        "pending",
        4,
        prepTaskDueDate,
      )
    } catch (error) {
      console.error("Error creating task in Neo4j:", error)
    }

    entities.push({
      type: "task",
      id: prepTaskId,
      data: prepTask,
    })

    suggestedTasks.push({
      title: prepTaskTitle,
      description: prepTaskDescription,
      priority: 4,
      dueDate: prepTaskDueDate,
    })

    // Create context in Neo4j
    try {
      await neo4jService.createContext(
        userId,
        contextId,
        eventTitle,
        `Event planning for ${message}`,
        "event",
        entities.map((e) => e.id),
      )
    } catch (error) {
      console.error("Error creating context in Neo4j:", error)
    }

    // Add follow-up questions if needed
    if (!contextData.dates || contextData.dates.length === 0) {
      followUpQuestions.push("When would you like to schedule this event?")
    }

    if (!contextData.times || contextData.times.length === 0) {
      followUpQuestions.push("What time would you like to schedule this event?")
    }

    if (!contextData.locations || contextData.locations.length === 0) {
      followUpQuestions.push("Where will this event take place?")
    }

    // Create additional suggested tasks based on event type
    if (participants.length > 0) {
      suggestedTasks.push({
        title: "Send event invitations",
        description: `Send invitations to ${participants.join(", ")}`,
        priority: 4,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      })

      suggestedTasks.push({
        title: "Confirm attendance",
        description: "Follow up with participants to confirm their attendance",
        priority: 3,
        dueDate: new Date(startDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before event
      })
    }

    // Add agenda preparation task if it's a meeting
    if (message.toLowerCase().includes("meeting")) {
      suggestedTasks.push({
        title: "Prepare meeting agenda",
        description: "Create an agenda for the upcoming meeting",
        priority: 4,
        dueDate: new Date(startDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before event
      })
    }

    return {
      id: contextId,
      name: eventTitle,
      description: `Event planning for ${message}`,
      type: "event",
      entities,
      followUpQuestions,
      suggestedTasks,
    }
  }

  // Helper method to get the next occurrence of a day of the week
  private static getNextDayOfWeek(date: Date, dayOfWeek: number): Date {
    const resultDate = new Date(date.getTime())
    resultDate.setDate(date.getDate() + ((7 + dayOfWeek - date.getDay()) % 7))
    return resultDate
  }
}

"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef } from "react"
import type { Message, FinancialTransaction, Task, CalendarEvent } from "@/types/erp"
import { MemoryService } from "@/lib/memory-service"
import { NLPService } from "@/lib/nlp-service"
import { FinancialService } from "@/lib/financial-service"
import { TaskService } from "@/lib/task-service"
import { CalendarService } from "@/lib/calendar-service"
import { LandingPageService } from "@/lib/landing-page-service"
import { ContextAnalyzer } from "@/lib/context-analyzer"
import { GmailSyncService } from "@/lib/gmail-sync-service"
import { WorkHierarchyService } from "@/lib/work-hierarchy-service"
import { parseWaywardCommandBlock } from "@/lib/command-center"
import type { MessageParam as ClaudeMessage } from "@anthropic-ai/sdk/resources/messages"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from "uuid"

interface ContextualSuggestion {
  id: string
  type: "task" | "event" | "transaction"
  title: string
  description: string
  accepted: boolean
}

interface GroupChat {
  id: string
  name: string
  description: string
  goal?: string
  participants: string[]
  isGoalOriented: boolean
  createdDate: Date
  isActive: boolean
}

interface MessageContextType {
  messages: Message[]
  sendMessage: (text: string) => Promise<void>
  isLoading: boolean
  clearMessages: () => void
  contextualSuggestions: ContextualSuggestion[]
  acceptSuggestion: (id: string) => void
  rejectSuggestion: (id: string) => void
  followUpQuestions: string[]
  answerFollowUpQuestion: (question: string, answer: string) => Promise<void>
  groupChats: GroupChat[]
  activeGroupChat: GroupChat | null
  createGroupChat: (data: Omit<GroupChat, "id" | "createdDate" | "isActive">) => Promise<void>
  switchToGroupChat: (groupId: string) => void
  leaveGroupChat: (groupId: string) => void
}

const MessageContext = createContext<MessageContextType | undefined>(undefined)

export const useMessages = () => {
  const context = useContext(MessageContext)
  if (!context) {
    throw new Error("useMessages must be used within a MessageProvider")
  }
  return context
}

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [contextualSuggestions, setContextualSuggestions] = useState<ContextualSuggestion[]>([])
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [currentContextId, setCurrentContextId] = useState<string | null>(null)
  const userId = "user-123" // In a real app, get from auth
  const [groupChats, setGroupChats] = useState<GroupChat[]>([])
  const [activeGroupChat, setActiveGroupChat] = useState<GroupChat | null>(null)
  // Tracks the Claude-formatted conversation history for multi-turn context
  const claudeHistoryRef = useRef<ClaudeMessage[]>([])

  // Load initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "1",
          userId,
          text: "Hello! I'm Dash, your personal ERP assistant. How can I help you today?",
          sender: "assistant",
          timestamp: new Date(),
        },
      ])
    }
  }, [messages.length, userId])

  const sendMessage = async (text: string) => {
    if (!text.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      userId,
      text,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Placeholder message for streaming
    const assistantId = uuidv4()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, userId, text: "", sender: "assistant", timestamp: new Date() },
    ])

    try {
      // ── Side-effect: NLP + context analysis (non-blocking) ──────────────
      NLPService.parseIntent(text).then((intent) => {
        // intent available for future use / telemetry
      })

      ContextAnalyzer.analyzeMessage(userId, text).then((contextData) => {
        if (!contextData) return
        setCurrentContextId(contextData.id)
        setFollowUpQuestions(contextData.followUpQuestions)
        const suggestions: ContextualSuggestion[] = contextData.suggestedTasks.map((task) => ({
          id: uuidv4(),
          type: "task",
          title: task.title,
          description: task.description,
          accepted: false,
        }))
        setContextualSuggestions(suggestions)
      })

      // ── Gather cross-module context snapshot ────────────────────────────
      const workHierarchy = WorkHierarchyService.getState(userId)

      const [tasks, upcomingEvents, recentMemories, gmailMessages] = await Promise.all([
        // Merge flat TaskService tasks with hierarchy tasks (hierarchy takes precedence)
        Promise.resolve(
          workHierarchy.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate?.toISOString(),
            projectId: t.projectId,
            dependsOnTaskIds: t.dependsOnTaskIds,
            tags: t.tags,
          })),
        ).then(async (hierarchyTasks) => {
          const flat = await TaskService.getUserTasks(userId)
          const flatMapped = flat
            .filter((t) => !hierarchyTasks.some((h) => h.id === t.id))
            .map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              dueDate: t.dueDate?.toISOString(),
              projectId: t.projectId,
              dependsOnTaskIds: t.dependsOnTaskIds,
              tags: t.tags,
            }))
          return [...hierarchyTasks, ...flatMapped]
        }),
        CalendarService.getUpcomingEvents(userId, 10).then((es) =>
          es.map((e) => ({
            id: e.id,
            title: e.title,
            type: e.type,
            startDate: e.startDate.toISOString(),
            endDate: e.endDate?.toISOString(),
            location: e.location,
          })),
        ),
        MemoryService.getUserMemories(userId).then((ms) =>
          ms
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5)
            .map((m) => ({
              text: m.text,
              tags: m.tags,
              emotion: m.emotion ?? "neutral",
              timestamp: new Date(m.timestamp).toISOString(),
            })),
        ),
        GmailSyncService.getRecentMessages(),
      ])

      const initiatives = workHierarchy.initiatives.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        status: i.status,
      }))

      const projects = workHierarchy.projects.map((p) => ({
        id: p.id,
        initiativeId: p.initiativeId,
        name: p.name,
        description: p.description,
        status: p.status,
      }))

      // ── Build messages for API (only commit to ref after success) ───────
      const userTurn: ClaudeMessage = { role: "user", content: text }
      const messagesForApi = [...claudeHistoryRef.current, userTurn]

      // ── Stream from Claude ───────────────────────────────────────────────
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForApi,
          userId,
          moduleContext: { tasks, upcomingEvents, recentMemories, gmailMessages, initiatives, projects },
        }),
      })

      if (!response.ok) {
        let desc = `Request failed (${response.status})`
        try {
          const err = (await response.json()) as { error?: string; code?: string }
          if (err?.error) desc = err.error
          if (err?.code) desc = `${desc} (${err.code})`
        } catch {
          /* non-JSON body */
        }
        throw new Error(desc)
      }

      if (!response.body) {
        throw new Error("No response body from chat")
      }

      // ── Read SSE with line buffering (chunks may split mid-line) ─────────
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ""
      let lineBuffer = ""
      let readerDone = false

      while (!readerDone) {
        const { done, value } = await reader.read()
        readerDone = done
        if (value) lineBuffer += decoder.decode(value, { stream: !readerDone })

        const lines = lineBuffer.split("\n")
        lineBuffer = lines.pop() ?? ""

        let sseClosed = false
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6).trim()
          if (payload === "[DONE]") {
            sseClosed = true
            break
          }
          let parsed: { text?: string; error?: string }
          try {
            parsed = JSON.parse(payload) as { text?: string; error?: string }
          } catch {
            continue
          }
          if (typeof parsed.error === "string") {
            sseClosed = true
            throw new Error(parsed.error)
          }
          if (typeof parsed.text === "string") {
            fullText += parsed.text
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, text: fullText } : m)),
            )
          }
        }
        if (sseClosed) break
      }

      const { commands, visibleText } = parseWaywardCommandBlock(fullText)
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, text: visibleText } : m)),
      )

      const createdTaskTitles: string[] = []
      for (const cmd of commands) {
        if (cmd.type === "navigate" && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("wayward-navigate", { detail: { tab: cmd.tab } }),
          )
        }

        if (cmd.type === "create_task") {
          try {
            await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                business_id: cmd.business_id,
                title: cmd.title,
                priority: cmd.priority ?? "medium",
                category: cmd.category ?? null,
                due_date: cmd.due_date ?? null,
                notes: cmd.notes ?? null,
                source: "claude",
                recurrence_rule: cmd.recurrence_rule ?? null,
                recurrence_interval: cmd.recurrence_interval ?? null,
                follows_up_on: cmd.follows_up_on ?? null,
              }),
            })
            createdTaskTitles.push(cmd.title)
          } catch (err) {
            console.error("Failed to create task from Claude command:", err)
          }
        }
      }

      if (createdTaskTitles.length > 0) {
        toast({
          title: createdTaskTitles.length === 1
            ? `Task created: "${createdTaskTitles[0]}"`
            : `${createdTaskTitles.length} tasks created`,
          description: createdTaskTitles.length > 1 ? createdTaskTitles.join(", ") : undefined,
        })
      }

      // ── Commit user + assistant turns (strip UI command block from assistant)
      claudeHistoryRef.current = [
        ...claudeHistoryRef.current,
        userTurn,
        { role: "assistant", content: visibleText },
      ]

      // ── Persist to memory ────────────────────────────────────────────────
      await MemoryService.storeMemory({
        userId,
        text: `User: ${text}\nAssistant: ${visibleText}`,
        timestamp: new Date(),
        tags: ["conversation"],
        emotion: "neutral",
      })
    } catch (error) {
      console.error("Error calling Claude:", error)
      const fallback =
        error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again."
      toast({
        title: "Chat error",
        description: fallback.length > 220 ? `${fallback.slice(0, 220)}…` : fallback,
        variant: "destructive",
      })
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, text: fallback } : m)),
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Handle command intents (log, schedule, remind)
  const handleCommand = async (message: Message): Promise<Message> => {
    const { intent } = message

    if (!intent || !intent.action || !intent.entity) {
      return {
        id: uuidv4(),
        userId,
        text: "I'm not sure what you want me to do. Could you be more specific?",
        sender: "assistant",
        timestamp: new Date(),
      }
    }

    // Handle financial transactions
    if (intent.entity === "transaction" && intent.action === "log") {
      const params = intent.parameters || {}

      // Check if we have enough information
      if (!params.amount || params.amount <= 0) {
        // Create a landing page for more details
        const landingPage = await LandingPageService.createLandingPage(
          userId,
          "transaction-form",
          "Log a Transaction",
          "Please provide details for your transaction",
          { type: params.type || "expense" },
        )

        return {
          id: uuidv4(),
          userId,
          text: `I need more details to log this ${params.type || "transaction"}. I've created a form for you to fill out.`,
          sender: "assistant",
          timestamp: new Date(),
          requiresLandingPage: true,
          landingPageUrl: `/forms/transaction/${landingPage.id}`,
        }
      }

      // We have enough info to log the transaction
      const transaction: Omit<FinancialTransaction, "id"> = {
        userId,
        amount: params.amount,
        type: params.type || "expense",
        category: params.category || "Other",
        description: params.description || message.text,
        date: new Date(),
      }

      const savedTransaction = await FinancialService.addTransaction(transaction)

      return {
        id: uuidv4(),
        userId,
        text: `I've logged a ${savedTransaction.type} of $${savedTransaction.amount.toFixed(2)} for ${savedTransaction.category}.`,
        sender: "assistant",
        timestamp: new Date(),
      }
    }

    // Handle tasks
    if (intent.entity === "task" && intent.action === "log") {
      const params = intent.parameters || {}

      // Check if we have enough information
      if (!params.title) {
        // Create a landing page for more details
        const landingPage = await LandingPageService.createLandingPage(
          userId,
          "task-form",
          "Create a Task",
          "Please provide details for your task",
        )

        return {
          id: uuidv4(),
          userId,
          text: "I need more details to create this task. I've created a form for you to fill out.",
          sender: "assistant",
          timestamp: new Date(),
          requiresLandingPage: true,
          landingPageUrl: `/forms/task/${landingPage.id}`,
        }
      }

      // We have enough info to create the task
      const task: Omit<Task, "id"> = {
        userId,
        title: params.title,
        description: params.description,
        status: "pending",
        priority: params.priority || 3,
        dueDate: params.dueDate,
      }

      const savedTask = await TaskService.addTask(task)

      let responseText = `I've created a task: "${savedTask.title}"`
      if (savedTask.dueDate) {
        responseText += ` due on ${savedTask.dueDate.toLocaleDateString()}`
      }

      return {
        id: uuidv4(),
        userId,
        text: responseText,
        sender: "assistant",
        timestamp: new Date(),
      }
    }

    // Handle events
    if (intent.entity === "event" && (intent.action === "schedule" || intent.action === "remind")) {
      const params = intent.parameters || {}

      // Check if we have enough information
      if (!params.title || !params.startDate) {
        // Create a landing page for more details
        const landingPage = await LandingPageService.createLandingPage(
          userId,
          "event-form",
          intent.action === "remind" ? "Set a Reminder" : "Schedule an Event",
          `Please provide details for your ${intent.action === "remind" ? "reminder" : "event"}`,
        )

        return {
          id: uuidv4(),
          userId,
          text: `I need more details to ${intent.action} this. I've created a form for you to fill out.`,
          sender: "assistant",
          timestamp: new Date(),
          requiresLandingPage: true,
          landingPageUrl: `/forms/event/${landingPage.id}`,
        }
      }

      // We have enough info to create the event
      const event: Omit<CalendarEvent, "id"> = {
        userId,
        title: params.title,
        description: params.description,
        type: intent.action === "remind" ? "reminder" : params.type || "other",
        startDate: params.startDate,
        endDate: params.endDate,
      }

      const savedEvent = await CalendarService.addEvent(event)

      const timeString = savedEvent.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const dateString = savedEvent.startDate.toLocaleDateString()

      return {
        id: uuidv4(),
        userId,
        text: `I've ${intent.action === "remind" ? "set a reminder" : "scheduled an event"}: "${savedEvent.title}" for ${timeString} on ${dateString}.`,
        sender: "assistant",
        timestamp: new Date(),
      }
    }

    // Default response for unhandled commands
    return {
      id: uuidv4(),
      userId,
      text: "I'm not sure how to handle that command yet.",
      sender: "assistant",
      timestamp: new Date(),
    }
  }

  // Handle query intents (view)
  const handleQuery = async (message: Message): Promise<Message> => {
    const { intent } = message

    if (!intent || !intent.action || !intent.entity) {
      return {
        id: uuidv4(),
        userId,
        text: "I'm not sure what information you're looking for. Could you be more specific?",
        sender: "assistant",
        timestamp: new Date(),
      }
    }

    // Handle transaction queries
    if (intent.entity === "transaction" && intent.action === "view") {
      const params = intent.parameters || {}

      if (params.type === "expense") {
        // Get recent expenses
        const expenses = await FinancialService.getTransactionsByType(userId, "expense")
        const recentExpenses = expenses.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)

        if (recentExpenses.length === 0) {
          return {
            id: uuidv4(),
            userId,
            text: "You don't have any expenses recorded yet.",
            sender: "assistant",
            timestamp: new Date(),
          }
        }

        let responseText = "Here are your recent expenses:\n"
        recentExpenses.forEach((expense) => {
          responseText += `- $${expense.amount.toFixed(2)} for ${expense.category} on ${expense.date.toLocaleDateString()}\n`
        })

        // Add total
        const total = recentExpenses.reduce((sum, expense) => sum + expense.amount, 0)
        responseText += `\nTotal: $${total.toFixed(2)}`

        return {
          id: uuidv4(),
          userId,
          text: responseText,
          sender: "assistant",
          timestamp: new Date(),
        }
      }

      if (params.type === "income") {
        // Get recent income
        const incomes = await FinancialService.getTransactionsByType(userId, "income")
        const recentIncomes = incomes.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)

        if (recentIncomes.length === 0) {
          return {
            id: uuidv4(),
            userId,
            text: "You don't have any income recorded yet.",
            sender: "assistant",
            timestamp: new Date(),
          }
        }

        let responseText = "Here are your recent income entries:\n"
        recentIncomes.forEach((income) => {
          responseText += `- $${income.amount.toFixed(2)} from ${income.category} on ${income.date.toLocaleDateString()}\n`
        })

        // Add total
        const total = recentIncomes.reduce((sum, income) => sum + income.amount, 0)
        responseText += `\nTotal: $${total.toFixed(2)}`

        return {
          id: uuidv4(),
          userId,
          text: responseText,
          sender: "assistant",
          timestamp: new Date(),
        }
      }

      // Get balance
      const balance = await FinancialService.calculateBalance(userId)

      return {
        id: uuidv4(),
        userId,
        text: `Your current balance is $${balance.toFixed(2)}.`,
        sender: "assistant",
        timestamp: new Date(),
      }
    }

    // Handle task queries
    if (intent.entity === "task" && intent.action === "view") {
      // Get pending tasks
      const pendingTasks = await TaskService.getTasksByStatus(userId, "pending")
      const sortedTasks = pendingTasks
        .sort((a, b) => {
          // Sort by due date (if available), then by priority
          if (a.dueDate && b.dueDate) {
            return a.dueDate.getTime() - b.dueDate.getTime()
          }
          if (a.dueDate) return -1
          if (b.dueDate) return 1
          return b.priority - a.priority
        })
        .slice(0, 5)

      if (sortedTasks.length === 0) {
        return {
          id: uuidv4(),
          userId,
          text: "You don't have any pending tasks.",
          sender: "assistant",
          timestamp: new Date(),
        }
      }

      let responseText = "Here are your pending tasks:\n"
      sortedTasks.forEach((task) => {
        let taskText = `- ${task.title}`
        if (task.dueDate) {
          taskText += ` (due ${task.dueDate.toLocaleDateString()})`
        }
        taskText += ` [Priority: ${task.priority}]\n`
        responseText += taskText
      })

      return {
        id: uuidv4(),
        userId,
        text: responseText,
        sender: "assistant",
        timestamp: new Date(),
      }
    }

    // Handle event queries
    if (intent.entity === "event" && intent.action === "view") {
      // Get upcoming events
      const upcomingEvents = await CalendarService.getUpcomingEvents(userId, 5)

      if (upcomingEvents.length === 0) {
        return {
          id: uuidv4(),
          userId,
          text: "You don't have any upcoming events.",
          sender: "assistant",
          timestamp: new Date(),
        }
      }

      let responseText = "Here are your upcoming events:\n"
      upcomingEvents.forEach((event) => {
        const timeString = event.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        const dateString = event.startDate.toLocaleDateString()
        responseText += `- ${event.title} at ${timeString} on ${dateString}\n`
      })

      return {
        id: uuidv4(),
        userId,
        text: responseText,
        sender: "assistant",
        timestamp: new Date(),
      }
    }

    // Default response for unhandled queries
    return {
      id: uuidv4(),
      userId,
      text: "I'm not sure how to retrieve that information yet.",
      sender: "assistant",
      timestamp: new Date(),
    }
  }

  // Handle conversation intents
  const handleConversation = async (message: Message): Promise<Message> => {
    // Query for related memories
    const relatedMemories = await MemoryService.retrieveMemories(userId, message.text, 2)

    if (relatedMemories.length > 0) {
      // Use the most relevant memory to inform the response
      const topMemory = relatedMemories[0]

      if (topMemory.confidence > 0.7) {
        return {
          id: uuidv4(),
          userId,
          text: `Based on our previous conversations, I recall: ${topMemory.text}`,
          sender: "assistant",
          timestamp: new Date(),
        }
      }
    }

    // Default conversation responses
    const defaultResponses = [
      "I'm here to help you manage your personal and financial life. You can ask me to log expenses, schedule events, or remind you of tasks.",
      "You can say things like 'Log $50 expense for groceries' or 'Schedule a meeting with John at 2 PM tomorrow'.",
      "I can help you track your finances, manage your schedule, and keep track of your tasks. What would you like to do?",
      "I'm your personal ERP assistant. I can help with finances, tasks, and scheduling. How can I assist you today?",
    ]

    return {
      id: uuidv4(),
      userId,
      text: defaultResponses[Math.floor(Math.random() * defaultResponses.length)],
      sender: "assistant",
      timestamp: new Date(),
    }
  }

  const acceptSuggestion = async (id: string) => {
    const suggestion = contextualSuggestions.find((s) => s.id === id)
    if (!suggestion) return

    // Mark as accepted
    setContextualSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, accepted: true } : s)))

    // Implement the suggestion based on its type
    switch (suggestion.type) {
      case "task":
        await TaskService.addTask({
          userId,
          title: suggestion.title,
          description: suggestion.description,
          status: "pending",
          priority: 3,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default due date: 1 week
        })

        // Add confirmation message
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            userId,
            text: `I've added the task "${suggestion.title}" to your to-do list.`,
            sender: "assistant",
            timestamp: new Date(),
          },
        ])
        break

      case "event":
        await CalendarService.addEvent({
          userId,
          title: suggestion.title,
          description: suggestion.description,
          type: "other",
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 1 week from now
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // Default: 2 hours duration
        })

        // Add confirmation message
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            userId,
            text: `I've scheduled "${suggestion.title}" on your calendar.`,
            sender: "assistant",
            timestamp: new Date(),
          },
        ])
        break

      case "transaction":
        await FinancialService.addTransaction({
          userId,
          amount: 0, // This would be replaced with actual amount in a real implementation
          type: "expense",
          category: "Other",
          description: suggestion.title,
          date: new Date(),
        })

        // Add confirmation message
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            userId,
            text: `I've recorded "${suggestion.title}" in your financial transactions.`,
            sender: "assistant",
            timestamp: new Date(),
          },
        ])
        break
    }
  }

  const rejectSuggestion = (id: string) => {
    // Remove the suggestion
    setContextualSuggestions((prev) => prev.filter((s) => s.id !== id))

    // Add rejection message
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        userId,
        text: "I've removed that suggestion.",
        sender: "assistant",
        timestamp: new Date(),
      },
    ])
  }

  const answerFollowUpQuestion = async (question: string, answer: string) => {
    // Add the Q&A to the chat
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        userId,
        text: question,
        sender: "assistant",
        timestamp: new Date(),
      },
      {
        id: uuidv4(),
        userId,
        text: answer,
        sender: "user",
        timestamp: new Date(),
      },
    ])

    // Remove the question from follow-up questions
    setFollowUpQuestions((prev) => prev.filter((q) => q !== question))

    // Process the answer based on the question
    if (question.toLowerCase().includes("budget")) {
      // Handle budget-related answer
      const amountPattern = /\$(\d+(?:,\d+)*(?:\.\d+)?)/g
      const amountMatches = []
      let match
      while ((match = amountPattern.exec(answer)) !== null) {
        amountMatches.push(Number.parseFloat(match[1].replace(/,/g, "")))
      }

      if (amountMatches.length > 0) {
        const amount = amountMatches[0]
        await FinancialService.addTransaction({
          userId,
          amount,
          type: "expense",
          category: "Budget",
          description: `Budget allocation from follow-up question`,
          date: new Date(),
        })

        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            userId,
            text: `I've updated your budget with $${amount.toFixed(2)}.`,
            sender: "assistant",
            timestamp: new Date(),
          },
        ])
      }
    } else if (question.toLowerCase().includes("when") || question.toLowerCase().includes("date")) {
      // Handle date-related answer
      const datePattern =
        /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi
      const dateMatches = answer.match(datePattern)

      if (dateMatches && dateMatches.length > 0) {
        // This is a simplified date parsing - in a real app, use a proper date library
        const dateStr = dateMatches[0]
        const date = new Date(dateStr + ", " + new Date().getFullYear())

        if (currentContextId && date) {
          // Update the context with the date information
          setMessages((prev) => [
            ...prev,
            {
              id: uuidv4(),
              userId,
              text: `I've updated your plan with the date: ${date.toLocaleDateString()}.`,
              sender: "assistant",
              timestamp: new Date(),
            },
          ])
        }
      }
    } else if (question.toLowerCase().includes("how long") || question.toLowerCase().includes("duration")) {
      // Handle duration-related answer
      const durationPattern = /\b(\d+)\s+(day|days|week|weeks|month|months)\b/gi
      const durationMatches = answer.match(durationPattern)

      if (durationMatches && durationMatches.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            userId,
            text: `I've noted the duration: ${durationMatches[0]}.`,
            sender: "assistant",
            timestamp: new Date(),
          },
        ])
      }
    } else {
      // Generic response for other questions
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          userId,
          text: `Thanks for providing that information. I've updated your plan accordingly.`,
          sender: "assistant",
          timestamp: new Date(),
        },
      ])
    }
  }

  const createGroupChat = async (data: Omit<GroupChat, "id" | "createdDate" | "isActive">) => {
    const newGroupChat: GroupChat = {
      ...data,
      id: uuidv4(),
      createdDate: new Date(),
      isActive: true,
    }

    setGroupChats((prev) => [...prev, newGroupChat])

    // Add system message about group creation
    const systemMessage: Message = {
      id: uuidv4(),
      userId,
      text: `Created group chat "${data.name}" with ${data.participants.length} participants. ${data.isGoalOriented ? "AI facilitation is enabled." : ""}`,
      sender: "assistant",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, systemMessage])
  }

  const switchToGroupChat = (groupId: string) => {
    const group = groupChats.find((g) => g.id === groupId)
    if (group) {
      setActiveGroupChat(group)
    }
  }

  const leaveGroupChat = (groupId: string) => {
    setGroupChats((prev) => prev.filter((g) => g.id !== groupId))
    if (activeGroupChat?.id === groupId) {
      setActiveGroupChat(null)
    }
  }

  const clearMessages = () => {
    setMessages([
      {
        id: "1",
        userId,
        text: "Hello! I'm Dash, your personal ERP assistant. How can I help you today?",
        sender: "assistant",
        timestamp: new Date(),
      },
    ])
    setContextualSuggestions([])
    setFollowUpQuestions([])
    setCurrentContextId(null)
    claudeHistoryRef.current = []
  }

  return (
    <MessageContext.Provider
      value={{
        messages,
        sendMessage,
        isLoading,
        clearMessages,
        contextualSuggestions,
        acceptSuggestion,
        rejectSuggestion,
        followUpQuestions,
        answerFollowUpQuestion,
        groupChats,
        activeGroupChat,
        createGroupChat,
        switchToGroupChat,
        leaveGroupChat,
      }}
    >
      {children}
    </MessageContext.Provider>
  )
}

export type TransactionType = "income" | "expense"
export type TaskStatus = "pending" | "in-progress" | "completed" | "cancelled"
export type InitiativeStatus = "planned" | "active" | "completed" | "cancelled"
export type ProjectStatus = "planned" | "active" | "on-hold" | "completed" | "cancelled"

/** Top-level strategic bucket. */
export interface Initiative {
  id: string
  userId: string
  name: string
  description?: string
  status: InitiativeStatus
  createdAt: Date
}

/** Work container under an initiative. */
export interface Project {
  id: string
  userId: string
  initiativeId: string
  name: string
  description?: string
  status: ProjectStatus
  createdAt: Date
}
export type EventType = "meeting" | "reminder" | "deadline" | "personal" | "other"
export type EmotionalState = "neutral" | "positive" | "negative" | "excited" | "anxious"
export type RelationshipType = "family" | "friend" | "colleague" | "acquaintance" | "romantic" | "professional"
export type ActivityType = "social" | "entertainment" | "fitness" | "cultural" | "outdoor" | "dining" | "shopping"
export type HealthMetricType =
  | "sleep"
  | "exercise"
  | "nutrition"
  | "mood"
  | "stress"
  | "weight"
  | "heart_rate"
  | "steps"

/** Linked Google / Gmail identity (OAuth). */
export interface LinkedGoogleAccount {
  id: string
  /** Google user id (stable per account). */
  googleSub: string
  email: string
  name?: string
  picture?: string
  linkedAt: Date
}

/** Additional emails tied to the same account (sign-in, notifications, recovery). */
export interface LinkedEmailAddress {
  id: string
  email: string
  verified: boolean
  isPrimary: boolean
  addedAt: Date
}

export interface User {
  id: string
  name: string
  email: string
  /** Extra addresses beyond the primary `email`; optional until loaded from account settings. */
  linkedEmails?: LinkedEmailAddress[]
  phoneNumber?: string
  createdAt: Date
}

export interface FinancialTransaction {
  id: string
  userId: string
  amount: number
  type: TransactionType
  category: string
  description: string
  date: Date
  tags?: string[]
}

export interface Task {
  id: string
  userId: string
  title: string
  description?: string
  status: TaskStatus
  priority: number // 1-5
  dueDate?: Date
  completedDate?: Date
  tags?: string[]
  /** When set, task lives under a project (and its initiative). */
  projectId?: string
  /** Other tasks in the same project that must be completed before this one (no cycles). */
  dependsOnTaskIds?: string[]
}

export interface CalendarEvent {
  id: string
  userId: string
  title: string
  description?: string
  type: EventType
  startDate: Date
  endDate?: Date
  location?: string
  participants?: string[]
  tags?: string[]
  /** When false, event still appears but styled as not attending. Default true. */
  attending?: boolean
}

export interface Memory {
  id: string
  userId: string
  text: string
  emotion?: EmotionalState
  timestamp: Date
  location?: string
  context?: string
  confidence: number
  tags: string[]
  vector?: number[] // For Pinecone storage
  relatedEntities?: {
    transactions?: string[]
    tasks?: string[]
    events?: string[]
  }
}

export interface MessageIntent {
  type: "query" | "command" | "conversation"
  action?: "log" | "schedule" | "remind" | "update" | "delete" | "view"
  entity?: "transaction" | "task" | "event" | "memory"
  parameters?: Record<string, any>
}

export interface Message {
  id: string
  userId: string
  text: string
  sender: "user" | "assistant"
  timestamp: Date
  intent?: MessageIntent
  requiresLandingPage?: boolean
  landingPageUrl?: string
}

export interface LandingPage {
  id: string
  userId: string
  type: "transaction-form" | "task-form" | "event-form" | "memory-form" | "integration-form"
  title: string
  description?: string
  data?: Record<string, any>
  createdAt: Date
  expiresAt: Date
  completed: boolean
}

export interface Integration {
  id: string
  userId: string
  service: "google-calendar" | "stripe" | "quickbooks" | "other"
  name: string
  status: "active" | "inactive" | "error"
  authData?: Record<string, any>
  lastSynced?: Date
}

export interface Contact {
  id: string
  userId: string
  name: string
  email?: string
  phone?: string
  relationshipType: RelationshipType
  birthday?: Date
  lastContact?: Date
  notes?: string
  socialAccounts?: {
    platform: string
    username: string
    profileUrl?: string
  }[]
  tags?: string[]
  importance: number // 1-5
}

export interface SocialActivity {
  id: string
  userId: string
  title: string
  description: string
  type: ActivityType
  estimatedCost: number
  duration: number // in minutes
  location?: string
  participants?: string[]
  suggestedDate?: Date
  tags?: string[]
}

export interface HealthMetric {
  id: string
  userId: string
  type: HealthMetricType
  value: number
  unit: string
  timestamp: Date
  notes?: string
}

export interface DailyRoutine {
  id: string
  userId: string
  name: string
  isDefault: boolean
  timeBlocks: {
    id: string
    startTime: string // HH:MM format
    endTime: string
    title: string
    description?: string
    category: "work" | "personal" | "health" | "social" | "other"
    isFlexible: boolean
  }[]
  tags?: string[]
}

export interface DailyPlan {
  id: string
  userId: string
  date: Date
  routineId?: string
  customBlocks: {
    id: string
    startTime: string
    endTime: string
    title: string
    description?: string
    category: "work" | "personal" | "health" | "social" | "other"
    completed: boolean
  }[]
  notes?: string
}

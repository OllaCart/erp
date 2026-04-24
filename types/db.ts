/**
 * Supabase database row types — mirrors the SQL schema exactly.
 * Used in API routes and server-side lib files.
 */

export type BusinessId =
  | "swiftfi"
  | "unbeatableloans"
  | "ollacart"
  | "personal"
  | "mortgage"   // day-job at a mortgage company (employment, not startup)
  | "projects"   // standalone software/dev projects

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked" | "archived"
export type TaskPriority = "urgent" | "high" | "medium" | "low"
export type TaskCategory = "dev" | "outreach" | "pitch" | "support" | "ops" | "finance"
export type TaskSource = "manual" | "email" | "github" | "calendar" | "claude" | "chat"
export type RecurrenceRule = "daily" | "weekly" | "monthly" | "yearly"
export type EmailCategory =
  | "urgent"
  | "investor"
  | "reply-needed"
  | "customer"
  | "developer"
  | "fyi"
  | "spam"

export interface DbTask {
  id: string
  business_id: BusinessId
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  category: TaskCategory | null
  source: TaskSource
  source_id: string | null
  assignee: string
  due_date: string | null               // ISO date string "YYYY-MM-DD"
  /** Calendar time block start (ISO); unscheduled tasks sort above scheduled within same priority */
  scheduled_start: string | null
  scheduled_end: string | null
  calendar_event_id: string | null
  completed_at: string | null           // ISO timestamp
  notes: string | null
  recurrence_rule: RecurrenceRule | null
  recurrence_interval: number | null    // every N units (default 1)
  recurrence_parent_id: string | null   // set on auto-spawned occurrences
  follows_up_on: string | null          // UUID of the task this was created to follow up on
  created_at: string
  updated_at: string
}

export interface DbEmailAccount {
  id: string
  business_id: BusinessId
  email_address: string
  display_name: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  last_synced_at: string | null
  is_active: boolean
  created_at: string
}

export interface DbEmail {
  id: string
  account_id: string
  business_id: BusinessId
  gmail_message_id: string | null
  gmail_thread_id: string | null
  from_address: string | null
  from_name: string | null
  to_addresses: string[] | null
  subject: string | null
  body_plain: string | null
  body_html: string | null
  received_at: string | null
  is_read: boolean
  claude_category: EmailCategory | null
  claude_summary: string | null
  claude_draft_reply: string | null
  task_id: string | null
  created_at: string
}

// ── Input types for creating/updating ────────────────────────────────────────

export interface CreateTaskInput {
  business_id: BusinessId
  title: string
  description?: string
  priority?: TaskPriority
  category?: TaskCategory
  due_date?: string
  notes?: string
  source?: TaskSource
  source_id?: string
  assignee?: string
  recurrence_rule?: RecurrenceRule
  recurrence_interval?: number
  recurrence_parent_id?: string
  follows_up_on?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  category?: TaskCategory
  due_date?: string | null
  notes?: string
  assignee?: string
  completed_at?: string | null
  recurrence_rule?: RecurrenceRule | null
  recurrence_interval?: number | null
}

# Module 03 — Task Manager (Replaces Linear)
# Dash ERP System Specification

## Purpose

A fully Claude-integrated task manager that replaces Linear. Tasks are created
from chat, email, GitHub webhooks, or manually. Claude prioritizes them daily.
Per-business views. Simple to-do list style (founder preference).

## Task Schema

  Supabase Table: tasks
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    title: text NOT NULL
    description: text
    status: text DEFAULT 'todo'         -- "todo" | "in_progress" | "done" | "blocked"
    priority: text DEFAULT 'medium'     -- "urgent" | "high" | "medium" | "low"
    category: text                      -- "dev" | "outreach" | "pitch" | "support" | "ops" | "finance"
    source: text                        -- "manual" | "email" | "github" | "calendar" | "claude" | "chat"
    source_id: text                     -- ID of the email/PR/event that created this task
    assignee: text DEFAULT 'founder'    -- "founder" | "developer" | email address
    due_date: date
    completed_at: timestamp
    notes: text
    created_at: timestamp DEFAULT now()
    updated_at: timestamp DEFAULT now()

  Neo4j: Also mirror tasks as Task nodes for graph relationships
    (Task)-[:BELONGS_TO]->(Business)
    (Task)-[:CREATED_FROM]->(Email | PR | Event)
    (Task)-[:ASSIGNED_TO]->(Contact)

## API Routes

  GET /api/tasks
    - Returns tasks filtered by business_id, status, priority, assignee
    - Default: all non-done tasks for all businesses, sorted by priority
    - Params: business_id?, status?, priority?, category?, limit, offset

  POST /api/tasks
    - Create a new task
    - Body: title, business_id, priority?, category?, due_date?, notes?, source?

  PATCH /api/tasks/:id
    - Update task: status, priority, notes, assignee, due_date

  DELETE /api/tasks/:id
    - Soft delete (set status = "archived")

  POST /api/tasks/prioritize
    - Calls Claude to re-prioritize all open tasks
    - Returns tasks sorted by Claude's recommended priority
    - Saves priority updates to DB

  POST /api/tasks/from-email
    - Creates a task linked to an email
    - Params: email_id, title (Claude suggests this automatically)

  POST /api/tasks/from-github
    - Creates a task linked to a GitHub PR or issue
    - Params: repo, pr_number | issue_number, business_id

## Claude Prioritization Logic

  Run daily at 6am and on-demand.

  System prompt for prioritization:
    Given these open tasks across my businesses, rank them by what I should
    do TODAY first. Consider:
    - SwiftFi tasks > others (revenue-generating business)
    - Anything blocking the developer is urgent
    - Investor follow-ups older than 48h are urgent
    - Support tickets from paying customers are high priority
    - UnbeatableLoans tasks happen at night — don't mix with daytime tasks
    - OllaCart Rye API integration is the current active project

    Return JSON array of task IDs in priority order with brief reasoning.

## Auto-Task Creation Rules

  From email (via Claude categorization):
    IF category = "urgent" OR "reply-needed" OR "investor"
    THEN auto-create task: "Reply to: {email subject}" linked to email

  From GitHub (via webhook):
    IF event = "pull_request.opened"
    THEN create task: "Review PR: {pr.title}" for business_id of that repo

    IF event = "issues.opened"
    THEN create task: "Issue opened: {issue.title}" for business_id of that repo

    IF event = "pull_request.review_requested"
    THEN create task: "PR review requested: {pr.title}" priority=urgent

  From calendar:
    IF event created with external attendees
    THEN create task: "Prep for: {event.title}" due_date = event.start - 1 day

## UI Components

  File: /components/tasks/TaskView.tsx

  Layout:
    - Business tabs at top (All / SwiftFi / UnbeatableLoans / OllaCart)
    - Priority sections: Urgent / High / Medium / Low
    - Each task row: checkbox, title, business badge, category, due date, source icon
    - Click task to expand: description, notes, linked source, assignee

  Quick add:
    - Text input at top: "Add a task..." with Enter to save
    - Auto-detects business from context (whichever tab is active)
    - Claude suggests priority and category from title text

  Views:
    - My tasks (assignee = founder)
    - Developer tasks (assignee = developer)
    - All tasks

  Filters:
    - By status: Todo / In Progress / Done
    - By category: Dev / Outreach / Pitch / Support / Ops
    - By source: Manual / Email / GitHub / Claude

  Actions per task:
    - Check off (marks done, logs completion time)
    - Change priority (click priority badge)
    - Assign to developer (sends notification)
    - Convert to GitHub issue (for dev tasks)
    - View linked source (email, PR, calendar event)

## Weekly Review (Claude-generated)

  Every Sunday 8pm, Claude generates a weekly summary:
  - Tasks completed this week per business
  - Tasks that slipped (overdue)
  - Recommended focus for next week
  - Patterns noticed ("You completed 80% of SwiftFi tasks but 20% of OllaCart")

  Delivered as a message in the Dash chat interface.

## Task Categories Explained

  dev:        Code-related, GitHub, Cursor, features, bugs
  outreach:   Investor emails, partnership emails, cold outreach
  pitch:      Deck, elevator pitch, demo prep, VC meetings
  support:    Customer support tickets and follow-ups
  ops:        Business operations, legal, admin, accounting
  finance:    Revenue tracking, invoicing, payments, burn rate

## Integration Points

  Email module:    Auto-creates tasks from categorized emails
  GitHub module:   Auto-creates tasks from webhooks
  Calendar module: Auto-creates prep tasks for meetings
  VC module:       Tasks linked to investor pipeline stages
  Support module:  Tasks linked to support tickets

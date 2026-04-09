# Module 01 — Claude AI Brain + Memory Layer
# Dash ERP System Specification

## Purpose

Claude is the intelligence layer of the entire system. Every module uses Claude to:
  - Summarize incoming data (emails, PRs, tickets)
  - Prioritize tasks across businesses
  - Draft responses and content
  - Surface what matters most right now
  - Remember context across sessions via Neo4j

## API Route

  File: /app/api/claude/route.ts
  Method: POST
  Auth: Session required

## Request Schema

  {
    message: string,              // User's input or system trigger
    business_id?: string,         // "swiftfi" | "unbeatableloans" | "ollacart" | null (all)
    module?: string,              // "tasks" | "email" | "calendar" | "dev" | "support" | "vc"
    include_memory?: boolean,     // Inject Neo4j memory into context (default: true)
    tools?: string[],             // Which tools Claude can use in this call
    stream?: boolean              // Stream response (default: true)
  }

## System Prompt Construction

Build system prompt dynamically before every Claude call. Inject:

  1. Role definition
  2. Current business context (if business_id provided)
  3. Today's date and time
  4. Recent memories from Neo4j (last 20 relevant nodes)
  5. Open tasks count per business
  6. Module-specific context

### Base System Prompt Template

  You are Dash, an AI chief of staff for a founder managing three startups:
  SwiftFi (crypto onramp, revenue-generating), UnbeatableLoans (mortgage app),
  and OllaCart (social shopping cart with Rye API integration in progress).

  Current date: {date}
  Current time: {time}
  Active business: {business_id or "all businesses"}

  --- MEMORY CONTEXT ---
  {injected_memory_nodes}

  --- OPEN TASKS ---
  SwiftFi: {n} open tasks ({n_urgent} urgent)
  UnbeatableLoans: {n} open tasks
  OllaCart: {n} open tasks

  --- MODULE CONTEXT ---
  {module_specific_context}

  RULES:
  - Always tag your responses with the relevant business_id
  - Surface the 3-5 most important actions, not everything
  - When drafting emails or messages, match the tone of that business brand
  - SwiftFi tone: modern, fast, fintech-forward
  - UnbeatableLoans tone: professional, trustworthy, mortgage-industry standard
  - OllaCart tone: friendly, social, community-driven
  - Never mix up business contexts in a single response
  - Flag when something is urgent vs. can wait

## Memory System (Neo4j)

### Memory Node Schema

  Node label: Memory
  Properties:
    id: string (uuid)
    business_id: string
    type: "fact" | "decision" | "contact" | "preference" | "event" | "task_context"
    content: string (the actual memory, plain text)
    importance: 1-5 (5 = critical, always inject)
    source: "user" | "email" | "github" | "calendar" | "claude"
    created_at: datetime
    last_accessed: datetime
    expires_at: datetime | null

### Memory Injection Logic

  File: /lib/memory.ts

  Function: getRelevantMemories(business_id, module, user_message)

  Steps:
    1. Fetch all memories with importance >= 4 (always include)
    2. Fetch memories where business_id matches
    3. Run semantic search against user_message to find relevant memories
    4. Sort by importance DESC, last_accessed DESC
    5. Limit to 20 memories total
    6. Format as plain text for system prompt injection

### Memory Creation

  After every Claude response, extract and save new memories:
  - New contacts mentioned
  - Decisions made ("I decided to...")
  - Preferences stated ("I prefer...", "always...", "never...")
  - Important facts about the business
  - Task completions

  File: /lib/memory.ts
  Function: extractAndSaveMemories(claude_response, business_id, source_module)

### Critical Persistent Memories (seed on first run)

  Save these immediately as importance=5 memories:

  business: swiftfi
  - SwiftFi is a crypto onramp app at swiftfi.com
  - SwiftFi is currently generating revenue — it is the highest priority business
  - SwiftFi has a developer who maintains the app repo
  - SwiftFi uses GoHighLevel for outreach
  - Landing page is one repo, app is another repo

  business: unbeatableloans
  - UnbeatableLoans is a mortgage app at unbeatableloans.com
  - Founder works on UnbeatableLoans at night because mortgage developers are hard to find
  - UnbeatableLoans uses GoHighLevel for outreach
  - Needs to document mortgage features for future developer hire

  business: ollacart
  - OllaCart is a social universal shopping cart at ollacart.com
  - Currently integrating Rye API (in progress)
  - john@ollacart.com is the development email
  - support@ollacart.com is the support email
  - OllaCart ERP repo is the main app (github.com/OllaCart/erp)

  business: all
  - Founder uses Cursor as primary IDE
  - Founder prefers to-do list style task management
  - System replaces Linear (task management), Marblism (social media)

## Claude API Call Implementation

  Model: claude-sonnet-4-6
  Max tokens: 1024 (conversation), 4096 (drafting/analysis)
  Stream: true for UI, false for background jobs

  File: /lib/claude.ts

  async function callClaude({
    messages,
    system_prompt,
    max_tokens = 1024,
    stream = true,
    tools = []
  })

  Always include:
    - x-api-key header from ANTHROPIC_API_KEY env var
    - anthropic-version: "2023-06-01"
    - content-type: application/json

## Tools Available to Claude

  Define these tools in Claude API calls for agentic behavior:

  create_task:
    description: Create a task in the task manager
    parameters: title, business_id, priority, due_date, notes

  update_task:
    description: Update or complete an existing task
    parameters: task_id, status, notes

  save_memory:
    description: Save an important fact to long-term memory
    parameters: content, business_id, type, importance

  search_emails:
    description: Search emails across connected accounts
    parameters: query, business_id, account_email, limit

  draft_email:
    description: Draft an email reply for review
    parameters: to, subject, body, business_id, account_email

  get_calendar_events:
    description: Get upcoming calendar events
    parameters: business_id, days_ahead

  create_calendar_event:
    description: Create a calendar event
    parameters: title, start, end, attendees, business_id

  get_github_activity:
    description: Get recent GitHub activity for a repo
    parameters: repo_name, business_id, days_back

## Chat Interface

  File: /components/Chat.tsx (already exists, extend it)

  The main chat interface is the primary way the founder interacts with Claude.
  It should:
  - Show business selector (All / SwiftFi / UnbeatableLoans / OllaCart)
  - Stream Claude responses token by token
  - Render task cards, email drafts, calendar events inline in chat
  - Allow clicking on rendered cards to take action (approve email, complete task)
  - Persist conversation history in Supabase per business per day
  - Show "Dash is thinking..." while streaming

## Background Jobs

  These Claude calls run automatically without user input:

  Daily brief (6am):
    - Pull all open tasks
    - Pull unread emails from last 24h
    - Pull today's calendar events
    - Pull GitHub activity from last 24h
    - Generate a morning briefing per business
    - Save as a Memory node, show in chat

  Email triage (every 15min):
    - Check for new emails across all accounts
    - Claude categorizes: urgent / reply-needed / FYI / spam
    - Creates tasks for emails needing action
    - Drafts suggested replies for review

  GitHub sync (on webhook):
    - Triggered by GitHub webhook
    - Claude summarizes new PRs, commits, issues
    - Creates tasks as needed

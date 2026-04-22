/**
 * /app/api/mcp/route.ts
 * Remote MCP server for Dash ERP — connects to Claude.ai as a custom connector.
 *
 * Protocol: MCP Streamable HTTP (JSON-RPC 2.0 over POST)
 * Auth:     Bearer token matched against MCP_API_KEY env var
 *           (set ?key=<your-key> or Authorization: Bearer <your-key>)
 *
 * Claude.ai connector URL: https://your-app.vercel.app/api/mcp?key=<MCP_API_KEY>
 */

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import {
  isWikiMemoryEnabled,
  wikiPagesDirHasContent,
  loadWikiMemoryForPrompt,
} from "@/lib/wiki-context"

// ── JSON-RPC types ────────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: "2.0"
  id: string | number | null
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

// ── MCP tool definitions ──────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "list_tasks",
    description:
      "List tasks from the Dash ERP. Filter by business, status, priority, or category. Returns up to 50 tasks sorted by priority.",
    inputSchema: {
      type: "object",
      properties: {
        business_id: {
          type: "string",
          enum: ["swiftfi", "unbeatableloans", "ollacart", "personal", "mortgage", "projects"],
          description: "Filter by business (optional — omit for all)",
        },
        status: {
          type: "string",
          enum: ["todo", "in_progress", "blocked", "done", "archived"],
          description: "Filter by status (optional)",
        },
        priority: {
          type: "string",
          enum: ["urgent", "high", "medium", "low"],
          description: "Filter by priority (optional)",
        },
        category: {
          type: "string",
          description: "Filter by category e.g. 'engineering', 'marketing' (optional)",
        },
        limit: {
          type: "number",
          description: "Max tasks to return (default 20, max 50)",
        },
      },
    },
  },
  {
    name: "create_task",
    description: "Create a new task in the Dash ERP.",
    inputSchema: {
      type: "object",
      required: ["business_id", "title"],
      properties: {
        business_id: {
          type: "string",
          enum: ["swiftfi", "unbeatableloans", "ollacart", "personal", "mortgage", "projects"],
        },
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Detailed description (optional)" },
        priority: {
          type: "string",
          enum: ["urgent", "high", "medium", "low"],
          description: "Default: medium",
        },
        category: {
          type: "string",
          description: "Category e.g. 'engineering', 'marketing', 'legal' (optional)",
        },
        due_date: {
          type: "string",
          description: "ISO 8601 date string e.g. 2025-01-31 (optional)",
        },
        notes: { type: "string", description: "Additional notes (optional)" },
      },
    },
  },
  {
    name: "update_task_status",
    description: "Update the status of an existing task.",
    inputSchema: {
      type: "object",
      required: ["task_id", "status"],
      properties: {
        task_id: { type: "string", description: "UUID of the task" },
        status: {
          type: "string",
          enum: ["todo", "in_progress", "blocked", "done", "archived"],
        },
      },
    },
  },
  {
    name: "list_contacts",
    description:
      "List CRM contacts. Supports filtering by business, contact type, pipeline stage, or name/email search.",
    inputSchema: {
      type: "object",
      properties: {
        business_id: {
          type: "string",
          enum: ["swiftfi", "unbeatableloans", "ollacart"],
        },
        contact_type: {
          type: "string",
          enum: ["lead", "customer", "investor", "partner", "vendor"],
        },
        pipeline_stage: { type: "string", description: "Pipeline stage filter (optional)" },
        search: { type: "string", description: "Search name, email, or company (optional)" },
        limit: { type: "number", description: "Max contacts to return (default 20, max 100)" },
      },
    },
  },
  {
    name: "list_calendar_events",
    description: "List upcoming calendar events from the ERP. Defaults to the next 7 days.",
    inputSchema: {
      type: "object",
      properties: {
        business_id: {
          type: "string",
          enum: ["swiftfi", "unbeatableloans", "ollacart", "personal", "mortgage", "projects"],
        },
        start_date: {
          type: "string",
          description: "ISO 8601 date (default: today)",
        },
        end_date: {
          type: "string",
          description: "ISO 8601 date (default: 7 days from now)",
        },
        event_type: { type: "string", description: "Filter by event type (optional)" },
      },
    },
  },
  {
    name: "list_emails",
    description:
      "List recent emails synced into the ERP. Filter by business, category, or read status.",
    inputSchema: {
      type: "object",
      properties: {
        business_id: {
          type: "string",
          enum: ["swiftfi", "unbeatableloans", "ollacart", "personal", "mortgage", "projects"],
        },
        category: {
          type: "string",
          enum: ["action_required", "fyi", "revenue", "spam", "legal", "investor", "other"],
        },
        unread_only: {
          type: "boolean",
          description: "Return only unread emails (default false)",
        },
        limit: { type: "number", description: "Max emails to return (default 10, max 50)" },
      },
    },
  },
  {
    name: "get_founder_context",
    description:
      "Retrieve the founder's business context and memory — wiki pages, goals, and current status for each business. Useful for orientation before answering complex questions.",
    inputSchema: {
      type: "object",
      properties: {
        business_id: {
          type: "string",
          enum: ["swiftfi", "unbeatableloans", "ollacart", "personal", "mortgage", "projects", "all"],
          description: "Which business context to load (default: all)",
        },
        topic: {
          type: "string",
          description: "Topic/question to bias memory retrieval (optional)",
        },
      },
    },
  },
]

// ── Auth helper ───────────────────────────────────────────────────────────────

function isAuthorized(request: Request): boolean {
  const apiKey = process.env.MCP_API_KEY?.trim()
  if (!apiKey) return true // no key configured → open (dev only)

  // Check Authorization: Bearer <key>
  const authHeader = request.headers.get("authorization") ?? ""
  if (authHeader.startsWith("Bearer ") && authHeader.slice(7) === apiKey) return true

  // Check ?key= query param (for URL-only connector config)
  const { searchParams } = new URL(request.url)
  if (searchParams.get("key") === apiKey) return true

  return false
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function handleListTasks(params: Record<string, unknown>) {
  const limit = Math.min(Number(params.limit ?? 20), 50)

  let query = supabaseAdmin
    .from("tasks")
    .select("id,title,description,status,priority,category,due_date,business_id,assignee,created_at")
    .neq("status", "archived")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit)

  if (params.business_id) query = query.eq("business_id", params.business_id as string)
  if (params.status) query = query.eq("status", params.status as string)
  if (params.priority) query = query.eq("priority", params.priority as string)
  if (params.category) query = query.eq("category", params.category as string)

  const { data, error } = await query
  if (error) throw new Error(`DB error: ${error.message}`)

  return { tasks: data ?? [], count: data?.length ?? 0 }
}

async function handleCreateTask(params: Record<string, unknown>) {
  if (!params.business_id || !params.title) {
    throw new Error("business_id and title are required")
  }

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      business_id: params.business_id,
      title: String(params.title).trim(),
      description: params.description ?? null,
      priority: params.priority ?? "medium",
      category: params.category ?? null,
      due_date: params.due_date ?? null,
      notes: params.notes ?? null,
      source: "mcp",
      assignee: "founder",
    })
    .select()
    .single()

  if (error) throw new Error(`DB error: ${error.message}`)
  return { task: data, message: `Task created: "${data.title}"` }
}

async function handleUpdateTaskStatus(params: Record<string, unknown>) {
  if (!params.task_id || !params.status) {
    throw new Error("task_id and status are required")
  }

  const update: Record<string, unknown> = { status: params.status }
  if (params.status === "done") {
    update.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update(update)
    .eq("id", params.task_id as string)
    .select()
    .single()

  if (error) throw new Error(`DB error: ${error.message}`)
  return { task: data, message: `Task status updated to "${params.status}"` }
}

async function handleListContacts(params: Record<string, unknown>) {
  const limit = Math.min(Number(params.limit ?? 20), 100)

  let query = supabaseAdmin
    .from("crm_contacts")
    .select("id,first_name,last_name,email,phone,company,contact_type,pipeline_stage,business_id,tags,last_activity_at")
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .limit(limit)

  if (params.business_id) query = query.eq("business_id", params.business_id as string)
  if (params.contact_type) query = query.eq("contact_type", params.contact_type as string)
  if (params.pipeline_stage) query = query.eq("pipeline_stage", params.pipeline_stage as string)
  if (params.search) {
    const s = params.search as string
    query = query.or(
      `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%`,
    )
  }

  const { data, error } = await query
  if (error) throw new Error(`DB error: ${error.message}`)

  return { contacts: data ?? [], count: data?.length ?? 0 }
}

async function handleListCalendarEvents(params: Record<string, unknown>) {
  const startDate = params.start_date
    ? new Date(params.start_date as string)
    : new Date()
  const endDate = params.end_date
    ? new Date(params.end_date as string)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  let query = supabaseAdmin
    .from("calendar_events")
    .select("id,title,description,start_time,end_time,event_type,business_id,attendees,location")
    .gte("start_time", startDate.toISOString())
    .lte("start_time", endDate.toISOString())
    .order("start_time", { ascending: true })

  if (params.business_id) query = query.eq("business_id", params.business_id as string)
  if (params.event_type) query = query.eq("event_type", params.event_type as string)

  const { data, error } = await query
  if (error) throw new Error(`DB error: ${error.message}`)

  return { events: data ?? [], count: data?.length ?? 0 }
}

async function handleListEmails(params: Record<string, unknown>) {
  const limit = Math.min(Number(params.limit ?? 10), 50)

  let query = supabaseAdmin
    .from("emails")
    .select("id,subject,from_address,from_name,received_at,claude_category,is_read,snippet,business_id")
    .order("received_at", { ascending: false })
    .limit(limit)

  if (params.business_id) query = query.eq("business_id", params.business_id as string)
  if (params.category) query = query.eq("claude_category", params.category as string)
  if (params.unread_only === true) query = query.eq("is_read", false)

  const { data, error } = await query
  if (error) throw new Error(`DB error: ${error.message}`)

  return { emails: data ?? [], count: data?.length ?? 0 }
}

async function handleGetFounderContext(params: Record<string, unknown>) {
  const businessId = (params.business_id as string) ?? "all"
  const topic = (params.topic as string) ?? ""

  if (isWikiMemoryEnabled() && (await wikiPagesDirHasContent())) {
    const wikiResult = await loadWikiMemoryForPrompt({
      businessId: businessId as "swiftfi" | "unbeatableloans" | "ollacart" | "personal" | "mortgage" | "projects" | "all",
      module: "chat",
      userMessage: topic,
    })
    if (wikiResult.usedWiki) {
      return {
        source: "wiki",
        context: wikiResult.text,
        pages_loaded: wikiResult.injectedPaths,
      }
    }
  }

  // Fallback: return basic business summary
  return {
    source: "static",
    context: `Dash ERP — Founder OS for three startups:
- SwiftFi (swiftfi.com): crypto onramp, revenue-generating
- UnbeatableLoans (unbeatableloans.com): mortgage app, early stage
- OllaCart (ollacart.com): social shopping cart, Rye API integration in progress

Wiki pages are not yet populated. Add .md files to /wiki/pages/ for richer context.`,
  }
}

// ── Tool dispatcher ───────────────────────────────────────────────────────────

async function callTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_tasks":          return handleListTasks(input)
    case "create_task":         return handleCreateTask(input)
    case "update_task_status":  return handleUpdateTaskStatus(input)
    case "list_contacts":       return handleListContacts(input)
    case "list_calendar_events":return handleListCalendarEvents(input)
    case "list_emails":         return handleListEmails(input)
    case "get_founder_context": return handleGetFounderContext(input)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ── JSON-RPC dispatcher ───────────────────────────────────────────────────────

async function handleRpcRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const id = req.id ?? null

  try {
    switch (req.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "dash-erp", version: "1.0.0" },
          },
        }

      case "ping":
        return { jsonrpc: "2.0", id, result: {} }

      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: TOOLS } }

      case "tools/call": {
        const params = req.params ?? {}
        const toolName = params.name as string
        const toolInput = (params.arguments ?? {}) as Record<string, unknown>

        if (!toolName) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing tool name" },
          }
        }

        const result = await callTool(toolName, toolInput)
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          },
        }
      }

      // Notifications are fire-and-forget — acknowledge with no result
      case "notifications/initialized":
      case "notifications/cancelled":
        return { jsonrpc: "2.0", id, result: null }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error"
    console.error(`[MCP] tool error (${req.method}):`, err)
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message },
    }
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * GET /api/mcp
 * Used by some MCP clients for discovery / capability check.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({
    name: "dash-erp",
    version: "1.0.0",
    description: "Dash ERP — MCP server for SwiftFi, UnbeatableLoans, OllaCart",
    protocol: "mcp",
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
  })
}

/**
 * POST /api/mcp
 * Main MCP Streamable HTTP endpoint. Accepts JSON-RPC 2.0 messages.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: invalid JSON" },
      },
      { status: 400 },
    )
  }

  // Handle batch requests (array of JSON-RPC messages)
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map((req) => handleRpcRequest(req as JsonRpcRequest)),
    )
    return NextResponse.json(responses, {
      headers: { "Content-Type": "application/json" },
    })
  }

  // Single request
  const response = await handleRpcRequest(body as JsonRpcRequest)
  return NextResponse.json(response, {
    headers: { "Content-Type": "application/json" },
  })
}

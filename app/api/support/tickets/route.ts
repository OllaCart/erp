import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { callClaudeJSON } from "@/lib/claude"

const TICKET_PREFIX: Record<string, string> = {
  swiftfi:         "SWF",
  unbeatableloans: "UBL",
  ollacart:        "OLC",
}

const BUSINESS_CONTEXT: Record<string, string> = {
  swiftfi:         "SwiftFi is a crypto onramp app. Common issues: transaction failures, KYC verification, wallet connections, deposit delays.",
  unbeatableloans: "UnbeatableLoans is a mortgage app. Common issues: loan status, document submission, rate questions, application status.",
  ollacart:        "OllaCart is a social shopping cart using Rye API. Common issues: cart sharing, product not found, Rye API errors, account issues.",
}

const ESCALATION_KEYWORDS = ["lawsuit", "fraud", "scam", "chargeback", "lawyer", "legal action"]

/**
 * GET /api/support/tickets
 * List tickets with optional filters.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const business_id = searchParams.get("business_id")
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")
  const category = searchParams.get("category")
  const limit = parseInt(searchParams.get("limit") ?? "50", 10)
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)

  let query = supabaseAdmin
    .from("support_tickets")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1)

  if (business_id) query = query.eq("business_id", business_id)
  if (status) query = query.eq("status", status)
  else query = query.neq("status", "closed") // default: exclude closed
  if (priority) query = query.eq("priority", priority)
  if (category) query = query.eq("category", category)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  // Metrics
  const { data: metrics } = await supabaseAdmin
    .from("support_tickets")
    .select("business_id, status, priority")
    .neq("status", "closed")

  const open = (metrics ?? []).filter((t) => t.status === "open").length
  const urgent = (metrics ?? []).filter((t) => t.priority === "urgent").length
  const resolvedToday = (metrics ?? []).filter((t) => t.status === "resolved").length

  return NextResponse.json({
    tickets: data ?? [],
    metrics: { open, urgent, resolved_today: resolvedToday },
  })
}

/**
 * POST /api/support/tickets
 * Create a new support ticket (also called internally from email sync).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.business_id || !body?.customer_email || !body?.subject) {
    return NextResponse.json(
      { error: "business_id, customer_email, and subject are required", code: "MISSING_FIELDS" },
      { status: 400 },
    )
  }

  // Generate ticket number
  const prefix = TICKET_PREFIX[body.business_id] ?? body.business_id.toUpperCase().slice(0, 3)
  const { data: seqRow } = await supabaseAdmin
    .from("ticket_number_seq")
    .select("next_val")
    .eq("business_id", body.business_id)
    .single()

  const seqNum = seqRow?.next_val ?? 1
  const ticketNumber = `${prefix}-${String(seqNum).padStart(4, "0")}`

  await supabaseAdmin
    .from("ticket_number_seq")
    .upsert({ business_id: body.business_id, next_val: seqNum + 1 })

  // Check for escalation keywords
  const messageText = `${body.subject} ${body.first_message ?? ""}`.toLowerCase()
  const needsEscalation = ESCALATION_KEYWORDS.some((kw) => messageText.includes(kw))

  // Claude analysis
  const analysis = await callClaudeJSON<{
    category: string
    priority: string
    sentiment: string
    diagnosis: string
    suggested_action: string
    draft_reply: string
  }>(
    `Support ticket for ${body.business_id}:
Customer: ${body.customer_name ?? body.customer_email}
Subject: ${body.subject}
Message: ${body.first_message ?? "(none)"}

Analyze and return JSON:
{
  "category": "billing|technical|account|general|refund",
  "priority": "urgent|high|normal|low",
  "sentiment": "positive|neutral|frustrated|angry",
  "diagnosis": "brief assessment of the issue",
  "suggested_action": "what the founder should do",
  "draft_reply": "a complete draft reply in the correct brand voice"
}`,
    `You are triaging customer support for ${BUSINESS_CONTEXT[body.business_id] ?? body.business_id}. Be empathetic and practical.`,
  )

  const finalPriority = needsEscalation || analysis.sentiment === "angry" ? "urgent" : analysis.priority

  const { data: ticket, error } = await supabaseAdmin
    .from("support_tickets")
    .insert({
      business_id: body.business_id,
      email_id: body.email_id ?? null,
      ticket_number: ticketNumber,
      status: "open",
      priority: finalPriority,
      category: analysis.category,
      customer_email: body.customer_email,
      customer_name: body.customer_name ?? null,
      subject: body.subject,
      first_message: body.first_message ?? null,
      claude_diagnosis: analysis.diagnosis,
      sentiment: analysis.sentiment,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  // Save the first inbound message
  if (body.first_message && ticket) {
    await supabaseAdmin.from("ticket_messages").insert({
      ticket_id: ticket.id,
      direction: "inbound",
      from_address: body.customer_email,
      body: body.first_message,
      sent_at: body.received_at ?? new Date().toISOString(),
    })
  }

  // Auto-create urgent task if escalated
  if (finalPriority === "urgent" && ticket) {
    await supabaseAdmin.from("tasks").insert({
      business_id: body.business_id,
      title: `Urgent support: ${body.subject}`,
      description: `${analysis.diagnosis}\n\nSuggested action: ${analysis.suggested_action}`,
      priority: "urgent",
      category: "support",
      source: "email",
      source_id: ticket.id,
    })
  }

  return NextResponse.json({ ticket, draft_reply: analysis.draft_reply }, { status: 201 })
}

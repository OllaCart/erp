import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { callClaudeDraft, BUSINESS_NAMES, BUSINESS_TONES } from "@/lib/claude"
import type { BusinessId } from "@/types/db"

type Params = Promise<{ id: string }>

const BRAND_SIGNOFF: Record<string, string> = {
  swiftfi:         "The SwiftFi Team",
  unbeatableloans: "UnbeatableLoans Support",
  ollacart:        "The OllaCart Team",
}

const BRAND_PROMISE: Record<string, string> = {
  swiftfi:         "We respond within 24 hours.",
  unbeatableloans: "We respond within 1 business day.",
  ollacart:        "We respond within 48 hours.",
}

/**
 * POST /api/support/tickets/:id/draft-reply
 * Calls Claude to draft a support reply. Never sends — returns draft for review.
 */
export async function POST(_request: Request, { params }: { params: Params }) {
  const { id } = await params

  const { data: ticket, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !ticket) {
    return NextResponse.json({ error: "Ticket not found", code: "NOT_FOUND" }, { status: 404 })
  }

  // Fetch message thread for context
  const { data: messages } = await supabaseAdmin
    .from("ticket_messages")
    .select("direction, from_address, body, sent_at")
    .eq("ticket_id", id)
    .order("sent_at", { ascending: true })

  const thread = (messages ?? [])
    .map((m) => `[${m.direction.toUpperCase()}] ${m.from_address}: ${m.body}`)
    .join("\n\n")

  const bizId = ticket.business_id as BusinessId
  const tone = BUSINESS_TONES[bizId] ?? "professional"
  const signoff = BRAND_SIGNOFF[bizId] ?? "Support Team"
  const promise = BRAND_PROMISE[bizId] ?? ""

  const draft = await callClaudeDraft(
    `Draft a customer support reply for ticket ${ticket.ticket_number}.

Customer: ${ticket.customer_name ?? ticket.customer_email}
Subject: ${ticket.subject}
Category: ${ticket.category ?? "general"}
Sentiment: ${ticket.sentiment ?? "neutral"}
Claude diagnosis: ${ticket.claude_diagnosis ?? "(none)"}

Message thread:
${thread || ticket.first_message || "(no messages)"}

Write the complete reply body only — no subject line. Sign off as "${signoff}". ${promise}`,
    `You are drafting a customer support reply for ${BUSINESS_NAMES[bizId] ?? bizId}. Tone: ${tone}. Be empathetic, clear, and action-oriented. Never make promises you can't keep.`,
  )

  return NextResponse.json({ draft, ticket_id: id })
}

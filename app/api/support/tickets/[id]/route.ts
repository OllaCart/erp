import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

type Params = Promise<{ id: string }>

/**
 * GET /api/support/tickets/:id
 * Returns ticket detail with full message thread.
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  const { id } = await params

  const { data: ticket, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !ticket) {
    return NextResponse.json({ error: "Ticket not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const { data: messages } = await supabaseAdmin
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", id)
    .order("sent_at", { ascending: true })

  return NextResponse.json({ ticket, messages: messages ?? [] })
}

/**
 * PATCH /api/support/tickets/:id
 * Update status, priority, category, resolution notes.
 */
export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id } = await params
  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  const allowed = ["status", "priority", "category", "resolution_notes", "customer_name"]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (body.status === "resolved") {
    updates.resolved_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ ticket: data })
}

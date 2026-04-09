import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * POST /api/email/mark-read
 * Marks one or more emails as read.
 */
export async function POST(request: Request) {
  const { email_ids } = await request.json().catch(() => ({ email_ids: [] }))

  if (!Array.isArray(email_ids) || email_ids.length === 0) {
    return NextResponse.json({ error: "email_ids array required", code: "MISSING_FIELDS" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("emails")
    .update({ is_read: true })
    .in("id", email_ids)

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

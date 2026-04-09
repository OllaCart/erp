import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * DELETE /api/email/accounts/:id
 * Unlinks a Gmail account — clears tokens and marks inactive.
 * Does NOT delete the row so email history is preserved.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const { error } = await supabaseAdmin
    .from("email_accounts")
    .update({
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      is_active: false,
    })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

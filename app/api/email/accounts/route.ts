import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/email/accounts
 * Returns all active email accounts with unread counts per account.
 */
export async function GET() {
  const { data: accounts, error } = await supabaseAdmin
    .from("email_accounts")
    .select("id, business_id, email_address, display_name, last_synced_at, is_active")
    .eq("is_active", true)
    .order("business_id")

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  // Get unread counts per account in one query
  const { data: unreadCounts } = await supabaseAdmin
    .from("emails")
    .select("account_id")
    .eq("is_read", false)

  const countMap: Record<string, number> = {}
  for (const row of unreadCounts ?? []) {
    countMap[row.account_id] = (countMap[row.account_id] ?? 0) + 1
  }

  const result = (accounts ?? []).map((a) => ({
    ...a,
    unread_count: countMap[a.id] ?? 0,
  }))

  return NextResponse.json({ accounts: result })
}

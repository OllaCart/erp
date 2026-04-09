import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import type { BusinessId, EmailCategory } from "@/types/db"

/**
 * GET /api/email/list
 * Returns emails across all accounts or filtered by business/category.
 * Sorted by received_at DESC (newest first).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const business_id = searchParams.get("business_id") as BusinessId | null
  const account_email = searchParams.get("account_email")
  const category = searchParams.get("category") as EmailCategory | null
  const is_read = searchParams.get("is_read")
  const limit = parseInt(searchParams.get("limit") ?? "50", 10)
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)

  let query = supabaseAdmin
    .from("emails")
    .select(`
      *,
      email_accounts ( email_address, display_name, business_id )
    `)
    .order("received_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (business_id) query = query.eq("business_id", business_id)
  if (category) query = query.eq("claude_category", category)
  if (is_read !== null) query = query.eq("is_read", is_read === "true")

  if (account_email) {
    // Filter by specific account email via join
    const { data: account } = await supabaseAdmin
      .from("email_accounts")
      .select("id")
      .eq("email_address", account_email)
      .single()
    if (account) query = query.eq("account_id", account.id)
  }

  const { data, error } = await query

  if (error) {
    console.error("GET /api/email/list error:", error)
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ emails: data, count: data?.length ?? 0 })
}

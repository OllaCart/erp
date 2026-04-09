import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/dev/events
 * Returns recent GitHub events across all repos, optionally filtered.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const business_id = searchParams.get("business_id")
  const repo_id = searchParams.get("repo_id")
  const event_type = searchParams.get("event_type")
  const limit = parseInt(searchParams.get("limit") ?? "50", 10)
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)

  let query = supabaseAdmin
    .from("github_events")
    .select(`
      *,
      repos ( github_repo, display_name, business_id, repo_type )
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (business_id) query = query.eq("business_id", business_id)
  if (repo_id) query = query.eq("repo_id", repo_id)
  if (event_type) query = query.eq("github_event_type", event_type)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ events: data ?? [], count: data?.length ?? 0 })
}

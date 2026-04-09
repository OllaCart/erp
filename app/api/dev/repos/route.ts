import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/dev/repos
 * Returns all active repos, optionally filtered by business_id.
 * Enriches each repo with open PR count and last event from github_events.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const business_id = searchParams.get("business_id")

  let query = supabaseAdmin
    .from("repos")
    .select("*")
    .eq("is_active", true)
    .order("business_id")

  if (business_id) query = query.eq("business_id", business_id)

  const { data: repos, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  // Enrich with latest event per repo
  const enriched = await Promise.all(
    (repos ?? []).map(async (repo) => {
      const { data: latest } = await supabaseAdmin
        .from("github_events")
        .select("github_event_type, github_event_action, actor, claude_summary, created_at")
        .eq("repo_id", repo.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      const { count: openPRs } = await supabaseAdmin
        .from("github_events")
        .select("id", { count: "exact", head: true })
        .eq("repo_id", repo.id)
        .eq("github_event_type", "pull_request")
        .eq("github_event_action", "opened")

      return { ...repo, latest_event: latest ?? null, open_prs: openPRs ?? 0 }
    }),
  )

  return NextResponse.json({ repos: enriched })
}

/**
 * POST /api/dev/repos
 * Add a new repo to track.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.github_repo || !body?.business_id) {
    return NextResponse.json(
      { error: "github_repo and business_id are required", code: "MISSING_FIELDS" },
      { status: 400 },
    )
  }

  const { data, error } = await supabaseAdmin
    .from("repos")
    .insert({
      business_id: body.business_id,
      github_repo: body.github_repo,
      display_name: body.display_name ?? null,
      owner: body.owner ?? "founder",
      repo_type: body.repo_type ?? "app",
      default_branch: body.default_branch ?? "main",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 })
  }

  return NextResponse.json({ repo: data }, { status: 201 })
}

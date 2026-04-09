import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { generateCursorRules, commitCursorRules, commitTasksMd } from "@/lib/cursor-rules"

/**
 * POST /api/dev/update-cursorrules
 * Regenerates .cursorrules and TASKS.md for all active repos and commits them to GitHub.
 * Run on-demand from Dash UI or daily via cron.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { repo_id?: string }

  let query = supabaseAdmin
    .from("repos")
    .select("*")
    .eq("is_active", true)

  if (body.repo_id) query = query.eq("id", body.repo_id)

  const { data: repos, error } = await query
  if (error || !repos) {
    return NextResponse.json({ error: "Failed to load repos", code: "DB_ERROR" }, { status: 500 })
  }

  const results: Array<{
    repo: string
    cursorrules: { ok: boolean; error?: string }
    tasksmd: { ok: boolean; error?: string }
  }> = []

  for (const repo of repos) {
    const [cursorResult, tasksResult] = await Promise.allSettled([
      (async () => {
        const content = await generateCursorRules(repo)
        return commitCursorRules(repo.github_repo, content, repo.default_branch)
      })(),
      commitTasksMd(repo.github_repo, repo.business_id, repo.default_branch),
    ])

    results.push({
      repo: repo.github_repo,
      cursorrules:
        cursorResult.status === "fulfilled"
          ? cursorResult.value
          : { ok: false, error: String(cursorResult.reason) },
      tasksmd:
        tasksResult.status === "fulfilled"
          ? tasksResult.value
          : { ok: false, error: String(tasksResult.reason) },
    })

    // Update last_synced_at
    await supabaseAdmin
      .from("repos")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", repo.id)
  }

  return NextResponse.json({ results, updated_at: new Date().toISOString() })
}

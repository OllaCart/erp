import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { callClaudeJSON } from "@/lib/claude"
import { createHmac } from "crypto"

/**
 * POST /api/webhooks/github
 * Receives GitHub webhook events, validates signature, summarizes with Claude,
 * and auto-creates tasks for actionable events.
 *
 * Configure in GitHub repo settings:
 *   Payload URL: https://your-domain.vercel.app/api/webhooks/github
 *   Content type: application/json
 *   Secret: GITHUB_WEBHOOK_SECRET env var
 *   Events: Pull requests, Pushes, Issues, Issue comments
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-hub-signature-256") ?? ""
  const eventType = request.headers.get("x-github-event") ?? ""

  // Validate signature
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (secret) {
    const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex")
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const repoFullName = (payload.repository as Record<string, unknown>)?.full_name as string
  if (!repoFullName) {
    return NextResponse.json({ ok: true, skipped: "no repository in payload" })
  }

  // Look up repo in Supabase
  const { data: repo } = await supabaseAdmin
    .from("repos")
    .select("id, business_id, display_name, owner")
    .eq("github_repo", repoFullName)
    .single()

  if (!repo) {
    // Unknown repo — still return 200 so GitHub doesn't retry
    return NextResponse.json({ ok: true, skipped: `repo ${repoFullName} not tracked` })
  }

  const action = payload.action as string | undefined
  const actor =
    ((payload.sender as Record<string, unknown>)?.login as string) ??
    ((payload.pusher as Record<string, unknown>)?.name as string) ??
    "unknown"

  // Build event context for Claude
  const eventContext = buildEventContext(eventType, action, payload)

  // Call Claude to summarize
  const analysis = await callClaudeJSON<{
    summary: string
    needs_action: boolean
    task_title: string | null
    priority: "urgent" | "high" | "medium" | "low"
  }>(
    `GitHub event for ${repo.display_name ?? repoFullName}:
Event: ${eventType}${action ? ` (${action})` : ""}
Actor: ${actor}
Context: ${eventContext}

Respond with JSON:
{
  "summary": "1-2 sentence plain-English summary for a non-technical founder",
  "needs_action": true or false (does the founder need to do something?),
  "task_title": "task title if needs_action, else null",
  "priority": "urgent|high|medium|low"
}`,
    "You summarize GitHub events for a non-technical founder managing 3 startups. Be brief and practical.",
  )

  // Save event to Supabase
  const { data: savedEvent } = await supabaseAdmin
    .from("github_events")
    .insert({
      business_id: repo.business_id,
      repo_id: repo.id,
      github_event_type: eventType,
      github_event_action: action ?? null,
      payload,
      claude_summary: analysis.summary,
      actor,
    })
    .select()
    .single()

  // Auto-create task if needed
  if (analysis.needs_action && analysis.task_title && savedEvent) {
    const { data: task } = await supabaseAdmin
      .from("tasks")
      .insert({
        business_id: repo.business_id,
        title: analysis.task_title,
        description: analysis.summary,
        priority: analysis.priority,
        category: "dev",
        source: "github",
        source_id: savedEvent.id,
        assignee:
          repo.owner === "developer" && eventType === "pull_request" ? "developer" : "founder",
      })
      .select()
      .single()

    if (task) {
      await supabaseAdmin
        .from("github_events")
        .update({ task_id: task.id })
        .eq("id", savedEvent.id)
    }
  }

  // Auto-complete linked task when issue is closed
  if (eventType === "issues" && action === "closed") {
    const issueNumber = (payload.issue as Record<string, unknown>)?.number
    if (issueNumber) {
      const { data: linkedEvent } = await supabaseAdmin
        .from("github_events")
        .select("task_id")
        .eq("repo_id", repo.id)
        .eq("github_event_type", "issues")
        .eq("github_event_action", "opened")
        .contains("payload", { issue: { number: issueNumber } })
        .single()

      if (linkedEvent?.task_id) {
        await supabaseAdmin
          .from("tasks")
          .update({ status: "done", completed_at: new Date().toISOString() })
          .eq("id", linkedEvent.task_id)
      }
    }
  }

  return NextResponse.json({ ok: true, summary: analysis.summary })
}

function buildEventContext(
  eventType: string,
  action: string | undefined,
  payload: Record<string, unknown>,
): string {
  if (eventType === "pull_request") {
    const pr = payload.pull_request as Record<string, unknown>
    return `PR #${pr?.number}: "${pr?.title}" — ${pr?.html_url}`
  }
  if (eventType === "push") {
    const commits = payload.commits as Array<Record<string, unknown>>
    const branch = (payload.ref as string)?.replace("refs/heads/", "")
    const msgs = (commits ?? []).slice(0, 3).map((c) => c.message as string).join("; ")
    return `Push to ${branch}: ${msgs || "(no commits)"}`
  }
  if (eventType === "issues") {
    const issue = payload.issue as Record<string, unknown>
    return `Issue #${issue?.number}: "${issue?.title}" — ${issue?.html_url}`
  }
  if (eventType === "issue_comment") {
    const issue = payload.issue as Record<string, unknown>
    const comment = payload.comment as Record<string, unknown>
    return `Comment on issue #${issue?.number}: "${issue?.title}": ${String(comment?.body ?? "").slice(0, 200)}`
  }
  return JSON.stringify(payload).slice(0, 300)
}

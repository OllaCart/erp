"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  RefreshCw,
  GitPullRequest,
  GitCommit,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Code2,
  Layers,
  User,
  Users,
  CheckCheck,
  FileCode2,
} from "lucide-react"
import type { BusinessId } from "@/types/db"

interface Repo {
  id: string
  business_id: BusinessId
  github_repo: string
  display_name: string | null
  owner: "founder" | "developer" | "shared"
  repo_type: "landing" | "app"
  last_synced_at: string | null
  open_prs: number
  latest_event: {
    github_event_type: string
    github_event_action: string | null
    actor: string
    claude_summary: string | null
    created_at: string
  } | null
}

interface GithubEvent {
  id: string
  business_id: BusinessId
  repo_id: string | null
  github_event_type: string
  github_event_action: string | null
  claude_summary: string | null
  actor: string
  created_at: string
  task_id: string | null
  repos: {
    github_repo: string
    display_name: string | null
    business_id: BusinessId
    repo_type: string
  } | null
}

const BUSINESSES: { id: BusinessId; label: string; dot: string }[] = [
  { id: "swiftfi",         label: "SwiftFi",        dot: "bg-blue-500" },
  { id: "unbeatableloans", label: "UnbeatableLoans", dot: "bg-amber-500" },
  { id: "ollacart",        label: "OllaCart",        dot: "bg-orange-500" },
]

const BUSINESS_BADGE: Record<BusinessId, string> = {
  swiftfi:         "bg-blue-100 text-blue-700",
  unbeatableloans: "bg-amber-100 text-amber-700",
  ollacart:        "bg-orange-100 text-orange-700",
  personal:        "bg-zinc-100 text-zinc-600",
  mortgage:        "bg-green-100 text-green-700",
  projects:        "bg-indigo-100 text-indigo-700",
}

const EVENT_ICON: Record<string, React.ReactNode> = {
  pull_request: <GitPullRequest className="h-3.5 w-3.5" />,
  push:         <GitCommit className="h-3.5 w-3.5" />,
  issues:       <AlertCircle className="h-3.5 w-3.5" />,
  issue_comment:<AlertCircle className="h-3.5 w-3.5" />,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function DevView() {
  const [activeBiz, setActiveBiz] = useState<BusinessId>("swiftfi")
  const [repos, setRepos] = useState<Repo[]>([])
  const [events, setEvents] = useState<GithubEvent[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(true)
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [isUpdatingRules, setIsUpdatingRules] = useState(false)
  const [rulesResult, setRulesResult] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"repos" | "activity" | "spec">("repos")

  // Spec writer state
  const [specInput, setSpecInput] = useState("")
  const [specOutput, setSpecOutput] = useState("")
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false)
  const [specBiz, setSpecBiz] = useState<BusinessId>("swiftfi")

  const fetchRepos = useCallback(async () => {
    setIsLoadingRepos(true)
    try {
      const res = await fetch(`/api/dev/repos?business_id=${activeBiz}`)
      const data = await res.json()
      setRepos(data.repos ?? [])
    } catch { /* silent */ }
    finally { setIsLoadingRepos(false) }
  }, [activeBiz])

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true)
    try {
      const res = await fetch(`/api/dev/events?business_id=${activeBiz}&limit=30`)
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch { /* silent */ }
    finally { setIsLoadingEvents(false) }
  }, [activeBiz])

  useEffect(() => { fetchRepos() }, [fetchRepos])
  useEffect(() => { fetchEvents() }, [fetchEvents])

  async function handleUpdateCursorRules() {
    setIsUpdatingRules(true)
    setRulesResult(null)
    try {
      const res = await fetch("/api/dev/update-cursorrules", { method: "POST" })
      const data = await res.json()
      const ok = (data.results ?? []).filter((r: { cursorrules: { ok: boolean } }) => r.cursorrules.ok).length
      setRulesResult(`Updated ${ok} of ${data.results?.length ?? 0} repos`)
    } catch {
      setRulesResult("Failed to update — check GITHUB_TOKEN")
    } finally {
      setIsUpdatingRules(false)
    }
  }

  async function handleGenerateSpec() {
    if (!specInput.trim()) return
    setIsGeneratingSpec(true)
    setSpecOutput("")
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: specBiz,
          module: "dev",
          messages: [{
            role: "user",
            content: `Generate a structured feature spec for this request:\n\n${specInput}`,
          }],
          systemPrompt: `You are a technical product manager. Convert the founder's plain-language feature request into a structured spec.

Format:
## Feature: [name]

**User Story**
As a [user], I want [goal] so that [benefit].

**Acceptance Criteria**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Technical Notes**
[Stack-specific implementation suggestions for Next.js/TypeScript/Supabase/Neo4j]

**Out of Scope**
- [what's NOT included]

**Complexity**
[small / medium / large] — [brief reasoning]`,
        }),
      })
      if (res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let text = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.slice(6))
                if (json.text) { text += json.text; setSpecOutput(text) }
              } catch { /* skip */ }
            }
          }
        }
      }
    } finally {
      setIsGeneratingSpec(false)
    }
  }

  async function handleCreateSpecTask() {
    if (!specOutput) return
    const title = specOutput.match(/## Feature: (.+)/)?.[1] ?? specInput.slice(0, 60)
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: specBiz,
        title,
        description: specOutput,
        priority: "medium",
        category: "dev",
        source: "claude",
      }),
    })
    setSpecOutput("")
    setSpecInput("")
  }

  const bizRepos = repos.filter((r) => r.business_id === activeBiz)

  return (
    <div className="flex flex-col h-full space-y-4 p-4 overflow-y-auto">
      {/* Business tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {BUSINESSES.map((biz) => (
          <button
            key={biz.id}
            onClick={() => setActiveBiz(biz.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeBiz === biz.id
                ? "bg-foreground text-background"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${biz.dot}`} />
            {biz.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={handleUpdateCursorRules}
            disabled={isUpdatingRules}
          >
            {isUpdatingRules ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCode2 className="h-3 w-3" />}
            Update .cursorrules
          </Button>
          {rulesResult && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5 text-green-600" />{rulesResult}
            </span>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b pb-0">
        {(["repos", "activity", "spec"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-sm capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "spec" ? "Spec Writer" : tab === "activity" ? "Activity Feed" : "Repos"}
          </button>
        ))}
      </div>

      {/* ── Repos tab ────────────────────────────────────────────────── */}
      {activeTab === "repos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {isLoadingRepos ? (
            <div className="col-span-2 flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : bizRepos.length === 0 ? (
            <div className="col-span-2 text-center text-muted-foreground text-sm py-12">
              No repos tracked for this business yet.
            </div>
          ) : (
            bizRepos.map((repo) => (
              <div key={repo.id} className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                      <Code2 className="h-4 w-4 text-muted-foreground" />
                      {repo.display_name ?? repo.github_repo}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{repo.github_repo}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${BUSINESS_BADGE[repo.business_id]}`}>
                      {repo.repo_type}
                    </span>
                    <a
                      href={`https://github.com/${repo.github_repo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {repo.owner === "developer" ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {repo.owner}
                  </span>
                  {repo.open_prs > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <GitPullRequest className="h-3 w-3" />
                      {repo.open_prs} open PR{repo.open_prs !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {repo.latest_event && (
                  <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      {EVENT_ICON[repo.latest_event.github_event_type] ?? <GitCommit className="h-3 w-3" />}
                      <span className="truncate">{repo.latest_event.claude_summary ?? `${repo.latest_event.github_event_type} by ${repo.latest_event.actor}`}</span>
                      <span className="shrink-0 ml-auto">{timeAgo(repo.latest_event.created_at)}</span>
                    </span>
                  </div>
                )}

                {!repo.latest_event && (
                  <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground italic">
                    No activity yet — set up GitHub webhook to start tracking
                  </div>
                )}

                {repo.last_synced_at && (
                  <p className="text-xs text-muted-foreground">
                    .cursorrules synced {timeAgo(repo.last_synced_at)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Activity Feed tab ─────────────────────────────────────────── */}
      {activeTab === "activity" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{events.length} recent events</p>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={fetchEvents}>
              <RefreshCw className="h-3 w-3" />Refresh
            </Button>
          </div>

          {isLoadingEvents ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : events.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              No events yet. Configure GitHub webhooks to start receiving activity.
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                <span className="mt-0.5 text-muted-foreground shrink-0">
                  {EVENT_ICON[event.github_event_type] ?? <GitCommit className="h-3.5 w-3.5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{event.claude_summary ?? `${event.github_event_type} by ${event.actor}`}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">{event.repos?.display_name ?? event.repos?.github_repo}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{event.actor}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(event.created_at)}</span>
                    {event.task_id && (
                      <span className="text-xs text-green-600 flex items-center gap-0.5">
                        <CheckCheck className="h-3 w-3" />task created
                      </span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                  event.github_event_type === "pull_request"
                    ? "bg-purple-100 text-purple-700"
                    : event.github_event_type === "push"
                    ? "bg-teal-100 text-teal-700"
                    : "bg-zinc-100 text-zinc-600"
                }`}>
                  {event.github_event_action
                    ? `${event.github_event_type}.${event.github_event_action}`
                    : event.github_event_type}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Spec Writer tab ───────────────────────────────────────────── */}
      {activeTab === "spec" && (
        <div className="space-y-4 max-w-3xl">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Describe a feature in plain language. Claude converts it into a structured spec for your developer.
            </p>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground">Business:</span>
              {BUSINESSES.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => setSpecBiz(biz.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    specBiz === biz.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${biz.dot}`} />
                  {biz.label}
                </button>
              ))}
            </div>

            <Textarea
              placeholder="e.g. I want users to be able to save their cart and share it with friends via a link..."
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              className="min-h-[100px] text-sm resize-none"
            />

            <Button
              className="mt-2 gap-1.5"
              onClick={handleGenerateSpec}
              disabled={!specInput.trim() || isGeneratingSpec}
            >
              {isGeneratingSpec ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Spec
            </Button>
          </div>

          {(specOutput || isGeneratingSpec) && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Generated Spec</span>
                {isGeneratingSpec && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>

              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                {specOutput}
              </pre>

              {specOutput && !isGeneratingSpec && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleCreateSpecTask}>
                    <CheckCheck className="h-3.5 w-3.5" />
                    Save as Task
                  </Button>
                  <span className="text-xs text-muted-foreground">Saved to Tasks → Dev category</span>
                </div>
              )}
            </div>
          )}

          {/* Webhook setup instructions */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <GitPullRequest className="h-4 w-4" />
              GitHub Webhook Setup
            </h4>
            <p className="text-xs text-muted-foreground">
              To receive PR/push/issue events, add a webhook to each GitHub repo:
            </p>
            <div className="text-xs font-mono bg-muted rounded p-2 space-y-1">
              <div><span className="text-muted-foreground">Payload URL:</span> https://your-domain.vercel.app/api/webhooks/github</div>
              <div><span className="text-muted-foreground">Content type:</span> application/json</div>
              <div><span className="text-muted-foreground">Secret:</span> GITHUB_WEBHOOK_SECRET env var</div>
              <div><span className="text-muted-foreground">Events:</span> Pull requests, Pushes, Issues, Issue comments</div>
            </div>
            <p className="text-xs text-muted-foreground">
              Also set <code className="bg-muted px-1 rounded">GITHUB_TOKEN</code> in .env.local to enable .cursorrules commits.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Filesystem-first founder memory for Claude prompts (LLM Wiki pattern).
 * Reads wiki/pages/*.md with YAML frontmatter; no Neo4j required for this path.
 */

import { mkdir, readdir, readFile, appendFile } from "fs/promises"
import path from "path"
import type { BusinessId, ModuleId } from "@/lib/claude"

const WIKI_DIR = path.join(process.cwd(), "wiki")
const PAGES_DIR = path.join(WIKI_DIR, "pages")
const CACHE_DIR = path.join(WIKI_DIR, ".cache")
const OBS_LOG = path.join(CACHE_DIR, "context-injections.jsonl")

const MAX_TOTAL_CHARS = 12_000
const MAX_PER_PAGE_BODY = 2_000
const CRITICAL_LIMIT = 10
const CONTEXT_LIMIT = 10
const KEYWORD_EXTRA_LIMIT = 6

export type WikiPageType =
  | "fact"
  | "decision"
  | "preference"
  | "contact_stub"
  | "event"
  | "task_context"

export interface WikiPageMeta {
  id: string
  type: WikiPageType | string
  business_id: string
  importance: number
  l0: string
  related?: string[]
  sources?: string[]
  updated?: string
}

export interface LoadedWikiPage {
  fileName: string
  relPath: string
  meta: WikiPageMeta
  bodyRaw: string
}

export interface WikiMemoryResult {
  text: string
  injectedPaths: string[]
  usedWiki: boolean
}

/** When `false`, Claude route uses Neo4j / in-memory memory only. */
export function isWikiMemoryEnabled(): boolean {
  return process.env.USE_WIKI_MEMORY?.trim().toLowerCase() !== "false"
}

/** Non-canonical observability: append one JSON line per injection when enabled. */
export function isWikiObservabilityEnabled(): boolean {
  return process.env.WIKI_OBSERVABILITY?.trim() === "1"
}

export async function wikiPagesDirHasContent(): Promise<boolean> {
  try {
    const names = await readdir(PAGES_DIR)
    return names.some((n) => n.endsWith(".md"))
  } catch {
    return false
  }
}

/**
 * Parse a small subset of YAML (scalars + single-line bracket arrays).
 * Sufficient for wiki frontmatter controlled by this repo.
 */
export function parseWikiFrontmatter(raw: string): {
  data: Record<string, string | number | string[]>
  body: string
} {
  if (!raw.startsWith("---\n")) {
    return { data: {}, body: raw }
  }
  const end = raw.indexOf("\n---\n", 4)
  if (end === -1) {
    return { data: {}, body: raw }
  }
  const yamlBlock = raw.slice(4, end)
  const body = raw.slice(end + 5)
  const data: Record<string, string | number | string[]> = {}

  for (const line of yamlBlock.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const colon = trimmed.indexOf(":")
    if (colon === -1) continue
    const key = trimmed.slice(0, colon).trim()
    let valuePart = trimmed.slice(colon + 1).trim()
    if (!key) continue

    if (valuePart.startsWith("[") && valuePart.endsWith("]")) {
      const inner = valuePart.slice(1, -1).trim()
      data[key] = inner
        ? inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
        : []
      continue
    }
    if (/^-?\d+$/.test(valuePart)) {
      data[key] = parseInt(valuePart, 10)
      continue
    }
    if (
      (valuePart.startsWith('"') && valuePart.endsWith('"')) ||
      (valuePart.startsWith("'") && valuePart.endsWith("'"))
    ) {
      valuePart = valuePart.slice(1, -1)
    }
    data[key] = valuePart
  }

  return { data, body }
}

function coerceMeta(data: Record<string, string | number | string[]>): WikiPageMeta | null {
  const id = typeof data.id === "string" ? data.id : ""
  const type = typeof data.type === "string" ? data.type : "fact"
  const business_id = typeof data.business_id === "string" ? data.business_id : ""
  const importance =
    typeof data.importance === "number" ? data.importance : Number(data.importance) || 3
  const l0 = typeof data.l0 === "string" ? data.l0 : ""
  if (!id || !business_id) return null

  const related = Array.isArray(data.related) ? data.related : undefined
  const sources = Array.isArray(data.sources) ? data.sources : undefined
  const updated = typeof data.updated === "string" ? data.updated : undefined

  return {
    id,
    type,
    business_id,
    importance,
    l0,
    related,
    sources,
    updated,
  }
}

export async function loadAllWikiPages(): Promise<LoadedWikiPage[]> {
  let names: string[]
  try {
    names = await readdir(PAGES_DIR)
  } catch {
    return []
  }

  const out: LoadedWikiPage[] = []
  for (const name of names) {
    if (!name.endsWith(".md")) continue
    const full = path.join(PAGES_DIR, name)
    const raw = await readFile(full, "utf8")
    const { data, body } = parseWikiFrontmatter(raw)
    const meta = coerceMeta(data)
    if (!meta) continue
    out.push({
      fileName: name,
      relPath: path.join("wiki", "pages", name),
      meta,
      bodyRaw: body,
    })
  }
  return out
}

function extractBodyForPrompt(body: string): string {
  const l1 = "<!-- L1 -->"
  const l2 = "<!-- L2 -->"
  const i1 = body.indexOf(l1)
  if (i1 !== -1) {
    const start = i1 + l1.length
    const i2 = body.indexOf(l2, start)
    const slice = (i2 === -1 ? body.slice(start) : body.slice(start, i2)).trim()
    if (slice.length > 0) return truncate(slice, MAX_PER_PAGE_BODY)
  }
  return truncate(body.trim(), MAX_PER_PAGE_BODY)
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function importanceStars(n: number): string {
  const clamped = Math.max(1, Math.min(5, Math.round(n)))
  return "★".repeat(clamped)
}

function effectiveBusinessId(requested: BusinessId | "all"): string {
  if (requested === "all") return "ollacart"
  return requested
}

function keywordScore(userMessage: string, page: LoadedWikiPage): number {
  const tokens = userMessage
    .toLowerCase()
    .split(/[^a-z0-9@.]+/)
    .filter((t) => t.length >= 4)
  if (tokens.length === 0) return 0
  const hay = `${page.meta.l0} ${page.meta.id} ${extractBodyForPrompt(page.bodyRaw)}`.toLowerCase()
  let score = 0
  for (const t of tokens) {
    if (hay.includes(t)) score += 1
  }
  return score
}

/**
 * Select pages mirroring Neo4j getRelevantMemories strategy:
 * - importance >= 4: "critical" (up to CRITICAL_LIMIT)
 * - importance < 4 and (business_id matches effective business or "all"): contextual (up to CONTEXT_LIMIT)
 * - extra pages strongly matching user message keywords
 */
export function selectWikiPages(
  pages: LoadedWikiPage[],
  businessId: BusinessId | "all",
  userMessage: string,
): LoadedWikiPage[] {
  const eff = effectiveBusinessId(businessId)

  const critical = pages
    .filter((p) => p.meta.importance >= 4)
    .sort((a, b) => b.meta.importance - a.meta.importance)
    .slice(0, CRITICAL_LIMIT)

  const contextual = pages
    .filter(
      (p) =>
        p.meta.importance < 4 &&
        (p.meta.business_id === eff || p.meta.business_id === "all"),
    )
    .sort((a, b) => {
      const ua = a.meta.updated ?? ""
      const ub = b.meta.updated ?? ""
      return ub.localeCompare(ua)
    })
    .slice(0, CONTEXT_LIMIT)

  const keywordCandidates = pages
    .map((p) => ({ p, s: keywordScore(userMessage, p) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)

  const ordered: LoadedWikiPage[] = []
  const seen = new Set<string>()

  for (const p of critical) {
    if (seen.has(p.meta.id)) continue
    seen.add(p.meta.id)
    ordered.push(p)
  }
  for (const p of contextual) {
    if (seen.has(p.meta.id)) continue
    seen.add(p.meta.id)
    ordered.push(p)
  }
  let keywordAdded = 0
  for (const { p } of keywordCandidates) {
    if (keywordAdded >= KEYWORD_EXTRA_LIMIT) break
    if (seen.has(p.meta.id)) continue
    seen.add(p.meta.id)
    ordered.push(p)
    keywordAdded += 1
  }

  return ordered
}

export function formatWikiPagesForPrompt(pages: LoadedWikiPage[]): string {
  if (pages.length === 0) return "(no wiki memories yet)"

  const lines: string[] = []
  let total = 0

  for (const page of pages) {
    const tag =
      page.meta.business_id === "all" ? "ALL" : page.meta.business_id.toUpperCase()
    const stars = importanceStars(page.meta.importance)
    const body = extractBodyForPrompt(page.bodyRaw)
    const l0Line = page.meta.l0 ? `l0: ${page.meta.l0}` : ""
    const block = `[${tag}][${page.meta.type}]${stars} (${page.meta.id}) ${l0Line}\n${body}\n[source: ${page.relPath}]`
    if (total + block.length + 2 > MAX_TOTAL_CHARS) break
    lines.push(block)
    total += block.length + 2
  }

  return lines.join("\n\n")
}

export async function loadWikiMemoryForPrompt(options: {
  businessId: BusinessId | "all"
  module: ModuleId | string
  userMessage: string
}): Promise<WikiMemoryResult> {
  if (!isWikiMemoryEnabled()) {
    return { text: "", injectedPaths: [], usedWiki: false }
  }

  const pages = await loadAllWikiPages()
  if (pages.length === 0) {
    return { text: "", injectedPaths: [], usedWiki: false }
  }

  const selected = selectWikiPages(pages, options.businessId, options.userMessage)
  if (selected.length === 0) {
    return { text: "", injectedPaths: [], usedWiki: false }
  }

  const text = formatWikiPagesForPrompt(selected)
  const injectedPaths = selected.map((p) => p.relPath)

  return { text, injectedPaths, usedWiki: true }
}

export interface WikiObservationPayload {
  at: string
  businessId: string
  module: string
  injectedPaths: string[]
  charCount: number
  source: "wiki"
}

export async function logWikiObservation(payload: WikiObservationPayload): Promise<void> {
  if (!isWikiObservabilityEnabled()) return
  try {
    await mkdir(CACHE_DIR, { recursive: true })
    await appendFile(OBS_LOG, `${JSON.stringify(payload)}\n`, "utf8")
  } catch (err) {
    console.error("wiki observability log failed:", err)
  }
}

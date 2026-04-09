# Dash wiki schema (LLM Wiki + filesystem-first)

Canonical founder memory lives in **markdown + YAML frontmatter** under `wiki/pages/`. This replaces Neo4j for “Dash memory” injected into Claude. Cross-links and `related:` in frontmatter stand in for a graph.

## Layout

| Path | Role |
|------|------|
| `wiki/index.md` | Content catalog: links, one-line summaries, categories |
| `wiki/log.md` | Append-only timeline (ingests, lint passes, notable queries) |
| `wiki/pages/*.md` | Topic / entity / preference / fact pages |
| `wiki/sources/` | Raw captures (immutable by convention; wiki cites them) |
| `wiki/.cache/` | Non-canonical telemetry only (gitignored) |

## Frontmatter (required fields)

- `id` — stable slug (matches filename without `.md` recommended)
- `type` — `fact` | `decision` | `preference` | `contact_stub` | `event` | `task_context` (align with `MemoryNode` in code)
- `business_id` — `swiftfi` | `unbeatableloans` | `ollacart` | `all`
- `importance` — `1`–`5` (5 = always inject when relevant; mirrors Neo4j behavior)
- `l0` — one-line summary (shown in prompts and index)
- `updated` — ISO date `YYYY-MM-DD`

Optional: `related: [other-id, ...]`, `sources: [...]`

## Progressive detail (optional)

In the body, use MEMM-style markers so prompts can prefer shallow context:

```markdown
<!-- L1 -->
Short operational summary.

<!-- L2 -->
Long-form detail, history, edge cases.
```

If markers are absent, the whole body is used (within a per-request character budget).

## Ingest (new source)

1. Add raw material under `wiki/sources/` (or cite Supabase/email IDs in `sources:`).
2. Discuss takeaways with the user.
3. Create or update pages in `wiki/pages/`; update `related:` / links.
4. Update `wiki/index.md` entries for touched pages.
5. Append a line to `wiki/log.md`: `## [YYYY-MM-DD] ingest | <title>`.

## Query (answering)

1. Read `wiki/index.md` to find relevant `id`s.
2. Open those pages; synthesize with citations (`[page title](pages/id.md)`).
3. Valuable answers may be saved as new pages and indexed.

## Lint (health)

Periodically: contradictions, stale `updated` vs newer sources, orphan pages (no inbound links), missing `related` targets, gaps worth a web search. Record findings in `log.md` or a dedicated `pages/wiki-lint-YYYY-MM-DD.md`.

## Agent rules

- Do not edit files under `wiki/sources/` except to add new immutables.
- Keep `index.md` in sync when adding or removing pages.
- Never store secrets in wiki files committed to git.

## Tooling

- `pnpm wiki:verify` — ensures at least the seeded page count under `wiki/pages/` (see `scripts/verify-wiki.mjs`).
- Set `WIKI_OBSERVABILITY=1` to append JSON lines (paths + char counts) to `wiki/.cache/context-injections.jsonl` on each Claude request that uses the wiki. This cache is gitignored and is not canonical.

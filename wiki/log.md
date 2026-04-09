# Wiki log (append-only)

Each entry should start with a parseable heading: `## [YYYY-MM-DD] <kind> | <short title>`

---

## [2026-04-09] bootstrap | Filesystem-first wiki seeded from Neo4j seed content

Migrated founder facts and preferences from `lib/memory.ts` `seedCriticalMemories()` into `wiki/pages/*.md`. Claude route prefers this wiki for MEMORY CONTEXT when pages exist and `USE_WIKI_MEMORY` is not `false`.

## [2026-04-09] cleanup | Removed seeded wiki pages and Neo4j seed API

Repo no longer ships pre-filled `wiki/pages` or `seedCriticalMemories()`. Add your own pages under `wiki/pages/` or use Neo4j for graph memory.

# Wiki log (append-only)

Each entry should start with a parseable heading: `## [YYYY-MM-DD] <kind> | <short title>`

---

## [2026-04-09] bootstrap | Filesystem-first wiki seeded from Neo4j seed content

Migrated founder facts and preferences from `lib/memory.ts` `seedCriticalMemories()` into `wiki/pages/*.md`. Claude route prefers this wiki for MEMORY CONTEXT when pages exist and `USE_WIKI_MEMORY` is not `false`.

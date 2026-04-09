# Dash wiki index

Add your own pages under `wiki/pages/` with YAML frontmatter (see `wiki/schema.md`). This catalog is maintained by you — there are **no seeded founder pages** in the repo.

## Conventions

| Path | Role |
|------|------|
| `wiki/pages/*.md` | Your memory / context pages |
| `wiki/sources/` | Raw captures (immutable) |
| `wiki/log.md` | Append-only timeline |

When `wiki/pages` contains `.md` files, the Claude API includes them in **MEMORY CONTEXT** (unless `USE_WIKI_MEMORY=false`).

# CLAUDE-CODE-INSTRUCTIONS.md
# How to Build Dash ERP — Instructions for Claude Code
# Read this first before touching any code.

## Your Role

You are Claude Code, working inside the OllaCart/erp repository.
This is an existing Next.js + TypeScript + Neo4j app that needs to be
extended into a full founder OS. Do not rewrite what exists — extend it.

## Before You Write Any Code

1. Read all spec files in this directory (00 through 10)
2. Read the existing file structure (list /app, /components, /lib, /types)
3. Read existing API routes (/app/api/) to understand patterns already established
4. Read existing types (/types/erp.ts and /types/memory.ts)
5. Check package.json to see what's already installed
6. Check .env.local.example to see what env vars already exist

Only after reading the existing code should you begin writing new code.

## Build Order (strict — do not skip steps)

  Phase 1 (Foundation — do these first, everything depends on them):
    Step 1: Extend types/erp.ts with all new types
    Step 2: Build /lib/claude.ts (Claude API wrapper)
    Step 3: Build /lib/memory.ts (Neo4j memory read/write)
    Step 4: Build /app/api/claude/route.ts (main Claude endpoint)
    Step 5: Add founder context via wiki/pages and/or Neo4j (no automatic seed in repo)

  Phase 2 (Email — needed by tasks, support, VC):
    Step 6: Extend Google OAuth for multi-account
    Step 7: Build /lib/gmail.ts
    Step 8: Build /app/api/email/ routes
    Step 9: Build email sync background job

  Phase 3 (Tasks — core daily tool):
    Step 10: Create Supabase tasks table
    Step 11: Build /app/api/tasks/ routes
    Step 12: Build /components/tasks/TaskView.tsx
    Step 13: Wire Claude prioritization

  Phase 4 (Calendar):
    Step 14: Build /lib/google-calendar.ts
    Step 15: Build /app/api/calendar/ routes
    Step 16: Build /components/calendar/CalendarView.tsx

  Phase 5 (Dev Module):
    Step 17: Build /app/api/webhooks/github/route.ts
    Step 18: Build /lib/cursor-rules.ts
    Step 19: Build /components/dev/DevView.tsx

  Phase 6 (Support, CRM, Social, Finance, VC):
    Steps 20-30: Build remaining modules in any order

## Code Conventions

  Language:     TypeScript (strict mode — no 'any' types)
  Framework:    Next.js App Router (not Pages Router)
  Styling:      Tailwind CSS + shadcn/ui (already installed)
  API routes:   /app/api/{module}/route.ts pattern
  Components:   /components/{module}/{ComponentName}.tsx
  Libraries:    /lib/{name}.ts for external service wrappers
  Types:        /types/erp.ts for all shared types

  Error handling: All API routes must return proper error responses
    { error: string, code: string } with appropriate HTTP status

  Auth check: All API routes (except webhooks) must verify session
    import { getServerSession } from 'next-auth'
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  Webhook routes: Validate signatures, no auth session check needed

## Claude API Usage

  Model: claude-sonnet-4-6
  Never use any other model.

  Import pattern:
    import { callClaude } from '@/lib/claude'

  Always pass:
    - System prompt with business context
    - Injected memories from wiki/pages (or Neo4j fallback)
    - Current module context

  Never call the Anthropic API directly from components.
  Always go through /lib/claude.ts.

## Database Patterns

  Wiki (filesystem-first founder memory — preferred for Claude MEMORY CONTEXT):
    - Canonical markdown under /wiki/pages with YAML frontmatter (see /wiki/schema.md)
    - Loader: /lib/wiki-context.ts; wired in /app/api/claude/route.ts
    - Set USE_WIKI_MEMORY=false to force Neo4j/in-memory memory only

  Neo4j (for graph relationships and memory):
    - Use for: Contact relationships, memory nodes, business graph
    - Fallback when wiki is empty or disabled; existing route: /app/api/neo4j/route.ts

  Supabase (for structured tabular data):
    - Use for: Tasks, emails, events, transactions, posts
    - Install if not present: npm install @supabase/supabase-js

  Rule: If it's a list of items with simple CRUD, use Supabase.
        If it's a relationship between entities, use Neo4j.

## Environment Variables

  Never hardcode API keys. Always use process.env.VARIABLE_NAME.
  Check .env.local.example for existing vars.
  Add new vars to .env.local.example with a comment explaining them.

## Testing Before Committing

  For each new API route:
    1. Test happy path (valid request)
    2. Test auth failure (no session)
    3. Test missing required fields
    4. Verify response shape matches spec

  For each new component:
    1. Render with mock data
    2. Check loading states
    3. Check error states

## What NOT to Do

  Do not:
  - Rewrite existing working code unless there is a bug
  - Install packages without checking if equivalent already exists
  - Create files outside the established directory structure
  - Use Pages Router patterns (this is App Router)
  - Use 'any' type in TypeScript
  - Call Claude API from frontend components directly
  - Store sensitive data (API keys, tokens) in Neo4j unencrypted
  - Auto-send emails or publish social posts without user confirmation
  - Delete or overwrite the existing /app/api/neo4j/ or /app/api/auth/ routes

## Communicating Progress

  After each step, output:
    - What was built
    - What files were created or modified
    - What env vars need to be added
    - What the next step is
    - Any blockers or decisions that need founder input

## When Stuck

  If you encounter a decision point not covered in the specs:
  1. State the decision clearly
  2. Propose 2-3 options with tradeoffs
  3. Recommend one option with reasoning
  4. Ask the founder to confirm before proceeding

  Do not make architectural decisions unilaterally.

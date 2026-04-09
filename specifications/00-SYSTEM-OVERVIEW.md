# Dash ERP — Founder OS System Specification
# Version 1.0 | For use with Claude Code

## What This System Is

Dash ERP is an AI-powered founder operating system built on top of the existing
Next.js + TypeScript + Neo4j + Vercel stack at github.com/OllaCart/erp.

It serves as the single command center for one founder managing three early-stage startups:

  - SwiftFi (swiftfi.com) — crypto onramp app, currently generating revenue
  - UnbeatableLoans (unbeatableloans.com) — mortgage app, early stage
  - OllaCart (ollacart.com) — social universal shopping cart, Rye API integration in progress

Claude (claude-sonnet-4-6) is the AI brain of the system. Every module routes through
Claude for summarization, prioritization, drafting, and decision support.

## Core Design Principles

1. Per-business isolation — every piece of data is tagged to a business. No cross-contamination.
2. Claude-first — Claude reads context before every action. It knows your open tasks,
   recent emails, calendar, and dev activity before responding.
3. Replace, don't add — this replaces Linear (tasks), Marblism (social), and standalone
   inbox tools. One system, not many.
4. Founder time is scarce — surfaces the 3-5 most important things, not everything.
5. Memory persists — Neo4j stores decisions, contacts, context. Claude remembers across sessions.

## Businesses & Their Identifiers

  business_id: "swiftfi"
    name: SwiftFi
    domain: swiftfi.com
    status: revenue-generating
    repos: swiftfi-landing, swiftfi-app
    emails: support@swiftfi.com
    gohighlevel: yes
    priority: highest (money-making)

  business_id: "unbeatableloans"
    name: UnbeatableLoans
    domain: unbeatableloans.com
    status: early stage, needs mortgage developer
    repos: loans-landing, loans-app
    emails: support@unbeatableloans.com
    gohighlevel: yes
    priority: medium (worked on at night)

  business_id: "ollacart"
    name: OllaCart
    domain: ollacart.com
    status: early stage, Rye API integration in progress
    repos: ollacart-landing, ollacart-app (erp repo)
    emails: support@ollacart.com, john@ollacart.com
    gohighlevel: no
    priority: medium (afternoon work)

## Tech Stack

  Frontend:     Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
  Database:     Neo4j (graph, primary memory store), Supabase (structured/relational data)
  Auth:         Google OAuth (multi-account), NextAuth.js
  AI:           Anthropic claude-sonnet-4-6 via /v1/messages
  Hosting:      Vercel (erp-gamma-azure.vercel.app)
  Package mgr:  pnpm
  IDE:          Cursor + Claude Code

## Existing File Structure (as of project start)

  /app
    /api
      /neo4j/route.ts         — Neo4j query endpoint
      /auth/google/           — Google OAuth flow
  /components                 — UI components
  /context                    — React context providers
  /hooks                      — Custom hooks
  /lib                        — Utilities
  /types
    erp.ts                    — Core ERP types
    memory.ts                 — Memory/Neo4j types
    speech.d.ts               — Speech types

## Modules to Build (in priority order)

  1. Claude AI Brain + Memory Layer     (see 01-CLAUDE-BRAIN.md)
  2. Multi-Account Email                (see 02-EMAIL.md)
  3. Task Manager (replaces Linear)     (see 03-TASKS.md)
  4. Calendar Manager                   (see 04-CALENDAR.md)
  5. Development Module                 (see 05-DEV-MODULE.md)
  6. Customer Support                   (see 06-CUSTOMER-SUPPORT.md)
  7. CRM & GoHighLevel                  (see 07-CRM-GOHIGHLEVEL.md)
  8. Social Media & LinkedIn            (see 08-SOCIAL-LINKEDIN.md)
  9. Finance Manager                    (see 09-FINANCE.md)
  10. VC Pipeline                       (see 10-VC-PIPELINE.md)

## Environment Variables Required

  # Anthropic
  ANTHROPIC_API_KEY=

  # Neo4j
  NEO4J_URI=
  NEO4J_USERNAME=
  NEO4J_PASSWORD=

  # Supabase
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=

  # Google OAuth (multiple accounts)
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=
  NEXTAUTH_SECRET=
  NEXTAUTH_URL=

  # GitHub
  GITHUB_TOKEN=
  GITHUB_WEBHOOK_SECRET=

  # GoHighLevel
  GHL_API_KEY_SWIFTFI=
  GHL_API_KEY_UNBEATABLELOANS=
  GHL_WEBHOOK_SECRET=

  # LinkedIn
  LINKEDIN_CLIENT_ID=
  LINKEDIN_CLIENT_SECRET=

## Data Model Philosophy

All entities in Neo4j are tagged with business_id.
Every node has: id, business_id, created_at, updated_at, source.

Core node types:
  - Business
  - Contact (investor, customer, partner, developer)
  - Task
  - Email
  - Event (calendar)
  - Memory (Claude's persistent notes)
  - Repo
  - Deal (VC pipeline)
  - SupportTicket

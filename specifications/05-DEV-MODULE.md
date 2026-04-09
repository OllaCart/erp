# Module 05 — Development Command Center
# Dash ERP System Specification

## Purpose

Central view of all GitHub repos across all three businesses. Claude reads
PR activity, summarizes changes, creates tasks, generates specs for the
developer, and maintains .cursorrules files per repo. Integrates with
Cursor and Claude Code.

## Repos Per Business

  SwiftFi:
    - swiftfi-landing (landing page, founder maintains in Cursor)
    - swiftfi-app (main app, developer primarily maintains)

  UnbeatableLoans:
    - loans-landing (landing page, founder maintains at night in Cursor)
    - loans-app (main app, founder + future developer)

  OllaCart:
    - ollacart-landing (landing page)
    - ollacart-erp (this repo — github.com/OllaCart/erp)

  Total: 6 repos to monitor

## Supabase Schema

  Table: repos
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    github_repo: text NOT NULL      -- "OllaCart/erp"
    display_name: text              -- "OllaCart ERP"
    owner: text                     -- "founder" | "developer" | "shared"
    repo_type: text                 -- "landing" | "app"
    github_webhook_secret: text
    is_active: boolean DEFAULT true
    last_synced_at: timestamp

  Table: github_events
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    repo_id: uuid REFERENCES repos(id)
    github_event_type: text         -- "pull_request" | "push" | "issues" | "issue_comment"
    github_event_action: text       -- "opened" | "closed" | "merged" | "review_requested"
    payload: jsonb                  -- raw GitHub webhook payload
    claude_summary: text            -- Claude's plain-English summary
    task_id: uuid                   -- linked task (if action created)
    actor: text                     -- GitHub username who triggered event
    created_at: timestamp DEFAULT now()

## GitHub Webhook Setup

  File: /app/api/webhooks/github/route.ts

  Endpoint: POST /api/webhooks/github
  Auth: Validate X-Hub-Signature-256 header using GITHUB_WEBHOOK_SECRET

  Each repo needs its own webhook configured in GitHub settings:
    Payload URL: https://erp-gamma-azure.vercel.app/api/webhooks/github
    Content type: application/json
    Secret: value of GITHUB_WEBHOOK_SECRET env var
    Events: Pull requests, Pushes, Issues, Issue comments

  Webhook handler logic:
    1. Validate signature
    2. Identify which repo triggered the event (from payload.repository.full_name)
    3. Look up business_id from repos table
    4. Save raw event to github_events table
    5. Call Claude to summarize the event (see below)
    6. Create task if action needed
    7. Return 200

## Claude Event Summarization

  For each webhook event, call Claude with:

  System: Summarize this GitHub event for a non-technical founder.
  Be brief (1-2 sentences). Say what changed and if any action is needed.

  Event types and default actions:

  pull_request.opened:
    Summary: "Developer opened PR #{n}: {title}"
    Action: Create task "Review PR: {title}" for business_id, priority=high
    Assignee: founder (if owner=shared or founder) else no task

  pull_request.merged:
    Summary: "PR #{n} was merged: {title}. Changes are live."
    Action: No task, log to memory

  pull_request.review_requested:
    Summary: "Your review is requested on PR #{n}: {title}"
    Action: Create task, priority=urgent

  push (to main branch):
    Summary: "New code pushed to main by {actor}: {commit_message}"
    Action: No task unless commit message contains "TODO" or "FIXME"

  issues.opened:
    Summary: "New issue #{n}: {title} by {actor}"
    Action: Create task "Triage issue: {title}", priority=medium

  issues.closed:
    Summary: "Issue #{n} closed: {title}"
    Action: Complete any linked task

## Dev Module UI

  File: /components/dev/DevView.tsx

  Layout:
    - Business tabs at top
    - Per-business: list of repos with status
    - Each repo card shows:
        - Repo name and type (landing/app)
        - Owner (you / developer)
        - Open PRs count
        - Last commit (when, by whom, message)
        - Open issues count
        - Link to GitHub

  Activity feed:
    - Chronological list of recent events across all repos
    - Each event: Claude summary + business badge + action button
    - Action button: "Create task" / "Mark reviewed" / "View PR"

  Developer task board:
    - Tasks assigned to developer across all businesses
    - Status: todo / in_progress / blocked / done
    - Founder can comment on tasks (sends to developer via email)

## Spec Writer

  File: /components/dev/SpecWriter.tsx

  Purpose: Founder describes a feature in plain language.
  Claude turns it into a structured spec for the developer.

  Input: Natural language feature description
  Output: Structured spec with:
    - Feature name
    - User story: "As a [user], I want [goal] so that [benefit]"
    - Acceptance criteria (bullet list)
    - Technical notes (Claude suggests based on existing stack)
    - Out of scope
    - Estimated complexity: small / medium / large

  Spec saved as:
    - Task in task manager (category=dev)
    - Optionally: GitHub issue (one-click create)
    - Optionally: Added to TASKS.md in the repo

## Cursor Integration

  File: /lib/cursor-rules.ts

  For each repo, maintain a .cursorrules file that Claude generates and updates.

  .cursorrules content template:
    # {Business Name} — {Repo Name}
    # Auto-generated by Dash ERP. Updated: {date}

    ## Business Context
    {business description and current status}

    ## Current Sprint Priorities
    {list of top 5 open tasks for this business, from task manager}

    ## Tech Stack
    {stack specific to this repo}

    ## Coding Standards
    - TypeScript strict mode
    - Use existing component patterns in /components
    - Follow existing API route patterns in /app/api
    - Test before committing to main

    ## Active Work
    {list of open PRs and their descriptions}

    ## Known Issues
    {list of open GitHub issues}

  API route: POST /api/dev/update-cursorrules
    - Regenerates .cursorrules for all repos
    - Uses GitHub API to commit the updated file to each repo
    - Run daily or on-demand from Dash UI

## TASKS.md Sync

  Each repo gets a TASKS.md file at root level.
  Synced from Dash task manager (tasks for that business with category=dev).

  Format:
    # Tasks — {Business Name}
    Last synced: {datetime}

    ## Urgent
    - [ ] {task title}

    ## This Week
    - [ ] {task title}

    ## Backlog
    - [ ] {task title}

  Cursor reads this file automatically, giving Claude Code context
  about what to work on next.

## Daily Dev Brief

  Generated each morning as part of the overall daily brief.
  Per business, per repo:

    SwiftFi App:
      Open PRs: 1 (waiting for your review since 2 days)
      Last commit: yesterday by [developer] — "fix payment flow timeout"
      Open issues: 3 (1 bug, 2 features)
      Suggested: Review PR #14 first — it's been waiting

    OllaCart ERP:
      Last commit: 3 days ago by you — "add calendar component"
      Open issues: 0
      Rye API integration: in progress (based on last memory)
      Suggested: Continue Rye API work — last active file was /lib/rye.ts

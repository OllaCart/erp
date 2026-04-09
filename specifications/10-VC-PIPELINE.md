# Module 10 — VC Pipeline
# Dash ERP System Specification

## Purpose

Track investor outreach and fundraising pipeline across all three businesses.
SwiftFi (revenue-generating) is most likely to raise first. Claude helps
manage relationships, draft pitch materials, and track follow-ups.

## Pipeline Per Business

  SwiftFi:       Active or near-future fundraise (revenue makes this investable now)
  UnbeatableLoans: Early stage, build relationships now
  OllaCart:      Early stage, build relationships now

## Supabase Schema

  Table: investors
    id: uuid PRIMARY KEY
    name: text NOT NULL
    email: text
    firm: text
    role: text                          -- "Partner" | "Associate" | "Principal" | "Angel"
    investor_type: text                 -- "angel" | "pre_seed" | "seed" | "series_a" | "vc"
    check_size_min: integer             -- in USD
    check_size_max: integer
    focus_areas: text[]                 -- ["fintech", "crypto", "marketplace"]
    linkedin_url: text
    twitter_handle: text
    notes: text
    warm_intro_through: text            -- contact who can intro
    source: text                        -- "angellist" | "linkedin" | "referral" | "cold"
    created_at: timestamp DEFAULT now()

  Table: vc_deals
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    investor_id: uuid REFERENCES investors(id)
    stage: text DEFAULT 'target'
      -- "target"         → identified, not contacted
      -- "intro_pending"  → working on getting intro
      -- "introduced"     → intro made, waiting for response
      -- "first_meeting"  → meeting scheduled or done
      -- "due_diligence"  → investor reviewing materials
      -- "term_sheet"     → term sheet received
      -- "closed"         → investment received
      -- "passed"         → investor passed
      -- "dormant"        → paused / long-term
    round: text                         -- "pre_seed" | "seed" | "series_a"
    target_amount: integer              -- how much you're raising total
    ask_amount: integer                 -- how much you're asking this investor for
    valuation: integer
    last_contact_at: timestamp
    next_follow_up_at: date
    intro_person: text                  -- who is making the intro
    materials_sent: text[]              -- ["deck", "one_pager", "financials"]
    notes: text
    created_at: timestamp DEFAULT now()
    updated_at: timestamp DEFAULT now()

  Table: vc_interactions
    id: uuid PRIMARY KEY
    deal_id: uuid REFERENCES vc_deals(id)
    business_id: text NOT NULL
    interaction_type: text              -- "email" | "meeting" | "call" | "intro" | "deck_sent"
    summary: text                       -- Claude-generated summary
    next_action: text
    occurred_at: timestamp
    created_at: timestamp DEFAULT now()

## API Routes

  GET /api/vc/pipeline
    - Full pipeline view per business
    - Returns deals grouped by stage

  GET /api/vc/investors
    - List all investors with relationship status

  POST /api/vc/investors
    - Add new investor to database

  POST /api/vc/deals
    - Create a new deal (link investor to business)

  PATCH /api/vc/deals/:id
    - Update stage, notes, materials sent, next follow-up

  POST /api/vc/deals/:id/log-interaction
    - Log a meeting, call, or email exchange

  POST /api/vc/deals/:id/draft-followup
    - Claude drafts a follow-up email for this investor

  GET /api/vc/followups-due
    - List of deals where next_follow_up_at <= today
    - Used in daily brief

  POST /api/vc/materials/elevator-pitch
    - Claude generates elevator pitch for a business

  POST /api/vc/materials/deck-outline
    - Claude generates a 12-slide deck outline for a business

## Claude VC Intelligence

  Follow-up drafting:
    Context given to Claude:
    - Investor profile (firm, focus, check size)
    - Full interaction history
    - Current stage
    - What was last discussed
    - Materials already sent
    - Business current metrics (from finance module)

    Output: Personalized follow-up email (not templated)
    Tone: Professional but genuine — this is a relationship, not a transaction

  Daily VC brief item:
    "VC pipeline: 3 follow-ups due today
    - Sarah Chen (Sequoia) — last contact 5 days ago, deck sent
    - Mike Torres (a16z) — intro pending via John Smith
    - James Lee (angel) — first meeting done, no follow-up yet"

  Pitch material generation:

  High-concept pitch:
    Per Venture Hacks methodology: one sentence that distills the vision.
    Template: "[Known company] for [target market]" or similar.
    SwiftFi example: "The simplest crypto onramp for everyday users"

  Elevator pitch (email format):
    Components:
    - High-concept pitch (1 sentence)
    - Product description (under 30 words)
    - Traction (users, revenue, growth rate — from finance module)
    - Team social proof
    - Why this investor
    - Call to action

  12-slide deck outline (Bessemer template):
    1. Cover (logo, tagline, contact)
    2. Summary (elevator pitch content)
    3. Team
    4. Problem
    5. Solution + Demo
    6. Technology
    7. Marketing
    8. Sales / Business Model
    9. Competition
    10. Milestones
    11. Conclusion
    12. Financing

## UI Components

  File: /components/vc/VCView.tsx

  Layout:
    - Business tabs
    - Pipeline kanban (columns = stages)
    - Investor list with relationship status
    - Materials generator

  Pipeline kanban:
    - Columns: Target → Intro Pending → Introduced → Meeting → Due Diligence → Term Sheet → Closed
    - Cards: investor name, firm, check size, days in stage
    - Color: green (recent contact), amber (7+ days), red (14+ days no contact)
    - Drag to move stage

  Investor detail:
    - Profile info
    - Full interaction timeline
    - Materials sent
    - Claude next-action recommendation
    - "Draft follow-up" button

  Materials panel:
    - Generate elevator pitch (per business)
    - Generate deck outline
    - Track which materials sent to which investor

## Follow-up Rules (from Venture Hacks)

  Key insight: follow-ups go cold fast. Rules encoded in Claude:

  Stages and follow-up timing:
    target:         Reach out within 7 days of adding
    intro_pending:  Follow up with intro person after 3 days
    introduced:     Follow up if no response after 5 days
    first_meeting:  Follow up within 48 hours of meeting
    due_diligence:  Check in every 7 days
    term_sheet:     Respond within 24 hours always

  Claude flags when these windows are breached.
  Creates tasks automatically: "Follow up with {investor} — {days} days since last contact"

## Middleman / Introduction Tracking

  Per Venture Hacks: warm intros matter most.
  Track the intro chain:
    - Who is making the intro
    - Quality of that middleman (1=entrepreneur they backed, 5=someone they met once)
    - Status of intro request

  Store in vc_deals.intro_person and vc_interactions.
  Claude reminds you to follow up with the middleman, not just the investor.

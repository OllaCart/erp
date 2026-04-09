# Module 07 — CRM & GoHighLevel Integration
# Dash ERP System Specification

## Purpose

Integrate GoHighLevel (GHL) for SwiftFi and UnbeatableLoans outreach pipelines.
Surface contact history, pipeline stages, and outreach activity inside Dash ERP.
Claude helps draft outreach messages and suggests next actions per contact.

## GoHighLevel Accounts

  SwiftFi:        Separate GHL sub-account (API key: GHL_API_KEY_SWIFTFI)
  UnbeatableLoans: Separate GHL sub-account (API key: GHL_API_KEY_UNBEATABLELOANS)
  OllaCart:       No GHL account (direct outreach only)

## GoHighLevel API

  Base URL: https://rest.gohighlevel.com/v1
  Auth: Bearer token (API key per account)

  Key endpoints used:
    GET  /contacts/           — list contacts with filters
    GET  /contacts/{id}       — single contact detail
    POST /contacts/           — create contact
    PUT  /contacts/{id}       — update contact
    GET  /contacts/{id}/activity — contact activity timeline
    GET  /pipelines/          — list pipelines
    GET  /opportunities/      — list deals in pipeline
    PUT  /opportunities/{id}  — update deal stage
    POST /conversations/messages — send SMS or email via GHL

## Supabase Schema

  Table: crm_contacts
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    ghl_contact_id: text              -- GoHighLevel contact ID
    first_name: text
    last_name: text
    email: text
    phone: text
    company: text
    contact_type: text                -- "lead" | "customer" | "partner" | "investor"
    pipeline_stage: text
    pipeline_id: text
    opportunity_id: text
    last_activity_at: timestamp
    notes: text
    tags: text[]
    source: text                      -- "ghl_sync" | "manual" | "email"
    created_at: timestamp DEFAULT now()
    updated_at: timestamp DEFAULT now()

  Neo4j: CRM contacts as Contact nodes
    (Contact)-[:BELONGS_TO]->(Business)
    (Contact)-[:HAS_EMAIL]->(Email)
    (Contact)-[:IN_STAGE]->(PipelineStage)

## API Routes

  GET /api/crm/contacts
    - List contacts per business with filters
    - Params: business_id, contact_type, pipeline_stage, search
    - Synced from GHL + local additions

  GET /api/crm/contacts/:id
    - Contact detail with activity timeline

  POST /api/crm/contacts
    - Create contact (syncs to GHL)

  PATCH /api/crm/contacts/:id
    - Update contact, pipeline stage (syncs to GHL)

  POST /api/crm/sync
    - Full sync of contacts and pipeline from GHL for both accounts
    - Run daily + on-demand

  POST /api/crm/outreach
    - Send outreach message via GHL (SMS or email)
    - Claude drafts message, founder reviews before sending

  GET /api/crm/pipeline
    - Get full pipeline view with stages and contact counts

## GHL Sync Logic

  File: /lib/ghl.ts

  Sync runs daily at 7am:
    1. Fetch all contacts from GHL SwiftFi account → save/update crm_contacts
    2. Fetch all contacts from GHL UnbeatableLoans account → save/update crm_contacts
    3. Fetch pipeline opportunities → update pipeline_stage on contacts
    4. For each contact with recent activity: update last_activity_at

  Bidirectional:
    - Changes in Dash ERP (stage updates, notes) push to GHL via API
    - Changes in GHL pull into Dash via daily sync or webhook

## Pipeline Views

  SwiftFi pipeline stages (customize in GHL, reflect here):
    New Lead → Contacted → Demo Scheduled → Demo Done → Converted → Lost

  UnbeatableLoans pipeline stages:
    Inquiry → Application Started → Documents Submitted → Under Review →
    Approved → Funded → Closed

## Claude CRM Intelligence

  On contact detail view, Claude provides:
    - Summary of relationship history
    - Recommended next action
    - Draft outreach message (if follow-up needed)
    - Days since last contact (flags if > 7 days with no activity)

  Outreach drafting prompt:
    System: Draft a {type} outreach message for {contact_name} at {company}.
    Business: {business_name}
    Last interaction: {summary of last contact}
    Goal: {move to next pipeline stage}
    Tone: {brand voice for this business}
    Length: Keep under 150 words. Personalized, not templated.

## UI Components

  File: /components/crm/CRMView.tsx

  Views:
    - Pipeline view (kanban by stage)
    - Contact list (table with search and filters)
    - Contact detail (activity timeline + Claude recommendations)

  Pipeline kanban:
    - Columns = pipeline stages
    - Cards = contacts with name, company, days in stage
    - Drag to move stage (syncs to GHL)
    - Color-code by days in stage: green (<7), amber (7-14), red (>14)

  Contact detail:
    - Name, company, contact info
    - Pipeline stage with move buttons
    - Activity timeline (calls, emails, messages from GHL)
    - Claude next-action recommendation
    - "Draft outreach" button → Claude drafts → review → send via GHL

  Outreach composer:
    - Select channel: Email or SMS
    - Claude draft pre-filled (editable)
    - Preview before sending
    - Send via GHL API

## Follow-up Automation

  Daily check: Find contacts where last_activity_at > 7 days AND stage is active.
  Claude generates a list of follow-up suggestions each morning.
  Appears in daily brief: "3 contacts need follow-up today"
  Creates tasks in task manager (category=outreach) for each.

## OllaCart Outreach (No GHL)

  OllaCart does not have GHL. Outreach contacts stored directly in crm_contacts
  with source="manual". No GHL sync for ollacart business_id.
  Use email module for outreach (send via support@ollacart.com).

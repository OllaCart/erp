# Module 06 — Customer Support
# Dash ERP System Specification

## Purpose

Unified customer support inbox across all three businesses. Claude triages
tickets, drafts replies in the correct brand voice, and escalates when needed.
Tracks resolution time and customer satisfaction.

## Support Channels Per Business

  SwiftFi:
    - support@swiftfi.com (Gmail)
    - Future: in-app chat widget

  UnbeatableLoans:
    - support@unbeatableloans.com (Gmail)
    - Future: contact form on website

  OllaCart:
    - support@ollacart.com (Gmail)
    - john@ollacart.com (developer queries — different handling)

## Supabase Schema

  Table: support_tickets
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    email_id: uuid REFERENCES emails(id)   -- linked to email module
    ticket_number: text UNIQUE             -- "SWF-001", "UBL-001", "OLC-001"
    status: text DEFAULT 'open'            -- "open" | "in_progress" | "waiting" | "resolved" | "closed"
    priority: text DEFAULT 'normal'        -- "urgent" | "high" | "normal" | "low"
    category: text                         -- "billing" | "technical" | "account" | "general" | "refund"
    customer_email: text NOT NULL
    customer_name: text
    subject: text NOT NULL
    first_message: text
    resolution_notes: text
    claude_diagnosis: text                 -- Claude's assessment of the issue
    sentiment: text                        -- "positive" | "neutral" | "frustrated" | "angry"
    first_response_at: timestamp
    resolved_at: timestamp
    created_at: timestamp DEFAULT now()
    updated_at: timestamp DEFAULT now()

  Table: ticket_messages
    id: uuid PRIMARY KEY
    ticket_id: uuid REFERENCES support_tickets(id)
    direction: text                        -- "inbound" | "outbound"
    from_address: text
    body: text
    claude_draft: boolean DEFAULT false    -- was this a Claude draft?
    sent_at: timestamp

## Ticket Number Format

  SwiftFi:          SWF-0001
  UnbeatableLoans:  UBL-0001
  OllaCart:         OLC-0001

  Auto-increment per business.

## API Routes

  GET /api/support/tickets
    - List tickets with filters: business_id, status, priority, category
    - Default: open tickets sorted by priority DESC, created_at ASC

  GET /api/support/tickets/:id
    - Ticket detail with full message thread

  POST /api/support/tickets
    - Create ticket manually (usually auto-created from email)

  PATCH /api/support/tickets/:id
    - Update status, priority, category, resolution notes

  POST /api/support/tickets/:id/reply
    - Send reply to customer (via Gmail API using correct account)
    - Params: body, use_claude_draft (boolean)
    - Adds to ticket_messages, updates ticket status

  POST /api/support/tickets/:id/draft-reply
    - Call Claude to draft a reply
    - Returns draft for founder review, does NOT send

## Auto-Ticket Creation

  Triggered by email module when a new email is categorized as "customer" or "urgent".

  Logic:
    1. Check if email is from existing open ticket thread (match by gmail_thread_id)
    2. If yes: add message to existing ticket
    3. If no: create new ticket, assign ticket number, call Claude for diagnosis

## Claude Ticket Processing

  On ticket creation, call Claude with:

  System: You are analyzing a customer support ticket for {business_name}.

  Business context:
    SwiftFi: crypto onramp app. Common issues: transaction failures,
             KYC verification, wallet connections, deposit delays.
    UnbeatableLoans: mortgage app. Common issues: loan status, document
                     submission, rate questions, application status.
    OllaCart: social shopping cart. Common issues: cart sharing, product
              not found, Rye API errors, account issues.

  Analyze this ticket and return JSON:
  {
    "category": "billing",
    "priority": "high",
    "sentiment": "frustrated",
    "diagnosis": "Customer has a failed transaction that hasn't been refunded",
    "suggested_action": "Check transaction ID in payment processor, initiate refund",
    "draft_reply": "Hi {customer_name},\n\nThank you for reaching out to SwiftFi support..."
  }

## Brand Voice Per Business

  SwiftFi:
    - Tone: professional but modern, empathetic, fast
    - Sign-off: "The SwiftFi Team"
    - Response time promise: within 24 hours
    - Never: use jargon the customer won't understand

  UnbeatableLoans:
    - Tone: formal, reassuring, compliance-aware
    - Sign-off: "UnbeatableLoans Support"
    - Response time promise: within 1 business day
    - Never: make specific loan guarantees in email

  OllaCart:
    - Tone: friendly, casual, community-driven
    - Sign-off: "The OllaCart Team"
    - Response time promise: within 48 hours
    - Never: overpromise on Rye API features still in development

## UI Components

  File: /components/support/SupportView.tsx

  Layout:
    - Left: ticket list with filters and search
    - Right: ticket detail with message thread and Claude draft

  Ticket list columns:
    - Ticket # and business badge
    - Customer name and email
    - Subject (truncated)
    - Status badge (color-coded)
    - Priority indicator
    - Time open
    - Sentiment indicator

  Ticket detail:
    - Full message thread (chronological)
    - Claude diagnosis card (collapsible)
    - Reply box with Claude draft pre-filled
    - Edit draft before sending
    - Quick actions: resolve, escalate, change priority

  Dashboard metrics (top of support view):
    - Open tickets per business
    - Average response time
    - Tickets resolved today
    - Urgent tickets needing immediate attention

## Escalation Rules

  Auto-escalate to urgent if:
    - Sentiment = "angry" AND no reply within 4 hours
    - Category = "billing" AND amount > $500
    - Same customer has opened 3+ tickets in 7 days
    - Keywords detected: "lawsuit", "fraud", "scam", "chargeback", "lawyer"

  Escalation action:
    - Change priority to urgent
    - Create urgent task in task manager
    - Send Dash chat notification immediately

## john@ollacart.com Special Handling

  Emails to john@ollacart.com are development-related, not customer support.
  Category: "developer"
  Do NOT create support tickets.
  Do create tasks in dev module (category=dev).
  Route to dev module inbox, not support inbox.

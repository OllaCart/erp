# Module 02 — Multi-Account Email
# Dash ERP System Specification

## Purpose

Connect multiple Gmail accounts across all three businesses into one unified inbox
inside Dash ERP. Claude reads, categorizes, and drafts replies. Founder reviews
and sends from the correct business account.

## Email Accounts

  SwiftFi:
    - support@swiftfi.com

  UnbeatableLoans:
    - support@unbeatableloans.com

  OllaCart:
    - support@ollacart.com    (customer support)
    - john@ollacart.com       (development)

## Architecture

  Each email account is a separate Google OAuth token stored in the database.
  The existing Google OAuth flow (/app/api/auth/google/) must be extended to
  support multiple simultaneous authenticated accounts.

  Token storage: Supabase table "email_accounts"
  Graph storage: Neo4j EmailAccount nodes linked to Business nodes

## Supabase Schema

  Table: email_accounts
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    email_address: text NOT NULL UNIQUE
    display_name: text
    access_token: text (encrypted)
    refresh_token: text (encrypted)
    token_expires_at: timestamp
    last_synced_at: timestamp
    is_active: boolean DEFAULT true
    created_at: timestamp DEFAULT now()

  Table: emails
    id: uuid PRIMARY KEY
    account_id: uuid REFERENCES email_accounts(id)
    business_id: text NOT NULL
    gmail_message_id: text UNIQUE
    gmail_thread_id: text
    from_address: text
    from_name: text
    to_addresses: text[]
    subject: text
    body_plain: text
    body_html: text
    received_at: timestamp
    is_read: boolean DEFAULT false
    claude_category: text   -- "urgent" | "reply-needed" | "fyi" | "spam" | "investor" | "customer"
    claude_summary: text    -- Claude's one-line summary
    claude_draft_reply: text -- Claude's suggested reply (if applicable)
    task_id: uuid           -- linked task if action required
    created_at: timestamp DEFAULT now()

## API Routes

  POST /api/email/connect
    - Initiates Google OAuth for a new email account
    - Params: business_id, email_address (hint for which account to auth)
    - Returns: OAuth URL to redirect user to

  GET /api/email/callback
    - Handles Google OAuth callback
    - Saves tokens to Supabase email_accounts table
    - Triggers initial sync

  GET /api/email/list
    - Returns emails across all accounts (or filtered by business_id)
    - Params: business_id?, account_email?, category?, limit, offset
    - Sorted by received_at DESC

  POST /api/email/sync
    - Syncs new emails from Gmail API for all active accounts
    - Runs as background job every 15 minutes
    - For each new email: saves to DB, calls Claude to categorize + summarize

  POST /api/email/reply
    - Sends a reply from the correct Gmail account
    - Params: email_id, body, send_as (email address)
    - Requires user confirmation before sending

  POST /api/email/draft
    - Calls Claude to draft a reply for a given email
    - Returns draft for user review, does NOT send automatically

## Gmail API Integration

  File: /lib/gmail.ts

  Use Google APIs Node.js client: npm install googleapis

  Functions needed:
    listMessages(auth, query, maxResults)
    getMessage(auth, messageId)
    sendMessage(auth, to, subject, body, threadId)
    markAsRead(auth, messageId)
    getThread(auth, threadId)

  Auth: Use stored refresh_token to get fresh access_token before each call
  Scopes required: gmail.readonly, gmail.send, gmail.modify

## Claude Email Processing

  For each new email, call Claude with:

  System: You are processing an email for {business_name}. Categorize and summarize it.

  Categories:
    - urgent: needs immediate response (angry customer, legal, broken payment)
    - investor: from an investor or potential investor
    - reply-needed: requires a response within 24-48h
    - customer: general customer inquiry
    - developer: dev-related (for john@ollacart.com)
    - fyi: informational, no action needed
    - spam: unsolicited

  Return JSON:
  {
    "category": "reply-needed",
    "summary": "Customer asking about refund for transaction #1234",
    "urgency": 3,
    "suggested_action": "Reply with refund policy and initiate refund",
    "draft_reply": "Hi [name], Thank you for reaching out..."
  }

## UI Components

  File: /components/email/InboxView.tsx

  Layout:
    - Left sidebar: account list with unread counts per account
    - Center: email list with category badges, Claude summary, sender
    - Right panel: email detail + Claude draft reply

  Features:
    - Filter by business, account, or category
    - One-click approve and send Claude's draft
    - Edit Claude's draft before sending
    - Mark as read / archive
    - Convert email to task (one click)
    - Show thread history

  Badge colors by category:
    urgent: red
    investor: purple
    reply-needed: amber
    customer: blue
    developer: teal
    fyi: gray
    spam: gray (muted)

## Unified Inbox vs. Per-Account View

  Default view: unified inbox (all accounts, sorted by received_at)
  Toggle: per-business filter using business tabs at top
  Filter: per-account using account selector in sidebar

  Important: always show which account an email belongs to.
  Never let emails from different businesses appear merged without clear labeling.

## Security & Privacy

  - OAuth tokens stored encrypted in Supabase (use Supabase vault or AES-256)
  - Never log email body content to console in production
  - Email bodies not stored in Neo4j (too verbose) — summaries only
  - Refresh tokens rotated on use
  - Revocation: DELETE /api/email/disconnect removes tokens and stops sync

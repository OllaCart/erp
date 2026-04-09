-- ============================================================
-- Dash ERP — Migration 001: Tasks + Email tables
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Tasks ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       text NOT NULL CHECK (business_id IN ('swiftfi', 'unbeatableloans', 'ollacart')),
  title             text NOT NULL,
  description       text,
  status            text NOT NULL DEFAULT 'todo'
                      CHECK (status IN ('todo', 'in_progress', 'done', 'blocked', 'archived')),
  priority          text NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  category          text CHECK (category IN ('dev', 'outreach', 'pitch', 'support', 'ops', 'finance')),
  source            text NOT NULL DEFAULT 'manual'
                      CHECK (source IN ('manual', 'email', 'github', 'calendar', 'claude', 'chat')),
  source_id         text,           -- ID of the email/PR/event that created this task
  assignee          text NOT NULL DEFAULT 'founder'
                      CHECK (assignee IN ('founder', 'developer') OR assignee LIKE '%@%'),
  due_date          date,
  completed_at      timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_business_id_idx    ON tasks (business_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx         ON tasks (status);
CREATE INDEX IF NOT EXISTS tasks_priority_idx       ON tasks (priority);
CREATE INDEX IF NOT EXISTS tasks_assignee_idx       ON tasks (assignee);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx       ON tasks (due_date);
CREATE INDEX IF NOT EXISTS tasks_source_id_idx      ON tasks (source_id);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Email Accounts ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       text NOT NULL CHECK (business_id IN ('swiftfi', 'unbeatableloans', 'ollacart')),
  email_address     text NOT NULL UNIQUE,
  display_name      text,
  access_token      text,           -- encrypted at app layer before storing
  refresh_token     text,           -- encrypted at app layer before storing
  token_expires_at  timestamptz,
  last_synced_at    timestamptz,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_accounts_business_id_idx ON email_accounts (business_id);
CREATE INDEX IF NOT EXISTS email_accounts_active_idx      ON email_accounts (is_active);

-- Seed the four known email accounts (tokens filled in when OAuth is linked)
INSERT INTO email_accounts (business_id, email_address, display_name)
VALUES
  ('swiftfi',         'support@swiftfi.com',         'SwiftFi Support'),
  ('unbeatableloans', 'support@unbeatableloans.com',  'UnbeatableLoans Support'),
  ('ollacart',        'support@ollacart.com',         'OllaCart Support'),
  ('ollacart',        'john@ollacart.com',            'OllaCart Dev')
ON CONFLICT (email_address) DO NOTHING;

-- ── Emails ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emails (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  business_id         text NOT NULL CHECK (business_id IN ('swiftfi', 'unbeatableloans', 'ollacart')),
  gmail_message_id    text UNIQUE,
  gmail_thread_id     text,
  from_address        text,
  from_name           text,
  to_addresses        text[],
  subject             text,
  body_plain          text,
  body_html           text,
  received_at         timestamptz,
  is_read             boolean NOT NULL DEFAULT false,
  claude_category     text CHECK (
                        claude_category IN (
                          'urgent', 'investor', 'reply-needed',
                          'customer', 'developer', 'fyi', 'spam'
                        )
                      ),
  claude_summary      text,         -- Claude's one-line summary
  claude_draft_reply  text,         -- Claude's suggested reply (never auto-sent)
  task_id             uuid REFERENCES tasks(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emails_account_id_idx       ON emails (account_id);
CREATE INDEX IF NOT EXISTS emails_business_id_idx      ON emails (business_id);
CREATE INDEX IF NOT EXISTS emails_received_at_idx      ON emails (received_at DESC);
CREATE INDEX IF NOT EXISTS emails_claude_category_idx  ON emails (claude_category);
CREATE INDEX IF NOT EXISTS emails_is_read_idx          ON emails (is_read);
CREATE INDEX IF NOT EXISTS emails_gmail_thread_id_idx  ON emails (gmail_thread_id);

-- ============================================================
-- Dash ERP — Migration 002: Calendar events table
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         text NOT NULL CHECK (business_id IN ('swiftfi', 'unbeatableloans', 'ollacart')),
  google_event_id     text UNIQUE,
  calendar_account    text NOT NULL,   -- which email account owns this calendar
  title               text NOT NULL,
  description         text,
  start_time          timestamptz NOT NULL,
  end_time            timestamptz NOT NULL,
  location            text,
  attendees           jsonb,           -- [{email, name, status}]
  event_type          text CHECK (
                        event_type IN (
                          'investor_meeting', 'dev_sync', 'customer_call',
                          'internal', 'personal', 'pitch', 'other'
                        )
                      ) DEFAULT 'other',
  claude_prep_notes   text,
  task_id             uuid REFERENCES tasks(id) ON DELETE SET NULL,
  is_recurring        boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_events_business_id_idx   ON calendar_events (business_id);
CREATE INDEX IF NOT EXISTS calendar_events_start_time_idx    ON calendar_events (start_time);
CREATE INDEX IF NOT EXISTS calendar_events_calendar_acct_idx ON calendar_events (calendar_account);
CREATE INDEX IF NOT EXISTS calendar_events_event_type_idx    ON calendar_events (event_type);

DROP TRIGGER IF EXISTS calendar_events_updated_at ON calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

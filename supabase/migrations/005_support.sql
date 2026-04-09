-- ============================================================
-- Migration 005: Customer Support — support_tickets + ticket_messages
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Support Tickets ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_tickets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         text NOT NULL,
  email_id            uuid REFERENCES emails(id) ON DELETE SET NULL,
  ticket_number       text UNIQUE NOT NULL,
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority            text NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  category            text CHECK (category IN ('billing', 'technical', 'account', 'general', 'refund')),
  customer_email      text NOT NULL,
  customer_name       text,
  subject             text NOT NULL,
  first_message       text,
  resolution_notes    text,
  claude_diagnosis    text,
  sentiment           text CHECK (sentiment IN ('positive', 'neutral', 'frustrated', 'angry')),
  first_response_at   timestamptz,
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_business_id_idx ON support_tickets (business_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx      ON support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_priority_idx    ON support_tickets (priority);
CREATE INDEX IF NOT EXISTS support_tickets_customer_idx    ON support_tickets (customer_email);
CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx  ON support_tickets (created_at DESC);

DROP TRIGGER IF EXISTS support_tickets_updated_at ON support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Ticket Messages ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ticket_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  direction     text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_address  text,
  body          text,
  claude_draft  boolean NOT NULL DEFAULT false,
  sent_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON ticket_messages (ticket_id);
CREATE INDEX IF NOT EXISTS ticket_messages_sent_at_idx   ON ticket_messages (sent_at DESC);

-- ── Ticket number sequence per business ────────────────────────────────────────
-- Stored as a simple table to avoid per-business sequences

CREATE TABLE IF NOT EXISTS ticket_number_seq (
  business_id text PRIMARY KEY,
  next_val    integer NOT NULL DEFAULT 1
);

INSERT INTO ticket_number_seq (business_id, next_val)
VALUES ('swiftfi', 1), ('unbeatableloans', 1), ('ollacart', 1)
ON CONFLICT (business_id) DO NOTHING;

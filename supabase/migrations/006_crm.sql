-- ============================================================
-- Migration 006: CRM — crm_contacts + ghl_webhook_events
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── CRM Contacts ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_contacts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       text NOT NULL,
  ghl_contact_id    text,             -- GoHighLevel contact ID (null for manual)
  first_name        text,
  last_name         text,
  email             text,
  phone             text,
  company           text,
  contact_type      text NOT NULL DEFAULT 'lead'
                      CHECK (contact_type IN ('lead', 'customer', 'partner', 'investor')),
  pipeline_stage    text,
  pipeline_id       text,
  opportunity_id    text,
  last_activity_at  timestamptz,
  notes             text,
  tags              text[],
  source            text NOT NULL DEFAULT 'manual'
                      CHECK (source IN ('ghl_sync', 'manual', 'email', 'webhook')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_ghl_id_idx
  ON crm_contacts (ghl_contact_id)
  WHERE ghl_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_contacts_business_id_idx   ON crm_contacts (business_id);
CREATE INDEX IF NOT EXISTS crm_contacts_contact_type_idx  ON crm_contacts (contact_type);
CREATE INDEX IF NOT EXISTS crm_contacts_stage_idx         ON crm_contacts (pipeline_stage);
CREATE INDEX IF NOT EXISTS crm_contacts_activity_idx      ON crm_contacts (last_activity_at DESC);

DROP TRIGGER IF EXISTS crm_contacts_updated_at ON crm_contacts;
CREATE TRIGGER crm_contacts_updated_at
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── GHL Webhook Events ─────────────────────────────────────────────────────────
-- Stores raw inbound webhooks from GoHighLevel for auditing + processing

CREATE TABLE IF NOT EXISTS ghl_webhook_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     text NOT NULL,
  event_type      text NOT NULL,      -- "ContactCreate" | "ContactUpdate" | "OpportunityStageUpdate" | etc.
  ghl_contact_id  text,
  payload         jsonb NOT NULL,
  processed       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ghl_events_business_id_idx ON ghl_webhook_events (business_id);
CREATE INDEX IF NOT EXISTS ghl_events_type_idx        ON ghl_webhook_events (event_type);
CREATE INDEX IF NOT EXISTS ghl_events_created_at_idx  ON ghl_webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS ghl_events_processed_idx   ON ghl_webhook_events (processed);

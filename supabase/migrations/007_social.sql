-- ============================================================
-- Migration 007: Social Media — social_accounts, social_posts, linkedin_connections
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS social_accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       text NOT NULL,
  platform          text NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram')),
  account_type      text NOT NULL CHECK (account_type IN ('personal', 'company_page')),
  account_name      text,
  account_id        text,
  access_token      text,
  refresh_token     text,
  token_expires_at  timestamptz,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_unique
  ON social_accounts (business_id, platform, account_type);
CREATE INDEX IF NOT EXISTS social_accounts_business_idx ON social_accounts (business_id);

CREATE TABLE IF NOT EXISTS social_posts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         text NOT NULL,
  social_account_id   uuid REFERENCES social_accounts(id) ON DELETE SET NULL,
  platform            text NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram')),
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  content             text NOT NULL,
  media_urls          text[],
  scheduled_for       timestamptz,
  published_at        timestamptz,
  platform_post_id    text,
  likes               integer NOT NULL DEFAULT 0,
  comments            integer NOT NULL DEFAULT 0,
  shares              integer NOT NULL DEFAULT 0,
  impressions         integer NOT NULL DEFAULT 0,
  claude_generated    boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_posts_business_idx    ON social_posts (business_id);
CREATE INDEX IF NOT EXISTS social_posts_status_idx      ON social_posts (status);
CREATE INDEX IF NOT EXISTS social_posts_scheduled_idx   ON social_posts (scheduled_for);
CREATE INDEX IF NOT EXISTS social_posts_platform_idx    ON social_posts (platform);

DROP TRIGGER IF EXISTS social_posts_updated_at ON social_posts;
CREATE TRIGGER social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS linkedin_connections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           text NOT NULL,
  linkedin_member_id    text NOT NULL,
  name                  text,
  headline              text,
  company               text,
  connected_at          timestamptz,
  last_interaction_at   timestamptz,
  notes                 text,
  contact_type          text CHECK (contact_type IN ('investor', 'partner', 'customer', 'peer', 'other')),
  crm_contact_id        uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS linkedin_connections_unique
  ON linkedin_connections (business_id, linkedin_member_id);
CREATE INDEX IF NOT EXISTS linkedin_connections_business_idx ON linkedin_connections (business_id);
CREATE INDEX IF NOT EXISTS linkedin_connections_type_idx     ON linkedin_connections (contact_type);

-- ============================================================
-- Migration 004: Dev Module — repos + github_events tables
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Repos ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS repos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           text NOT NULL,
  github_repo           text NOT NULL UNIQUE,   -- "OllaCart/erp"
  display_name          text,                   -- "OllaCart ERP"
  owner                 text NOT NULL DEFAULT 'founder'
                          CHECK (owner IN ('founder', 'developer', 'shared')),
  repo_type             text NOT NULL DEFAULT 'app'
                          CHECK (repo_type IN ('landing', 'app')),
  default_branch        text NOT NULL DEFAULT 'main',
  github_webhook_secret text,
  is_active             boolean NOT NULL DEFAULT true,
  last_synced_at        timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repos_business_id_idx ON repos (business_id);
CREATE INDEX IF NOT EXISTS repos_active_idx      ON repos (is_active);

-- Seed the 6 known repos
INSERT INTO repos (business_id, github_repo, display_name, owner, repo_type)
VALUES
  ('swiftfi',         'DevFlexCo/swiftfi-landing',      'SwiftFi Landing',        'founder',   'landing'),
  ('swiftfi',         'DevFlexCo/swiftfi-app',           'SwiftFi App',            'developer', 'app'),
  ('unbeatableloans', 'DevFlexCo/loans-landing',         'UBL Landing',            'founder',   'landing'),
  ('unbeatableloans', 'DevFlexCo/loans-app',             'UBL App',                'developer', 'app'),
  ('ollacart',        'DevFlexCo/ollacart-landing',      'OllaCart Landing',       'founder',   'landing'),
  ('ollacart',        'OllaCart/erp',                    'OllaCart ERP (this app)','shared',    'app')
ON CONFLICT (github_repo) DO NOTHING;

-- ── GitHub Events ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS github_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         text NOT NULL,
  repo_id             uuid REFERENCES repos(id) ON DELETE SET NULL,
  github_event_type   text NOT NULL,   -- "pull_request" | "push" | "issues" | "issue_comment"
  github_event_action text,            -- "opened" | "closed" | "merged" | "review_requested"
  payload             jsonb NOT NULL,  -- raw GitHub webhook payload
  claude_summary      text,            -- Claude's plain-English summary
  task_id             uuid,            -- linked task created from this event
  actor               text,            -- GitHub username
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS github_events_business_id_idx ON github_events (business_id);
CREATE INDEX IF NOT EXISTS github_events_repo_id_idx     ON github_events (repo_id);
CREATE INDEX IF NOT EXISTS github_events_created_at_idx  ON github_events (created_at DESC);
CREATE INDEX IF NOT EXISTS github_events_type_idx        ON github_events (github_event_type);

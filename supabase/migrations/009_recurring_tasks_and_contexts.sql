-- ============================================================
-- Dash ERP — Migration 009: Recurring tasks + extended contexts
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Expand business_id to include personal, mortgage (job), projects ─────────

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_business_id_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_business_id_check
  CHECK (business_id IN ('swiftfi', 'unbeatableloans', 'ollacart', 'personal', 'mortgage', 'projects'));

-- email_accounts and emails may also need expanded business_id in future,
-- but tasks is the primary table affected right now.

-- ── Allow 'claude' as a task assignee ────────────────────────────────────────

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_check
  CHECK (assignee IN ('founder', 'developer', 'claude') OR assignee LIKE '%@%');

-- ── Recurring tasks ───────────────────────────────────────────────────────────
-- recurrence_rule: how often the task repeats (null = one-off)
-- recurrence_interval: every N units (e.g. every 2 weeks)
-- recurrence_parent_id: if this task was auto-spawned, points back to original

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence_rule     text
    CHECK (recurrence_rule IN ('daily', 'weekly', 'monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_recurrence_rule_idx
  ON tasks (recurrence_rule)
  WHERE recurrence_rule IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_recurrence_parent_idx
  ON tasks (recurrence_parent_id)
  WHERE recurrence_parent_id IS NOT NULL;

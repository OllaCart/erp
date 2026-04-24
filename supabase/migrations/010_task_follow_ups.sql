-- ============================================================
-- Dash ERP — Migration 010: Task follow-ups
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- follows_up_on: points to the task this one was created to follow up on.
-- Nullable — only set on explicitly created follow-up tasks.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS follows_up_on uuid REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_follows_up_on_idx
  ON tasks (follows_up_on)
  WHERE follows_up_on IS NOT NULL;

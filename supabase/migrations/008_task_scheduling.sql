-- Task time blocks on calendar + relax calendar business_id for personal slugs

ALTER TABLE calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_business_id_check;

ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_business_id_check
  CHECK (business_id <> '');

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS scheduled_start timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz,
  ADD COLUMN IF NOT EXISTS calendar_event_id uuid REFERENCES calendar_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_scheduled_start_idx
  ON tasks (scheduled_start)
  WHERE scheduled_start IS NOT NULL;

-- ============================================================
-- Migration 003: Flexible email accounts
-- - Remove hardcoded seeded placeholder accounts (no tokens, just noise)
-- - Drop rigid business_id CHECK constraints on email_accounts + emails
--   so any business slug can be used without a migration
-- - Add 'personal' as a recognized business context
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Remove placeholder seeded accounts that have no OAuth tokens
DELETE FROM email_accounts
WHERE access_token IS NULL
  AND email_address IN (
    'support@swiftfi.com',
    'support@unbeatableloans.com',
    'support@ollacart.com',
    'john@ollacart.com'
  );

-- Drop the rigid CHECK constraint on email_accounts.business_id
ALTER TABLE email_accounts
  DROP CONSTRAINT IF EXISTS email_accounts_business_id_check;

-- Allow any non-empty business slug (swiftfi, unbeatableloans, ollacart, personal, ...)
ALTER TABLE email_accounts
  ADD CONSTRAINT email_accounts_business_id_check
  CHECK (business_id <> '');

-- Drop and relax the CHECK constraint on emails.business_id as well
ALTER TABLE emails
  DROP CONSTRAINT IF EXISTS emails_business_id_check;

ALTER TABLE emails
  ADD CONSTRAINT emails_business_id_check
  CHECK (business_id <> '');

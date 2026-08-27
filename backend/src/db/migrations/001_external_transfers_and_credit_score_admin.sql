-- Migration: external transfer fields + credit score audit trail
-- Safe to run against your existing database — every change is additive
-- (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS). Nothing is
-- dropped, nothing is truncated, no existing rows are touched except the
-- one-time backfill noted below.
--
-- Run this once:
--   psql "$DATABASE_URL" -f backend/src/db/migrations/001_external_transfers_and_credit_score_admin.sql

BEGIN;

-- ── Transfers: recipient/bank details for external transfers + a
--    human-readable reference number for receipts ──────────────────────
ALTER TABLE transfers
  ADD COLUMN IF NOT EXISTS reference_number VARCHAR(20)
    DEFAULT ('MT-' || upper(substr(md5(random()::text), 1, 10))),
  ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS external_bank_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS external_account_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS external_routing_number VARCHAR(9);

-- Backfill reference numbers for any pre-existing transfers created before
-- this column existed (the column default only applies to new rows).
UPDATE transfers
SET reference_number = 'MT-' || upper(substr(md5(random()::text || id::text), 1, 10))
WHERE reference_number IS NULL;

-- Now that every row has one, enforce uniqueness going forward.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transfers_reference_number_key'
  ) THEN
    ALTER TABLE transfers ADD CONSTRAINT transfers_reference_number_key UNIQUE (reference_number);
  END IF;
END $$;

ALTER TABLE transfers ALTER COLUMN reference_number SET NOT NULL;

-- ── Credit scores: who changed it and why, for the admin audit trail ────
ALTER TABLE credit_scores
  ADD COLUMN IF NOT EXISTS set_by_admin_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reason VARCHAR(200);

COMMIT;

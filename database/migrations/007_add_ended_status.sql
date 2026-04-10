-- =============================================================================
-- Migration 007: Add 'ended' to expeditions status constraint
-- The mobile app uses updateExpeditionStatus(id, 'ended') and
-- autoExpireExpeditions() — both require 'ended' to be a valid value.
-- =============================================================================

-- Drop the old constraint and replace it with one that includes 'ended'
ALTER TABLE expeditions
  DROP CONSTRAINT IF EXISTS expeditions_status_check;

ALTER TABLE expeditions
  ADD CONSTRAINT expeditions_status_check
    CHECK (status IN ('active', 'completed', 'cancelled', 'ended'));

-- Tasker verification workflow: rejection reason and timestamps
-- US-T-002, US-A-008: Admin verify/reject tasker applications

ALTER TABLE tasker_profiles
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

COMMENT ON COLUMN tasker_profiles.rejection_reason IS 'Reason given when admin rejects tasker application; cleared on resubmit or approve';
COMMENT ON COLUMN tasker_profiles.rejected_at IS 'When the application was last rejected; null if never rejected or resubmitted';

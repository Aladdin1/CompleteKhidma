-- Bid-based tasks: task_bids table and optional bid_id on bookings
-- Status: requested = client asked for quote, tasker hasn't submitted
--         pending = tasker submitted quote, waiting client accept/decline
--         accepted, declined, withdrawn, expired

CREATE TYPE bid_status AS ENUM (
  'requested',
  'pending',
  'accepted',
  'declined',
  'withdrawn',
  'expired'
);

CREATE TABLE task_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tasker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INT,
  currency TEXT NOT NULL DEFAULT 'EGP',
  minimum_minutes INT NOT NULL DEFAULT 60,
  message TEXT,
  can_start_at TIMESTAMPTZ,
  status bid_status NOT NULL DEFAULT 'requested',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, tasker_id)
);

CREATE INDEX idx_task_bids_task_status ON task_bids(task_id, status);
CREATE INDEX idx_task_bids_tasker_status ON task_bids(tasker_id, status);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bid_id UUID REFERENCES task_bids(id);

-- US-C-101/102/103: at post time client chooses open_for_bids vs invite_only
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS bid_mode TEXT NOT NULL DEFAULT 'invite_only'
  CHECK (bid_mode IN ('open_for_bids', 'invite_only'));

COMMENT ON COLUMN tasks.bid_mode IS 'open_for_bids = any matching tasker can submit a quote; invite_only = client chooses taskers to request a quote from';

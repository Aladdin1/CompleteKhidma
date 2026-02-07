-- Negotiation: bid-level messages for pre-booking Q&A (tasker questions, client replies: text/image/video)
-- See design/negotiation_process_design.md
-- Note: To allow 'video' in booking conversations (messages table), run outside a transaction:
--   ALTER TYPE message_kind ADD VALUE IF NOT EXISTS 'video';

CREATE TABLE IF NOT EXISTS bid_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID NOT NULL REFERENCES task_bids(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'voice', 'image', 'video', 'system')),
  text TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bid_messages_bid_created ON bid_messages(bid_id, created_at DESC);

COMMENT ON TABLE bid_messages IS 'Pre-booking negotiation: tasker questions and client replies (text/image/video) per bid';

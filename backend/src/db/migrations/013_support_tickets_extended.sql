-- US-A-043: Ticket type/category
-- US-A-044: Link ticket to task or dispute
-- US-A-046: Resolution summary when closing
-- US-A-050: Due date / SLA

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS dispute_id UUID REFERENCES disputes(id) ON DELETE SET NULL;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolution_summary TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_support_tickets_type ON support_tickets(type) WHERE type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_task ON support_tickets(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_dispute ON support_tickets(dispute_id) WHERE dispute_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_due_at ON support_tickets(due_at) WHERE due_at IS NOT NULL;

-- Optional: allow note to be "sent to user" (US-A-047) – store visibility
ALTER TABLE support_ticket_notes ADD COLUMN IF NOT EXISTS sent_to_user BOOLEAN NOT NULL DEFAULT false;

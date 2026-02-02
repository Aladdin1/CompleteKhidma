-- US-A-006: Account-level suspend/ban for all users (not just taskers)
-- US-A-007: Fraud risk score for behavior flags
-- US-A-028: Support tickets for ticket-centric UI with user context

-- 1. User account status (suspend/ban) and fraud risk
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status_updated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status_actor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fraud_risk_score INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fraud_risk_updated_at TIMESTAMPTZ;

-- Constrain account_status and fraud_risk_score (ignore if already present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_account_status_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_account_status_check CHECK (account_status IN ('active', 'suspended', 'banned'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_fraud_risk_score_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_fraud_risk_score_check CHECK (fraud_risk_score IS NULL OR (fraud_risk_score >= 0 AND fraud_risk_score <= 100));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);

-- 2. Support tickets (US-A-026, US-A-028)
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS support_ticket_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_ticket_notes_ticket ON support_ticket_notes(ticket_id);

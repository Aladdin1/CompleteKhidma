-- KHIDMA Platform Database Schema Migration
-- Based on: database_schemas_khidma_platform_postgre_sql.md (KHIDMA Platform)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. Core Types (Enums)
-- ============================================

CREATE TYPE user_role AS ENUM ('client','tasker','ops','admin');
CREATE TYPE task_state AS ENUM (
  'draft','posted','matching','accepted','confirmed','in_progress','completed','settled','reviewed',
  'expired','canceled_by_client','canceled_by_tasker','disputed'
);
CREATE TYPE booking_status AS ENUM ('offered','accepted','confirmed','in_progress','completed','canceled','disputed');
CREATE TYPE tasker_status AS ENUM ('applied','verified','active','at_risk','suspended','offboarded');
CREATE TYPE message_kind AS ENUM ('text','voice','image','system');
CREATE TYPE payment_method AS ENUM ('cash','wallet','card');
CREATE TYPE payment_status AS ENUM ('requires_action','authorized','captured','failed','canceled');
CREATE TYPE ledger_entry_type AS ENUM ('authorization','capture','refund','payout','fee','adjustment');
CREATE TYPE dispute_status AS ENUM ('open','investigating','resolved','rejected','refunded');

-- ============================================
-- 2. Users & Identity
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  full_name TEXT,
  locale TEXT NOT NULL DEFAULT 'ar-EG',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_verifications (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  national_id_hash TEXT,
  national_id_last4 TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL, -- ios/android/web
  push_token TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_user_devices_last_seen ON user_devices(last_seen_at);

-- ============================================
-- 3. Taskers
-- ============================================

CREATE TABLE tasker_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status tasker_status NOT NULL DEFAULT 'applied',
  bio TEXT,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  acceptance_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasker_categories (
  tasker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  PRIMARY KEY(tasker_id, category)
);

CREATE TABLE tasker_skills (
  tasker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  PRIMARY KEY(tasker_id, skill)
);

CREATE TABLE tasker_service_areas (
  tasker_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_km DOUBLE PRECISION NOT NULL DEFAULT 10
);

CREATE TABLE tasker_availability_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tasker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL DEFAULT 'available', -- available/unavailable
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasker_avail_tasker_time ON tasker_availability_blocks(tasker_id, starts_at, ends_at);

-- ============================================
-- 4. Tasks
-- ============================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  flexibility_minutes INT NOT NULL DEFAULT 0,
  pricing_model TEXT NOT NULL DEFAULT 'hourly',
  price_band_id TEXT,
  est_minutes INT,
  est_min_amount INT,
  est_max_amount INT,
  currency TEXT NOT NULL DEFAULT 'EGP',
  structured_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  state task_state NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_client_state ON tasks(client_id, state);
CREATE INDEX idx_tasks_city_state ON tasks(city, state);
CREATE INDEX idx_tasks_geo ON tasks(lat, lng);
CREATE INDEX idx_tasks_starts_at ON tasks(starts_at);

-- Task State History (Audit)
CREATE TABLE task_state_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_state task_state,
  to_state task_state NOT NULL,
  actor_user_id UUID REFERENCES users(id),
  reason TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_state_events_task_time ON task_state_events(task_id, created_at DESC);

-- ============================================
-- 5. Matching (Operational)
-- ============================================

CREATE TABLE task_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tasker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  score NUMERIC(10,6) NOT NULL,
  explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, tasker_id)
);

CREATE INDEX idx_task_candidates_task_rank ON task_candidates(task_id, rank);

-- ============================================
-- 6. Bookings
-- ============================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  tasker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status booking_status NOT NULL DEFAULT 'offered',
  agreed_rate_amount INT,
  agreed_rate_currency TEXT NOT NULL DEFAULT 'EGP',
  agreed_minimum_minutes INT NOT NULL DEFAULT 60,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id) -- one active booking per task (enforced by workflow)
);

CREATE INDEX idx_bookings_tasker_status ON bookings(tasker_id, status);
CREATE INDEX idx_bookings_task_status ON bookings(task_id, status);

-- Booking Events
CREATE TABLE booking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status booking_status,
  to_status booking_status NOT NULL,
  actor_user_id UUID REFERENCES users(id),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_events_booking_time ON booking_events(booking_id, created_at DESC);

-- ============================================
-- 7. Messaging
-- ============================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind message_kind NOT NULL,
  text TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_time ON messages(conversation_id, created_at DESC);

-- ============================================
-- 8. Payments & Ledger (Double-Entry)
-- ============================================

-- Payment Intents
CREATE TABLE payment_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'requires_action',
  provider TEXT, -- wallet provider or card processor
  provider_reference TEXT,
  amount_authorized INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_intents_status ON payment_intents(status);

-- Ledger Accounts
CREATE TABLE ledger_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL, -- client_cash, client_wallet, platform_fee, tasker_payable, escrow
  owner_user_id UUID REFERENCES users(id),
  currency TEXT NOT NULL DEFAULT 'EGP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kind, owner_user_id, currency)
);

-- Ledger Entries (Immutable)
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_type ledger_entry_type NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  reference_id TEXT, -- provider/cash receipt id
  currency TEXT NOT NULL DEFAULT 'EGP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES ledger_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  amount INT NOT NULL, -- positive for credit, negative for debit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_lines_account ON ledger_lines(account_id, created_at DESC);
CREATE INDEX idx_ledger_entries_booking ON ledger_entries(booking_id, created_at DESC);

-- Payouts
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tasker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  booking_id UUID REFERENCES bookings(id) ON DELETE RESTRICT,
  amount INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled/processing/paid/failed
  provider TEXT,
  provider_reference TEXT,
  scheduled_for TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_tasker_time ON payouts(tasker_id, created_at DESC);

-- ============================================
-- 9. Reviews & Reputation
-- ============================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id, created_at DESC);

-- ============================================
-- 10. Trust, Safety, and Disputes
-- ============================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reported_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  kind TEXT NOT NULL, -- harassment, fraud, safety, property_damage, etc.
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
  status dispute_status NOT NULL DEFAULT 'open',
  opened_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  amount_in_question INT,
  currency TEXT NOT NULL DEFAULT 'EGP',
  resolution JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================
-- 11. Audit & Admin
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_time ON audit_log(created_at DESC);

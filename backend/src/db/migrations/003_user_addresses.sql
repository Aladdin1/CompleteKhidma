-- User Addresses Migration
-- Adds support for multiple saved addresses per user (US-C-039)

-- Add deleted_at for soft deletion (for account deactivation) - do this first
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- e.g., "Home", "Office", "Rental Property"
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  district TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'Egypt',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_addresses_user') THEN
    CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_addresses_default') THEN
    CREATE INDEX idx_user_addresses_default ON user_addresses(user_id, is_default) WHERE is_default = true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_addresses_one_default') THEN
    CREATE UNIQUE INDEX idx_user_addresses_one_default ON user_addresses(user_id) WHERE is_default = true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_deleted_at') THEN
    CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
  END IF;
END $$;

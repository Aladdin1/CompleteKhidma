-- Migration 007: User Payment Methods
-- Adds table for storing user's saved payment methods

CREATE TABLE user_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type payment_method NOT NULL, -- 'card', 'wallet', 'cash' (cash is for reference only)
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Card-specific fields
  card_number_hash TEXT, -- Hashed card number for security
  card_last4 TEXT, -- Last 4 digits for display
  card_brand TEXT, -- visa, mastercard, etc.
  card_expiry_month INT CHECK (card_expiry_month >= 1 AND card_expiry_month <= 12),
  card_expiry_year INT CHECK (card_expiry_year >= 2020),
  cardholder_name TEXT,
  
  -- Wallet-specific fields
  wallet_provider TEXT, -- vodafone_cash, orange_money, etc.
  wallet_phone TEXT,
  
  -- Provider reference (for payment processor tokenization)
  provider_token TEXT, -- Encrypted token from payment processor
  provider_customer_id TEXT, -- Customer ID from payment processor
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Indexes
CREATE INDEX idx_user_payment_methods_user ON user_payment_methods(user_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_payment_methods_default ON user_payment_methods(user_id, is_default) WHERE deleted_at IS NULL AND is_default = true;

-- Ensure only one default payment method per user
CREATE UNIQUE INDEX user_payment_methods_one_default 
ON user_payment_methods(user_id) 
WHERE is_default = true AND deleted_at IS NULL;

-- Add comment
COMMENT ON TABLE user_payment_methods IS 'Stores user saved payment methods (cards, wallets). Supports soft deletes.';

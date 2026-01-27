-- Migration: Add OAuth support to users table
-- This allows users to sign in with Google or Facebook

-- Make phone nullable (OAuth users might not have phone initially)
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Add OAuth fields
ALTER TABLE users ADD COLUMN oauth_provider TEXT; -- 'google' or 'facebook'
ALTER TABLE users ADD COLUMN oauth_id TEXT; -- Provider's user ID

-- Create unique constraint for OAuth users (provider + oauth_id)
-- This ensures one OAuth account can only be linked to one user
CREATE UNIQUE INDEX idx_users_oauth_unique ON users(oauth_provider, oauth_id) 
WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL;

-- Add constraint to ensure phone is provided if not using OAuth
-- (This is a soft constraint - we'll handle it in application logic)
-- Note: We can't use CHECK constraint easily here since we want either phone OR oauth to be present
-- Application logic will handle this validation

-- Add index for faster OAuth lookups
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id) 
WHERE oauth_provider IS NOT NULL;

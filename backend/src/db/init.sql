-- KHIDMA Platform Database Initialization
-- This file is executed when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- Note: Full schema will be created via migrations
-- This file is for initial setup only

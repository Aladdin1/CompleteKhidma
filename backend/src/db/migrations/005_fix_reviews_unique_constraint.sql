-- Fix reviews table: Allow both client and tasker to review each other
-- Change unique constraint from booking_id to (booking_id, reviewer_id)

-- Drop the existing unique constraint on booking_id
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_key;

-- Add composite unique constraint on (booking_id, reviewer_id)
-- This allows both parties to review, but prevents duplicate reviews from the same reviewer
ALTER TABLE reviews ADD CONSTRAINT reviews_booking_reviewer_unique UNIQUE (booking_id, reviewer_id);

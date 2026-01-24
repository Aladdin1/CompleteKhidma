-- Migration 006: Fix bookings unique constraint to allow multiple canceled bookings
-- This allows clients to select another tasker after a rejection

-- Drop the existing unique constraint on task_id
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_task_id_key;

-- Create a partial unique index that only enforces uniqueness for non-canceled bookings
-- This allows multiple canceled bookings but only one active booking per task
CREATE UNIQUE INDEX bookings_task_id_active_unique 
ON bookings(task_id) 
WHERE status NOT IN ('canceled', 'disputed');

-- Add comment explaining the constraint
COMMENT ON INDEX bookings_task_id_active_unique IS 
'Ensures only one active booking per task. Canceled and disputed bookings are excluded, allowing new bookings after rejection.';

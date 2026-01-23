-- Add arrived_at to bookings (US-T-060: tasker marks arrived)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;

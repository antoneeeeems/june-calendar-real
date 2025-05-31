-- Database constraint to prevent overlapping events
-- Run this SQL in your Supabase SQL editor to prevent overlapping events

-- First, ensure the events table has the correct structure
-- (This is just for reference - your table should already exist)
/*
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

-- Install the btree_gist extension (required for exclusion constraints with timestamps)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add an exclusion constraint to prevent overlapping events for the same user
-- This constraint ensures that no two events for the same user can have overlapping time ranges
ALTER TABLE events 
ADD CONSTRAINT no_overlapping_events 
EXCLUDE USING gist (
  user_id WITH =,
  tsrange(start_time, end_time, '[)') WITH &&
);

-- Optional: Add an index to improve performance on time range queries
CREATE INDEX IF NOT EXISTS idx_events_user_time_range 
ON events USING gist (user_id, tsrange(start_time, end_time, '[)'));

-- Optional: Add a check constraint to ensure end_time is after start_time
ALTER TABLE events 
ADD CONSTRAINT end_after_start 
CHECK (end_time > start_time);

-- Test the constraint (these should fail after the constraint is added)
-- INSERT INTO events (user_id, title, start_time, end_time) VALUES 
-- ('some-user-id', 'Event 1', '2025-06-15 10:00:00', '2025-06-15 12:00:00'),
-- ('some-user-id', 'Event 2', '2025-06-15 11:00:00', '2025-06-15 13:00:00'); -- This should fail

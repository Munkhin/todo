-- Align backend with SCHEMA.md
-- Migration: align_schema.sql
-- This migration updates tables to match the new schema.

-- 1. Rename energy_profiles to settings (if it exists)
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.tables WHERE table_name = 'energy_profiles') THEN
    ALTER TABLE energy_profiles RENAME TO settings;
  END IF;
END $$;

-- 2. Add subjects column
ALTER TABLE settings ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 3. Convert wake_time and sleep_time to TIME
-- Drop defaults first to avoid casting errors
ALTER TABLE settings ALTER COLUMN wake_time DROP DEFAULT;
ALTER TABLE settings ALTER COLUMN sleep_time DROP DEFAULT;

-- Use make_time assuming they are integers (hours)
ALTER TABLE settings ALTER COLUMN wake_time TYPE TIME USING make_time(wake_time, 0, 0);
ALTER TABLE settings ALTER COLUMN sleep_time TYPE TIME USING make_time(sleep_time, 0, 0);

-- Set new defaults
ALTER TABLE settings ALTER COLUMN wake_time SET DEFAULT '07:00:00'::TIME;
ALTER TABLE settings ALTER COLUMN sleep_time SET DEFAULT '23:00:00'::TIME;

-- 4. Ensure energy_levels is JSONB
ALTER TABLE settings ALTER COLUMN energy_levels TYPE JSONB USING energy_levels::JSONB;

-- 5. Drop learning_history table (no longer needed)
DROP TABLE IF EXISTS learning_history;

-- 6. Drop user_subjects table (subjects now stored in settings)
DROP TABLE IF EXISTS user_subjects;

-- 7. Modify tasks table: remove SM2 columns
ALTER TABLE tasks DROP COLUMN IF EXISTS repetition_count;
ALTER TABLE tasks DROP COLUMN IF EXISTS easiness_factor;
ALTER TABLE tasks DROP COLUMN IF EXISTS last_reviewed_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS next_review_date;
-- Ensure subject column exists
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subject TEXT;

-- 8. Ensure calendar_events has fixed boolean and subject column
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS fixed BOOLEAN DEFAULT FALSE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS subject TEXT;

-- 9. Create review_sessions table
CREATE TABLE IF NOT EXISTS review_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id),
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    scheduled_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 10. Create sessions table for auth sessions
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    credentials JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;

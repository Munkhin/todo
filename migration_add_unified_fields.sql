-- Migration: Add unified data structure fields
-- Run this in your Supabase SQL Editor or via CLI
-- Date: 2025-11-11

-- ============ TASKS TABLE ============
-- Add new fields to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 10),
ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_start ON tasks(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============ CALENDAR_EVENTS TABLE ============
-- Add priority field to calendar_events table
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_task_id ON calendar_events(task_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range ON calendar_events(start_time, end_time);

-- ============ VERIFICATION ============
-- Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('difficulty', 'scheduled_start', 'scheduled_end', 'title', 'estimated_duration')
ORDER BY ordinal_position;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'calendar_events'
  AND column_name IN ('priority', 'event_type', 'source')
ORDER BY ordinal_position;

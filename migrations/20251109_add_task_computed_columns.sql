-- Migration: Add computed columns to tasks table for app compatibility
-- Date: 2025-11-09
-- Description: Adds 'duration' (hours) and 'scheduled' (boolean) as computed columns
--              to maintain compatibility with api_handwritten application code

-- Add duration column (computed from estimated_minutes)
-- Duration is in hours (decimal), estimated_minutes is in minutes (integer)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS duration DECIMAL GENERATED ALWAYS AS (estimated_minutes / 60.0) STORED;

-- Add scheduled column (computed from scheduled_start)
-- scheduled is true if the task has been scheduled (scheduled_start is not null)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS scheduled BOOLEAN GENERATED ALWAYS AS (scheduled_start IS NOT NULL) STORED;

-- Create index on scheduled column for performance
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduled);

-- Add comments to document the columns
COMMENT ON COLUMN tasks.duration IS 'Computed column: task duration in hours (estimated_minutes / 60)';
COMMENT ON COLUMN tasks.scheduled IS 'Computed column: true if task has been scheduled (scheduled_start IS NOT NULL)';

-- Verify migration
-- Run this to test: SELECT id, topic, estimated_minutes, duration, scheduled_start, scheduled FROM tasks LIMIT 5;

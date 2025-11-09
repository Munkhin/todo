-- Rollback migration: Remove computed columns from tasks table
-- Date: 2025-11-09
-- Use this if the migration needs to be reverted

-- Remove index
DROP INDEX IF EXISTS idx_tasks_scheduled;

-- Remove computed columns
ALTER TABLE tasks DROP COLUMN IF EXISTS duration;
ALTER TABLE tasks DROP COLUMN IF EXISTS scheduled;

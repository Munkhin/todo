-- Standardize the tasks table to the columns used throughout the app.

-- 1. Drop legacy computed columns that depend on estimated_minutes.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tasks'
          AND column_name = 'duration'
    ) THEN
        EXECUTE 'ALTER TABLE public.tasks DROP COLUMN duration';
    END IF;
END
$$;

-- 2. Rename or merge estimated_minutes -> estimated_duration.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tasks'
          AND column_name = 'estimated_minutes'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'tasks'
              AND column_name = 'estimated_duration'
        ) THEN
            EXECUTE 'UPDATE public.tasks SET estimated_duration = COALESCE(estimated_duration, estimated_minutes)';
            EXECUTE 'ALTER TABLE public.tasks DROP COLUMN estimated_minutes';
        ELSE
            EXECUTE 'ALTER TABLE public.tasks RENAME COLUMN estimated_minutes TO estimated_duration';
        END IF;
    END IF;
END
$$;

-- 3. Ensure required columns exist (with sensible defaults).
ALTER TABLE IF EXISTS public.tasks
    ADD COLUMN IF NOT EXISTS title text,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS difficulty integer,
    ADD COLUMN IF NOT EXISTS estimated_duration integer,
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS scheduled_start timestamptz,
    ADD COLUMN IF NOT EXISTS scheduled_end timestamptz,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

-- Backfill null priority/status to keep NOT NULL constraints happy.
UPDATE public.tasks SET priority = 'medium' WHERE priority IS NULL;
UPDATE public.tasks SET status = 'pending' WHERE status IS NULL;

-- 4. Drop unused legacy columns.
ALTER TABLE IF EXISTS public.tasks
    DROP COLUMN IF EXISTS topic,
    DROP COLUMN IF EXISTS source_text,
    DROP COLUMN IF EXISTS confidence_score,
    DROP COLUMN IF EXISTS last_studied,
    DROP COLUMN IF EXISTS review_count,
    DROP COLUMN IF EXISTS scheduled;

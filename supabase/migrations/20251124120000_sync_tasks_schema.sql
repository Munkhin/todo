alter table if exists public.tasks
    add column if not exists title text,
    add column if not exists priority text not null default 'medium',
    add column if not exists estimated_duration integer;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tasks'
          AND column_name = 'estimated_minutes'
    ) THEN
        UPDATE public.tasks
        SET estimated_duration = estimated_minutes
        WHERE estimated_duration IS NULL;
    END IF;
END
$$;

alter table if exists public.tasks
    drop column if exists estimated_minutes,
    drop column if exists topic,
    drop column if exists source_text,
    drop column if exists confidence_score,
    drop column if exists last_studied,
    drop column if exists review_count,
    drop column if exists duration,
    drop column if exists scheduled;

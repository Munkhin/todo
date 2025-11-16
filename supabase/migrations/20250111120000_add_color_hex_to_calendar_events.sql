alter table if exists public.calendar_events
add column if not exists color_hex text;

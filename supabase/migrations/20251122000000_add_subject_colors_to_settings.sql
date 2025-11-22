-- Add subject color mapping to settings with hardcoded TUI calendar color palette
-- Migration: 20251122000000_add_subject_colors_to_settings.sql

-- Add subject_colors JSONB column to settings table
ALTER TABLE public.settings
    ADD COLUMN IF NOT EXISTS subject_colors JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN public.settings.subject_colors IS 'Mapping of subject names to color hex codes from TUI calendar palette. Example: {"Math": "#03bd9e", "Physics": "#00a9ff"}';

-- Hardcoded TUI calendar color palette (from frontend Demo.tsx and calendarEventMapper.tsx)
-- These colors match the toast-ui/calendar styling:
-- #03bd9e - Teal (study/primary)
-- #00a9ff - Blue (meetings/secondary)
-- #ffa500 - Orange (breaks/alerts)
-- #9b59b6 - Purple (work/projects)
-- #e74c3c - Red (exercise/urgent)
-- #f39c12 - Yellow/Gold (personal)

-- Update existing rows with hardcoded colors assigned to their subjects
DO $$
DECLARE
    color_palette TEXT[] := ARRAY['#03bd9e', '#00a9ff', '#9b59b6', '#e74c3c', '#f39c12', '#ffa500'];
    user_row RECORD;
    subject_name TEXT;
    color_mapping JSONB;
    color_index INT;
BEGIN
    -- Iterate through all users with subjects
    FOR user_row IN SELECT user_id, subjects FROM public.settings WHERE subjects IS NOT NULL AND array_length(subjects, 1) > 0
    LOOP
        color_mapping := '{}'::jsonb;
        color_index := 1;
        
        -- Assign colors to each subject in round-robin fashion
        FOREACH subject_name IN ARRAY user_row.subjects
        LOOP
            color_mapping := jsonb_set(
                color_mapping,
                ARRAY[subject_name],
                to_jsonb(color_palette[color_index]),
                true
            );
            
            -- Cycle through color palette
            color_index := (color_index % array_length(color_palette, 1)) + 1;
        END LOOP;
        
        -- Update user's subject_colors
        UPDATE public.settings
        SET subject_colors = color_mapping
        WHERE user_id = user_row.user_id;
    END LOOP;
END $$;

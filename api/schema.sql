-- supabase database schema
-- run this in your Supabase SQL Editor to create all tables

-- users table
create table users (
    id bigserial primary key,
    email text unique not null,
    name text,
    google_user_id text unique,
    hashed_password text,
    created_at timestamptz default now(),
    timezone text default "UTC",
    subscription_plan text default "free",
    credits_used integer default 0,
    subscription_status text default "active",
    subscription_start_date timestamptz default now(),
    subscription_end_date timestamptz,
    stripe_customer_id text,
    stripe_subscription_id text
);

-- tasks table
create table tasks (
    id bigserial primary key,
    user_id bigint references users(id) on delete cascade,
    topic text not null,
    estimated_minutes integer not null,
    difficulty integer default 3,
    due_date timestamptz not null,
    description text,
    source_text text,
    confidence_score real default 1.0,
    status text default "unscheduled",
    last_studied timestamptz,
    review_count integer default 0,
    scheduled_start timestamptz,
    scheduled_end timestamptz,
    created_at timestamptz default now()
);

-- calendar_events table
create table calendar_events (
    id bigserial primary key,
    user_id bigint references users(id) on delete cascade not null,
    title text not null,
    description text,
    start_time timestamptz not null,
    end_time timestamptz not null,
    event_type text default "study",
    source text default "user",
    task_id bigint references tasks(id) on delete cascade,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- energy_profiles table
create table energy_profiles (
    id bigserial primary key,
    user_id bigint references users(id) on delete cascade not null,
    due_date_days integer default 7,
    wake_time integer default 7,
    sleep_time integer default 23,
    max_study_duration integer default 180,
    min_study_duration integer default 30,
    energy_levels text,
    insert_breaks boolean default true,
    short_break_min integer default 5,
    long_break_min integer default 15,
    long_study_threshold_min integer default 90,
    min_gap_for_break_min integer default 3,
    created_at timestamptz default now()
);

-- sessions table (for storing google oauth sessions)
create table sessions (
    id bigserial primary key,
    session_id text unique not null,
    credentials jsonb not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- indexes for performance
create index idx_tasks_user_id on tasks(user_id);
create index idx_tasks_due_date on tasks(due_date);
create index idx_tasks_status on tasks(status);
create index idx_calendar_events_user_id on calendar_events(user_id);
create index idx_calendar_events_start_time on calendar_events(start_time);
create index idx_sessions_session_id on sessions(session_id);
create index idx_users_google_user_id on users(google_user_id);

-- row level security (RLS) policies
alter table users enable row level security;
alter table tasks enable row level security;
alter table calendar_events enable row level security;
alter table energy_profiles enable row level security;
alter table sessions enable row level security;

-- allow service role to bypass RLS
-- users can only read/write their own data (to be implemented based on auth strategy)

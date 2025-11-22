# Database Schema

## Tables Overview

1. **users** - User account data
2. **tasks** - High-level goals/assignments
3. **calendar_events** - Scheduled time blocks
4. **review_sessions** - SM2 spaced repetition schedule
5. **settings** - User preferences, energy, subjects
6. **feedback** - User feedback messages

---

## 1. users

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | Unique user ID |
| email | TEXT UNIQUE | User email |
| name | TEXT | User display name |
| created_at | TIMESTAMPTZ | Account creation time |
| timezone | TEXT | User timezone |
| subscription_plan | TEXT | Plan type |
| credits_used | INTEGER | API credits consumed |
| subscription_status | TEXT | Active/cancelled/etc |
| subscription_start_date | TIMESTAMPTZ | Sub start |
| subscription_end_date | TIMESTAMPTZ | Sub end |
| stripe_customer_id | TEXT | Stripe customer ref |
| stripe_subscription_id | TEXT | Stripe sub ref |
| conversation_id | TEXT | Current AI conversation |

---

## 2. tasks

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | Unique task ID |
| user_id | BIGINT FK | Owner |
| title | TEXT | Task title |
| description | TEXT | Details |
| estimated_duration | INTEGER | Minutes |
| difficulty | INTEGER | 1-10 scale |
| subject | TEXT | Subject name |
| priority | TEXT | high/medium/low |
| status | TEXT | pending/completed/etc |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update |

---

## 3. calendar_events

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | Unique event ID |
| user_id | BIGINT FK | Owner |
| title | TEXT | Event title |
| description | TEXT | Details |
| start_time | TIMESTAMPTZ | Start time |
| end_time | TIMESTAMPTZ | End time |
| event_type | TEXT | study/review/break/user_event |
| source | TEXT | scheduler/user/agent |
| task_id | BIGINT FK | Parent task (nullable) |
| subject | TEXT | For interleaving (nullable) |
| priority | TEXT | high/medium/low |
| color_hex | TEXT | UI color |
| **fixed** | **BOOLEAN** | **Cannot be rescheduled** |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update |

### `fixed` Field Rules:
- **User manual events**: `fixed = TRUE`
- **Study sessions**: `fixed = FALSE` (flexible)
- **Review sessions**: `fixed = TRUE` (SM2 timing)
- **Reschedule targets**: become `fixed = TRUE`

---

## 4. review_sessions

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | Unique session ID |
| user_id | BIGINT FK | Owner |
| task_id | BIGINT FK | Original task |
| scheduled_date | TIMESTAMPTZ | When to review |
| status | TEXT | pending/completed/skipped |
| created_at | TIMESTAMPTZ | Creation time |
| completed_at | TIMESTAMPTZ | Completion time |

### SM2 Implementation:
- Created when task status = 'completed'
- Generates 5 sessions with intervals: [1, 6, 15, 37, 93] days
- Each session creates a fixed calendar_event immediately
- Easiness factor hardcoded to 2.5

---

## 5. settings

| Column | Type | Description |
|--------|------|-------------|
| user_id | BIGINT PK | One-to-one with users |
| **subjects** | **TEXT[]** | User's subjects list |
| wake_time | TIME | Wake time |
| sleep_time | TIME | Sleep time |
| max_study_duration | INTEGER | Minutes |
| min_study_duration | INTEGER | Minutes |
| short_break | INTEGER | Minutes |
| long_break | INTEGER | Minutes |
| long_study_threshold | INTEGER | Minutes |
| energy_levels | JSONB | Hour → energy map |
| onboarding_complete | BOOLEAN | Onboarding done |
| created_at | TIMESTAMPTZ | Creation time |

### energy_levels Format:
```json
{
  "8": 0.3,
  "9": 0.5,
  "10": 0.8,
  ...
  "23": 0.4
}
```
Keys: Hour (wake to sleep), Values: 0.0-1.0

### subjects:
- Moved from users table
- Used for UI autocomplete and interleaving
- Not enforced as FK (flexible)

---

## 6. feedback

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | Unique feedback ID |
| user_id | BIGINT FK | Submitter |
| message | TEXT | Feedback content |
| email | TEXT | Contact email |
| created_at | TIMESTAMPTZ | Submission time |

---

## Data Flow

### Task Completion → Review Sessions
```
1. User completes task (status = 'completed')
   ↓
2. Create 5 review_sessions (days 1, 6, 15, 37, 93)
   ↓
3. Create fixed calendar_events for each session
   - event_type = 'review'
   - fixed = TRUE
   - start_time = scheduled_date
   ↓
4. Reviews appear in calendar immediately
```

### Subject Inheritance
```
settings.subjects[] → tasks.subject → calendar_events.subject
```

---

## Scheduler Behavior

### Finding Empty Slots:
1. Query all calendar_events in time range
2. Extract events where `fixed = TRUE` OR `start_time IS NOT NULL`
3. Find gaps between these events
4. Return gaps as available slots

### Scheduling Events:
1. Only schedule events where `fixed = FALSE`
2. Skip all `fixed = TRUE` events
3. Assign flexible events to empty slots
4. Set `start_time`, `end_time` on assignment

# Architecture Overview

**1-minute read** | Last updated: 2025-11-11

---

## Stack

**Frontend:** Next.js 14 (App Router) + TypeScript + React Query + NextAuth
**Backend:** FastAPI + Python + Supabase (PostgreSQL)
**API Style:** REST JSON

---

## Architecture Pattern

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   React UI      │ ──HTTP──│   FastAPI API    │ ──SQL──│   Supabase   │
│  (Next.js)      │         │   (Python)       │         │  (Postgres)  │
└─────────────────┘         └──────────────────┘         └──────────────┘
```

**Data Flow:** UI → API Client (`lib/api/`) → FastAPI Routes → Database Functions → Supabase

---

## Feature Flows

### 1. Authentication & User Management

```
User Login
  ↓
NextAuth (Google OAuth)
  ↓
POST /api/auth/register-nextauth-session
  ↓
database.create_or_update_user_by_email()
  ↓
Supabase: users table
  ↓
Session stored in app state
```

**Key Files:**
- Frontend: `hooks/use-user-id.ts`
- Backend: `api/auth/user_routes.py`
- Database: `database.py:create_or_update_user_by_email()`

---

### 2. Tasks Management

```
User creates/views tasks
  ↓
hooks/use-tasks.ts (React Query)
  ↓
lib/api/tasks.ts
  ↓
GET/POST/PUT/DELETE /api/tasks[/{id}]
  ↓
api/tasks/task_routes.py
  ↓
database.py: create_task(), get_tasks_by_user(), update_task(), delete_task()
  ↓
Supabase: tasks table
```

**Endpoints:**
- `GET /api/tasks?user_id={id}` - List all user tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

**Key Files:**
- Frontend: `hooks/use-tasks.ts`, `lib/api/tasks.ts`
- Backend: `api/tasks/task_routes.py`
- Database: `database.py` (lines 188-222)

---

### 3. Calendar/Events Management

```
User manages calendar events
  ↓
components/Schedule/ScheduleView.tsx
  ↓
lib/api/calendar.ts
  ↓
GET/POST/PUT/DELETE /api/calendar/events[/{id}]
  ↓
api/calendar/event_routes.py
  ↓
database.py: create_calendar_event(), get_calendar_events(), update_calendar_event(), delete_calendar_event()
  ↓
Supabase: calendar_events table
```

**Endpoints:**
- `GET /api/calendar/events?user_id={id}&start_date=X&end_date=Y` - Get events with date filtering
- `POST /api/calendar/events` - Create event
- `PUT /api/calendar/events/{id}` - Update event
- `DELETE /api/calendar/events/{id}` - Delete event

**Key Files:**
- Frontend: `components/Schedule/ScheduleView.tsx`, `lib/api/calendar.ts`
- Backend: `api/calendar/event_routes.py`
- Database: `database.py` (lines 224-269)

---

### 4. Settings/Energy Profile

```
User configures preferences
  ↓
components/Settings/SettingsView.tsx
  ↓
hooks/use-settings.ts (React Query)
  ↓
lib/api/energyProfile.ts
  ↓
GET/POST /api/settings/energy-profile?user_id={id}
  ↓
api/settings/energy_profile_routes.py
  ↓
database.py: get_energy_profile(), create_or_update_energy_profile()
  ↓
Supabase: energy_profiles table
```

**Settings Stored:**
- Wake/sleep times (hours)
- Study duration limits (min/max)
- Energy levels by hour (JSON)
- Break preferences (short/long break durations)
- Default due date offset

**Key Files:**
- Frontend: `components/Settings/SettingsView.tsx`, `hooks/use-settings.ts`
- Backend: `api/settings/energy_profile_routes.py`
- Database: `database.py` (lines 271-298)

---

### 5. Subscription Management

```
User checks subscription status
  ↓
components/Subscription/SubscriptionView.tsx
  ↓
hooks/use-subscription.ts (React Query)
  ↓
lib/api/subscription.ts
  ↓
GET /api/users/{id}/subscription
  ↓
api/business_logic/subscription_routes.py
  ↓
database.py: get_user_by_id(), get_user_credits()
  ↓
Supabase: users table (subscription_plan, credits_used fields)
```

**Endpoints:**
- `GET /api/users/{id}/subscription` - Get subscription plan & status
- `GET /api/users/{id}/credits` - Get credit usage

**Plans:** free (10 credits), pro (500 credits), unlimited (∞ credits)

**Key Files:**
- Frontend: `components/Subscription/SubscriptionView.tsx`, `hooks/use-subscription.ts`
- Backend: `api/business_logic/subscription_routes.py`
- Database: `database.py` (lines 86-109)

---

### 6. Chat/AI Agent

```
User sends chat message
  ↓
components/Schedule/ChatBar.tsx
  ↓
controllers/model_response.ts
  ↓
POST /api/chat
  ↓
api/ai/chat_routes.py
  ↓
ai/agent.py (AI processing logic)
  ↓
Returns structured response
  ↓
UI updates calendar/tasks
```

**Endpoint:**
- `POST /api/chat` - Process user message with AI agent

**Key Files:**
- Frontend: `components/Schedule/ChatBar.tsx`, `controllers/model_response.ts`
- Backend: `api/ai/chat_routes.py`, `ai/agent.py`

---

## Database Schema

### Core Tables

**users**
- `id` (PK), `email`, `name`, `google_user_id`
- `subscription_plan`, `credits_used`, `subscription_status`
- `timezone`, `conversation_id`

**tasks**
- `id` (PK), `user_id` (FK), `title`, `description`
- `priority`, `status`, `due_date`, `estimated_duration`

**calendar_events**
- `id` (PK), `user_id` (FK), `task_id` (FK nullable)
- `title`, `description`, `start_time`, `end_time`
- `event_type` (study/rest/break), `source` (user/system)

**energy_profiles**
- `id` (PK), `user_id` (FK), `wake_time`, `sleep_time`
- `max_study_duration`, `min_study_duration`, `energy_levels` (JSON)
- `due_date_days`, `insert_breaks`, `short_break_min`, `long_break_min`

**sessions**
- `id` (PK), `session_id`, `credentials` (JSON)

---

## API Client Pattern

All frontend API calls follow this pattern:

```typescript
// 1. Define interface in lib/api/{feature}.ts
export interface Task { ... }

// 2. Create typed API function
export const getTasks = async (userId: number) => {
  return api.get<{ tasks: Task[] }>(`/api/tasks?user_id=${userId}`)
}

// 3. Use in React Query hook (hooks/use-{feature}.ts)
export function useTasks(userId: number) {
  return useQuery({
    queryKey: ['tasks', userId],
    queryFn: () => getTasks(userId)
  })
}

// 4. Consume in component
const { tasks, loading } = useTasks(userId)
```

---

## Backend Route Pattern

All backend routes follow this structure:

```python
# 1. Define Pydantic request model
class CreateTaskRequest(BaseModel):
    user_id: int
    title: str
    ...

# 2. Create route with validation
@router.post("/tasks")
async def create_task(request: CreateTaskRequest):
    # 3. Call database function
    task_id = create_task(task_data)

    # 4. Return structured response
    return {"success": True, "task_id": task_id}
```

---

## Error Handling

**Frontend:**
- API errors caught by React Query
- Displayed via `error` state in hooks
- User-facing error messages in components

**Backend:**
- FastAPI HTTPException for API errors
- Database errors logged and wrapped
- Returns JSON: `{"detail": "Error message"}`

---

## State Management

**Client State:** React Query (server data caching)
**Local State:** React useState (UI state)
**Auth State:** NextAuth session
**No Global Store:** All data fetched per-component as needed

---

## File Structure

```
todo/
├── api/                           # Backend
│   ├── main.py                    # FastAPI app entry
│   ├── database.py                # Supabase client + DB functions
│   ├── auth/                      # Auth routes
│   ├── tasks/                     # Task routes
│   ├── calendar/                  # Calendar routes
│   ├── settings/                  # Settings routes
│   ├── business_logic/            # Subscription routes
│   └── ai/                        # Chat/AI routes
│
└── todo_ui/                       # Frontend
    ├── app/                       # Next.js pages
    ├── components/                # React components
    ├── hooks/                     # React Query hooks
    ├── lib/api/                   # API client functions
    └── controllers/               # Business logic layer
```

---

## Key Design Decisions

1. **React Query for data fetching** - Automatic caching, refetching, loading states
2. **Separate API client layer** - Type-safe, reusable, testable
3. **Database functions in database.py** - Single source of truth for queries
4. **Pydantic models for validation** - Type safety + automatic docs
5. **No Redux/Zustand** - React Query handles server state, useState for UI state

---

## Performance Optimizations

- React Query stale time: 2-5 minutes (prevents excessive refetching)
- Database queries use indexes on user_id, task_id
- API responses paginated where needed
- Frontend lazy loads route components

---

## Development Workflow

**Backend:**
```bash
python -m uvicorn api.main:app --reload --port 8000
```

**Frontend:**
```bash
npm run dev  # Port 3000
```

**API Docs:** http://localhost:8000/docs (FastAPI auto-generated)

---

## Testing Strategy

**Syntax:** `python -m py_compile` for Python, `npx tsc --noEmit` for TypeScript
**Manual:** Browser testing of UI flows
**API:** FastAPI docs interactive testing

---

**End of Documentation** | 270 lines

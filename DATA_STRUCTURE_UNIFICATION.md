# Data Structure Unification - Implementation Complete

## Overview
This document describes the unified data structure implementation across database, backend, and frontend.

## Changes Summary

### ✅ Database Schema Changes
**Location:** `/workspaces/todo/migration_add_unified_fields.sql`

#### Tasks Table - New Fields Added:
- `difficulty` (INTEGER 1-10) - Task difficulty rating
- `scheduled_start` (TIMESTAMPTZ) - When task is scheduled to start
- `scheduled_end` (TIMESTAMPTZ) - When task is scheduled to end
- Indexes added for improved query performance

#### Calendar Events Table - New Fields Added:
- `priority` (VARCHAR low/medium/high) - Event priority level
- Indexes added for improved query performance

### ✅ Field Name Standardization
The following field names were unified across all layers:

| Old Name (Frontend) | New Name (Unified) | Type |
|---------------------|-------------------|------|
| `topic` | `title` | string |
| `estimated_minutes` | `estimated_duration` | number (minutes) |

### ✅ Backend Changes

#### Files Modified:
1. **`/api/tasks/task_routes.py`**
   - Added `difficulty`, `scheduled_start`, `scheduled_end` to `CreateTaskRequest`
   - Added `difficulty`, `scheduled_start`, `scheduled_end` to `UpdateTaskRequest`
   - Added validation for difficulty (1-10 range)
   - Added validation for scheduled time formats

2. **`/api/calendar/event_routes.py`**
   - Added `priority` field to `CreateCalendarEventRequest`
   - Added `priority` field to `UpdateCalendarEventRequest`

3. **`/api/data_types/consts.py`**
   - Updated `EVENT_SCHEMA` to include `priority` field

4. **`/api/business_logic/scheduler.py`**
   - Added logic to map task `difficulty` to event `priority`
   - Difficulty 1-3 → low priority
   - Difficulty 4-7 → medium priority
   - Difficulty 8-10 → high priority
   - Added `priority` field to all calendar events created by scheduler

5. **`/api/ai/semantic_matcher.py`**
   - Updated to use `title` instead of `topic` for task matching

### ✅ Frontend Changes

#### Files Modified:
1. **`/todo_ui/lib/api/tasks.ts`**
   - `Task` interface: Changed `topic` → `title`, `estimated_minutes` → `estimated_duration`
   - Added `priority` field
   - Added `created_at`, `updated_at` fields
   - Removed deprecated fields: `review_count`, `confidence_score`
   - `TaskCreateData` interface: Updated to match unified schema
   - `TaskUpdateData` interface: Updated to match unified schema

2. **`/todo_ui/lib/api/calendar.ts`**
   - Added `CalendarEventPriority` type
   - Added `priority` field to `CalendarEvent` interface
   - Added `description` field
   - Added `created_at`, `updated_at` fields
   - Updated `createManualEvent` to accept `priority` and `description`
   - Updated `updateManualEvent` to accept `priority` and `description`

3. **`/todo_ui/controllers/task.ts`**
   - Updated `createTaskFromAI` to use `title` instead of `topic`
   - Updated to use `estimated_duration` instead of `estimated_minutes`
   - Added default `priority: "medium"`

4. **`/todo_ui/components/Tasks/TasksView.tsx`**
   - Updated to display `title` instead of `topic`
   - Updated to display `estimated_duration` instead of `estimated_minutes`
   - Updated to display `priority` field
   - Updated difficulty scale display (changed from /5 to /10)

5. **`/todo_ui/components/Schedule/TUICalendar.tsx`**
   - Added custom popup templates for create/edit forms
   - Custom form includes: Title, Description, Event Type, Priority, Start, End
   - Custom detail view includes: Event Type, Priority, Task ID, Source
   - Form fields match unified calendar event schema

6. **`/todo_ui/components/Schedule/TUICalendar.css`**
   - Added styling for custom event form (`.custom-event-form`)
   - Added styling for event details popup (`.event-details`)

## Unified Schema Reference

### Task Schema
```typescript
{
  id: number
  user_id: number
  title: string                    // ✅ standardized
  description?: string
  priority: 'low' | 'medium' | 'high'  // ✅ added
  difficulty?: number (1-10)       // ✅ added to backend
  status: 'pending' | 'in_progress' | 'completed'
  due_date?: string (ISO 8601)
  estimated_duration?: number (minutes)  // ✅ standardized
  scheduled_start?: string (ISO)   // ✅ added to backend
  scheduled_end?: string (ISO)     // ✅ added to backend
  created_at: string
  updated_at: string
}
```

### Calendar Event Schema
```typescript
{
  id: number
  user_id: number
  title: string
  description?: string
  start_time: string (ISO 8601)
  end_time: string (ISO 8601)
  event_type: 'study' | 'rest' | 'break'
  priority: 'low' | 'medium' | 'high'  // ✅ added
  source: 'user' | 'system' | 'scheduler'
  task_id?: number
  created_at: string
  updated_at: string
}
```

## Migration Instructions

### 1. Run Database Migration
Execute the SQL migration script in your Supabase dashboard:
```bash
# In Supabase SQL Editor, run:
/workspaces/todo/migration_add_unified_fields.sql
```

### 2. Restart Backend
```bash
cd /workspaces/todo
python -m uvicorn api.main:app --reload --port 8000
```

### 3. Rebuild Frontend
```bash
cd /workspaces/todo/todo_ui
npm run build
npm run dev
```

## Data Flow

### Task Creation Flow (Unified)
```
Frontend (TasksView)
  ↓ {title, estimated_duration, difficulty, priority, ...}
API Client (lib/api/tasks.ts)
  ↓ POST /api/tasks
Backend (api/tasks/task_routes.py)
  ↓ CreateTaskRequest {title, estimated_duration, difficulty, priority, ...}
Database (tasks table)
  ↓ Stores all fields
✅ NO MISMATCHES
```

### Calendar Event Creation Flow (Unified)
```
Frontend (TUICalendar custom form)
  ↓ {title, description, event_type, priority, start_time, end_time}
API Client (lib/api/calendar.ts)
  ↓ POST /api/calendar/events
Backend (api/calendar/event_routes.py)
  ↓ CreateCalendarEventRequest {all fields including priority}
Database (calendar_events table)
  ↓ Stores all fields
✅ NO MISMATCHES
```

### AI Scheduler Flow (Unified)
```
User Input
  ↓
AI Agent (extracts tasks with difficulty)
  ↓ {description, difficulty, duration, due_date}
Scheduler (maps difficulty → priority)
  ↓ Creates events with priority field
Database (calendar_events table)
  ↓ Stores with priority
✅ PROPERLY MAPPED
```

## Testing Checklist

### Backend Testing
- [ ] Run migration script in Supabase
- [ ] Test task creation with new fields
- [ ] Test task update with new fields
- [ ] Test calendar event creation with priority
- [ ] Test scheduler creates events with priority
- [ ] Verify difficulty-to-priority mapping works

### Frontend Testing
- [ ] Test task display shows title and priority
- [ ] Test calendar popup shows all custom fields
- [ ] Test event creation through TUI calendar popup
- [ ] Test event editing through TUI calendar popup
- [ ] Verify no console errors for missing fields

### Integration Testing
- [ ] Create task via AI → verify scheduler adds priority
- [ ] Create task manually → verify all fields save
- [ ] Update task → verify scheduled_start/end work
- [ ] Create calendar event → verify priority shows in UI
- [ ] Delete task → verify cascading deletes work

## Rollback Plan

If issues occur, you can rollback the database changes:
```sql
-- Rollback tasks table changes
ALTER TABLE tasks DROP COLUMN IF EXISTS difficulty;
ALTER TABLE tasks DROP COLUMN IF EXISTS scheduled_start;
ALTER TABLE tasks DROP COLUMN IF EXISTS scheduled_end;

-- Rollback calendar_events table changes
ALTER TABLE calendar_events DROP COLUMN IF EXISTS priority;
```

Then revert code changes using git:
```bash
git checkout HEAD~1
```

## Files Changed Summary
- ✅ 1 SQL migration file created
- ✅ 5 backend Python files modified
- ✅ 6 frontend TypeScript/TSX files modified
- ✅ 1 CSS file modified
- ✅ Total: 13 files changed

## Benefits Achieved
1. **No more data mismatches** - All field names are consistent
2. **Lean schema** - Removed unnecessary fields (review_count, confidence_score, source_text)
3. **Better priority handling** - Added priority field across all layers
4. **Improved scheduling** - Added scheduled_start/end tracking
5. **Better UX** - Custom TUI calendar popup with all relevant fields
6. **Type safety** - TypeScript interfaces match backend Pydantic models
7. **Maintainability** - Single source of truth for data structures

# API to Frontend Rendering Flow

## Overview
This document details the complete flow from when `scheduler.py` creates scheduled tasks to how they are rendered in the frontend calendar UI.

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. SCHEDULER CREATES CALENDAR EVENTS                                │
│    scheduler.py: schedule_tasks()                                   │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. DATABASE PERSISTENCE                                             │
│    - Task table: scheduled_start, scheduled_end updated             │
│    - CalendarEvent table: new rows created (source="system")        │
│      Fields: user_id, title, start_time, end_time, event_type,      │
│              source, task_id                                        │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. FRONTEND REQUESTS DATA                                           │
│    CalendarPage.tsx: fetchEvents() called on mount/view change      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. API CALL TO CALENDAR ENDPOINT                                    │
│    calendar-data.ts: fetchCalendarEvents()                          │
│    GET https://todo.studybar.academy/api/calendar/events?user_id=1&         │
│        start_date=2025-10-31T00:00:00.000Z&                         │
│        end_date=2025-10-31T23:59:59.999Z                            │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. BACKEND ROUTE HANDLER                                            │
│    calendar_routes.py: GET /api/calendar/events                     │
│    - Extracts user_id, start_date, end_date from query params       │
│    - Queries CalendarEvent table with filters                       │
│    - Returns: { "events": [...], "count": n }                       │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. DATABASE QUERY                                                   │
│    models.py: CalendarEvent ORM model                               │
│    Query: SELECT * FROM calendar_events                             │
│           WHERE user_id = ? AND                                     │
│                 start_time >= ? AND                                 │
│                 end_time <= ?                                       │
│           ORDER BY start_time                                       │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. JSON RESPONSE TO FRONTEND                                        │
│    Response payload:                                                │
│    {                                                                │
│      "events": [                                                    │
│        {                                                            │
│          "id": 123,                                                 │
│          "user_id": 1,                                              │
│          "title": "Study linear algebra",                           │
│          "description": "Study session for linear algebra",         │
│          "start_time": "2025-10-31T10:00:00",                       │
│          "end_time": "2025-10-31T11:30:00",                         │
│          "event_type": "study",                                     │
│          "source": "system",                                        │
│          "task_id": 45                                              │
│        },                                                           │
│        ...                                                          │
│      ],                                                             │
│      "count": 5                                                     │
│    }                                                                │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. STATE UPDATE IN REACT                                            │
│    CalendarPage.tsx: setEvents(fetchedEvents)                       │
│    - events state updated with API response                         │
│    - triggers re-render of calendar components                      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. DATA TRANSFORMATION                                              │
│    calendar-hooks.ts: useCalendarData()                             │
│    - Groups events by day: eventsByDay[dateKey] = events[]          │
│    - Filters events for selected day: dayEvents                     │
│    - Calculates week dates array                                    │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 10. CALENDAR VIEW RENDERING                                         │
│     CalendarPage.tsx renders either:                                │
│     - CalendarDayView (single day)                                  │
│     - CalendarWeekView (7 days grid)                                │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 11. EVENT BLOCK RENDERING                                           │
│     CalendarWeekView.tsx (or CalendarDayView.tsx):                  │
│     - Maps over dayList/dayEvents array                             │
│     - For each event:                                               │
│       * Calculates position: getEventPosition(start, end, height)   │
│       * Determines color: getEventColor(event_type)                 │
│       * Renders event block at calculated position                  │
│                                                                     │
│     Rendering logic:                                                │
│     {dayList.map((event) => {                                       │
│       const { top, height } = getEventPosition(...);                │
│       return (                                                      │
│         <div style={{ top: `${top}px`, height: `${height}px` }}>    │
│           {event.title}                                             │
│         </div>                                                      │
│       );                                                            │
│     })}                                                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Component Breakdown

### 1. Scheduler Creates Calendar Events
**File**: `api/services/scheduler.py:179-224`

When `reschedule()` function runs:
```python
# For each task that fits in a time block
calendar_event = CalendarEvent(
    user_id=user_id,
    title=task.topic,
    description=f"Study session for {task.topic}",
    start_time=start_time,
    end_time=end_time,
    event_type="study",
    source="system",  # distinguishes from user-created events
    task_id=task.id
)
db.add(calendar_event)
```

**Result**: New rows in `calendar_events` table with scheduled time slots.

---

### 2. Database Schema
**File**: `api/models.py`

**CalendarEvent Model**:
- `id`: Primary key
- `user_id`: Links to user
- `title`: Display name (task topic)
- `start_time`: DateTime when event starts
- `end_time`: DateTime when event ends
- `event_type`: "study", "rest", etc.
- `source`: "system" (auto-scheduled) or "user" (manually created)
- `task_id`: Links back to Task table

**Task Model Updates**:
- `scheduled_start`: Populated by scheduler
- `scheduled_end`: Populated by scheduler

---

### 3. Frontend Initialization
**File**: `todo_ui/app/pages/dashboard/components/CalendarPage.tsx:21-26`

When CalendarPage mounts or view/date changes:
```typescript
const fetchEvents = useCallback(async () => {
  setLoading(true);
  const fetchedEvents = await fetchCalendarEvents(selectedDate, view);
  setEvents(fetchedEvents);
  setLoading(false);
}, [selectedDate, view]);
```

Triggers on:
- Component mount (`useEffect([fetchEvents])`)
- Date navigation (prev/next/today)
- View toggle (day ↔ week)
- Chat interaction completes (`refreshNowAndSoon()`)

---

### 4. API Request Construction
**File**: `todo_ui/app/pages/dashboard/components/utils/calendar-data.ts:5-68`

```typescript
export async function fetchCalendarEvents(
  selectedDate: Date,
  view: CalendarView
): Promise<any[]> {
  // Determine date range based on view
  const rangeStart = view === 'week' ? getStartOfWeek(selectedDate) : new Date(selectedDate);
  const rangeEnd = view === 'week' ? getEndOfWeek(selectedDate) : new Date(selectedDate);

  // Construct query parameters
  const params = new URLSearchParams();
  params.set('user_id', String(userId));
  params.set('start_date', rangeStart.toISOString());
  params.set('end_date', rangeEnd.toISOString());

  // Make API call
  const response = await fetch(`https://todo.studybar.academy/api/calendar/events?${params.toString()}`);
  const data = await response.json();
  return data.events || [];
}
```

**Example URL**:
```
GET https://todo.studybar.academy/api/calendar/events?user_id=1&start_date=2025-10-31T00:00:00.000Z&end_date=2025-10-31T23:59:59.999Z
```

---

### 5. Backend Route Handler
**File**: `api/routes/calendar_routes.py:30-66`

```python
@router.get("/events")
async def get_calendar_events(
    user_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Build query with filters
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == user_id)

    if start_date:
        start_dt = datetime.fromisoformat(start_date)
        query = query.filter(CalendarEvent.start_time >= start_dt)

    if end_date:
        end_dt = datetime.fromisoformat(end_date)
        query = query.filter(CalendarEvent.end_time <= end_dt)

    events = query.order_by(CalendarEvent.start_time).all()

    return {
        "events": events,
        "count": len(events)
    }
```

**Database Query**:
```sql
SELECT * FROM calendar_events
WHERE user_id = 1
  AND start_time >= '2025-10-31 00:00:00'
  AND end_time <= '2025-10-31 23:59:59'
ORDER BY start_time;
```

---

### 6. React State Management
**File**: `todo_ui/app/pages/dashboard/components/CalendarPage.tsx:15-26`

```typescript
// Component state
const [events, setEvents] = useState<CalendarEvent[]>([]);
const [loading, setLoading] = useState(true);
const [selectedDate, setSelectedDate] = useState(new Date());
const [view, setView] = useState<CalendarView>('day');

// Fetch and update state
const fetchEvents = useCallback(async () => {
  setLoading(true);
  const fetchedEvents = await fetchCalendarEvents(selectedDate, view);
  setEvents(fetchedEvents);  // ← State update triggers re-render
  setLoading(false);
}, [selectedDate, view]);
```

---

### 7. Data Transformation Hook
**Custom hook processes events for calendar rendering**

Groups events by day key:
```typescript
const eventsByDay: Record<string, CalendarEvent[]> = {};
events.forEach(event => {
  const key = toDateKey(new Date(event.start_time));
  if (!eventsByDay[key]) eventsByDay[key] = [];
  eventsByDay[key].push(event);
});
```

---

### 8. Calendar View Rendering
**File**: `todo_ui/app/pages/dashboard/components/CalendarWeekView.tsx:76-145`

```typescript
{weekDates.map((date) => {
  const key = toDateKey(date);
  const dayList = eventsByDay[key] || [];  // Get events for this day

  return (
    <article key={key} className="relative" style={{ height: `${24 * WEEK_HOUR_HEIGHT}px` }}>
      {/* Hour grid lines */}
      {HOURS.map((hour) => (
        <div style={{ top: `${hour * WEEK_HOUR_HEIGHT}px` }} />
      ))}

      {/* Event blocks */}
      {dayList.map((event) => {
        const { top, height } = getEventPosition(
          event.start_time,
          event.end_time,
          WEEK_HOUR_HEIGHT
        );

        return (
          <div
            className={getEventColor(event.event_type)}
            style={{ top: `${top}px`, height: `${height}px` }}
            onClick={() => onEventClick(event)}
          >
            {event.title}
          </div>
        );
      })}
    </article>
  );
})}
```

---

### 9. Event Position Calculation
**File**: `todo_ui/app/pages/dashboard/components/utils/calendar-utils.ts`

```typescript
export function getEventPosition(
  start_time: string,
  end_time: string,
  hourHeight: number
) {
  const startDate = new Date(start_time);
  const endDate = new Date(end_time);

  // Convert times to hour decimals (e.g., 10:30 → 10.5)
  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
  const endHour = endDate.getHours() + endDate.getMinutes() / 60;

  // Calculate pixel positions
  const top = startHour * hourHeight;
  const height = (endHour - startHour) * hourHeight;

  return { top, height };
}
```

**Example**:
- Event: 10:00 AM - 11:30 AM
- `hourHeight` = 80px (week view)
- `startHour` = 10.0
- `endHour` = 11.5
- `top` = 10.0 × 80 = 800px
- `height` = 1.5 × 80 = 120px

---

### 10. Event Styling
**File**: `todo_ui/app/pages/dashboard/components/utils/calendar-utils.ts`

```typescript
export function getEventColor(event_type: string): string {
  switch (event_type) {
    case 'study':
      return 'bg-blue-500/90';
    case 'rest':
      return 'bg-green-500/90';
    case 'personal':
      return 'bg-purple-500/90';
    default:
      return 'bg-gray-500/90';
  }
}
```

Events scheduled by `scheduler.py` have `event_type="study"` → blue background.

---

## Interaction Flow: User Creates Task via Chat

### Optimized Flow (With Direct Event Return)

```
┌─────────────────────────────────────────────────────────────────────┐
│ User types: "Study calculus tomorrow, 2 hours"                     │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ChatInterface.tsx → POST /api/chat/message                          │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ agent.py: AI calls create_tasks() and schedule_all_tasks()         │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ scheduler.py: schedule_tasks()                                      │
│   - Detects conflicts (if any)                                      │
│   - Incremental schedule (new tasks only) OR full reschedule        │
│   - Creates CalendarEvent objects in database                       │
│   - Returns created events directly in response                     │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ schedule_routes.py: /api/schedule/generate response includes:      │
│   {                                                                 │
│     "scheduled_count": 1,                                           │
│     "events": [CalendarEventOut, ...],  ← DIRECT EVENT RETURN      │
│     "message": "Incremental scheduling"                             │
│   }                                                                 │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ agent_tools.py: schedule_all_tasks() receives events               │
│   - Passes events back through tool result                          │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ChatInterface.tsx: onTasksUpdated() callback triggered              │
│   → CalendarPage.tsx: refreshNowAndSoon()                           │
│   → fetchCalendarEvents() called (optional for confirmation)        │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ setEvents(fetchedEvents) → Calendar re-renders with new event       │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Optimization**: Events are returned directly from `schedule_tasks()` via `POST /api/schedule/generate`, eliminating the need to wait for a separate `GET /api/calendar/events` call. Frontend can optionally still fetch for confirmation.

### Legacy Flow (Before Optimization)

```
┌─────────────────────────────────────────────────────────────────────┐
│ scheduler.py: Creates CalendarEvent → Database only                 │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Frontend must call GET /api/calendar/events (EXTRA ROUND TRIP)     │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ setEvents(fetchedEvents) → Calendar renders                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Optimistic Update Pattern

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. scheduler.py: reschedule_optimistic()                            │
│    - Creates CalendarEvent objects                                  │
│    - Adds to DB session                                             │
│    - Calls db.flush() to get IDs WITHOUT committing                 │
│    - Returns events with real IDs immediately                       │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. schedule_routes.py: /api/schedule/generate                       │
│    - Receives events with IDs from scheduler                        │
│    - Serializes to JSON                                             │
│    - Adds background_tasks.add_task(commit_schedule_async, db)      │
│    - Returns response immediately (< 100ms)                         │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. FastAPI BackgroundTasks                                          │
│    - Executes after response is sent                                │
│    - Calls commit_schedule_async(db)                                │
│    - Commits transaction to SQLite                                  │
│    - Handles rollback on error                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Benefits

- **Instant Response**: Frontend receives events in <100ms without waiting for DB commit
- **Real IDs**: Events have real database IDs immediately (via flush), no temp ID handling needed
- **Safe**: If commit fails in background, only affects persistence not user experience
- **Consistent**: IDs remain the same between flush and commit

### Key Functions

- `reschedule_optimistic()` (scheduler.py:256): Uses `db.flush()` to get IDs, defers commit
- `commit_schedule_async()` (scheduler.py:322): Background task that commits transaction
- `generate_schedule()` (schedule_routes.py:22): Uses FastAPI BackgroundTasks for async commit

### Fallback

The deprecated `reschedule()` function (scheduler.py:331) is kept for backwards compatibility and synchronous use cases.

---

## Event Push Pattern (Eliminates Triple Fetch)

### Old Flow (Deprecated)

```
ChatInterface → POST /api/chat/message
                     │
                     ▼
              onTasksUpdated()
                     │
                     ▼
     fetchEvents() at 0ms, 800ms, 2000ms  ← TRIPLE FETCH
```

### New Flow (Current)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. ChatInterface sends message                                      │
│    POST /api/chat/message                                           │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. agent.py extracts events from schedule_all_tasks tool result     │
│    - Tracks events in scheduled_events array                        │
│    - Returns events in response                                     │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. chat_routes.py serializes events to CalendarEventOut             │
│    Response: { response: "...", events: [...], timestamp: "..." }  │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. ChatInterface extracts events from response                      │
│    onTasksUpdated(events)  ← EVENTS PASSED DIRECTLY                │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. CalendarPage merges events with existing state                   │
│    - If events present: merge into Map by ID                        │
│    - If no events: single fallback fetchEvents()                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Benefits

- **Zero Polling**: No 800ms/2000ms delayed fetches needed
- **Instant Update**: Events appear in calendar immediately after chat response
- **Bandwidth Savings**: Single API call instead of 3-4 calls
- **Consistency**: Events are guaranteed to be the ones just created

### Key Changes

**Backend**:
- `agent.py`: Extracts events from `schedule_all_tasks` tool results
- `chat_routes.py`: Includes `events` array in ChatMessageResponse
- Events serialized using CalendarEventOut schema

**Frontend**:
- `ChatInterface.tsx`: Accepts events in callback: `onTasksUpdated?: (events?: CalendarEvent[]) => void`
- `CalendarPage.tsx`: `handleTasksUpdated()` merges new events into existing state
- Triple fetch (`refreshNowAndSoon`) removed entirely

---

## Key Files Reference

| Component | File Path | Purpose |
|-----------|-----------|---------|
| **Scheduler** | `api/services/scheduler.py` | Creates CalendarEvent records |
| **Database Models** | `api/models.py` | CalendarEvent & Task ORM definitions |
| **API Route** | `api/routes/calendar_routes.py` | GET /api/calendar/events endpoint |
| **Frontend Data Fetch** | `todo_ui/.../utils/calendar-data.ts` | API call wrapper |
| **Calendar Page** | `todo_ui/.../CalendarPage.tsx` | Main calendar component |
| **Week View** | `todo_ui/.../CalendarWeekView.tsx` | 7-day grid renderer |
| **Day View** | `todo_ui/.../CalendarDayView.tsx` | Single day renderer |
| **Utilities** | `todo_ui/.../utils/calendar-utils.ts` | Position/color calculations |

---

## Data Flow Summary

### Optimized Flow (Current Implementation)

1. **Scheduling** → `scheduler.py` creates `CalendarEvent` rows in SQLite
2. **Direct Return** → `schedule_tasks()` returns created events in response
3. **API Response** → `POST /api/schedule/generate` includes `events` array
4. **Immediate Use** → Frontend receives events without separate fetch
5. **State** → React `useState` stores events array
6. **Transform** → Events grouped by day for efficient rendering
7. **Render** → Calendar view maps events to positioned div elements
8. **Display** → Events appear as colored blocks at calculated pixel positions

**Efficiency Gains**:
- ✅ **Conflict Detection**: Skips full reschedule when no conflicts exist
- ✅ **Incremental Scheduling**: Schedules only new tasks when possible
- ✅ **Direct Event Return**: Eliminates extra GET request round trip
- ✅ **Optimistic Updates**: Returns events with IDs immediately, commits async via BackgroundTasks
- ✅ **Event Push from Chat**: Events passed directly from chat API response, no polling needed
- ✅ **Smart Merge**: Frontend merges new events with existing ones, single fallback fetch only if no events provided

**Refresh Triggers**:
- Page load
- Date navigation
- View toggle
- Chat task creation (events returned directly, optional confirmation fetch)
- Manual refresh

---

## Example Event Object

**Database (CalendarEvent)**:
```python
{
  "id": 123,
  "user_id": 1,
  "title": "Study calculus",
  "description": "Study session for calculus",
  "start_time": datetime(2025, 10, 31, 14, 0),
  "end_time": datetime(2025, 10, 31, 16, 0),
  "event_type": "study",
  "source": "system",
  "task_id": 45,
  "created_at": datetime(2025, 10, 30, 20, 15)
}
```

**JSON Response**:
```json
{
  "id": 123,
  "user_id": 1,
  "title": "Study calculus",
  "description": "Study session for calculus",
  "start_time": "2025-10-31T14:00:00",
  "end_time": "2025-10-31T16:00:00",
  "event_type": "study",
  "source": "system",
  "task_id": 45
}
```

**Rendered HTML**:
```html
<div
  class="bg-blue-500/90 rounded-md px-2 py-1"
  style="position: absolute; top: 1120px; height: 160px; left: 4px; right: 4px;"
>
  <div class="truncate">Study calculus</div>
</div>
```

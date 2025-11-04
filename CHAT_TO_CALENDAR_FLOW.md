# Complete Flow: User Chat to Calendar Rendering

## Overview
This document traces the complete journey of a user message through the AI agent system, from initial chat input to final calendar event rendering.

---

## PART 1: FRONTEND - CHAT INPUT & MESSAGE SUBMISSION

### Entry Point
**File**: `/workspaces/todo/todo_ui/app/dashboard/schedule/page.tsx`
- Simple wrapper page that renders the ScheduleView component

**File**: `/workspaces/todo/todo_ui/components/Dashboard/ScheduleView.tsx` (Lines 509-599)
- Main schedule view containing chat input form
- Chat bar at bottom (15% of layout), calendar above (85%)

### Chat Input Handler
**File**: `/workspaces/todo/todo_ui/components/Dashboard/ScheduleView.tsx` (Lines 510-545)

```
User types message in input field
        ↓
Form onSubmit handler (line 512)
        ↓
Extract message from input state (line 523: const msg = input)
        ↓
Call sendMessage() from useChatStore (line 526)
        ↓
Refresh view data (line 539: await refreshViewData())
        ↓
Show notification overlay (line 536: setNotification(resp))
```

### Store: Chat Store
**File**: `/workspaces/todo/todo_ui/lib/store/useChatStore.ts` (Lines 36-52)

```typescript
sendMessage(message: string, userId: number) 
  ↓
Add user message to local state
  ↓
Call sendChatMessage(userId, message) from API
  ↓
Receive response { response: string, events: CalendarEvent[] }
  ↓
Add assistant response to local messages
  ↓
Return response text to component
```

---

## PART 2: API CALL - FRONTEND TO BACKEND

### API Client
**File**: `/workspaces/todo/todo_ui/lib/api/chat.ts` (Lines 11-15)

```typescript
sendChatMessage(userId: number, message: string)
  ↓
POST /api/chat/message
  ↓
Payload:
{
  user_id: number,
  message: string
}
```

### HTTP Transport
**File**: `/workspaces/todo/todo_ui/lib/api/client.ts` (Lines 54-59)
- Uses standard fetch API
- Sends as application/json
- Returns parsed JSON response

---

## PART 3: BACKEND - CHAT MESSAGE ROUTE

### Chat Routes Handler
**File**: `/workspaces/todo/api/routes/chat_routes.py` (Lines 95-131)

```python
@router.post("/message", response_model=ChatMessageResponse)
async def send_message(request: ChatMessageRequest, db: Session)
```

**Request Model** (Lines 23-26):
```python
class ChatMessageRequest(BaseModel):
    session_id: str | None = None
    user_id: int | None = None
    message: str
```

**Response Model** (Lines 28-31):
```python
class ChatMessageResponse(BaseModel):
    response: str
    timestamp: datetime
    events: Optional[List[CalendarEventOut]] = []
```

### Key Processing Steps (Lines 97-131)

1. **Resolve User ID** (Line 99)
   - `get_user_id(request)` from either session_id or user_id
   - Maps Google OAuth user to database user_id

2. **Get or Create Conversation History** (Lines 102-105)
   - Maintains in-memory conversation_store keyed by user_id
   - Tracks full message history for agent context

3. **Run Agent** (Lines 108-113)
   ```python
   result = run_agent(
       user_id=effective_user_id,
       message=request.message,
       conversation_history=conversation_history,
       db=db
   )
   ```

4. **Update Conversation History** (Line 116)
   - Stores updated conversation for next turn

5. **Serialize Events** (Lines 119-121)
   - Convert CalendarEvent ORM objects to UTC ISO format
   - Returns events created by agent's tool calls

6. **Return Response** (Lines 123-127)
   ```python
   {
       "response": result["response"],
       "timestamp": datetime.utcnow().isoformat() + 'Z',
       "events": events_data
   }
   ```

---

## PART 4: BACKEND - AI AGENT EXECUTION

### Agent Entry Point
**File**: `/workspaces/todo/api/agent.py` (Lines 262-339)

```python
def run_agent(user_id, message, conversation_history, db)
```

### System Instructions (Lines 24-82)
Agent behavior configured with:
- Critical behaviors: NEVER ask for clarification, be decisive
- Learning from conversation history
- Pattern recognition for time estimates
- Task creation workflow
- Rest-aware scheduling tuning capability

### OpenAI Function Calling Loop (Lines 275-332)

```
Iteration Loop (max 5 iterations):
  ↓
1. Build messages array
   - System instructions
   - Conversation history
   - New user message
  
2. Call OpenAI GPT-5-mini
   - Model: gpt-4-mini (faster, cheaper)
   - Tools: 10 available functions
   - tool_choice: "auto"
  
3. Check tool_calls
   - If none: Return final response
   - If yes: Execute tools
  
4. Execute Each Tool Call
   - Get function name and arguments
   - Look up in tool_mapping
   - Execute function
   - Capture returned data (especially events)
   - Add tool response to messages
  
5. Loop back to step 2
   (Continue until no tool calls or max iterations)
```

### Available Tools (Lines 85-244)
**Tool Mapping** (Lines 247-259):

1. **create_tasks** - Create new tasks from natural language
   - Parameters: tasks (array of {topic, estimated_minutes, difficulty, due_date})
   - Returns: {created_tasks, count}

2. **schedule_all_tasks** - Generate schedule for unscheduled tasks
   - Parameters: none (uses user_id context)
   - Returns: {scheduled_count, total_tasks, unscheduled_count, events, message}
   - **IMPORTANT**: Returns CalendarEvent ORM objects

3. **get_user_tasks** - Get existing tasks with filters
   - Parameters: scheduled, completed
   - Returns: {tasks, count}

4. **update_task** - Modify existing task
   - Parameters: task_id, updates
   - Returns: {success}

5. **delete_task** - Remove task
   - Parameters: task_id
   - Returns: {success}

6. **get_calendar_events** - View events in date range
   - Parameters: start_date, end_date (ISO format)
   - Returns: {events}

7. **create_calendar_event** - Add personal event (blocks time)
   - Parameters: title, start_time, end_time, event_type, description
   - Returns: {success, event_id, task_id}
   - Creates both Task and CalendarEvent

8. **get_energy_profile** - View scheduling preferences
   - Parameters: none
   - Returns: {due_date_days, wake_time, sleep_time, ...}

9. **update_energy_profile** - Update preferences
   - Parameters: various time/duration settings
   - Returns: {success}

10. **tune_break_settings** - Adjust rest/break behavior
    - Parameters: insert_breaks, short_break_min, long_break_min, etc.
    - Returns: {success}

---

## PART 5: BACKEND - TOOL EXECUTION DETAILS

### Tool 1: create_tasks
**File**: `/workspaces/todo/api/services/agent_tools.py` (Lines 31-67)

```python
def create_tasks(tasks: List[Dict], user_id: int, db: Session)

Process each task:
  1. Parse due_date (natural language or ISO)
     - Uses parse_natural_date() service
     - Applies DEFAULT_DUE_DATE_DAYS if not specified
  
  2. Create Task ORM object
     - topic: task description
     - estimated_minutes: duration estimate
     - difficulty: 1-5 scale (default 3)
     - due_date: parsed datetime
     - user_id: associate with user
     - status: "unscheduled"
  
  3. db.add(task) to session
  
4. db.commit() - persist all tasks

Returns: {created_tasks: [topic1, topic2, ...], count: N}
```

### Tool 2: schedule_all_tasks
**File**: `/workspaces/todo/api/services/agent_tools.py` (Lines 69-120)

```python
def schedule_all_tasks(user_id: int, db: Session)

1. Check subscription credits
   - If free/pro plan: verify credits available
   - Deduct credits if scheduling
   
2. Call run_scheduler(user_id, db)
   - Returns scheduling result
   - **CRITICAL**: Result contains "events" key with CalendarEvent objects
   
3. Return result with events
   - scheduled_count
   - total_tasks
   - unscheduled_count
   - events: List[CalendarEvent ORM objects]
   - message: summary
```

### Scheduler: Core Scheduling Logic
**File**: `/workspaces/todo/api/services/scheduler.py` (Lines 17-77)

```
schedule_tasks(user_id, db):
  
Case 1: No new tasks, no conflicts
  → Return existing scheduled events
  
Case 2: New tasks, no conflicts
  → Incremental scheduling (reschedule_optimistic)
  → Only schedule new tasks
  
Case 3: Conflicts detected
  → Full reschedule (unschedule_old_events)
  → reschedule_optimistic all tasks

reschedule_optimistic(tasks, time_blocks, user_id, consts, db):
  
  1. Sort time blocks by energy level (highest first)
  2. Sort tasks by difficulty (hardest first)
  
  3. For each task:
     - Find first available time block
     - Set task.scheduled_start and task.scheduled_end
     
     - Create CalendarEvent (source="system")
       {
         user_id,
         title: task.topic,
         description: "Study session for...",
         start_time,
         end_time,
         event_type: "study",
         source: "system",
         task_id: task.id
       }
     - db.add(calendar_event)
     - Add to created_events list
     
     - If INSERT_BREAKS enabled:
       - Check study streak
       - Create break/rest CalendarEvent if conditions met
       - db.add(break_event)
  
  4. db.flush() - get IDs without committing
  
  5. Return:
     {
       scheduled_count,
       total_tasks,
       unscheduled_count,
       events: created_events,  // CalendarEvent ORM objects!
       message
     }
```

### Event Creation (Scheduler)
**File**: `/workspaces/todo/api/services/scheduler.py` (Lines 291-303)

```python
calendar_event = CalendarEvent(
    user_id=user_id,
    title=task.topic,
    description=f"Study session for {task.topic}",
    start_time=start_time,
    end_time=end_time,
    event_type="study",
    source="system",
    task_id=task.id
)
db.add(calendar_event)
created_events.append(calendar_event)
```

Break events created similarly (Lines 323-334) with:
- event_type: "rest" or "break"
- title: "Long Break" or "Short Break"
- source: "system"

---

## PART 6: BACKEND - EVENT RETURN PATH

### Agent Event Capture
**File**: `/workspaces/todo/api/agent.py` (Lines 308-322)

```python
# In tool execution loop:

if function_name == "schedule_all_tasks" and "events" in function_response:
    # Capture ORM objects directly
    scheduled_events.extend(function_response["events"])

elif function_name == "create_calendar_event":
    # Capture directly created event
    ev_id = function_response.get("event_id")
    if ev_id:
        try:
            ev = db.query(CalendarEvent).filter(
                CalendarEvent.id == ev_id
            ).first()
            if ev:
                scheduled_events.append(ev)
        except Exception:
            pass  # non-blocking

# Continue loop...
# After no more tool calls:

return {
    "response": response_message.content,
    "conversation_history": messages,
    "events": scheduled_events  // CalendarEvent ORM objects!
}
```

### Chat Route Response Serialization
**File**: `/workspaces/todo/api/routes/chat_routes.py` (Lines 119-127)

```python
events_data = []
if "events" in result and result["events"]:
    # Convert ORM to dict with UTC serialization
    events_data = [_serialize_event_utc(event) for event in result["events"]]

def _serialize_event_utc(ev) -> dict:
    return {
        "id": ev.id,
        "user_id": ev.user_id,
        "title": ev.title,
        "description": ev.description,
        "start_time": _to_utc_iso(ev.start_time),
        "end_time": _to_utc_iso(ev.end_time),
        "start_ts": int(ev.start_time.timestamp() * 1000),
        "end_ts": int(ev.end_time.timestamp() * 1000),
        "event_type": ev.event_type,
        "source": getattr(ev, 'source', 'system'),
        "task_id": ev.task_id,
    }
```

Return to frontend:
```json
{
  "response": "I've scheduled your tasks...",
  "timestamp": "2025-11-04T12:00:00Z",
  "events": [
    {
      "id": 42,
      "user_id": 1,
      "title": "Math homework",
      "description": "Study session for Math homework",
      "start_time": "2025-11-04T14:00:00Z",
      "end_time": "2025-11-04T15:00:00Z",
      "start_ts": 1730718000000,
      "end_ts": 1730721600000,
      "event_type": "study",
      "source": "system",
      "task_id": 123
    },
    ...
  ]
}
```

---

## PART 7: FRONTEND - RESPONSE HANDLING & CALENDAR REFRESH

### Store Response Processing
**File**: `/workspaces/todo/todo_ui/lib/store/useChatStore.ts` (Lines 36-52)

```typescript
sendMessage(message, userId):
  ↓
const res = await sendChatMessage(userId, message)
  ↓
Create assistant message:
  {
    role: "assistant",
    content: res.response,
    timestamp: now,
    events: res.events  // Captured but not directly used for calendar
  }
  ↓
Add to messages state
  ↓
Return res.response
```

**Note**: Events from chat response are stored in chat store but calendar rendering uses a separate data source.

### Calendar Refresh Trigger
**File**: `/workspaces/todo/todo_ui/components/Dashboard/ScheduleView.tsx` (Lines 512-544)

```typescript
onSubmit handler:
  ↓
await sendMessage(msg, userId)  // Chat
  ↓
setNotification(resp)  // Show response overlay
  ↓
await refreshViewData()  // CRITICAL: Refresh calendar!
  ↓
if (!demoMode) setTimeout(() => setNotification(null), 4000)
```

### refreshViewData Function
**File**: `/workspaces/todo/todo_ui/components/Dashboard/ScheduleView.tsx` (Lines 67-77)

```typescript
const refreshViewData = async () => {
  const start = view === 'week' ? startOfWeek(currentDate) : currentDate
  const end = view === 'week' ? endOfWeek(currentDate) : currentDate

  await Promise.all([
    fetchTasks({ include_completed: false }),    // Task store
    fetchEvents(start, end, userId)              // Schedule store
  ])
}
```

This parallel fetches:
1. **Tasks** from `/api/tasks` endpoint
2. **Calendar Events** from `/api/calendar/events` endpoint

---

## PART 8: FRONTEND - DATA FETCHING FROM BACKEND

### Task Fetching
**File**: `/workspaces/todo/todo_ui/lib/api/tasks.ts` (Lines 45-63)

```typescript
listTasks(params: { include_completed?: boolean, ... })
  ↓
GET /api/tasks?include_completed=false&...
  ↓
Backend returns:
{
  tasks: Task[],
  count: number
}
```

**Backend Handler**: `/workspaces/todo/api/routes/task_routes.py` (Lines 14-62)
- Filters tasks by user, scheduled status, completion
- Sorts by due_date

### Calendar Event Fetching
**File**: `/workspaces/todo/todo_ui/lib/api/calendar.ts` (Lines 15-21)

```typescript
getEvents(userId, startDate?, endDate?)
  ↓
GET /api/calendar/events?user_id={userId}&start_date={start}&end_date={end}
  ↓
Backend returns:
{
  events: CalendarEvent[]
}
```

**Backend Handler**: `/workspaces/todo/api/routes/calendar_routes.py` (TODO: verify exact line range)
- Queries CalendarEvent table for user and date range
- Serializes to UTC ISO format
- Includes start_ts and end_ts (millisecond timestamps)

---

## PART 9: FRONTEND - STATE MANAGEMENT & RENDERING

### State Store Updates
**File**: `/workspaces/todo/todo_ui/lib/store/useTaskStore.ts` (Lines 24-35)

```typescript
fetchTasks(filters):
  ↓
Zustand set state:
  tasks: response.tasks  // Array of Task objects
```

**File**: `/workspaces/todo/todo_ui/lib/store/useScheduleStore.ts` (Lines 19-27)

```typescript
fetchEvents(start, end, userId):
  ↓
Zustand set state:
  events: res.events  // Array of CalendarEvent objects
```

### Component Hooks
**File**: `/workspaces/todo/todo_ui/components/Dashboard/ScheduleView.tsx` (Lines 25-31)

```typescript
const tasks = useTaskStore((s) => s.tasks) ?? []
const fetchTasks = useTaskStore((s) => s.fetchTasks)

const fetchEvents = useScheduleStore((s) => s.fetchEvents)
const userId = useUserId()
```

The component subscribes to both store slices.

---

## PART 10: FRONTEND - CALENDAR RENDERING

### Week View Rendering
**File**: `/workspaces/todo/todo_ui/components/Dashboard/ScheduleView.tsx` (Lines 126-297)

```typescript
// Layout: time column (left) + 7 day columns (right)

Week header: (137-142)
  Days: Mon, Tue, Wed, ..., Sun
  Dates: 1, 2, 3, ...

For each day column (144-294):
  weekHours div:
    - Height based on wake_time to sleep_time
    - Hourly grid rows
    - White "now" line indicator
    
    Task rendering (194-283):
    
    tasks.filter(t => isSameDate(t.due_date, dayDate))
      ↓
    For each matching task:
      taskToSpan(task):
        start = scheduled_start || (due_date - estimated_minutes)
        end = scheduled_end || due_date
      
      getEventBox(start, end, wake_time, spanMinutes):
        Calculate pixel positions:
        - top = startMinutes * PX_PER_MIN
        - height = (endMinutes - startMinutes) * PX_PER_MIN
      
      Render div:
        className: cal.eventDay
        style: { top, height }
        content: t.topic
        
        Child: resize handle (cal.eventDayHandle)
```

**Visual Coordinates**:
- PX_PER_HOUR = 48 pixels
- PX_PER_MIN = 48/60 = 0.8 pixels per minute
- top = (minutes_from_wake_time) * 0.8
- height = (duration_minutes) * 0.8

### Event Box Calculation
**File**: `/workspaces/todo/todo_ui/components/Dashboard/ScheduleView.tsx` (Lines 621-629)

```typescript
function getEventBox(startIso, endIso, baseHour, spanMinutes) {
  const startMin = minutesSinceStartOfDay(startIso) - baseHour*60
  const endMin = minutesSinceStartOfDay(endIso) - baseHour*60
  const clampedTopMin = Math.max(0, Math.min(startMin, spanMinutes))
  const clampedEndMin = Math.max(0, Math.min(endMin, spanMinutes))
  const top = clampedTopMin * PX_PER_MIN
  const height = Math.max(20, (clampedEndMin - clampedTopMin) * PX_PER_MIN)
  return { top, height }
}
```

Tasks are clamped to visible area if they extend beyond wake/sleep times.

### Interactive Features (Drag/Drop/Resize)
**File**: `/workspaces/todo/todo_ui/components/Dashboard/ScheduleView.tsx` (Lines 205-279)

1. **Drag to Move** (205-240):
   - onMouseDown: capture task ID, start position
   - onMouseMove: translate task visually
   - onMouseUp: 
     - Calculate new day and time
     - Call editTask() with new scheduled_start/end
     - Call refreshViewData()

2. **Resize to Change Duration** (243-279):
   - onMouseDown on handle: capture original position
   - onMouseMove: update height dynamically
   - onMouseUp:
     - Calculate new end time
     - Call editTask() with updated times
     - Call refreshViewData()

3. **Selection/Creation** (150-184):
   - onMouseDown to start: record start minute
   - onMouseMove: extend selection
   - onMouseUp:
     - Calculate time range
     - Open TaskDialog for new task creation
     - If saved: addTask(), then refreshViewData()

---

## PART 11: COMPLETE DATA FLOW SUMMARY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE DATA FLOW DIAGRAM                           │
└─────────────────────────────────────────────────────────────────────────────┘

FRONTEND UI (ScheduleView.tsx)
  │
  ├─ User types message → sendMessage()
  │
  └─→ POST /api/chat/message
      {user_id, message}
      
      BACKEND (chat_routes.py)
      │
      ├─ Resolve user_id
      ├─ Get conversation_store history
      │
      └─→ run_agent(user_id, message, history, db)
          
          AGENT (agent.py)
          │
          ├─ Build messages with system instructions
          ├─ Call OpenAI GPT-4-mini with tools
          │
          └─ Tool Loop (max 5 iterations):
             │
             ├─ Tool: create_tasks
             │  └─→ Create Task ORM objects
             │      Set status="unscheduled"
             │      Commit to DB
             │
             ├─ Tool: schedule_all_tasks
             │  └─→ run_scheduler(user_id, db)
             │      
             │      scheduler.py:
             │      ├─ Get unscheduled tasks
             │      ├─ Split large tasks
             │      ├─ Check for conflicts
             │      ├─ Generate time blocks
             │      │
             │      └─ reschedule_optimistic():
             │          ├─ Sort tasks by difficulty
             │          ├─ Sort blocks by energy
             │          ├─ Assign tasks to blocks
             │          │
             │          ├─ Create CalendarEvent for each task
             │          │  └─ event_type="study", source="system"
             │          │
             │          ├─ If breaks enabled:
             │          │  └─ Create CalendarEvent for breaks
             │          │      └─ event_type="rest"/"break"
             │          │
             │          └─ db.flush() → return events
             │      
             │      Returns:
             │      {
             │        scheduled_count,
             │        events: [CalendarEvent ORM objects],
             │        ...
             │      }
             │
             ├─ Tool: create_calendar_event (optional)
             │  └─→ Create CalendarEvent + Task
             │
             ├─ Tool: get/update_energy_profile (optional)
             │  └─→ Update EnergyProfile settings
             │
             └─ Return assistant response
             
          Capture events from:
          - schedule_all_tasks result
          - create_calendar_event result
          
          Return:
          {
            response: "I've scheduled...",
            conversation_history: [...],
            events: [CalendarEvent ORM objects]
          }
      
      Serialize events to JSON:
      {
        "response": "...",
        "timestamp": "2025-11-04T12:00:00Z",
        "events": [
          {
            "id": 42,
            "title": "Math homework",
            "start_time": "2025-11-04T14:00:00Z",
            "end_time": "2025-11-04T15:00:00Z",
            "event_type": "study",
            "source": "system",
            "task_id": 123
          },
          ...
        ]
      }
  
  ← Response
  │
  │ FRONTEND (ScheduleView.tsx)
  │
  ├─ Store response in chat store
  ├─ Show notification overlay
  │
  └─→ refreshViewData():
      │
      ├─→ fetchTasks()
      │   └─ GET /api/tasks → Task[]
      │       Update useTaskStore.tasks
      │
      └─→ fetchEvents(start, end, userId)
          └─ GET /api/calendar/events → CalendarEvent[]
              Update useScheduleStore.events

RENDERING (ScheduleView.tsx)
│
├─ Get tasks from useTaskStore (line 25)
├─ Get events from useScheduleStore (line 30)
│
└─ For each week/day:
   │
   ├─ Render calendar grid with hours
   ├─ Filter tasks by date range
   │
   └─ For each task matching date:
      │
      ├─ taskToSpan(task)
      │  └─ Calculate start/end ISO times
      │
      ├─ getEventBox(start, end, baseHour, spanMinutes)
      │  └─ Calculate pixel position and height
      │
      └─ Render task box with:
         - Position: top = startMin * PX_PER_MIN
         - Height: height = duration * PX_PER_MIN
         - Content: task.topic
         - Draggable for move/resize
         - Click to edit
```

---

## KEY DATA MODELS

### Task Model
**Database**: `/workspaces/todo/api/models.py` (Lines 10-28)

```python
class Task(Base):
    id: int (primary key)
    user_id: int (foreign key → users.id)
    topic: str (task title)
    estimated_minutes: int (duration estimate)
    difficulty: int (1-5 scale)
    due_date: DateTime (required - end date/time)
    description: str (optional)
    source_text: str (original text)
    confidence_score: float (AI confidence 0-1)
    status: str ("unscheduled", "scheduled", "completed", "missed")
    brain_dump_id: int (reference to uploaded file)
    scheduled_start: DateTime (calculated start time or null)
    scheduled_end: DateTime (calculated end time or null)
    review_count: int (completion tracking)
```

### CalendarEvent Model
**Database**: `/workspaces/todo/api/models.py` (Lines 74-88)

```python
class CalendarEvent(Base):
    id: int (primary key)
    user_id: int (foreign key → users.id)
    title: str (event title)
    description: str (optional)
    start_time: DateTime (event start, naive UTC)
    end_time: DateTime (event end, naive UTC)
    event_type: str ("study", "rest", "break")
    source: str ("user" = manual, "system" = auto-generated)
    task_id: int (optional, links to Task)
    created_at: DateTime
    updated_at: DateTime
```

### User Model
**Database**: `/workspaces/todo/api/models.py` (Lines 30-52)

```python
class User(Base):
    id: int
    email: str (unique)
    name: str
    google_user_id: str (OAuth ID)
    timezone: str (user's timezone)
    subscription_plan: str ("free", "pro", "unlimited")
    credits_used: int (cumulative credits)
    subscription_status: str ("active", "cancelled")
    stripe_customer_id: str
    stripe_subscription_id: str
```

### EnergyProfile Model
**Database**: `/workspaces/todo/api/models.py` (Lines 54-72)

```python
class EnergyProfile(Base):
    user_id: int (foreign key)
    wake_time: int (hour, 0-23)
    sleep_time: int (hour, 0-23)
    max_study_duration: int (minutes)
    min_study_duration: int (minutes)
    energy_levels: JSON (hourly energy mapping)
    insert_breaks: bool (enable break insertion)
    short_break_min: int
    long_break_min: int
    long_study_threshold_min: int
    min_gap_for_break_min: int
```

---

## CRITICAL FUNCTIONS & FILE LOCATIONS

### Frontend Components
| Function | File | Lines |
|----------|------|-------|
| ScheduleView | ScheduleView.tsx | 24-641 |
| Chat input handler | ScheduleView.tsx | 512-545 |
| refreshViewData | ScheduleView.tsx | 67-77 |
| Calendar rendering (week) | ScheduleView.tsx | 126-297 |
| Calendar rendering (day) | ScheduleView.tsx | 299-449 |
| getEventBox | ScheduleView.tsx | 621-629 |
| taskToSpan | ScheduleView.tsx | 636 |

### Frontend Stores
| Store | File | Purpose |
|-------|------|---------|
| useTaskStore | useChatStore.ts | Tasks state |
| useScheduleStore | useScheduleStore.ts | Calendar events state |
| useChatStore | useChatStore.ts | Chat messages |

### Frontend API
| Function | File | Endpoint |
|----------|------|----------|
| sendChatMessage | chat.ts | POST /api/chat/message |
| listTasks | tasks.ts | GET /api/tasks |
| getEvents | calendar.ts | GET /api/calendar/events |

### Backend Routes
| Route | File | Handler |
|-------|------|---------|
| POST /api/chat/message | chat_routes.py | send_message (95-131) |
| GET /api/calendar/events | calendar_routes.py | get_events |
| GET /api/tasks | task_routes.py | get_tasks (14-62) |

### Backend Agent
| Component | File | Purpose |
|-----------|------|---------|
| run_agent | agent.py | Main agent loop |
| Tool definitions | agent.py | Tool schemas (85-244) |
| Tool implementations | agent_tools.py | All tool functions |

### Backend Scheduler
| Function | File | Purpose |
|----------|------|---------|
| schedule_tasks | scheduler.py | Entry point (17-77) |
| reschedule_optimistic | scheduler.py | Assign tasks to time blocks (261-350+) |
| get_time_blocks | scheduler.py | Generate available slots |
| split_tasks | scheduler.py | Break large tasks |
| detect_conflicts | scheduler.py | Check for reschedule needs |

---

## DATABASE RELATIONSHIPS

```
User (1)
  ├─→ (Many) Task
  │    └─ Fields: user_id, topic, due_date, scheduled_start/end, status
  │
  ├─→ (Many) CalendarEvent
  │    └─ Fields: user_id, title, start_time, end_time, event_type, source
  │    └─ Foreign Key: task_id (optional) → Task.id
  │
  ├─→ (1) EnergyProfile
  │    └─ Fields: wake_time, sleep_time, insert_breaks, break durations
  │
  └─→ (Many) BrainDump
       └─ Fields: raw_text, processing_status (from file uploads)
```

---

## API RESPONSE FLOW

```
Chat Message Response:
{
  "response": "I've created 3 tasks and scheduled them...",
  "timestamp": "2025-11-04T12:00:00Z",
  "events": [
    {
      "id": 42,
      "user_id": 1,
      "title": "Math homework",
      "description": "Study session for Math homework",
      "start_time": "2025-11-04T14:00:00Z",
      "end_time": "2025-11-04T15:00:00Z",
      "start_ts": 1730718000000,
      "end_ts": 1730721600000,
      "event_type": "study",
      "source": "system",
      "task_id": 123
    },
    {
      "id": 43,
      "user_id": 1,
      "title": "Short Break",
      "description": "Break between study sessions",
      "start_time": "2025-11-04T15:00:00Z",
      "end_time": "2025-11-04T15:05:00Z",
      "start_ts": 1730721600000,
      "end_ts": 1730721900000,
      "event_type": "break",
      "source": "system",
      "task_id": null
    }
  ]
}

Tasks Response:
{
  "tasks": [
    {
      "id": 123,
      "user_id": 1,
      "topic": "Math homework",
      "estimated_minutes": 60,
      "difficulty": 3,
      "due_date": "2025-11-04T15:00:00",
      "description": "Complete chapter 5 exercises",
      "status": "scheduled",
      "scheduled_start": "2025-11-04T14:00:00",
      "scheduled_end": "2025-11-04T15:00:00",
      "review_count": 0,
      "confidence_score": 1.0
    }
  ],
  "count": 1
}

Calendar Events Response:
{
  "events": [
    {
      "id": 42,
      "title": "Math homework",
      "start_time": "2025-11-04T14:00:00Z",
      "end_time": "2025-11-04T15:00:00Z",
      "start_ts": 1730718000000,
      "end_ts": 1730721600000,
      "event_type": "study",
      "source": "system",
      "task_id": 123
    }
  ]
}
```

---

## TIMING & PERFORMANCE

1. **Chat Input to Response**: ~2-3 seconds
   - Frontend submit (10ms)
   - Network latency (100ms)
   - OpenAI API call (1500-2000ms)
   - Tool execution (100-300ms)
   - Database operations (50-100ms)
   - Response serialize (10ms)
   - Network return (100ms)

2. **Calendar Refresh After Chat**: ~300-500ms
   - Parallel fetchTasks + fetchEvents (200-300ms)
   - Zustand state update (10ms)
   - React re-render (50-100ms)

3. **Task Drag/Drop**: ~50-100ms
   - editTask call + refreshViewData
   - Database update (50ms)
   - API responses (100-200ms)

---

## SUMMARY

The complete flow from user chat input to calendar rendering involves:

1. **Frontend Chat Input** → Chat store → API call
2. **Backend Route Handler** → User ID resolution → Agent execution
3. **AI Agent** → OpenAI function calls → Tool execution
4. **Tool Execution** → Database operations → CalendarEvent/Task creation
5. **Scheduler** → Time block generation → Event assignment
6. **Response Serialization** → Event conversion to JSON → Return to frontend
7. **Frontend State Update** → Zustand store → Task/event re-fetch
8. **Calendar Rendering** → Filter by date → Calculate pixel positions → Display

All events created by the scheduler flow directly into the calendar as system events with links to their corresponding tasks.

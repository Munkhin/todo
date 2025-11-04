# Flow Diagrams: Chat to Calendar

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NEXT.JS FRONTEND                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  /dashboard/schedule/page.tsx                                              │
│      └─ ScheduleView.tsx                                                   │
│          ├─ Chat Input Form (bottom 15%)                                   │
│          │   └─ onSubmit → sendMessage()                                   │
│          │       └─ useChatStore.sendMessage()                             │
│          │           └─ api.post(/api/chat/message)                        │
│          │                                                                  │
│          └─ Calendar Grid (top 85%)                                        │
│              ├─ useTaskStore.tasks (via fetchTasks)                        │
│              ├─ useScheduleStore.events (via fetchEvents)                  │
│              └─ Render task blocks with drag/drop                          │
│                                                                             │
│  Zustand State:                                                            │
│  ├─ useTaskStore: { tasks[], fetchTasks() }                               │
│  ├─ useScheduleStore: { events[], fetchEvents() }                         │
│  └─ useChatStore: { messages[], sendMessage() }                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                          HTTP/JSON │ API Calls
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI BACKEND                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  main.py                                                                    │
│  ├─ POST /api/chat/message                                                │
│  │   └─ chat_routes.py: send_message()                                    │
│  │       ├─ Resolve user_id                                               │
│  │       ├─ Get conversation history                                      │
│  │       ├─ run_agent() [agent.py]                                        │
│  │       │   ├─ OpenAI GPT-4-mini with tools                              │
│  │       │   ├─ Tool loop (max 5 iterations):                             │
│  │       │   │   ├─ create_tasks [agent_tools.py]                         │
│  │       │   │   ├─ schedule_all_tasks [agent_tools.py → scheduler.py]    │
│  │       │   │   ├─ create_calendar_event [agent_tools.py]                │
│  │       │   │   └─ update_energy_profile [agent_tools.py]                │
│  │       │   └─ Return {response, events: CalendarEvent[]}                │
│  │       └─ Serialize events to JSON                                      │
│  │           └─ Return ChatMessageResponse                                │
│  │                                                                         │
│  ├─ GET /api/tasks                                                        │
│  │   └─ task_routes.py: get_tasks()                                      │
│  │       └─ Query Task table                                              │
│  │           └─ Return Task[]                                             │
│  │                                                                         │
│  └─ GET /api/calendar/events                                             │
│      └─ calendar_routes.py: get_events()                                 │
│          └─ Query CalendarEvent table                                     │
│              └─ Return CalendarEvent[]                                    │
│                                                                           │
│  Database (SQLite: tasks.db)                                             │
│  ├─ Task:                                                                │
│  │   id, user_id, topic, estimated_minutes, difficulty,                │
│  │   due_date, description, status, scheduled_start, scheduled_end     │
│  │                                                                     │
│  ├─ CalendarEvent:                                                      │
│  │   id, user_id, title, start_time, end_time,                        │
│  │   event_type, source, task_id                                      │
│  │                                                                     │
│  └─ EnergyProfile:                                                      │
│      user_id, wake_time, sleep_time, insert_breaks, break settings   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Message Flow Sequence

```
FRONTEND                              BACKEND                   AGENT/SCHEDULER
   │                                    │                              │
   │ User types "create math homework"  │                              │
   │────────────────────────────────────→ POST /api/chat/message        │
   │                                    │                              │
   │                                    │ send_message()               │
   │                                    ├─→ resolve user_id            │
   │                                    ├─→ get conversation history   │
   │                                    │                              │
   │                                    │ run_agent()                  │
   │                                    ├─────────────────────────────→
   │                                    │                              │
   │                                    │  Build messages:              │
   │                                    │  [system, history, user_msg] │
   │                                    │                              │
   │                                    │  Loop 1:                      │
   │                                    │  Call OpenAI GPT-4-mini      │
   │                                    │  ← tool_calls: [create_tasks]│
   │                                    │                              │
   │                                    │  Execute create_tasks()      │
   │                                    │  ← Create Task objects       │
   │                                    │  ← Commit to DB              │
   │                                    │  ← Tool response             │
   │                                    │                              │
   │                                    │  Loop 2:                      │
   │                                    │  Call OpenAI with tool results
   │                                    │  ← tool_calls: [schedule_all_tasks]
   │                                    │                              │
   │                                    │  Execute schedule_all_tasks()
   │                                    │┬─────────────────────────────→
   │                                    ││ scheduler.py:               │
   │                                    ││ ├─ Get unscheduled tasks   │
   │                                    ││ ├─ Generate time_blocks    │
   │                                    ││ ├─ reschedule_optimistic() │
   │                                    ││ │  ├─ Sort tasks by diff  │
   │                                    ││ │  ├─ Sort blocks by energy│
   │                                    ││ │  ├─ Assign tasks        │
   │                                    ││ │  ├─ Create CalendarEvent│
   │                                    ││ │  ├─ If breaks: break evt│
   │                                    ││ │  └─ db.flush()          │
   │                                    ││ └─ Return events[]         │
   │                                    │←─────────────────────────────
   │                                    │  ← Tool response with events│
   │                                    │                              │
   │                                    │  Loop 3:                      │
   │                                    │  Call OpenAI with results    │
   │                                    │  ← tool_calls: None          │
   │                                    │  ← Final response text       │
   │                                    │                              │
   │                                    │ Return {response, events}    │
   │                                    │←─────────────────────────────
   │                                    │                              │
   │                                    │ Serialize events to JSON     │
   │                                    │ Update conversation_store    │
   │                                    │                              │
   │ ← ChatMessageResponse              │                              │
   │ {response, timestamp, events}      │                              │
   │                                    │                              │
   ├─ Store in useChatStore             │                              │
   ├─ Show notification overlay         │                              │
   └─ Call refreshViewData()            │                              │
       │                                │                              │
       ├─→ fetchTasks()                 │                              │
       │   │ GET /api/tasks             │                              │
       │   │────────────────────────────→ get_tasks()                 │
       │   │                            │ ← Return Task[]             │
       │   ←─────────────────────────────                              │
       │   Update useTaskStore.tasks    │                              │
       │                                │                              │
       ├─→ fetchEvents()                │                              │
       │   │ GET /api/calendar/events   │                              │
       │   │────────────────────────────→ get_events()                │
       │   │                            │ ← Return CalendarEvent[]    │
       │   ←─────────────────────────────                              │
       │   Update useScheduleStore.events                             │
       │                                │                              │
       └─ React re-render               │                              │
           └─ Calendar displays tasks/events                           │
```

## 3. Scheduler: Task Assignment to Calendar

```
reschedule_optimistic() Flow:
└─ Input: tasks[], time_blocks[], user_id, consts, db

   Step 1: Sort and Prepare
   ├─ sorted_blocks = sort(time_blocks, energy_level DESC)
   ├─ sorted_tasks = sort(tasks, difficulty DESC)
   └─ created_events = []

   Step 2: For Each Task (hardest first)
   │
   └─ For task in sorted_tasks:
       │
       ├─ Find first available block
       │   └─ if block.available_minutes >= task.estimated_minutes:
       │
       ├─ Schedule task
       │   ├─ start_time = block.start_time
       │   ├─ end_time = start_time + task.estimated_minutes
       │   ├─ task.scheduled_start = start_time
       │   └─ task.scheduled_end = end_time
       │
       ├─ Create Study CalendarEvent
       │   ├─ CalendarEvent(
       │   │   user_id = user_id,
       │   │   title = task.topic,
       │   │   description = f"Study session for {task.topic}",
       │   │   start_time = start_time,
       │   │   end_time = end_time,
       │   │   event_type = "study",
       │   │   source = "system",  ← AUTO-GENERATED
       │   │   task_id = task.id
       │   │ )
       │   ├─ db.add(calendar_event)
       │   └─ created_events.append(calendar_event)
       │
       ├─ Update block availability
       │   ├─ block.available_minutes -= task.estimated_minutes
       │   └─ block.start_time = end_time
       │
       └─ If INSERT_BREAKS enabled:
           │
           ├─ Check study streak
           │   └─ prev_streak = streak_by_day.get(date, 0)
           │   └─ new_streak = prev_streak + task.estimated_minutes
           │
           ├─ Determine break type
           │   └─ if new_streak >= LONG_STUDY_THRESHOLD:
           │       break_min = LONG_BREAK_MIN (15)
           │   else:
           │       break_min = SHORT_BREAK_MIN (5)
           │
           ├─ If break fits in block:
           │   ├─ Create Break CalendarEvent
           │   │   ├─ CalendarEvent(
           │   │   │   user_id = user_id,
           │   │   │   title = "Long Break" or "Short Break",
           │   │   │   description = "Break between study sessions",
           │   │   │   start_time = block.start_time,
           │   │   │   end_time = block.start_time + break_min,
           │   │   │   event_type = "rest" or "break",
           │   │   │   source = "system",  ← AUTO-GENERATED
           │   │   │   task_id = None
           │   │   │ )
           │   │   ├─ db.add(break_event)
           │   │   └─ created_events.append(break_event)
           │   │
           │   └─ Update block
           │       ├─ block.available_minutes -= break_min
           │       ├─ block.start_time += break_min
           │       └─ streak_by_day[date] = 0  ← RESET
           │
           └─ Else: Update streak
               └─ streak_by_day[date] = new_streak

   Step 3: Finalize
   ├─ db.flush()  ← Get IDs without committing
   └─ Return {
       scheduled_count: N,
       total_tasks: M,
       unscheduled_count: L,
       events: created_events,  ← CalendarEvent ORM objects!
       message: "..."
     }
```

## 4. Event Model to Calendar Display

```
Database: CalendarEvent
│
├─ id = 42
├─ user_id = 1
├─ title = "Math homework"
├─ description = "Study session for Math homework"
├─ start_time = 2025-11-04T14:00:00  (naive UTC)
├─ end_time = 2025-11-04T15:00:00    (naive UTC)
├─ event_type = "study"
├─ source = "system"
└─ task_id = 123

   │
   ├─ Serialize to JSON (UTC ISO):
   │  {
   │    "id": 42,
   │    "title": "Math homework",
   │    "start_time": "2025-11-04T14:00:00Z",
   │    "end_time": "2025-11-04T15:00:00Z",
   │    "start_ts": 1730718000000,
   │    "end_ts": 1730721600000,
   │    "event_type": "study",
   │    "source": "system",
   │    "task_id": 123
   │  }
   │
   ├─ Frontend stores in useScheduleStore
   │  events: CalendarEvent[]
   │
   └─ ScheduleView.tsx renders:
      │
      ├─ Task matching date found
      ├─ taskToSpan(task) → {startIso, endIso}
      ├─ getEventBox(startIso, endIso, wake_hour=7, span=16h)
      │  │
      │  └─ Calculations:
      │     start_minutes = 14*60 = 840 minutes
      │     base_minutes = 7*60 = 420 minutes
      │     startMin = 840 - 420 = 420 minutes from wake
      │     endMin = 15*60 - 420 = 480 minutes from wake
      │     top = 420 * 0.8 = 336px
      │     height = (480-420) * 0.8 = 48px
      │
      └─ Render <div>
         ├─ style={{
         │   top: "336px",
         │   height: "48px"
         │ }}
         ├─ className: "eventDay"
         ├─ text: "Math homework"
         ├─ cursor: "grab"  (draggable)
         └─ onMouseDown/Move/Up handlers for drag & resize
```

## 5. Database Relationships

```
User (PK: id)
 │
 ├─→ (1:Many) Task
 │   ├─ Fields: topic, due_date, scheduled_start, scheduled_end, status
 │   └─ When scheduled: scheduled_start ≠ NULL
 │
 ├─→ (1:Many) CalendarEvent
 │   ├─ Fields: title, start_time, end_time, event_type, source
 │   ├─ FK: task_id → Task.id (nullable)
 │   ├─ source: "system" = auto-generated by scheduler
 │   ├─ source: "user" = manually created by user
 │   └─ linked tasks have matching scheduled times
 │
 ├─→ (1:1) EnergyProfile
 │   ├─ Fields: wake_time, sleep_time, insert_breaks, break settings
 │   └─ Determines scheduler behavior
 │
 └─→ (1:Many) BrainDump
     └─ raw_text from file uploads

Key Constraint:
└─ CalendarEvent.task_id FK → Task.id with CASCADE DELETE
   (Deleting task auto-removes linked events)
```

## 6. Frontend State Management

```
Zustand Stores (Reactive):

useTaskStore
 │
 ├─ State:
 │  ├─ tasks: Task[]
 │  ├─ loading: boolean
 │  └─ error: string
 │
 └─ Actions:
    ├─ fetchTasks(filters)
    │   └─ GET /api/tasks → listTasks()
    │       └─ Update tasks state
    │
    ├─ addTask(data)
    │   └─ POST /api/tasks + refetch
    │
    ├─ editTask(id, updates)
    │   └─ PUT /api/tasks/{id} + refetch
    │
    └─ removeTask(id)
        └─ DELETE /api/tasks/{id}

useScheduleStore
 │
 ├─ State:
 │  ├─ events: CalendarEvent[]
 │  ├─ loading: boolean
 │  └─ error: string
 │
 └─ Actions:
    └─ fetchEvents(start, end, userId)
        └─ GET /api/calendar/events
            └─ Update events state

useChatStore
 │
 ├─ State:
 │  ├─ messages: ChatMessage[]
 │  ├─ isLoading: boolean
 │  └─ error: string
 │
 └─ Actions:
    └─ sendMessage(message, userId)
        ├─ Add user message
        ├─ POST /api/chat/message
        ├─ Add assistant response
        └─ Return response text
```

## 7. Calendar Rendering Pipeline

```
ScheduleView Component
│
├─ Subscribe to stores:
│  ├─ tasks = useTaskStore((s) => s.tasks)
│  ├─ fetchTasks = useTaskStore((s) => s.fetchTasks)
│  ├─ fetchEvents = useScheduleStore((s) => s.fetchEvents)
│  └─ userId = useUserId()
│
├─ Effects:
│  └─ useEffect(() => refreshViewData(), [currentDate, view, userId])
│     └─ refreshViewData():
│        ├─ fetchTasks({ include_completed: false })
│        └─ fetchEvents(weekStart, weekEnd, userId)
│
├─ State:
│  ├─ currentDate: Date
│  ├─ view: "week" | "day"
│  ├─ input: string (chat message)
│  ├─ notification: ReactNode | null
│  └─ selected/dragging: Task tracking
│
├─ Render Week View (lines 126-297):
│  │
│  ├─ Time column (left):
│  │  └─ Hour labels 7am-11pm
│  │
│  └─ 7 Day columns (right):
│     │
│     ├─ Week header: Mon 1, Tue 2, ..., Sun 7
│     │
│     └─ For each day (144-294):
│        │
│        ├─ Grid with hourly rows (PX_PER_HOUR = 48px)
│        ├─ Current time indicator (white line)
│        │
│        └─ For each task on this day:
│           │
│           ├─ taskToSpan(task):
│           │  └─ Determine start/end times
│           │     (use scheduled_start/end if available)
│           │
│           ├─ getEventBox(start, end, wake_hour, spanMin):
│           │  └─ Calculate:
│           │     top = (minutes_from_wake) * 0.8
│           │     height = (duration) * 0.8
│           │
│           └─ Render <div className="eventDay">
│              ├─ style={{top, height}}
│              ├─ text: task.topic
│              │
│              ├─ onMouseDown: Start drag
│              ├─ onMouseMove: Visual feedback
│              └─ onMouseUp:
│                 ├─ editTask(id, {scheduled_start, scheduled_end})
│                 └─ refreshViewData()
│
└─ Render Chat Bar (bottom 15%, lines 509-599):
   │
   ├─ File upload button
   ├─ Message input field
   └─ Send button
      └─ onSubmit:
         ├─ sendMessage(msg, userId)
         ├─ setNotification(response)
         └─ refreshViewData()
```

## 8. Event Type Color/Display Mapping

```
CalendarEvent rendered as:

event_type: "study"
 ├─ className: cal.eventDay (blue/purple)
 ├─ border: solid
 ├─ cursor: grab (draggable)
 └─ Shows task.topic as content

event_type: "break"
 ├─ className: cal.eventDay (lighter color)
 ├─ opacity: 0.7
 └─ Shows "Short Break"

event_type: "rest"
 ├─ className: cal.eventDay (lighter color)
 ├─ opacity: 0.7
 └─ Shows "Long Break"

source: "system" (auto-generated)
 ├─ Created by scheduler
 ├─ Linked to task_id
 └─ Can be dragged to reschedule

source: "user" (manual)
 ├─ Created manually by user
 ├─ Blocks time for scheduling
 └─ Not directly draggable in current UI
```


# Quick Reference: Chat to Calendar Flow

## 1. User Message Submission
```
ScheduleView.tsx (lines 512-545)
  └─ Form onSubmit
      └─ sendMessage(msg, userId)
          └─ POST /api/chat/message {user_id, message}
```

## 2. Backend Chat Handler
```
chat_routes.py (lines 95-131)
  └─ send_message()
      ├─ resolve user_id from session/user_id param
      ├─ get/create conversation_store[user_id]
      ├─ run_agent(user_id, message, history, db)
      └─ serialize events to JSON
          └─ Return ChatMessageResponse {response, events}
```

## 3. AI Agent Execution
```
agent.py (lines 262-339)
  └─ run_agent()
      ├─ Build messages: [system, history, user_message]
      ├─ OpenAI loop (max 5 iterations):
      │   ├─ POST to gpt-4-mini with tools
      │   ├─ If tool_calls returned:
      │   │   ├─ Execute each tool
      │   │   └─ Add results to messages
      │   └─ Else: Return final response
      └─ Collect events from tools
          └─ Return {response, events: CalendarEvent[]}
```

## 4. Key Tools
```
Tool: create_tasks
  └─ Create Task objects (status="unscheduled")

Tool: schedule_all_tasks ⭐ MAIN TOOL
  └─ run_scheduler(user_id, db)
      └─ scheduler.py: reschedule_optimistic()
          ├─ Sort tasks by difficulty
          ├─ Sort time_blocks by energy
          ├─ For each task:
          │   ├─ Find time block
          │   ├─ Create CalendarEvent (source="system")
          │   └─ If breaks enabled: Create break events
          └─ db.flush() + return events

Tool: create_calendar_event
  └─ Create CalendarEvent + linked Task

Tool: get/update_energy_profile
  └─ Modify wake_time, sleep_time, break settings
```

## 5. Event Creation Flow
```
scheduler.py (lines 261-349)
  └─ reschedule_optimistic()
      ├─ For each task:
      │   └─ CalendarEvent(
      │       user_id, title=task.topic,
      │       start_time, end_time,
      │       event_type="study",
      │       source="system",
      │       task_id=task.id
      │     )
      │   └─ db.add(calendar_event)
      │
      ├─ If INSERT_BREAKS:
      │   └─ Create break CalendarEvent (source="system")
      │
      └─ db.flush() → return events[]
```

## 6. Response Return
```
agent.py (lines 308-322)
  ├─ Capture events from schedule_all_tasks result
  ├─ Capture events from create_calendar_event result
  └─ Return {response, events: ORM objects}

chat_routes.py (lines 119-127)
  └─ Serialize ORM to JSON:
      {
        "response": "...",
        "timestamp": "...",
        "events": [
          {id, title, start_time, end_time, event_type, source, task_id}
        ]
      }
```

## 7. Frontend Response & Refresh
```
ScheduleView.tsx (lines 512-544)
  ├─ Receive response
  ├─ Store in chat store
  ├─ Show notification overlay
  └─ refreshViewData():
      ├─ fetchTasks() → GET /api/tasks
      │   └─ Update useTaskStore
      └─ fetchEvents() → GET /api/calendar/events
          └─ Update useScheduleStore
```

## 8. Calendar Rendering
```
ScheduleView.tsx (lines 126-449)
  ├─ Subscribe to tasks: useTaskStore
  ├─ Subscribe to events: useScheduleStore
  │
  └─ For each task matching date:
      ├─ taskToSpan(task) → {start, end}
      ├─ getEventBox() → {top, height}
      └─ Render div with:
          ├─ top = startMin * 0.8px (PX_PER_MIN)
          ├─ height = duration * 0.8px
          ├─ text = task.topic
          └─ draggable/resizable
```

## File Map

### Frontend Files
```
ScheduleView.tsx          Main component, chat input, calendar rendering
  ├─ useChatStore.ts      Chat state (sendMessage)
  ├─ useTaskStore.ts      Tasks state (fetchTasks)
  ├─ useScheduleStore.ts  Calendar events state (fetchEvents)
  └─ chat.ts              API client (sendChatMessage)
  └─ tasks.ts             API client (listTasks)
  └─ calendar.ts          API client (getEvents)
```

### Backend Files
```
main.py
  ├─ chat_routes.py       POST /api/chat/message (send_message)
  │   └─ agent.py         run_agent()
  │       ├─ agent_tools.py
  │       │   ├─ create_tasks()
  │       │   ├─ schedule_all_tasks()
  │       │   │   └─ scheduler.py
  │       │   │       └─ reschedule_optimistic()  ⭐ Creates events
  │       │   ├─ create_calendar_event()
  │       │   ├─ update_energy_profile()
  │       │   └─ tune_break_settings()
  │       └─ models.py    Task, CalendarEvent, EnergyProfile
  │
  ├─ task_routes.py       GET /api/tasks (get_tasks)
  └─ calendar_routes.py   GET /api/calendar/events (get_events)
```

## Key Models

### Task
```python
id, user_id, topic, estimated_minutes, difficulty,
due_date, description, status, scheduled_start, scheduled_end
```

### CalendarEvent
```python
id, user_id, title, description, start_time, end_time,
event_type ("study"|"rest"|"break"), source ("system"|"user"), task_id
```

### EnergyProfile
```python
user_id, wake_time, sleep_time, max_study_duration, min_study_duration,
insert_breaks, short_break_min, long_break_min, long_study_threshold_min
```

## Key Metrics

### Pixel Calculations (ScheduleView.tsx)
```javascript
PX_PER_HOUR = 48 pixels
PX_PER_MIN = 0.8 pixels (48/60)
top = minutesFromWakeTime * 0.8
height = durationMinutes * 0.8
```

### Performance
```
Chat to response: 2-3 seconds
Calendar refresh: 300-500ms
Drag/drop update: 50-100ms
```

## Critical Path Summarized

```
User Message
    ↓
ScheduleView sendMessage()
    ↓
POST /api/chat/message
    ↓
Backend: send_message()
    ↓
run_agent() with tools
    ↓
Tool: schedule_all_tasks()
    ↓
scheduler.reschedule_optimistic()
    ↓
Create CalendarEvent (source="system")
    ↓
db.flush() return events
    ↓
Agent captures events
    ↓
Serialize to JSON
    ↓
Return ChatMessageResponse
    ↓
Frontend: refreshViewData()
    ↓
fetchTasks() + fetchEvents()
    ↓
Update Zustand stores
    ↓
React re-render
    ↓
Calendar displays tasks/events
```

## Important Notes

1. **CalendarEvent ORM objects** flow directly from scheduler to agent response
2. **Source field** distinguishes auto-generated ("system") vs manual ("user") events
3. **Events returned in chat response** are for immediate UI feedback; calendar refresh fetches canonical data
4. **Time blocks** generated based on EnergyProfile wake_time and sleep_time
5. **Break insertion** creates additional CalendarEvent records alongside task events
6. **Optimistic update**: db.flush() returns objects before commit for immediate response
7. **Drag/drop** updates both task times and refreshes calendar
8. **Task filtering** on frontend uses due_date; calendar uses scheduled_start/end for display


# START HERE: Chat to Calendar Flow Documentation

Welcome! This directory contains comprehensive documentation of how user chat messages flow through the AI agent system to create calendar events.

## Quick Navigation

**New to the codebase?**
→ Read: `DOCUMENTATION_SUMMARY.md` (7 min read)

**Need to understand the complete flow?**
→ Read: `CHAT_TO_CALENDAR_FLOW.md` (30 min read)

**Want quick answers and visual diagrams?**
→ Read: `CHAT_FLOW_QUICK_REFERENCE.md` (10 min read)

**Need architecture diagrams?**
→ Read: `FLOW_DIAGRAMS.md` (15 min read)

## The Four Documents

| Document | Size | Purpose | Best For |
|----------|------|---------|----------|
| **DOCUMENTATION_SUMMARY.md** | 7.7 KB | Overview & quick start | New developers, executives, quick reference |
| **CHAT_TO_CALENDAR_FLOW.md** | 31 KB | Complete technical reference | Deep understanding, debugging, detailed analysis |
| **CHAT_FLOW_QUICK_REFERENCE.md** | 6.9 KB | Condensed flow with key info | Quick lookups, getting oriented |
| **FLOW_DIAGRAMS.md** | 23 KB | Visual representations | Architecture, relationships, visual learners |

## 30-Second Summary

```
User types chat message
    ↓
Backend receives message, starts AI agent
    ↓
Agent calls OpenAI GPT-4-mini with tools
    ↓
Tool: schedule_all_tasks() creates scheduler.reschedule_optimistic()
    ↓
Scheduler creates CalendarEvent objects (source="system")
    ↓
CalendarEvent objects returned to agent, serialized to JSON
    ↓
Frontend receives response, calls refreshViewData()
    ↓
Frontend fetches fresh tasks and calendar events from API
    ↓
React re-renders calendar with new events displayed
```

## Key Technologies

- **Frontend**: Next.js (React) with TypeScript, Zustand for state
- **Backend**: FastAPI (Python) with SQLAlchemy ORM
- **Database**: SQLite with migrations
- **AI**: OpenAI GPT-4-mini with function calling
- **Scheduling**: Energy-aware algorithm with break insertion

## Critical Files to Know

**Frontend Main Component**
- `/workspaces/todo/todo_ui/components/Dashboard/ScheduleView.tsx`
  - Chat input handler (lines 512-545)
  - Calendar rendering (lines 126-449)
  - Event positioning (lines 621-629)

**Backend AI Agent**
- `/workspaces/todo/api/agent.py`
  - run_agent() function (lines 262-339)
  - Tool definitions (lines 85-244)
  - Event capture logic (lines 308-322)

**Backend Scheduler (Creates Events)**
- `/workspaces/todo/api/services/scheduler.py`
  - reschedule_optimistic() (lines 261-349+)
  - CalendarEvent creation (lines 291-303)
  - Break insertion logic (lines 312-345)

**Backend Chat Route**
- `/workspaces/todo/api/routes/chat_routes.py`
  - send_message() handler (lines 95-131)
  - Event serialization (lines 119-127)

**Frontend Stores**
- `/workspaces/todo/todo_ui/lib/store/useTaskStore.ts` - Task state
- `/workspaces/todo/todo_ui/lib/store/useScheduleStore.ts` - Calendar events
- `/workspaces/todo/todo_ui/lib/store/useChatStore.ts` - Chat messages

## Database Models

```python
# Three main models involved in the flow:

Task
  ├─ topic: str (what to do)
  ├─ due_date: datetime (deadline)
  ├─ scheduled_start: datetime (when it's scheduled)
  ├─ scheduled_end: datetime (when it ends)
  └─ status: str ("unscheduled", "scheduled", etc.)

CalendarEvent
  ├─ title: str (display name)
  ├─ start_time: datetime (start)
  ├─ end_time: datetime (end)
  ├─ event_type: str ("study", "break", "rest")
  ├─ source: str ("system" = auto-generated, "user" = manual)
  └─ task_id: int (links to Task)

EnergyProfile
  ├─ wake_time: int (7 = 7am)
  ├─ sleep_time: int (23 = 11pm)
  ├─ insert_breaks: bool (enable automated breaks)
  └─ break settings (duration, thresholds)
```

## API Endpoints (Simplified)

```
Chat:
  POST /api/chat/message
    Input: {user_id, message}
    Output: {response, events}

Tasks:
  GET /api/tasks
    Input: filters (optional)
    Output: {tasks: Task[]}

Calendar:
  GET /api/calendar/events
    Input: user_id, start_date, end_date
    Output: {events: CalendarEvent[]}
```

## Pixel Calculations for Calendar Display

The calendar uses pixel-based positioning:

```
PX_PER_HOUR = 48 pixels (height for 1 hour)
PX_PER_MIN = 0.8 pixels (48/60)

For a task from 2pm-3pm (14:00-15:00):
  Start minutes = 14*60 - 7*60 = 420 (from 7am wake time)
  Duration = 60 minutes
  
  top = 420 * 0.8 = 336px
  height = 60 * 0.8 = 48px
```

## Common Workflows

### Debugging: Why aren't events showing?

1. Check `useScheduleStore.events` has data (DevTools)
2. Verify `fetchEvents()` was called after chat
3. Ensure date range matches (check start_date/end_date)
4. Check `CalendarEvent.source` is set correctly
5. Verify timezone conversions (UTC naive in DB)

### Development: Adding a new tool

1. Edit `/workspaces/todo/api/agent.py` lines 85-244 (add schema)
2. Edit `/workspaces/todo/api/agent.py` lines 247-259 (register tool)
3. Create function in `/workspaces/todo/api/services/agent_tools.py`
4. Function receives: user_id, db (and tool-specific params)
5. Return: dict with results
6. If creating events: append to list, return in result["events"]

### Performance: Optimization Points

- Agent to OpenAI: ~1500ms (unavoidable, external API)
- Scheduler computation: ~50ms (data structure ops)
- Frontend refresh: ~300ms (two parallel API calls)
- Calendar render: ~50ms (React reconciliation)

**Total user-perceived latency: 2-3 seconds**

## Architecture Diagram (Simplified)

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│ ScheduleView.tsx                                            │
│  ├─ Chat input → sendMessage()                             │
│  └─ Calendar grid ← useTaskStore.tasks                     │
│                  ← useScheduleStore.events                 │
└─────────────────────────────────────────────────────────────┘
        │                                           │
   POST /api/                              GET /api/
   chat/message                            tasks, events
        │                                           │
        ▼                                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
├─────────────────────────────────────────────────────────────┤
│ chat_routes.py → agent.py → agent_tools.py                │
│                               ↓                             │
│                    scheduler.py                             │
│                    (Creates CalendarEvent)                  │
└─────────────────────────────────────────────────────────────┘
        │                                           │
        └───────────────────┬─────────────────────┘
                            │
                            ▼
                    SQLite Database
                    (Task, CalendarEvent)
```

## Next Steps

1. **Read DOCUMENTATION_SUMMARY.md** (you are here)
2. **Pick your focus**:
   - Full flow: Read CHAT_TO_CALENDAR_FLOW.md
   - Quick ref: Read CHAT_FLOW_QUICK_REFERENCE.md
   - Architecture: Read FLOW_DIAGRAMS.md
3. **Dive into code**:
   - Start with `/workspaces/todo/api/routes/chat_routes.py`
   - Follow to `/workspaces/todo/api/agent.py`
   - Understand `/workspaces/todo/api/services/scheduler.py`
   - Review `/workspaces/todo/todo_ui/components/Dashboard/ScheduleView.tsx`

## Questions?

- Check DOCUMENTATION_SUMMARY.md Quick Troubleshooting section
- Search in the relevant document
- Examine referenced files and line numbers

---

**Last Updated**: 2025-11-04
**Codebase Commit**: 641bc0e (debug user not found error)
**Status**: Complete - All major flows documented

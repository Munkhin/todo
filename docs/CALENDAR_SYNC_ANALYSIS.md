# Calendar-Task Synchronization Analysis

## Executive Summary

**Status:** ⚠️ PARTIALLY FUNCTIONAL WITH CRITICAL EDGE CASES

The calendar does render responsively after task operations through manual `fetchEvents()` calls, but there are critical synchronization gaps that will cause bugs in production.

---

## Current Implementation

### ✅ What Works

1. **Manual Refetch Pattern**
   - After task create/edit/delete, `fetchEvents()` is called
   - Calendar re-renders with fresh data from backend
   - Week/day view switching works correctly

2. **Event Click to Edit**
   - Clicking calendar event fetches task via `task_id`
   - TaskDialog pre-fills with task data
   - Edit mode properly detected via `isEditMode` prop

3. **Error Handling**
   - `handleEventClick()` returns early if `task_id` is null
   - API errors logged to console (not shown to user)

---

## 🚨 Critical Issues & Edge Cases

### Issue #1: Task Edit Does NOT Update Calendar Event

**Severity:** HIGH

**Flow:**
```
User clicks event → Edit task title → Save
→ PUT /api/tasks/{id} updates Task.topic
→ CalendarEvent.title remains OLD value
→ fetchEvents() retrieves stale event
→ Calendar shows outdated title
```

**Root Cause:**
- `PUT /api/tasks/{id}` (line 83-94 in task_routes.py) only updates Task table
- No logic to update associated CalendarEvent(s)

**Impact:**
- Events show stale titles, times, descriptions
- User confusion: "I edited the task but calendar didn't update"
- Data integrity: Task and Event out of sync

**Reproduction:**
1. Click scheduled event "Study Math"
2. Edit title to "Study Calculus"
3. Save → Calendar still shows "Study Math"

---

### Issue #2: Task Deletion Creates Orphaned Events

**Severity:** CRITICAL

**Flow:**
```
User clicks event → Delete task
→ DELETE /api/tasks/{id} removes Task
→ CalendarEvent.task_id now points to non-existent task
→ fetchEvents() retrieves orphaned event
→ Calendar displays event
→ User clicks orphaned event → API 404 error
```

**Root Cause:**
```python
# models.py line 69
task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
# No CASCADE specified! Should be:
# task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
```

**Impact:**
- Ghost events on calendar that can't be edited
- Console errors when clicking orphaned events
- Database pollution with dead references

**Reproduction:**
1. Delete a scheduled task
2. Event remains on calendar
3. Click event → "Failed to load task" error

---

### Issue #3: Task Edit Changes Are Not Reflected in Event

**Severity:** HIGH

**Scenario:**
```
User edits:
- Task topic: "Read Chapter 1" → "Read Chapter 5"
- Estimated minutes: 60 → 120
- Difficulty: 3 → 5
- Due date: 2025-11-05 → 2025-11-10

Calendar event still shows original values
```

**Root Cause:**
CalendarEvent has its own fields (title, start_time, end_time) that are NOT updated when Task changes.

**Backend Code Gap:**
```python
# task_routes.py:84-94
def update_task(task_id: int, task: TaskUpdate, db: Session):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    for field, value in task.dict(exclude_unset=True).items():
        setattr(db_task, field, value)
    db.commit()
    # MISSING: Update associated CalendarEvent(s)
```

---

### Issue #4: Create Task Does NOT Create Calendar Event

**Severity:** MEDIUM (Expected behavior but confusing UX)

**Flow:**
```
User clicks empty calendar cell → TaskDialog opens
→ Fill form with title, time, duration
→ addTask() creates Task with no scheduled_start/end
→ fetchEvents() returns nothing (task unscheduled)
→ Calendar cell remains empty
```

**Root Cause:**
- Task creation from calendar doesn't set `scheduled_start`/`scheduled_end`
- Scheduler must be run separately to create CalendarEvent

**Impact:**
- User expects task to appear immediately after creation
- Requires separate "Schedule All Tasks" action

**Reproduction:**
1. Click calendar cell
2. Create "Study Biology", due 2025-11-03
3. Save → Nothing appears on calendar

---

### Issue #5: Multiple Rapid Operations → Race Conditions

**Severity:** MEDIUM

**Scenario:**
```javascript
// User rapidly clicks:
await editTask(1, {...})
await fetchEvents()  // Request A
await deleteTask(2)
await fetchEvents()  // Request B
// Request B may complete before Request A
```

**Impact:**
- Calendar may show incorrect state temporarily
- Last request wins, not last operation

---

### Issue #6: Event Without task_id Cannot Be Edited

**Severity:** LOW (Handled but UX issue)

**Flow:**
```
User clicks user-created event (source="user", task_id=null)
→ handleEventClick() returns early
→ Nothing happens
```

**Root Cause:**
```typescript
// ScheduleView.tsx:34
const handleEventClick = async (event: any) => {
  if (!event.task_id) return  // Silent failure
  ...
}
```

**Impact:**
- User-created events cannot be edited via calendar
- No feedback to user why click does nothing

---

## Edge Case Matrix

| Scenario | Current Behavior | Expected Behavior | Issue |
|----------|------------------|-------------------|-------|
| Edit scheduled task title | Calendar shows old title | Calendar shows new title | #1 |
| Edit scheduled task time | Event time unchanged | Event time updates | #3 |
| Delete scheduled task | Orphaned event remains | Event deleted with task | #2 |
| Create task from calendar | Task created, not visible | Task + event created | #4 |
| Click user-created event | Nothing happens | Open edit dialog | #6 |
| Click orphaned event | API 404 error | Handle gracefully | #2 |
| Delete event, keep task | Task orphaned | Task unscheduled | N/A |
| Reschedule conflicts | Old events deleted | New events created | ✅ |
| Network error on fetch | Error logged | User notification | N/A |

---

## Database Integrity Issues

### Current Schema (models.py:69)
```python
task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
```

### Problems:
1. **No CASCADE delete** → Orphaned events when tasks deleted
2. **No CASCADE update** → Events not updated when tasks change
3. **Nullable foreign key** → Events can exist without tasks (intended for user events)

### Recommended Schema:
```python
task_id = Column(Integer,
    ForeignKey("tasks.id", ondelete="CASCADE", onupdate="CASCADE"),
    nullable=True
)
```

---

## Code Locations

### Frontend
- **ScheduleView.tsx:34-45** - Event click handler (handleEventClick)
- **ScheduleView.tsx:221-262** - Task save/delete handlers with fetchEvents
- **useScheduleStore.ts:19-27** - fetchEvents implementation

### Backend
- **task_routes.py:83-94** - Task update (no event sync)
- **task_routes.py:97-104** - Task delete (no event cleanup)
- **models.py:69** - CalendarEvent.task_id foreign key (no cascade)
- **calendar_routes.py:46-73** - Get events endpoint

---

## Recommended Fixes

### Priority 1: Critical Fixes

1. **Add CASCADE to foreign key**
   ```python
   # models.py:69
   task_id = Column(Integer,
       ForeignKey("tasks.id", ondelete="CASCADE"),
       nullable=True
   )
   ```

2. **Update CalendarEvent when Task edited**
   ```python
   # task_routes.py:84-94
   def update_task(task_id: int, task: TaskUpdate, db: Session):
       db_task = db.query(Task).filter(Task.id == task_id).first()

       # Update task fields
       for field, value in task.dict(exclude_unset=True).items():
           setattr(db_task, field, value)

       # NEW: Update associated calendar event(s)
       if db_task.scheduled_start:
           events = db.query(CalendarEvent).filter(
               CalendarEvent.task_id == task_id
           ).all()

           for event in events:
               event.title = db_task.topic
               event.start_time = db_task.scheduled_start
               event.end_time = db_task.scheduled_end

       db.commit()
   ```

### Priority 2: UX Improvements

3. **Handle orphaned events gracefully**
   ```typescript
   // ScheduleView.tsx:34
   const handleEventClick = async (event: any) => {
       if (!event.task_id) {
           alert("This event is not linked to a task")
           return
       }
       try {
           const response = await getTask(String(event.task_id))
           setEditingTask(response.task)
           setOpenDialog(true)
       } catch (error) {
           alert("Task no longer exists. Deleting orphaned event...")
           await deleteEvent(event.id)
           await fetchEvents(...)
       }
   }
   ```

4. **Create scheduled task with event**
   ```typescript
   // When creating from calendar, set scheduled times
   await addTask({
       ...data,
       scheduled_start: initialDueDate,  // Use clicked cell time
       scheduled_end: calculateEndTime(initialDueDate, data.estimated_minutes)
   })
   ```

### Priority 3: Robustness

5. **Add optimistic updates**
   ```typescript
   // Update local state immediately, rollback on error
   const optimisticUpdate = (taskId, changes) => {
       setEvents(prev => prev.map(ev =>
           ev.task_id === taskId ? { ...ev, ...changes } : ev
       ))
   }
   ```

6. **Add loading states**
   ```typescript
   const [refreshing, setRefreshing] = useState(false)
   // Show spinner during refetch
   ```

---

## Testing Checklist

- [ ] Edit scheduled task title → Calendar updates immediately
- [ ] Edit scheduled task time → Event moves to new time
- [ ] Delete scheduled task → Event removed from calendar
- [ ] Create task from calendar → Event appears immediately
- [ ] Click orphaned event → Graceful error handling
- [ ] Rapid edit operations → No race conditions
- [ ] Network error on fetch → User notification
- [ ] Reschedule all tasks → Old events cleared, new ones appear

---

## Conclusion

**Current State:** Calendar refetches work but task-event sync is broken.

**Risk Level:** HIGH for production use

**Recommendation:** Implement Priority 1 fixes before deploying to users.

The refetch mechanism ensures eventual consistency, but the lack of cascade deletes and event updates creates data integrity issues and poor UX.

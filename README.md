# tasks
**HIGH priority**
- [✔] taskview not syncing from right store
- [✔] schedule view not persistent
- [✔] user not found error
- [ ] taskview is not synced with the scheduled events(check store)
- [ ] wrong time (630 -8 instead of 1030 - 12(utc and sgt timezone correction needed))
- [ ] items take long time to load (red line, schedule view events)

**MID priority**
- [ ] feedback route not found error
- [ ] feedback, task views not scaled properly

*Low Priority*
- [ ] highlight on wasting | hours have unrounded corners on mobile
- [ ] should have logo on landing page


# future extensions(after all tasks)
- [ ] voice input
- [ ] **Multi-day event support** - Currently events are only displayed on the day they start. For events that span across midnight (e.g., 11 PM Monday to 2 AM Tuesday), implement logic to show the event across multiple day columns. Implementation would use the commented-out `eventOccursOnDate()` function in `todo_ui/lib/utils/calendar.ts` to replace the current `isSameDate()` filtering in `WeekView.tsx` and `DayView.tsx`.
- [ ] Missed tasks rescheduling
- [ ] **Drag-and-drop for calendar events** - Implement drag-and-drop functionality to allow users to reschedule events by dragging them to different time slots or days. Would require:
  - Mouse event handlers (onDragStart, onDrag, onDragEnd) on event buttons
  - Visual feedback during drag (ghost element, drop zones)
  - Conflict detection when dropping
  - API calls to update event/task times on drop
- [ ] **Automatic conflict detection with scheduler invocation** - Implement conflict detection that triggers scheduler.py only when scheduling conflicts occur. Current state:
  - scheduler.py exists at `api/services/scheduler.py` with `schedule_study_sessions()` function
  - Not currently invoked anywhere in the codebase
  - Would require:
    - Conflict detection logic before task creation/update
    - Integration with scheduler.py to automatically reschedule conflicting tasks
    - Respect user's energy profile and break preferences during rescheduling


# implementation items:
- [ ] correct the rest of the api code to revolve around scheduler. (tz information in all time data, data structures)
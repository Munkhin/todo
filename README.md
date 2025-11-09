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

- [ ] **Drag-and-drop for calendar events** - Implement drag-and-drop functionality to allow users to reschedule events by dragging them to different time slots or days. Would require:
  - Mouse event handlers (onDragStart, onDrag, onDragEnd) on event buttons
  - Visual feedback during drag (ghost element, drop zones)
  - Conflict detection when dropping
  - API calls to update event/task times on drop

- [ ] smart preview on slot recommendation request: scroll to the day, dotted outline for a "shadow" task box preview.
    - [ ] need animation
    - [ ] need prompt engineering
    - [ ] need adjusting the recommend_slots function in agent.py


# implementation items:

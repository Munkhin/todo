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


# implementation items:
- [ ] correct the rest of the api code to revolve around scheduler. (tz information in all time data, data structures)
# TaskListView Layout Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Your Tasks                                                      │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Write research paper                                 50m        │
│  Due: 11/5/2025, 5:00:00 PM                      ┌──────────┐  │
│  Scheduled: 11/4/2025, 4:00:00 PM - 4:50:00 PM   │Scheduled │  │
│                                                   └──────────┘  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Study for math exam                              120m          │
│  Due: 11/6/2025, 9:00:00 AM                      ┌────────────┐│
│                                                   │Unscheduled ││
│                                                   └────────────┘│
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Complete coding assignment                       90m           │
│  Due: 11/5/2025, 11:59:00 PM                     ┌──────────┐  │
│  Scheduled: 11/4/2025, 7:00:00 PM - 8:30:00 PM   │Scheduled │  │
│                                                   └──────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Color Coding:

- **Scheduled tasks:**
  - Green text for "Scheduled: ..." line
  - Green badge with text "Scheduled"

- **Unscheduled tasks:**
  - No scheduled time shown
  - Gray badge with text "Unscheduled"

## Data Flow:

```
┌─────────────┐         ┌──────────────┐
│  TaskStore  │         │ScheduleStore │
│   (tasks)   │         │   (events)   │
└──────┬──────┘         └──────┬───────┘
       │                       │
       │                       │
       └───────┬───────────────┘
               │
               ▼
       ┌───────────────┐
       │ TaskListView  │
       │               │
       │ Maps task_id  │
       │ to events     │
       └───────────────┘
```

## Task Properties Displayed:

1. **Topic** (large, bold) - "Write research paper"
2. **Due date** (gray text) - "Due: 11/5/2025, 5:00:00 PM"
3. **Scheduled time** (green, conditional) - "Scheduled: 11/4/2025, 4:00:00 PM - 4:50:00 PM"
4. **Duration** (right side) - "50m"
5. **Status badge** (right side) - "Scheduled" or "Unscheduled"

# Timezone Handling Guide

## ⚙️ Best Practice Design

This codebase follows UTC-first timezone handling:

1. **Always store timestamps in UTC** (naive datetimes without tzinfo)
2. **Store user timezone** in `users.timezone` field (e.g., "Asia/Singapore", "America/Los_Angeles")
3. **Convert when displaying or scheduling**:
   - Convert UTC → user's timezone for display
   - Convert user input → UTC before saving

## Implementation

### Database Storage
- All `DateTime` columns store **naive UTC datetimes** (no tzinfo)
- Default values use `utc_now_naive()` from `api/utils/timezone`

```python
from api.utils.timezone import utc_now_naive

created_at = Column(DateTime, default=utc_now_naive)
```

### API Responses
- All datetime fields in API responses use **ISO 8601 with Z suffix**
- Format: `2025-11-07T09:00:00Z`

```python
from api.utils.timezone import naive_utc_to_iso_z

response_data = {
    "due_date": naive_utc_to_iso_z(task.due_date),
    "start_time": naive_utc_to_iso_z(event.start_time)
}
```

### Parsing User Input
- Frontend sends ISO 8601 strings (with or without timezone)
- Backend parses and converts to naive UTC

```python
from api.utils.timezone import parse_iso_to_utc_naive

# handles "2025-11-07T09:00:00Z", "2025-11-07T17:00:00+08:00", etc.
utc_naive = parse_iso_to_utc_naive(user_input_string)
```

## Utility Functions

All timezone utilities are in `api/utils/timezone.py`:

### `utc_now_naive() -> datetime`
Get current UTC time as naive datetime for database storage.

### `naive_utc_to_iso_z(dt: datetime) -> str`
Convert naive UTC datetime to ISO 8601 string with Z suffix.
- Input: naive datetime (assumed UTC)
- Output: `"2025-11-07T09:00:00Z"`

### `parse_iso_to_utc_naive(iso_string: str) -> datetime`
Parse ISO datetime string to naive UTC datetime for database storage.
- Handles timezone-aware: `"2025-11-07T17:00:00+08:00"`
- Handles UTC with Z: `"2025-11-07T09:00:00Z"`
- Handles naive: `"2025-11-07T09:00:00"` (assumes UTC)
- Output: naive datetime in UTC

## Examples

### Creating a Task
```python
# frontend sends ISO string (user's local time)
task_data = {
    "topic": "Study calculus",
    "due_date": "2025-11-10T23:59:00+08:00"  # Singapore time
}

# backend converts to naive UTC before saving
task.due_date = parse_iso_to_utc_naive(task_data["due_date"])
# stored as: 2025-11-10 15:59:00 (naive UTC)
```

### Returning a Task
```python
# database has naive UTC: 2025-11-10 15:59:00
# convert to ISO with Z for response
response = {
    "due_date": naive_utc_to_iso_z(task.due_date)
}
# returns: "2025-11-10T15:59:00Z"
```

### Frontend Display
```javascript
// frontend receives: "2025-11-10T15:59:00Z"
const dueDate = new Date("2025-11-10T15:59:00Z");

// display in user's local timezone (browser handles conversion)
console.log(dueDate.toLocaleString());
// in Singapore: "11/11/2025, 11:59:00 PM"
// in New York: "11/10/2025, 10:59:00 AM"
```

## User Timezone

The `users.timezone` field stores the user's timezone string:

```python
# get from frontend
user.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
// "Asia/Singapore", "America/New_York", etc.
```

This can be used for:
- Scheduling tasks at specific local times
- Displaying "smart" due dates ("today", "tomorrow")
- Sending notifications at appropriate local times

## Migration from Old Code

If you find any code using:
- `datetime.now()` without timezone → use `utc_now_naive()`
- `.isoformat()` on naive datetime → use `naive_utc_to_iso_z()`
- Manual timezone parsing → use `parse_iso_to_utc_naive()`

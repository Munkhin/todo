# Timezone Bug Analysis

## Problem
Calendar events display at wrong times due to timezone confusion.

## Root Cause
Database stores **naive datetimes** (no timezone info), but system treats them inconsistently:
- **On input**: Naive datetime from ISO string is stored as-is
- **On output**: Naive datetime is assumed to be UTC
- **Result**: User's local time gets misinterpreted as UTC

## Example
User in PST (UTC-8) creates event for "Nov 2, 9:00 PM local":

1. Frontend sends: `2025-11-02T21:00:00` (no timezone, user's local time)
2. Backend parses: `datetime.fromisoformat("2025-11-02T21:00:00")` → naive `2025-11-02 21:00:00`
3. Database stores: `2025-11-02 21:00:00` (naive, no timezone)
4. Serializer assumes UTC: `dt.replace(tzinfo=timezone.utc)` → `2025-11-02T21:00:00Z`
5. Frontend converts: `9 PM UTC = 1 PM PST` ❌ **WRONG!**

**Expected**: Event should display at 9 PM local time
**Actual**: Event displays at 1 PM local time (8 hours off)

## Current Code Issues

### 1. Naive Datetime Storage (models.py)
```python
start_time = Column(DateTime, nullable=False)  # No timezone info
end_time = Column(DateTime, nullable=False)
```

### 2. Naive Parsing (agent_tools.py:285)
```python
start_time=datetime.fromisoformat(start_time),  # Creates naive datetime
end_time=datetime.fromisoformat(end_time),
```

### 3. Incorrect UTC Assumption (_to_utc_iso in calendar_routes.py:62-65)
```python
if dt.tzinfo is None:
    # FastAPI parses ISO strings as naive UTC datetimes
    dt = dt.replace(tzinfo=timezone.utc)  # ❌ WRONG ASSUMPTION
```

## Solutions

### Option 1: Store User Timezone (Recommended)
Add `timezone` field to User model, convert local → UTC on input, UTC → local on output.

**Pros**: Accurate, handles DST, user can travel
**Cons**: Requires migration, frontend must send timezone

### Option 2: Assume Server Timezone
Treat all naive datetimes as server's local time.

**Pros**: Simple
**Cons**: Breaks if user in different timezone

### Option 3: Frontend Sends UTC
Frontend converts to UTC before sending, backend stores UTC, frontend converts back.

**Pros**: Backend stays simple
**Cons**: Frontend complexity, current implementation already does this poorly

## Recommended Fix

1. Add timezone to User model (default: "UTC")
2. Convert input times from user's TZ to UTC before storing
3. Convert output times from UTC to user's TZ before serializing
4. Update frontend to send timezone-aware ISO strings

## Files to Modify

- `api/models.py` - Add User.timezone field
- `api/routes/calendar_routes.py` - Convert TZ on input/output
- `api/services/agent_tools.py` - Use TZ-aware datetimes
- `api/services/scheduler.py` - Use TZ-aware datetimes
- Frontend: Send ISO strings with timezone offset (e.g., `2025-11-02T21:00:00-08:00`)

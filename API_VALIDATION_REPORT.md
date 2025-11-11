# API Endpoint Validation Report

Generated: 2025-11-11

## Summary

This report compares all frontend API calls against the backend API endpoints to identify mismatches.

## Backend API Endpoints (Actual)

### Auth Routes (`/api/auth`)
- ✓ POST `/api/auth/login`
- ✓ POST `/api/auth/logout`
- ✓ GET `/api/auth/google-oauth`
- ✓ GET `/api/auth/google-oauth/callback`
- ✓ GET `/api/auth/user`
- ✓ GET `/api/auth/status`
- ✓ GET `/api/auth/credits`
- ✓ POST `/api/auth/upgrade-plan`
- ✓ POST `/api/auth/register-nextauth-session`
- ✓ POST `/api/auth/update-timezone`

### User Routes (`/api/user`)
- ✓ POST `/api/user/me`

### Task Routes (`/api`)
- ✓ GET `/api/tasks`
- ✓ POST `/api/tasks`
- ✓ PUT `/api/tasks/{task_id}`
- ✓ DELETE `/api/tasks/{task_id}`

### Calendar Routes (`/api/calendar`)
- ✓ GET `/api/calendar/events`
- ✓ POST `/api/calendar/events`
- ✓ PUT `/api/calendar/events/{event_id}`
- ✓ DELETE `/api/calendar/events/{event_id}`

### Chat Routes (`/api/chat`)
- ✓ POST `/api/chat/`

### Subscription Routes (`/api`)
- ✓ GET `/api/users/{user_id}/subscription`
- ✓ GET `/api/users/{user_id}/credits`

---

## Frontend API Calls Analysis

### ✅ VALID Calls (Match Backend)

#### From `use-user-id.ts`
- ✓ POST `/api/user/me`

#### From `controllers/subscription.ts`
- ✓ GET `/api/users/{userId}/subscription`
- ✓ GET `/api/users/{userId}/credits`

#### From `controllers/model_response.ts`
- ✓ POST `/api/chat`

#### From `lib/api/tasks.ts`
- ✓ GET `/api/tasks`
- ✓ POST `/api/tasks`
- ✓ PUT `/api/tasks/{taskId}`
- ✓ DELETE `/api/tasks/{taskId}`

#### From `lib/api/calendar.ts`
- ✓ GET `/api/calendar/events`
- ✓ DELETE `/api/calendar/events/{eventId}`

---

## ❌ INVALID Calls (Missing Backend Endpoints)

### Tasks API (`lib/api/tasks.ts`)

#### ❌ GET `/api/tasks/{taskId}`
**Used in:** `lib/api/tasks.ts:77`
**Issue:** Backend doesn't have individual task retrieval endpoint
**Fix:** Need to add to backend or remove from frontend

#### ❌ POST `/api/tasks/{taskId}/complete`
**Used in:** `lib/api/tasks.ts:97`
**Issue:** Backend doesn't have task completion endpoint
**Fix:** Either add endpoint or use PUT `/api/tasks/{taskId}` with status update

---

### Calendar API (`lib/api/calendar.ts`)

#### ❌ POST `/api/calendar/manual-event`
**Used in:** `lib/api/calendar.ts:31`
**Backend has:** POST `/api/calendar/events`
**Fix:** Change frontend to use `/api/calendar/events`

#### ❌ PUT `/api/calendar/manual-event/{eventId}`
**Used in:** `lib/api/calendar.ts:40`
**Backend has:** PUT `/api/calendar/events/{event_id}`
**Fix:** Change frontend to use `/api/calendar/events/{eventId}`

---

### Subscription API (`lib/api/subscription.ts`)

#### ❌ GET `/api/subscription?user_id={userId}`
**Used in:** `lib/api/subscription.ts:11`
**Backend has:** GET `/api/users/{user_id}/subscription`
**Fix:** Change frontend to use `/api/users/{userId}/subscription`

#### ❌ POST `/api/subscription/change`
**Used in:** `lib/api/subscription.ts:15`
**Issue:** Backend doesn't have this endpoint
**Note:** Backend has `/api/auth/upgrade-plan` which might be the intended endpoint
**Fix:** Either add endpoint or use `/api/auth/upgrade-plan`

#### ❌ POST `/api/subscription/cancel`
**Used in:** `lib/api/subscription.ts:19`
**Issue:** Backend doesn't have subscription cancellation endpoint
**Fix:** Add backend endpoint or remove from frontend

---

### Settings/Energy Profile API (`lib/api/energyProfile.ts`)

#### ❌ GET `/api/settings/energy-profile?user_id={userId}`
**Used in:** `lib/api/energyProfile.ts:98`
**Issue:** Backend doesn't have settings/energy-profile endpoints
**Fix:** Add these endpoints to backend

#### ❌ POST `/api/settings/energy-profile?user_id={userId}`
**Used in:** `lib/api/energyProfile.ts:123`
**Issue:** Backend doesn't have settings/energy-profile endpoints
**Fix:** Add these endpoints to backend

---

### Auth/Timezone API (`lib/api/auth.ts`)

#### ❌ POST `/api/user/timezone`
**Used in:** `lib/api/auth.ts:4`
**Backend has:** POST `/api/auth/update-timezone`
**Fix:** Change frontend to use `/api/auth/update-timezone`

---

### Chat API (`lib/api/chat.ts`)

#### ❌ POST `/api/chat/message`
**Used in:** `lib/api/chat.ts:12`
**Backend has:** POST `/api/chat/`
**Fix:** Change frontend to use `/api/chat/` (root)

#### ❌ GET `/api/chat/history/{userId}`
**Used in:** `lib/api/chat.ts:19`
**Issue:** Backend doesn't have chat history endpoint
**Fix:** Add backend endpoint or remove from frontend

#### ❌ DELETE `/api/chat/history/{userId}`
**Used in:** `lib/api/chat.ts:23`
**Issue:** Backend doesn't have chat history deletion endpoint
**Fix:** Add backend endpoint or remove from frontend

#### ❌ POST `/api/chat/upload?user_id={userId}`
**Used in:** `lib/api/chat.ts:38`
**Issue:** Backend doesn't have file upload endpoint for chat
**Fix:** Add backend endpoint or remove from frontend

---

### Sync API (`lib/api/sync.ts`)

#### ❌ POST `/api/sync/gmail`
**Used in:** `lib/api/sync.ts:31`
**Issue:** Backend doesn't have sync endpoints
**Fix:** Add backend endpoints for sync functionality

#### ❌ POST `/api/sync/classroom`
**Used in:** `lib/api/sync.ts:36`
**Issue:** Backend doesn't have sync endpoints
**Fix:** Add backend endpoints for sync functionality

#### ❌ POST `/api/sync/all`
**Used in:** `lib/api/sync.ts:41`
**Issue:** Backend doesn't have sync endpoints
**Fix:** Add backend endpoints for sync functionality

#### ❌ GET `/api/sync/status?session_id={sessionId}`
**Used in:** `lib/api/sync.ts:50`
**Issue:** Backend doesn't have sync status endpoint
**Fix:** Add backend endpoint for sync status

---

### Schedule API (`lib/api/schedule.ts`)

#### ❌ POST `/api/schedule/run`
**Used in:** `lib/api/schedule.ts:44`
**Issue:** Backend doesn't have schedule endpoints
**Fix:** Add backend endpoints for scheduling functionality

#### ❌ POST `/api/schedule/preview`
**Used in:** `lib/api/schedule.ts:53`
**Issue:** Backend doesn't have schedule preview endpoint
**Fix:** Add backend endpoint for schedule preview

#### ❌ GET `/api/schedule/scheduled`
**Used in:** `lib/api/schedule.ts:67`
**Issue:** Backend doesn't have scheduled tasks retrieval endpoint
**Fix:** Add backend endpoint for retrieving scheduled tasks

#### ❌ DELETE `/api/schedule/clear`
**Used in:** `lib/api/schedule.ts:74`
**Issue:** Backend doesn't have schedule clearing endpoint
**Fix:** Add backend endpoint for clearing schedules

#### ❌ GET `/api/schedule/status`
**Used in:** `lib/api/schedule.ts:86`
**Issue:** Backend doesn't have schedule status endpoint
**Fix:** Add backend endpoint for schedule status

---

## Summary Statistics

- **Total Backend Endpoints:** 18
- **Total Frontend API Calls:** 38
- **Valid Calls:** 10 (26%)
- **Invalid Calls:** 28 (74%)

## Recommended Actions

### Priority 1 - Fix Path Mismatches (Quick Fixes)
These are simple path corrections where the functionality exists but paths don't match:

1. `lib/api/calendar.ts` - Update manual-event paths to use `/events`
2. `lib/api/subscription.ts` - Update subscription path to use `/users/{userId}/subscription`
3. `lib/api/auth.ts` - Update timezone path to use `/api/auth/update-timezone`
4. `lib/api/chat.ts` - Update message path to use `/api/chat/` instead of `/api/chat/message`

### Priority 2 - Add Missing Backend Endpoints
These features exist in frontend but need backend implementation:

1. **Settings/Energy Profile** - Add `/api/settings/energy-profile` GET & POST
2. **Task Operations** - Add GET `/api/tasks/{taskId}` and POST `/api/tasks/{taskId}/complete`
3. **Chat Features** - Add history, upload endpoints
4. **Sync Features** - Add all sync endpoints (gmail, classroom, all, status)
5. **Schedule Features** - Add all schedule endpoints (run, preview, scheduled, clear, status)
6. **Subscription Management** - Add change and cancel endpoints

### Priority 3 - Review & Remove Unused Features
Verify if these frontend features are actually used, if not, remove them:

1. Chat history functionality
2. Sync functionality (if not implemented yet)
3. Schedule functionality (if not implemented yet)
4. Subscription change/cancel (if using different approach)

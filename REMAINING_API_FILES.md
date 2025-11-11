# Remaining API Files After Cleanup

Generated: 2025-11-11

## Files Deleted ✂️
- ❌ `sync.ts` (52 lines)
- ❌ `schedule.ts` (88 lines)
- ❌ `chat.ts` (49 lines)

**Total Removed:** 189 lines of dead code

---

## Remaining API Files ✅

### 1. `client.ts` (1,993 bytes)
**Purpose:** Base API client with error handling

**Exports:**
- `api.get()` - GET requests
- `api.post()` - POST requests
- `api.put()` - PUT requests
- `api.delete()` - DELETE requests
- `APIError` class

**Status:** ✅ Core infrastructure - KEEP

---

### 2. `tasks.ts` (2,556 bytes)
**Purpose:** Task management operations

**Exports:**
- `listTasks()` - ✅ USED in hooks/use-tasks.ts
- `getTask()` - ❌ NOT USED (no backend endpoint)
- `createTask()` - ✅ USED in controllers/task.ts
- `updateTask()` - ✅ POTENTIALLY USED
- `deleteTask()` - ✅ POTENTIALLY USED
- `completeTask()` - ❌ NOT USED (no backend endpoint)

**Issues:**
- `getTask()` - calls `/api/tasks/{taskId}` (backend doesn't have this)
- `completeTask()` - calls `/api/tasks/{taskId}/complete` (backend doesn't have this)

**Recommendation:**
- Delete `getTask()` function
- Delete `completeTask()` function (use `updateTask()` with status instead)

**Status:** ⚠️ Needs cleanup of 2 unused functions

---

### 3. `calendar.ts` (1,280 bytes)
**Purpose:** Calendar event operations

**Exports:**
- `getEvents()` - ✅ USED in controllers/calendar.ts
- `createManualEvent()` - ❌ WRONG PATH (calls `/api/calendar/manual-event`)
- `updateManualEvent()` - ❌ WRONG PATH (calls `/api/calendar/manual-event/{id}`)
- `deleteEvent()` - ✅ CORRECT PATH (calls `/api/calendar/events/{id}`)

**Issues:**
- Backend has `/api/calendar/events` not `/api/calendar/manual-event`

**Recommendation:**
- Fix `createManualEvent()` to use `/api/calendar/events`
- Fix `updateManualEvent()` to use `/api/calendar/events/{eventId}`

**Status:** ⚠️ Needs path fixes

---

### 4. `subscription.ts` (634 bytes)
**Purpose:** Subscription management

**Exports:**
- `getSubscription()` - ❌ WRONG PATH (calls `/api/subscription`)
- `changePlan()` - ❌ NOT USED (calls `/api/subscription/change` - no backend)
- `cancelSubscription()` - ❌ NOT USED (calls `/api/subscription/cancel` - no backend)

**Issues:**
- Backend has `/api/users/{user_id}/subscription` not `/api/subscription`
- `changePlan()` and `cancelSubscription()` don't exist in backend

**Recommendation:**
- Fix `getSubscription()` to use `/api/users/${userId}/subscription`
- Delete `changePlan()` (backend has `/api/auth/upgrade-plan` instead)
- Delete `cancelSubscription()` (no backend endpoint)

**Status:** ⚠️ Needs path fix + deletion of 2 functions

---

### 5. `auth.ts` (355 bytes)
**Purpose:** User timezone management

**Exports:**
- `updateUserTimezone()` - ❌ WRONG PATH (calls `/api/user/timezone`)
- `detectTimezone()` - ✅ UTILITY FUNCTION (no API call)

**Issues:**
- Backend has `/api/auth/update-timezone` not `/api/user/timezone`

**Recommendation:**
- Fix `updateUserTimezone()` to use `/api/auth/update-timezone`

**Status:** ⚠️ Needs path fix

---

### 6. `energyProfile.ts` (4,305 bytes)
**Purpose:** User energy profile settings

**Exports:**
- `fetchEnergyProfile()` - ❌ NO BACKEND (calls `/api/settings/energy-profile`)
- `saveEnergyProfile()` - ❌ NO BACKEND (calls `/api/settings/energy-profile`)
- `normaliseResponse()` - ✅ UTILITY FUNCTION
- Types and interfaces

**Issues:**
- Backend has NO `/api/settings/energy-profile` endpoints
- Used by `hooks/use-settings.ts`

**Recommendation:**
- **OPTION 1:** Add backend endpoints for energy profile
- **OPTION 2:** Delete this file if feature not needed

**Status:** ⚠️ No backend implementation - decide to implement or remove

---

## Summary Statistics

### After Deletion:
- **Total Files:** 6 (down from 9)
- **Total Size:** ~11KB (down from ~15KB)
- **Dead Code Removed:** 189 lines

### Remaining Issues:
| File | Issue | Fix Required |
|------|-------|--------------|
| `tasks.ts` | 2 unused functions | Delete `getTask()`, `completeTask()` |
| `calendar.ts` | Wrong paths | Fix 2 endpoint paths |
| `subscription.ts` | Wrong paths + unused | Fix 1 path, delete 2 functions |
| `auth.ts` | Wrong path | Fix 1 endpoint path |
| `energyProfile.ts` | No backend | Add backend OR delete file |

---

## Next Steps

### Quick Wins (Path Fixes):
1. Fix `calendar.ts` - 2 path corrections
2. Fix `subscription.ts` - 1 path correction
3. Fix `auth.ts` - 1 path correction

### Function Deletions:
1. Delete from `tasks.ts`: `getTask()`, `completeTask()`
2. Delete from `subscription.ts`: `changePlan()`, `cancelSubscription()`

### Major Decision Needed:
1. **Energy Profile** - Implement backend OR delete `energyProfile.ts` + `use-settings.ts` hook

After these fixes, all remaining API files will be clean and match the backend exactly.

# Broken Modules Report - API Issues

Generated: 2025-11-11

## Summary

After path fixes, only **1 feature is broken** due to missing backend endpoints.

---

## 🔴 BROKEN - No Backend Implementation

### Settings / Energy Profile Feature

**User-Facing Impact:** Settings page will fail to load/save user preferences

**Component Chain:**
```
SettingsView.tsx
  ↓
useSettings() hook
  ↓
energyProfile.ts API
  ↓
❌ GET /api/settings/energy-profile (404 - endpoint doesn't exist)
❌ POST /api/settings/energy-profile (404 - endpoint doesn't exist)
```

**Files Involved:**
- `components/Settings/SettingsView.tsx` - Full settings UI (164 lines)
- `hooks/use-settings.ts` - React Query hook (137 lines)
- `lib/api/energyProfile.ts` - API client (125 lines)

**What This Feature Does:**
- Allows users to configure wake/sleep times
- Set min/max study duration
- Configure energy levels by hour of day
- Set break preferences (short/long breaks)
- Default due date settings

**Backend Endpoints Needed:**
1. `GET /api/settings/energy-profile?user_id={userId}`
   - Returns user's energy profile settings
   - Should return 404 if not found (frontend handles this)

2. `POST /api/settings/energy-profile?user_id={userId}`
   - Saves user's energy profile settings
   - Request body schema in `energyProfile.ts:109-121`

**Current Behavior:**
- Settings page loads with default values
- Save button will fail silently (API error)
- No data persistence

**Options:**
1. **Implement Backend** - Add energy profile endpoints to backend
2. **Remove Feature** - Delete all 3 files (426 lines total)

---

## ✅ WORKING - All Paths Fixed

### Subscription Feature
**Status:** ✅ All working after path fixes

**Used By:**
- `SubscriptionView.tsx` → `useSubscription()` → `getSubscription()` ✅
- `ScheduleView.tsx` → `SubscriptionController.getUsage()` ✅
- `pricing.tsx` → `useSubscription()` ✅

**Backend Endpoints:**
- ✅ `GET /api/users/{userId}/subscription` - WORKS
- ✅ `GET /api/users/{userId}/credits` - WORKS

**Unused Functions** (safe to delete):
- ❌ `changePlan()` - calls `/api/subscription/change` (no backend, not used)
- ❌ `cancelSubscription()` - calls `/api/subscription/cancel` (no backend, not used)

---

### Calendar Feature
**Status:** ✅ All working after path fixes

**Used By:**
- `ScheduleView.tsx` → calendar API functions ✅

**Backend Endpoints:**
- ✅ `GET /api/calendar/events` - WORKS
- ✅ `POST /api/calendar/events` - WORKS (fixed from `/manual-event`)
- ✅ `PUT /api/calendar/events/{id}` - WORKS (fixed from `/manual-event/{id}`)
- ✅ `DELETE /api/calendar/events/{id}` - WORKS

---

### Tasks Feature
**Status:** ✅ Core functionality working

**Used By:**
- `controllers/task.ts` → `createTask()`, `listTasks()` ✅
- `hooks/use-tasks.ts` → `listTasks()` ✅

**Backend Endpoints:**
- ✅ `GET /api/tasks` - WORKS
- ✅ `POST /api/tasks` - WORKS
- ✅ `PUT /api/tasks/{id}` - WORKS
- ✅ `DELETE /api/tasks/{id}` - WORKS

**Unused Functions** (safe to delete):
- ❌ `getTask()` - calls `/api/tasks/{id}` (no backend GET single, not used)
- ❌ `completeTask()` - calls `/api/tasks/{id}/complete` (no backend, not used)

---

### Chat Feature
**Status:** ✅ Working

**Used By:**
- `controllers/model_response.ts` → direct fetch to `/api/chat` ✅

**Backend Endpoint:**
- ✅ `POST /api/chat/` - WORKS

**Note:** The `lib/api/chat.ts` file was deleted (unused functions)

---

### Auth/User Feature
**Status:** ✅ Working after path fix

**Used By:**
- `hooks/use-user-id.ts` → `/api/user/me` ✅

**Backend Endpoints:**
- ✅ `POST /api/user/me` - WORKS
- ✅ `POST /api/auth/update-timezone` - WORKS (path fixed)

---

## 📊 Summary Statistics

### Working Features: 5/6 (83%)
- ✅ Subscription
- ✅ Calendar
- ✅ Tasks
- ✅ Chat
- ✅ Auth/User

### Broken Features: 1/6 (17%)
- 🔴 Settings/Energy Profile (no backend)

### Unused Functions to Delete: 4
- `tasks.ts`: `getTask()`, `completeTask()`
- `subscription.ts`: `changePlan()`, `cancelSubscription()`

---

## 🎯 Recommendations

### Priority 1 - Fix Broken Feature
**Option A: Implement Backend**
- Add 2 endpoints to backend: GET and POST `/api/settings/energy-profile`
- Frontend already handles all edge cases
- Schema is well-defined in `energyProfile.ts`

**Option B: Remove Feature**
- Delete 3 files (426 lines)
- Remove Settings tab from navigation
- Loss of user customization features

### Priority 2 - Clean Up Unused Functions
Delete these 4 unused functions to reduce confusion:
1. `tasks.ts:76` - `getTask()`
2. `tasks.ts:96` - `completeTask()`
3. `subscription.ts:14` - `changePlan()`
4. `subscription.ts:18` - `cancelSubscription()`

Total cleanup: ~30 lines

---

## Decision Required

**Settings/Energy Profile Feature:**
- [ ] Implement backend endpoints (recommended if feature is needed)
- [ ] Remove entire feature (if not needed)

This is the only blocking issue preventing 100% frontend-backend compatibility.

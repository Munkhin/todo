# Path Fixes Summary

Generated: 2025-11-11

## All Path Fixes Completed ✅

---

## 1. calendar.ts ✅

### Fixed: createManualEvent()
**Before:** `/api/calendar/manual-event`
**After:** `/api/calendar/events`
**Status:** ✅ Now matches backend POST `/api/calendar/events`

### Fixed: updateManualEvent()
**Before:** `/api/calendar/manual-event/${eventId}`
**After:** `/api/calendar/events/${eventId}`
**Status:** ✅ Now matches backend PUT `/api/calendar/events/{event_id}`

---

## 2. subscription.ts ✅

### Fixed: getSubscription()
**Before:** `/api/subscription?user_id=${userId}`
**After:** `/api/users/${userId}/subscription`
**Status:** ✅ Now matches backend GET `/api/users/{user_id}/subscription`

---

## 3. auth.ts ✅

### Fixed: updateUserTimezone()
**Before:** `/api/user/timezone`
**After:** `/api/auth/update-timezone`
**Status:** ✅ Now matches backend POST `/api/auth/update-timezone`

---

## Verification Results

All API paths now correctly match backend endpoints:

### calendar.ts:
- Line 20: `GET /api/calendar/events` ✅
- Line 31: `POST /api/calendar/events` ✅
- Line 40: `PUT /api/calendar/events/${eventId}` ✅
- Line 44: `DELETE /api/calendar/events/${eventId}` ✅

### subscription.ts:
- Line 11: `GET /api/users/${userId}/subscription` ✅

### auth.ts:
- Line 4: `POST /api/auth/update-timezone` ✅

---

## Remaining Issues (Not Path-Related)

### subscription.ts still has unused functions:
- Line 15: `changePlan()` - calls `/api/subscription/change` (no backend) - **DELETE**
- Line 19: `cancelSubscription()` - calls `/api/subscription/cancel` (no backend) - **DELETE**

These will be addressed in the next cleanup phase (function deletions).

---

## Summary

✅ **4 path fixes completed**
✅ **All fixed paths verified against backend**
✅ **Zero breaking changes** (only correcting wrong paths)
✅ **Ready to commit**

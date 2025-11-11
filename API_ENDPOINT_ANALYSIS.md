# API Endpoint Analysis - Frontend vs Backend

## Summary
- **Backend Endpoints:** 21 total
- **Frontend API Calls:** 33 total
- **Matching Endpoints:** 5
- **Mismatched/Missing Endpoints:** 28

---

## ✅ WORKING Endpoints (Frontend matches Backend)

1. **POST** `/api/user/me` - Get or create user
2. **GET** `/api/users/{userId}/credits` - Get user credits
3. **GET** `/api/calendar/events` - Get calendar events
4. **DELETE** `/api/calendar/events/{eventId}` - Delete calendar event
5. **POST** `/api/chat/` - Chat with AI agent

---

## ❌ BROKEN Endpoints (Frontend calls non-existent backend endpoints)

### Authentication/User (1 issue)
- ❌ **POST** `/api/user/timezone` (Frontend)
  - ✓ Backend has: **POST** `/api/auth/update-timezone`
  - **Fix:** Update frontend to use `/api/auth/update-timezone`
  - **Location:** `todo_ui/lib/api/auth.ts:4`, `todo_ui/app/dashboard/layout.tsx:23`

### Tasks Management (6 issues - ENTIRE MODULE MISSING)
All task endpoints are missing from backend:
- ❌ **GET** `/api/tasks` - List tasks
- ❌ **GET** `/api/tasks/{taskId}` - Get single task
- ❌ **POST** `/api/tasks` - Create task
- ❌ **PUT** `/api/tasks/{taskId}` - Update task
- ❌ **DELETE** `/api/tasks/{taskId}` - Delete task
- ❌ **POST** `/api/tasks/{taskId}/complete` - Complete task
- **Location:** `todo_ui/lib/api/tasks.ts`
- **Fix:** Implement complete tasks API in backend

### Calendar Events (2 issues)
- ❌ **POST** `/api/calendar/manual-event` (Frontend)
  - ✓ Backend has: **POST** `/api/calendar/events`
  - **Fix:** Update frontend to use `/api/calendar/events`
  - **Location:** `todo_ui/lib/api/calendar.ts:31`

- ❌ **PUT** `/api/calendar/manual-event/{eventId}` (Frontend)
  - ✓ Backend has: **PUT** `/api/calendar/events/{event_id}`
  - **Fix:** Update frontend to use `/api/calendar/events/{eventId}`
  - **Location:** `todo_ui/lib/api/calendar.ts:40`

### Chat/AI (4 issues)
- ❌ **POST** `/api/chat/message` - Send chat message
- ❌ **GET** `/api/chat/history/{userId}` - Get chat history
- ❌ **DELETE** `/api/chat/history/{userId}` - Clear chat history
- ❌ **POST** `/api/chat/upload` - Upload file for agent
- **Location:** `todo_ui/lib/api/chat.ts`
- **Fix:** Implement these endpoints in backend OR consolidate into existing `/api/chat/`

### Sync Operations (4 issues - ENTIRE MODULE MISSING)
- ❌ **POST** `/api/sync/gmail` - Sync Gmail tasks
- ❌ **POST** `/api/sync/classroom` - Sync Google Classroom
- ❌ **POST** `/api/sync/all` - Sync all sources
- ❌ **GET** `/api/sync/status` - Get sync status
- **Location:** `todo_ui/lib/api/sync.ts`
- **Fix:** Implement sync API endpoints in backend

### Scheduling (5 issues - ENTIRE MODULE MISSING)
- ❌ **POST** `/api/schedule/run` - Run scheduling algorithm
- ❌ **POST** `/api/schedule/preview` - Preview schedule
- ❌ **GET** `/api/schedule/scheduled` - Get scheduled tasks
- ❌ **DELETE** `/api/schedule/clear` - Clear auto-scheduled events
- ❌ **GET** `/api/schedule/status` - Get scheduling status
- **Location:** `todo_ui/lib/api/schedule.ts`
- **Fix:** Implement scheduling API endpoints in backend

### Settings/Energy Profile (2 issues - ENTIRE MODULE MISSING)
- ❌ **GET** `/api/settings/energy-profile` - Get energy profile
- ❌ **POST** `/api/settings/energy-profile` - Save energy profile
- **Location:** `todo_ui/lib/api/energyProfile.ts`
- **Fix:** Implement settings/energy profile endpoints in backend

### Subscription Management (3 issues - ENTIRE MODULE MISSING)
- ❌ **GET** `/api/subscription` - Get subscription details
- ❌ **POST** `/api/subscription/change` - Change plan
- ❌ **POST** `/api/subscription/cancel` - Cancel subscription
- **Location:** `todo_ui/lib/api/subscription.ts`
- **Fix:** Implement subscription endpoints OR use existing `/api/auth/upgrade-plan`

### Feedback (1 issue)
- ❌ **POST** `/api/feedback` - Submit feedback
- **Location:** `todo_ui/components/Feedback/FeedbackView.tsx:20`
- **Fix:** Implement feedback endpoint in backend

---

## 📋 Backend Endpoints NOT Used by Frontend

These exist in backend but are never called:
1. **GET** `/` - Root endpoint
2. **GET** `/health` - Health check
3. **GET** `/favicon.ico` - Favicon
4. **POST** `/api/auth/login` - Google OAuth login
5. **POST** `/api/auth/logout` - Logout
6. **GET** `/api/auth/google-oauth` - OAuth for calendar
7. **GET** `/api/auth/google-oauth/callback` - OAuth callback
8. **GET** `/api/auth/user` - Get user info
9. **GET** `/api/auth/status` - Check auth status
10. **GET** `/api/auth/credits` - Get credits (duplicate of `/api/users/{user_id}/credits`?)
11. **POST** `/api/auth/upgrade-plan` - Upgrade plan
12. **POST** `/api/auth/register-nextauth-session` - Register session

---

## 🎯 Recommended Actions

### Priority 1: Critical Fixes (Simple URL changes)
1. Update timezone endpoint: `/api/user/timezone` → `/api/auth/update-timezone`
2. Update manual event endpoint: `/api/calendar/manual-event` → `/api/calendar/events`

### Priority 2: Missing Backend Modules (Need implementation)
1. **Tasks API** - 6 endpoints (CORE FUNCTIONALITY)
2. **Scheduling API** - 5 endpoints
3. **Sync API** - 4 endpoints
4. **Extended Chat API** - 4 endpoints
5. **Settings/Energy Profile API** - 2 endpoints
6. **Subscription API** - 3 endpoints
7. **Feedback API** - 1 endpoint

### Priority 3: Architecture Review
- Review if NextAuth session registration is being used
- Consolidate duplicate credit endpoints
- Review if subscription endpoints should use existing upgrade-plan endpoint

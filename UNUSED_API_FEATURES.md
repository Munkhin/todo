# Unused API Features Report

Generated: 2025-11-11

## Summary

These API modules define endpoints but are **NOT USED ANYWHERE** in the frontend codebase.

---

## 🚫 UNUSED: Sync Endpoints

**File:** `todo_ui/lib/api/sync.ts`

### Functions Defined (Never Imported/Called):
- `syncGmail()` - POST `/api/sync/gmail`
- `syncClassroom()` - POST `/api/sync/classroom`
- `syncAll()` - POST `/api/sync/all`
- `getSyncStatus()` - GET `/api/sync/status`

### Backend Status:
❌ No matching backend endpoints exist

### Recommendation:
**DELETE** `todo_ui/lib/api/sync.ts` - This is dead code with no backend implementation.

---

## 🚫 UNUSED: Schedule Endpoints

**File:** `todo_ui/lib/api/schedule.ts`

### Functions Defined (Never Imported/Called):
- `runSchedule()` - POST `/api/schedule/run`
- `previewSchedule()` - POST `/api/schedule/preview`
- `getScheduledTasks()` - GET `/api/schedule/scheduled`
- `clearSchedule()` - DELETE `/api/schedule/clear`
- `getScheduleStatus()` - GET `/api/schedule/status`

### Backend Status:
❌ No matching backend endpoints exist

### Recommendation:
**DELETE** `todo_ui/lib/api/schedule.ts` - This is dead code with no backend implementation.

### Note:
If scheduling functionality is planned, these endpoints would need to be implemented in the backend first, but currently there's no UI consuming this API either.

---

## 🚫 UNUSED: Chat History/Upload Features

**File:** `todo_ui/lib/api/chat.ts`

### Functions Defined (Never Imported/Called):
- `sendChatMessage()` - POST `/api/chat/message`
- `getChatHistory()` - GET `/api/chat/history/{userId}`
- `clearChatHistory()` - DELETE `/api/chat/history/{userId}`
- `uploadChatFile()` - POST `/api/chat/upload`

### Backend Status:
- ❌ `/api/chat/message` - doesn't exist (backend has `/api/chat/` instead)
- ❌ `/api/chat/history/{userId}` - doesn't exist
- ❌ `/api/chat/upload` - doesn't exist

### What IS Used:
The frontend uses `controllers/model_response.ts` which calls `/api/chat` directly via fetch, bypassing this entire API module.

### Recommendation:
**DELETE** these unused functions from `todo_ui/lib/api/chat.ts`:
- `sendChatMessage()`
- `getChatHistory()`
- `clearChatHistory()`
- `uploadChatFile()`

Keep the types (ChatMessage, UploadFileResponse) if they're useful for documentation.

---

## Impact Analysis

### Files to Delete:
1. ✂️ `todo_ui/lib/api/sync.ts` (entire file - 52 lines)
2. ✂️ `todo_ui/lib/api/schedule.ts` (entire file - 88 lines)

### Functions to Delete from `todo_ui/lib/api/chat.ts`:
1. ✂️ `sendChatMessage()`
2. ✂️ `getChatHistory()`
3. ✂️ `clearChatHistory()`
4. ✂️ `uploadChatFile()`

### Total Cleanup:
- **~200+ lines of dead code**
- **0 breaking changes** (nothing uses these)
- **Cleaner codebase** with no confusion about which APIs exist

---

## Action Items

### Immediate Actions (No Risk):
1. Delete `todo_ui/lib/api/sync.ts`
2. Delete `todo_ui/lib/api/schedule.ts`
3. Remove unused functions from `todo_ui/lib/api/chat.ts`

### Future Considerations:
If sync/schedule features are planned:
1. Implement backend endpoints first
2. Build UI components that need them
3. Re-add API client functions as needed
4. Follow the working patterns from tasks/calendar APIs

---

## Verification Commands

```bash
# Confirm no imports of sync API
grep -r "from.*api/sync" todo_ui/ --include="*.ts" --include="*.tsx"

# Confirm no imports of schedule API
grep -r "from.*api/schedule" todo_ui/ --include="*.ts" --include="*.tsx"

# Confirm no usage of chat history/upload functions
grep -r "getChatHistory\|clearChatHistory\|uploadChatFile\|sendChatMessage" todo_ui/ --include="*.ts" --include="*.tsx"
```

All commands should return only the function definitions themselves, no actual usage.

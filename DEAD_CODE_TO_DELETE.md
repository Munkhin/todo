# Dead Code to Delete - API Functions

Generated: 2025-11-11

## Summary

**4 unused functions** remain in frontend API files that should be deleted.

---

## ❌ DEAD CODE: tasks.ts

### File: `todo_ui/lib/api/tasks.ts`

#### 1. getTask() - Lines 75-78
```typescript
export const getTask = async (taskId: string) => {
  return api.get<{ task: Task }>(`/api/tasks/${taskId}`);
};
```

**Status:** ❌ NOT USED ANYWHERE
**Backend:** ❌ No GET `/api/tasks/{taskId}` endpoint exists
**Search Results:** 0 imports, 0 calls
**Safe to Delete:** ✅ Yes

---

#### 2. completeTask() - Lines 95-98
```typescript
export const completeTask = async (taskId: string) => {
  return api.post<{ message: string }>(`/api/tasks/${taskId}/complete`);
};
```

**Status:** ❌ NOT USED ANYWHERE
**Backend:** ❌ No POST `/api/tasks/{taskId}/complete` endpoint exists
**Alternative:** Use `updateTask()` with `status: "completed"`
**Search Results:** 0 imports, 0 calls
**Safe to Delete:** ✅ Yes

---

#### 3. updateTask() - Lines 85-88
**Status:** ✅ NOT CURRENTLY USED but **KEEP**
**Reason:** Has matching backend endpoint, may be needed for future features

---

#### 4. deleteTask() - Lines 90-93
**Status:** ✅ NOT CURRENTLY USED but **KEEP**
**Reason:** Has matching backend endpoint, may be needed for future features

---

## ❌ DEAD CODE: subscription.ts

### File: `todo_ui/lib/api/subscription.ts`

#### 1. changePlan() - Lines 14-16
```typescript
export async function changePlan(userId: number, newPlan: Subscription['plan']) {
  return api.post<{ ok: boolean }>(`/api/subscription/change`, { user_id: userId, new_plan: newPlan })
}
```

**Status:** ❌ NOT USED ANYWHERE
**Backend:** ❌ No POST `/api/subscription/change` endpoint exists
**Note:** Backend has `/api/auth/upgrade-plan` instead
**Search Results:** 0 imports, 0 calls (only function definition)
**Safe to Delete:** ✅ Yes

---

#### 2. cancelSubscription() - Lines 18-20
```typescript
export async function cancelSubscription(userId: number) {
  return api.post<{ ok: boolean }>(`/api/subscription/cancel`, { user_id: userId })
}
```

**Status:** ❌ NOT USED ANYWHERE
**Backend:** ❌ No POST `/api/subscription/cancel` endpoint exists
**Search Results:** 0 imports, 0 calls (only function definition)
**Safe to Delete:** ✅ Yes

---

## ✅ WORKING CODE (Keep These)

### calendar.ts - ALL FUNCTIONS USED ✅
- ✅ `getEvents()` - Used in ScheduleView.tsx:51
- ✅ `createManualEvent()` - Used in ScheduleView.tsx:63
- ✅ `updateManualEvent()` - Used in ScheduleView.tsx:81
- ✅ `deleteEvent()` - Used in ScheduleView.tsx:97

### auth.ts - ALL FUNCTIONS USED ✅
- ✅ `updateUserTimezone()` - Used in dashboard/layout.tsx:23
- ✅ `detectTimezone()` - Utility function

### tasks.ts - CORE FUNCTIONS USED ✅
- ✅ `listTasks()` - Used in hooks/use-tasks.ts:21
- ✅ `createTask()` - Used in controllers/task.ts:6

### subscription.ts - CORE FUNCTION USED ✅
- ✅ `getSubscription()` - Used in hooks/use-subscription.ts:10

### energyProfile.ts - ALL FUNCTIONS USED ✅
- ✅ `fetchEnergyProfile()` - Used in hooks/use-settings.ts:72
- ✅ `saveEnergyProfile()` - Used in hooks/use-settings.ts:87

---

## 📊 Summary Statistics

### Dead Functions to Delete: 4
1. `tasks.ts:getTask()` - 4 lines
2. `tasks.ts:completeTask()` - 4 lines
3. `subscription.ts:changePlan()` - 3 lines
4. `subscription.ts:cancelSubscription()` - 3 lines

**Total Lines to Remove:** ~14 lines

### Impact:
- ✅ Zero breaking changes (nothing uses these)
- ✅ Reduces confusion about which APIs exist
- ✅ Cleaner codebase
- ✅ No backend endpoints for these anyway

---

## 🎯 Deletion Plan

### Step 1: Delete from tasks.ts
```typescript
// DELETE LINES 75-78
export const getTask = async (taskId: string) => {
  return api.get<{ task: Task }>(`/api/tasks/${taskId}`);
};

// DELETE LINES 95-98
export const completeTask = async (taskId: string) => {
  return api.post<{ message: string }>(`/api/tasks/${taskId}/complete`);
};
```

**After deletion, tasks.ts will have:**
- ✅ `listTasks()` - USED
- ✅ `createTask()` - USED
- ✅ `updateTask()` - AVAILABLE (has backend)
- ✅ `deleteTask()` - AVAILABLE (has backend)

---

### Step 2: Delete from subscription.ts
```typescript
// DELETE LINES 14-16
export async function changePlan(userId: number, newPlan: Subscription['plan']) {
  return api.post<{ ok: boolean }>(`/api/subscription/change`, { user_id: userId, new_plan: newPlan })
}

// DELETE LINES 18-20
export async function cancelSubscription(userId: number) {
  return api.post<{ ok: boolean }>(`/api/subscription/cancel`, { user_id: userId })
}
```

**After deletion, subscription.ts will have:**
- ✅ `getSubscription()` - USED
- ✅ `Subscription` interface - USED

---

## ✅ Verification Commands

After deletion, verify no broken imports:

```bash
# Should return no results
grep -r "getTask\|completeTask" todo_ui/ --include="*.ts" --include="*.tsx"

# Should return no results
grep -r "changePlan\|cancelSubscription" todo_ui/ --include="*.ts" --include="*.tsx"
```

---

## Final State

**After cleanup:**
- ✅ All remaining API functions are either used or have matching backend endpoints
- ✅ No dead code calling non-existent endpoints
- ✅ Clear 1:1 mapping between frontend API and backend routes
- ✅ Zero maintenance burden from unused code

**Files will be:**
- `tasks.ts`: 79 lines → ~71 lines (cleaner)
- `subscription.ts`: 21 lines → ~14 lines (cleaner)

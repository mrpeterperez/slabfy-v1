# Buying Desk: Auto-Archive on Close Implementation

**Date:** October 2, 2025  
**Status:** ✅ Production Ready

## Overview

Implemented clean, intuitive session lifecycle where closing a session automatically archives it, matching industry-standard UX patterns (Gmail, Slack, GitHub, etc.).

## The System

### Two Tabs
- **Active Tab**: All working sessions (status = active)
- **Archive Tab**: Completed/hidden sessions (archived = true)

### Two Paths to Archive

#### Path 1: Auto-Archive (Workflow Completion)
```
Active Status → Close Status → Auto-Archives
```
- User changes status to "Closed" in settings
- Backend automatically sets `archived = true`
- Toast shows: "Session closed & archived - moved to Archive tab"
- Session disappears from Active tab
- Appears in Archive tab with "Closed" badge

#### Path 2: Manual Archive (Cleanup)
```
Active Status → Manual Archive Action → Archived
```
- User clicks "Archive" in bulk actions or 3-dot menu
- Backend sets `archived = true` WITHOUT changing status
- Status remains "Active" (or whatever it was)
- Session moves to Archive tab
- Can be unarchived back to Active tab

### Delete Safety
- Delete only works on archived sessions
- Bulk delete validates `archived = true` before allowing deletion
- Provides clear error: "Session must be archived before deleting"

## Technical Implementation

### Backend Changes

**File:** `server/routes/buying-desk/sessions/service.ts`

```typescript
export async function updateSession(
  userId: string,
  sessionId: string,
  payload: UpdateSessionInput
): Promise<SessionSummary | null> {
  // ... existing validation ...

  if (payload.status !== undefined) {
    updates.status = payload.status;
    
    // Auto-archive when status changes to 'closed'
    if (payload.status === 'closed') {
      updates.archived = true;
    }
  }
  
  // ... rest of update logic ...
}
```

**Bulk Operations** (`server/routes/buying-desk/bulk.ts`):
- Archive/unarchive endpoints only modify `archived` flag
- Never touch `status` field
- Delete endpoint validates `archived = true` before allowing deletion

### Frontend Changes

**File:** `client/src/features/buying-desk-v0/components/sections/settings-section.tsx`

```typescript
const handleSave = async () => {
  await buyingDeskApi.sessions.update(sessionId, { status });
  
  // Show different message if closing (which auto-archives)
  if (status === 'closed') {
    toast({ 
      title: "Session closed & archived", 
      description: "This session has been moved to the Archive tab" 
    });
  } else {
    toast({ title: "Saved", description: "Session settings updated" });
  }
  
  // Invalidate queries to refresh lists
  qc.invalidateQueries({ queryKey: ["buying-desk", "session", sessionId] });
  qc.invalidateQueries({ queryKey: ["buying-desk", "sessions"] });
}
```

**Status Pill Guard** (`client/src/components/status/buy-session-status-pill.tsx`):
- Added runtime guard against invalid status values
- Defaults to "active" for any unrecognized status
- Prevents React crashes from stale/migrated data

## User Flows

### Happy Path: Close Session
1. User opens session settings
2. Changes status dropdown from "Active" to "Closed"
3. Clicks "Save"
4. Toast: "Session closed & archived"
5. Session disappears from Active tab
6. Session appears in Archive tab with "Closed" badge

### Alternative Path: Manual Archive
1. User selects sessions in Active tab
2. Clicks bulk "Archive" button
3. Sessions move to Archive tab
4. Status badges remain unchanged (still show "Active")
5. Can unarchive back to Active tab anytime

### Delete Path
1. User navigates to Archive tab
2. Selects archived sessions
3. Clicks bulk "Delete" button
4. Confirmation dialog appears
5. Sessions permanently deleted
6. Non-archived sessions show error: "Must be archived first"

## Data Model

```typescript
// buy_offers table
{
  status: 'active' | 'closed',  // Workflow state (tracking)
  archived: boolean,             // Visibility flag (filter)
}
```

**Key Insight:** Status and archived are independent but linked:
- Closing status → auto-sets archived = true
- Manual archive → leaves status unchanged
- This allows both automatic workflow and manual cleanup

## Business Logic Rules

1. **Status Change to 'Closed'** → Automatically archives
2. **Manual Archive** → Keeps status as-is
3. **Unarchive** → Moves back to Active tab (status unchanged)
4. **Delete** → Only allowed on archived sessions
5. **Bulk Operations** → Process each session independently with error tracking

## Why This Pattern Wins

### Matches Industry Standards
- **Gmail:** Inbox vs Archive (auto-archive on complete)
- **GitHub:** Open vs Closed (closed auto-hides)
- **Slack:** Active vs Archived (resolved threads auto-hide)
- **Notion:** Active vs Archived

### Reduces Cognitive Load
- One action (close) = clear result (hidden)
- No weird "closed but active" limbo state
- Archive tab is single source for all hidden sessions

### Flexible for Power Users
- Can manually archive active sessions (cleanup without closing)
- Can see why sessions are archived (status badge shows "Closed" vs "Active")
- Unarchive functionality preserves status

### Safe Deletion
- Two-step process: archive → delete
- No accidental permanent deletions
- Clear error messages for validation

## Migration Notes

**Database Migration Applied:** `simplify_buy_session_status.sql`
- Migrated old statuses to active/closed
- Added check constraint for only active/closed
- Set default to 'active'

**Component Guard:** BuySessionStatusPill now handles invalid status values gracefully, preventing crashes from stale data.

## Testing Checklist

- [x] Close status → session disappears from Active tab
- [x] Closed session → appears in Archive tab with "Closed" badge
- [x] Manual archive → moves to Archive tab with original status
- [x] Unarchive → returns to Active tab
- [x] Delete non-archived → shows error
- [x] Delete archived → succeeds
- [x] Bulk operations → process all with error tracking
- [x] Toast messages → clear feedback for all actions

## Files Modified

1. `server/routes/buying-desk/sessions/service.ts` - Auto-archive logic
2. `client/src/features/buying-desk-v0/components/sections/settings-section.tsx` - Toast messaging
3. `client/src/components/status/buy-session-status-pill.tsx` - Runtime guard
4. `migrations/simplify_buy_session_status.sql` - Status migration

## Files Verified (No Changes Needed)

1. `server/routes/buying-desk/bulk.ts` - Already correct (archive flag only)
2. Bulk operation hooks - Already handle partial failures correctly

---

**Result:** Dead simple, industry-standard session lifecycle with zero confusion! 🎯

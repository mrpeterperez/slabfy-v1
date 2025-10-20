# Bulk Operations Pattern

## Overview
This document describes the reusable bulk operations pattern implemented for consignments, designed for easy replication across other list features (collections, card shows, buying desk).

## Architecture

### Backend (Server)
- **Location**: `/server/routes/{feature}/bulk.ts`
- **Pattern**: Bulk endpoints with transaction-based operations and ownership verification
- **Endpoints**:
  - `PATCH /api/{feature}/bulk/archive` - Move multiple items to archived state
  - `PATCH /api/{feature}/bulk/unarchive` - Restore multiple items from archived
  - `DELETE /api/{feature}/bulk/delete` - Permanently delete (only archived items)

### Frontend Components

#### 1. Reusable Hook: `useBulkSelection`
**Location**: `/client/src/hooks/use-bulk-selection.ts`

Generic hook for managing checkbox selection state. Feature-agnostic.

```typescript
const bulkSelection = useBulkSelection();

// Available methods:
bulkSelection.selected          // Set<string> - selected IDs
bulkSelection.selectedCount     // number
bulkSelection.selectedIds       // string[]
bulkSelection.isSelected(id)    // Check if specific item selected
bulkSelection.toggle(id)        // Toggle single item
bulkSelection.selectAll(ids)    // Select all items
bulkSelection.clearSelection()  // Clear all selections
bulkSelection.isAllSelected(ids) // Check if all selected
bulkSelection.isSomeSelected(ids) // Check if some (not all) selected
```

#### 2. Reusable Component: `BulkActionBar`
**Location**: `/client/src/components/ui/bulk-action-bar.tsx`

Sticky bottom action bar that appears when items are selected.

```typescript
interface BulkAction {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
  loading?: boolean;
}

<BulkActionBar
  selectedCount={bulkSelection.selectedCount}
  onClearSelection={bulkSelection.clearSelection}
  actions={[
    {
      key: 'archive',
      label: `Archive (${count})`,
      icon: Archive,
      onClick: handleBulkArchive,
      variant: 'secondary',
      loading: isLoading,
    }
  ]}
/>
```

## Implementation Guide

### Step 1: Backend Bulk Endpoints

Create `/server/routes/{feature}/bulk.ts`:

```typescript
import { Router } from "express";
import { db } from "@/db";
import { {featureTable} } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

const router = Router();

// Bulk Archive
router.patch("/bulk/archive", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { {feature}Ids } = req.body;
  if (!Array.isArray({feature}Ids) || {feature}Ids.length === 0) {
    return res.status(400).json({ error: "Invalid {feature} IDs" });
  }

  try {
    const scopedDb = db.$withUser(userId);
    
    const updated = await scopedDb
      .update({featureTable})
      .set({ archived: true })
      .where(
        and(
          eq({featureTable}.userId, userId),
          inArray({featureTable}.id, {feature}Ids)
        )
      );

    res.json({ success: true, archivedCount: updated.changes });
  } catch (error) {
    console.error("Bulk archive error:", error);
    res.status(500).json({ error: "Failed to archive {features}" });
  }
});

// Bulk Delete (archived only)
router.delete("/bulk/delete", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { {feature}Ids } = req.body;
  if (!Array.isArray({feature}Ids) || {feature}Ids.length === 0) {
    return res.status(400).json({ error: "Invalid {feature} IDs" });
  }

  try {
    const scopedDb = db.$withUser(userId);
    
    // Verify all are archived before deletion
    const items = await scopedDb
      .select()
      .from({featureTable})
      .where(
        and(
          eq({featureTable}.userId, userId),
          inArray({featureTable}.id, {feature}Ids)
        )
      );

    const notArchived = items.filter(item => !item.archived);
    if (notArchived.length > 0) {
      return res.status(400).json({
        error: "Only archived {features} can be permanently deleted",
      });
    }

    let deletedCount = 0;
    for (const id of {feature}Ids) {
      try {
        await scopedDb
          .delete({featureTable})
          .where(
            and(
              eq({featureTable}.id, id),
              eq({featureTable}.userId, userId)
            )
          );
        deletedCount++;
      } catch (err) {
        console.error(`Failed to delete {feature} ${id}:`, err);
      }
    }

    res.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ error: "Failed to delete {features}" });
  }
});

export default router;
```

### Step 2: List Component Updates

Update your list component (e.g., `/client/src/features/my-{feature}/components/lists/{feature}-list.tsx`):

```typescript
import { Checkbox } from "@/components/ui/checkbox";

interface {Feature}ListProps {
  className?: string;
  archived?: boolean;
  // Bulk selection props
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
}

export default function {Feature}List({ 
  selectedIds,
  onToggleSelection,
  onSelectAll,
  isAllSelected,
  isSomeSelected,
  // ... other props
}: {Feature}ListProps) {
  // In table header:
  <thead>
    <tr>
      {onSelectAll && (
        <th className="w-12 p-3">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={() => onSelectAll(allIds)}
            aria-label="Select all"
          />
        </th>
      )}
      {/* other headers */}
    </tr>
  </thead>

  // In table rows:
  <tbody>
    {items.map(item => {
      const isSelected = selectedIds?.has(item.id);
      return (
        <tr key={item.id} className={isSelected ? 'ring-2 ring-primary' : ''}>
          {onToggleSelection && (
            <td className="w-12 p-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelection(item.id)}
              />
            </td>
          )}
          {/* other cells */}
        </tr>
      );
    })}
  </tbody>
}
```

### Step 3: Page Integration

Wire up bulk operations in your page component:

```typescript
import { useEffect, useMemo } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { 
  use{Feature}s, 
  useBulkArchive{Feature}s,
  useBulkUnarchive{Feature}s,
  useBulkDelete{Feature}s 
} from "../hooks/use-{features}";

export function {Feature}sPage() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: items = [] } = use{Feature}s(showArchived);
  
  // Bulk selection
  const allIds = useMemo(() => items.map(i => i.id), [items]);
  const bulkSelection = useBulkSelection();

  // Clear selection when switching tabs
  useEffect(() => {
    bulkSelection.clearSelection();
  }, [showArchived]);

  // Bulk mutations
  const bulkArchiveMutation = useBulkArchive{Feature}s();
  const bulkUnarchiveMutation = useBulkUnarchive{Feature}s();
  const bulkDeleteMutation = useBulkDelete{Feature}s();

  // Handlers
  const handleBulkArchive = async () => {
    await bulkArchiveMutation.mutateAsync(bulkSelection.selectedIds);
    bulkSelection.clearSelection();
  };

  const handleBulkUnarchive = async () => {
    await bulkUnarchiveMutation.mutateAsync(bulkSelection.selectedIds);
    bulkSelection.clearSelection();
  };

  const handleBulkDelete = async () => {
    if (confirm(`Permanently delete ${bulkSelection.selectedCount} item(s)?`)) {
      await bulkDeleteMutation.mutateAsync(bulkSelection.selectedIds);
      bulkSelection.clearSelection();
    }
  };

  return (
    <div>
      {/* Your page content */}
      
      <{Feature}List
        archived={showArchived}
        selectedIds={bulkSelection.selected}
        onToggleSelection={bulkSelection.toggle}
        onSelectAll={(ids) => {
          if (bulkSelection.isAllSelected(ids)) {
            bulkSelection.clearSelection();
          } else {
            bulkSelection.selectAll(ids);
          }
        }}
        isAllSelected={bulkSelection.isAllSelected(allIds)}
        isSomeSelected={bulkSelection.isSomeSelected(allIds)}
      />

      {/* Bulk Action Bar */}
      {bulkSelection.selectedCount > 0 && (
        <BulkActionBar
          selectedCount={bulkSelection.selectedCount}
          onClearSelection={bulkSelection.clearSelection}
          actions={
            showArchived
              ? [
                  {
                    key: 'restore',
                    label: `Restore (${bulkSelection.selectedCount})`,
                    icon: ArchiveRestore,
                    onClick: handleBulkUnarchive,
                    variant: 'default',
                    loading: bulkUnarchiveMutation.isPending,
                  },
                  {
                    key: 'delete',
                    label: `Delete (${bulkSelection.selectedCount})`,
                    icon: Trash2,
                    onClick: handleBulkDelete,
                    variant: 'destructive',
                    loading: bulkDeleteMutation.isPending,
                  },
                ]
              : [
                  {
                    key: 'archive',
                    label: `Archive (${bulkSelection.selectedCount})`,
                    icon: Archive,
                    onClick: handleBulkArchive,
                    variant: 'secondary',
                    loading: bulkArchiveMutation.isPending,
                  },
                ]
          }
        />
      )}
    </div>
  );
}
```

## Key Features

1. **Archive-First Deletion**: Only archived items can be bulk deleted (safety mechanism)
2. **Ownership Verification**: All bulk operations verify user ownership before execution
3. **Transaction-Based**: Bulk operations are atomic with proper error handling
4. **Cache Invalidation**: Mutations properly invalidate relevant React Query caches
5. **Loading States**: BulkActionBar shows loading spinners during operations
6. **Auto-Clear**: Selection clears on tab switch and after successful operations
7. **Reusable Components**: Both useBulkSelection and BulkActionBar are feature-agnostic

## Implementation Checklist

When adding bulk operations to a new feature:

- [ ] Backend bulk endpoints (`/server/routes/{feature}/bulk.ts`)
- [ ] Add `archived` boolean field to database schema if not exists
- [ ] API client functions (`bulkArchive`, `bulkUnarchive`, `bulkDelete`)
- [ ] React Query mutation hooks with cache invalidation
- [ ] Update list component interface to accept selection props
- [ ] Add checkbox column to table header and rows
- [ ] Wire useBulkSelection in page component
- [ ] Add BulkActionBar with appropriate actions
- [ ] Test archive → delete workflow
- [ ] Verify cache invalidation updates UI immediately

## Example Reference

See complete implementation in:
- Backend: `/server/routes/consignments/bulk.ts`
- Hooks: `/client/src/features/my-consignments/hooks/use-consignments.ts`
- List: `/client/src/features/my-consignments/components/lists/consignments-list.tsx`
- Page: `/client/src/features/my-consignments/pages/consignments-page.tsx`

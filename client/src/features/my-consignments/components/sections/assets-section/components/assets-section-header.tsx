// 🤖 INTERNAL NOTE:
// Purpose: Assets section header with search, filters and actions
// Exports: AssetsSectionHeader component
// Feature: my-consignments

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Plus, Search as SearchIcon } from 'lucide-react';
import { InventoryV2ColumnsPopover } from '@/features/events/components/event-detail/sections/inventory-management/inventory-v2-columns-popover';
import type { ColumnConfig, PendingSplitApply } from '../types';

interface AssetsSectionHeaderProps {
  filteredCount: number;
  totalCount: number;
  selectedCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  columnsOpen: boolean;
  onColumnsOpenChange: (open: boolean) => void;
  columns: ColumnConfig[];
  onToggleColumn: (key: string) => void;
  onResetColumns: () => void;
  showResetColumns: boolean;
  onAddAssets: () => void;
  pendingSplitApply: PendingSplitApply | null;
  onApplySplit: () => void;
  onDismissSplit: () => void;
  isApplyingSplit: boolean;
  previewCount: number;
  onScopeChange: (scope: 'smart' | 'selected' | 'all') => void;
  onBulkActions?: () => void;
}

export function AssetsSectionHeader({
  filteredCount,
  totalCount,
  selectedCount,
  searchQuery,
  onSearchChange,
  columnsOpen,
  onColumnsOpenChange,
  columns,
  onToggleColumn,
  onResetColumns,
  showResetColumns,
  onAddAssets,
  pendingSplitApply,
  onApplySplit,
  onDismissSplit,
  isApplyingSplit,
  previewCount,
  onScopeChange,
  onBulkActions,
}: AssetsSectionHeaderProps) {
  return (
    <div className="hidden lg:block border-b border-border px-8 py-3 min-h-[60px]">
      <div className="flex items-center justify-between gap-4 w-full">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Assets ({filteredCount}{filteredCount !== totalCount ? ` of ${totalCount}` : ''})
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <InventoryV2ColumnsPopover
            open={columnsOpen}
            onOpenChange={onColumnsOpenChange}
            columns={columns as any}
            onToggle={onToggleColumn}
            onReset={onResetColumns}
            showReset={showResetColumns}
          />
          <Button onClick={onAddAssets}>
            <Plus className="w-4 h-4 mr-2" />
            Add Assets
          </Button>
        </div>
      </div>
    </div>
  );
}
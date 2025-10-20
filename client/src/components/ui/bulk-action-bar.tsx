// 🤖 INTERNAL NOTE:
// Purpose: Reusable sticky bulk action bar that appears when items are selected
// Exports: BulkActionBar component
// Feature: shared/ui-patterns
// Dependencies: @/components/ui, lucide-react

import React from 'react';
import { Button } from '@/components/ui/button';
import { X, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface BulkAction {
  /**
   * Unique key for the action
   */
  key: string;
  
  /**
   * Display label for the action button
   */
  label: string;
  
  /**
   * Optional icon component from lucide-react
   */
  icon?: React.ComponentType<{ className?: string }>;
  
  /**
   * Click handler for the action
   */
  onClick: () => void;
  
  /**
   * Button variant (default, destructive, outline, etc.)
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  
  /**
   * Whether the action is currently disabled
   */
  disabled?: boolean;
  
  /**
   * Loading state for async operations
   */
  loading?: boolean;
}

export interface BulkActionBarProps {
  /**
   * Number of selected items
   */
  selectedCount: number;
  
  /**
   * Array of bulk actions to display
   */
  actions: BulkAction[];
  
  /**
   * Optional menu actions (shown in 3-dot menu)
   */
  menuActions?: BulkAction[];
  
  /**
   * Callback when clear selection button is clicked
   */
  onClearSelection: () => void;
  
  /**
   * Optional custom message (defaults to "{count} selected")
   */
  message?: string;
  
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Sticky bulk action bar that appears at the bottom when items are selected
 * Provides clear selection button and configurable action buttons
 * 
 * @example
 * ```tsx
 * <BulkActionBar
 *   selectedCount={selected.size}
 *   onClearSelection={clearSelection}
 *   actions={[
 *     {
 *       key: 'archive',
 *       label: 'Archive',
 *       icon: Archive,
 *       onClick: handleBulkArchive,
 *       variant: 'default'
 *     },
 *     {
 *       key: 'delete',
 *       label: 'Delete',
 *       icon: Trash2,
 *       onClick: handleBulkDelete,
 *       variant: 'destructive'
 *     }
 *   ]}
 * />
 * ```
 */
export function BulkActionBar({
  selectedCount,
  actions,
  menuActions,
  onClearSelection,
  message,
  className
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-card border border-border rounded-lg shadow-xl',
        'px-4 py-3 flex items-center gap-4',
        'animate-in slide-in-from-bottom-4 duration-300',
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {message || `${selectedCount} selected`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onClearSelection}
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Edit label */}
      <span className="text-sm text-muted-foreground">Edit:</span>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.key}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className="h-8"
            >
              {Icon && <Icon className="h-4 w-4 mr-1.5" />}
              {action.loading ? 'Processing...' : action.label}
            </Button>
          );
        })}
        
        {/* 3-dot menu for additional actions */}
        {menuActions && menuActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuActions.map((action) => (
                <DropdownMenuItem
                  key={action.key}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  className={cn(
                    action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                  )}
                >
                  {action.loading ? 'Processing...' : action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

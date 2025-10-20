// 🤖 INTERNAL NOTE:
// Purpose: Header component for consignment management pages with navigation and actions
// Exports: ConsignmentHeader component
// Feature: my-consignments
// Dependencies: @/components/ui, @/components/auth-provider, wouter

import { 
  Plus, 
  Save,
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Consignment, ConsignorWithContact } from '@shared/schema';
import { StatusPill, normalizeSimpleStatus } from "@/components/status";
import { ConsignmentStatusPill, type ConsignmentStatus } from "@/components/status/consignment-status-pill";

interface ConsignmentHeaderProps {
  consignment?: Consignment;
  consignor?: ConsignorWithContact;
  onAddAssets?: () => void;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
  isArchiving?: boolean;
  isUnarchiving?: boolean;
  isDeleting?: boolean;
}

export function ConsignmentHeader({ 
  consignment, 
  consignor, 
  onAddAssets, 
  hasUnsavedChanges, 
  isSaving,
  onArchive,
  onUnarchive,
  onDelete,
  isArchiving,
  isUnarchiving,
  isDeleting,
}: ConsignmentHeaderProps) {
  const consignmentTitle = consignment?.title || 'Loading...';
  const consignorName = consignor?.name || 'Unknown Consignor';
  const isArchived = Boolean((consignment as any)?.archived);
  const simpleStatus = normalizeSimpleStatus(isArchived ? 'archived' : 'active');

  return (
    <header className="bg-background border-b border-border">
      <div className="mx-auto px-4 sm:px-6 lg:px-4">
  <div className="flex h-12 items-center w-full">
          {/* Desktop Layout */}
          <div className="hidden md:contents">
      {/* Left - Consignment title (single line) */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h1 className="text-2xl font-heading font-bold text-foreground truncate" title={consignmentTitle}>
          {consignmentTitle}
        </h1>
        <ConsignmentStatusPill status={(consignment?.status as ConsignmentStatus) ?? "active"} size="sm" />
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <span className="truncate">Consignor: {consignorName}</span>
          <span className="mx-1">•</span>
          <span className="whitespace-nowrap">
            Created: {consignment ? new Date(consignment.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
          </span>
        </div>
      </div>

            {/* Right Side - Actions */}
            <div className="flex items-center space-x-2 flex-1 justify-end">
              {/* Actions menu (replaces ThemeToggle) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={!!(isArchiving || isUnarchiving || isDeleting)} aria-disabled={!!(isArchiving || isUnarchiving || isDeleting)}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isArchived ? (
                    <>
                      {onUnarchive && (
                        <DropdownMenuItem onClick={onUnarchive} disabled={!!isUnarchiving}>
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Restore
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive" disabled={!!isDeleting}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Permanently
                        </DropdownMenuItem>
                      )}
                    </>
                  ) : (
                    <>
                      {onArchive && (
                        <DropdownMenuItem onClick={onArchive} disabled={!!isArchiving}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Save Draft Button */}
              {hasUnsavedChanges && (
                <Button 
                  onClick={() => {}} 
                  variant="outline"
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
              )}

              {/* Add Assets Button */}
              {onAddAssets && (
                <Button 
                  onClick={onAddAssets} 
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Assets
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden flex items-center justify-between w-full">
            {/* Left - Consignment Info (left aligned) */}
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate flex items-center gap-2">
                <span className="truncate">{consignmentTitle}</span>
                <ConsignmentStatusPill status={(consignment?.status as ConsignmentStatus) ?? "active"} size="sm" />
              </h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Consignor: {consignorName}</span>
                <span>•</span>
                <span>Created: {consignment ? new Date(consignment.createdAt || Date.now()).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                }) : 'Today'}</span>
              </div>
            </div>

            {/* Right Side - Actions */}
            <div className="flex items-center space-x-2">
              {/* Actions menu (replaces ThemeToggle) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={!!(isArchiving || isUnarchiving || isDeleting)} aria-disabled={!!(isArchiving || isUnarchiving || isDeleting)}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isArchived ? (
                    <>
                      {onUnarchive && (
                        <DropdownMenuItem onClick={onUnarchive} disabled={!!isUnarchiving}>
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Restore
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive" disabled={!!isDeleting}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Permanently
                        </DropdownMenuItem>
                      )}
                    </>
                  ) : (
                    <>
                      {onArchive && (
                        <DropdownMenuItem onClick={onArchive} disabled={!!isArchiving}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Save Draft Button */}
              {hasUnsavedChanges && (
                <Button 
                  onClick={() => {}} 
                  variant="outline"
                  disabled={isSaving}
                  size="sm"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              )}

              {/* Add Assets Button */}
              {onAddAssets && (
                <Button 
                  onClick={onAddAssets} 
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
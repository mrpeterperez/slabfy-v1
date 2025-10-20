// 🤖 INTERNAL NOTE:
// Purpose: Main events page with filtering and responsive layout
// Exports: EventsPage component (default)
// Feature: events  
// Dependencies: @/components/layout/header, events table components, events hooks

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { RadixButton } from "@/components/ui/radix-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEvents, useBulkArchiveEvents, useBulkUnarchiveEvents, useBulkDeleteEvents } from "@/features/events/hooks/use-events";
import { EventsSummaryCards } from "./events/components/events-summary-cards";
import { EventsTable } from "./events/components/events-table";
import { AddEventDialog } from "@/features/events/components/add-event/add-event-dialog";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";

export function EventsPage() {
  usePageTitle("Shows");

  // state management
  const [addOpen, setAddOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("last-30-days");
  const [showArchived, setShowArchived] = useState(false);

  // data loading
  const { data: events, isLoading, error } = useEvents(showArchived);

  // Bulk selection
  const bulkSelection = useBulkSelection();

  // Clear selection when switching tabs
  useEffect(() => {
    bulkSelection.clearSelection();
  }, [showArchived]);

  // Bulk mutations
  const bulkArchiveMutation = useBulkArchiveEvents();
  const bulkUnarchiveMutation = useBulkUnarchiveEvents();
  const bulkDeleteMutation = useBulkDeleteEvents();

  // Bulk action handlers
  const handleBulkArchive = async () => {
    await bulkArchiveMutation.mutateAsync(bulkSelection.selectedIds);
    bulkSelection.clearSelection();
  };

  const handleBulkUnarchive = async () => {
    await bulkUnarchiveMutation.mutateAsync(bulkSelection.selectedIds);
    bulkSelection.clearSelection();
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to permanently delete ${bulkSelection.selectedCount} event(s)? This action cannot be undone.`)) {
      await bulkDeleteMutation.mutateAsync(bulkSelection.selectedIds);
      bulkSelection.clearSelection();
    }
  };

  // error handling
  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground mt-2">
        <main>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4">
            <div className="text-center text-destructive">
              Error loading events: {error?.message || "Unknown error"}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground mt-2">
      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 pb-48">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <h1 className="text-2xl font-heading font-semibold">Shows</h1>

            <div className="flex items-center gap-3 sm:ml-auto">
              {/* Time Filter */}
              {isLoading ? (
                <div className="h-9 w-40 rounded bg-muted animate-pulse" />
              ) : (
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="h-9 w-40 text-sm">
                    <SelectValue placeholder="Last 30 Days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                    <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                    <SelectItem value="all-time">All Time</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Add Button - Using RadixButton for modern glassy look */}
              <RadixButton
                size="icon"
                className="sm:hidden"
                aria-label="Add Show"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </RadixButton>
              <RadixButton className="hidden sm:inline-flex gap-2" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Show
              </RadixButton>
            </div>
          </div>

          {/* Summary Cards */}
          <EventsSummaryCards loading={isLoading} />

          {/* Active/Archived Tabs */}
          <div className="border-b bg-background mt-6">
            <nav className="flex overflow-x-auto scrollbar-hide">
              {[
                { id: 'active', label: 'Active' },
                { id: 'archived', label: 'Archived' }
              ].map((tab) => {
                const isActive = (tab.id === 'active' && !showArchived) || (tab.id === 'archived' && showArchived);
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setShowArchived(tab.id === 'archived')}
                    className={`
                      whitespace-nowrap py-2 px-4 text-md font-medium flex-shrink-0
                      ${
                        isActive
                          ? "border-b-4 border-primary text-primary"
                          : "text-muted-foreground hover:text-foreground hover:border-border"
                      }
                    `}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Events Table */}
          <EventsTable 
            events={events || []}
            loading={isLoading}
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
            isAllSelected={bulkSelection.isAllSelected(events?.map(e => e.id) || [])}
            isSomeSelected={bulkSelection.isSomeSelected(events?.map(e => e.id) || [])}
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
                        label: 'Restore',
                        icon: ArchiveRestore,
                        onClick: handleBulkUnarchive,
                        variant: "default",
                        loading: bulkUnarchiveMutation.isPending,
                      },
                      {
                        key: 'delete',
                        label: 'Delete Permanently',
                        icon: Trash2,
                        onClick: handleBulkDelete,
                        variant: "destructive",
                        loading: bulkDeleteMutation.isPending,
                      },
                    ]
                  : [
                      {
                        key: 'archive',
                        label: 'Archive',
                        icon: Archive,
                        onClick: handleBulkArchive,
                        variant: "secondary",
                        loading: bulkArchiveMutation.isPending,
                      },
                    ]
              }
            />
          )}

          {/* Add Event Dialog */}
          <AddEventDialog open={addOpen} onOpenChange={setAddOpen} />
        </div>
      </main>
    </div>
  );
}

// 🤖 INTERNAL NOTE:
// Purpose: Main consignments page with Active/Archived tabs and summary cards
// Exports: ConsignmentsPage component
// Feature: my-consignments
// Dependencies: ../components/lists, ../components/dialogs, ../hooks/use-consignments

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Settings, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { ConsignmentsList } from "../components/lists";
import { AddConsignmentDialog, ConsignmentSettingsDialog } from "../components/dialogs";
import { ConsignmentErrorBoundary } from "../components";
import { useConsignmentStats, useConsignments, useBulkArchiveConsignments, useBulkUnarchiveConsignments, useBulkDeleteConsignments } from "../hooks/use-consignments";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { MobilePageWrapper } from "@/components/layout/mobile-page-wrapper";

export function ConsignmentsPage() {
  const [addConsignmentOpen, setAddConsignmentOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("last-30-days");
  // Only two tabs: Active and Archived
  const [showArchived, setShowArchived] = useState(false);

  // Data (avoid double-fetch: list handles its own loading state)
  const { data: stats, isLoading: statsLoading } = useConsignmentStats();
  const { data: consignments = [] } = useConsignments(showArchived);
  const loading = statsLoading;

  // Bulk selection
  const allConsignmentIds = useMemo(() => consignments.map(c => c.id), [consignments]);
  const bulkSelection = useBulkSelection();

  // Clear selection when switching tabs
  useEffect(() => {
    bulkSelection.clearSelection();
  }, [showArchived]);

  // Event listener for floating (+) button
  useEffect(() => {
    const handleAddConsignment = () => setAddConsignmentOpen(true);
    window.addEventListener('slabfy:add-consignment', handleAddConsignment);
    return () => window.removeEventListener('slabfy:add-consignment', handleAddConsignment);
  }, []);

  // Bulk mutations
  const bulkArchiveMutation = useBulkArchiveConsignments();
  const bulkUnarchiveMutation = useBulkUnarchiveConsignments();
  const bulkDeleteMutation = useBulkDeleteConsignments();

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
    if (confirm(`Are you sure you want to permanently delete ${bulkSelection.selectedCount} consignment(s)? This action cannot be undone.`)) {
      await bulkDeleteMutation.mutateAsync(bulkSelection.selectedIds);
      bulkSelection.clearSelection();
    }
  };

  const fmtCurrency = useMemo(
    () => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }),
    []
  );

  const totalConsignmentValue = stats?.totalConsignmentValue ?? 0;
  const totalExpectedHouseShare = stats?.totalExpectedHouseShare ?? 0;
  const houseSharePercentage =
    totalConsignmentValue > 0 ? (totalExpectedHouseShare / totalConsignmentValue) * 100 : 0;
  const activeConsignments = stats?.activeConsignments ?? 0;

  // MVP Summary cards — identical shell in both states (skeleton vs values)
  const summaryCards = [
    {
      title: "Total Asset Value",
      value: fmtCurrency.format(totalConsignmentValue),
    },
    {
      title: "Expected House Share",
      value: `${fmtCurrency.format(totalExpectedHouseShare)} (${houseSharePercentage.toFixed(0)}%)`,
    },
    {
      title: "Active Consignments",
      value: String(activeConsignments),
    },
  ] as const;

  return (
    <MobilePageWrapper>
      <div className="mt-2 min-h-screen bg-background text-foreground">
        <main>
        {/* Use the SAME wrapper regardless of loading to avoid layout shifts */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 pb-48 space-y-6">
          {/* Header: responsive layout with proper mobile alignment */}
          <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            {/* Title with settings */}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold font-heading">Consignments</h1>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8 p-0 sm:inline-flex"
                title="Consignment Settings"
                disabled={loading}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Right side: Time Filter + Add Button */}
            <div className="flex items-center gap-3 sm:ml-auto">
              {/* Time Filter */}
              {loading ? (
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

              {/* Add Button */}
              <Button 
                onClick={() => setAddConsignmentOpen(true)} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Consignment
              </Button>
            </div>
          </div>

          {/* Summary Cards — responsive grid with better mobile spacing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {summaryCards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-8 bg-muted rounded animate-pulse" />
                  ) : (
                    <div className="text-2xl font-bold">{card.value}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ---------- Active/Archived Tabs ---------- */}
          <div className="border-b bg-background">
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

          {/* Consignments List — keep container; swap content only */}
          <ConsignmentErrorBoundary>
            {loading ? (
              <div className="h-96 bg-muted rounded animate-pulse" />
            ) : (
              <ConsignmentsList 
                archived={showArchived}
                selectedIds={bulkSelection.selected}
                onToggleSelection={bulkSelection.toggle}
                onSelectAll={(ids) => {
                  // Toggle: if all selected, clear; otherwise select all
                  if (bulkSelection.isAllSelected(ids)) {
                    bulkSelection.clearSelection();
                  } else {
                    bulkSelection.selectAll(ids);
                  }
                }}
                isAllSelected={bulkSelection.isAllSelected(allConsignmentIds)}
                isSomeSelected={bulkSelection.isSomeSelected(allConsignmentIds)}
              />
            )}
          </ConsignmentErrorBoundary>

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
        </div>
      </main>

      {/* Dialogs */}
      <AddConsignmentDialog
        isOpen={addConsignmentOpen}
        onClose={() => setAddConsignmentOpen(false)}
      />
      <ConsignmentSettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
    </MobilePageWrapper>
  );
}

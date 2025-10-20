// Purpose: Buying Desk v0 dashboard page with bulk operations
// Feature: buying-desk-v0

import React, { useMemo, useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Settings, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import AddOfferDialog from "../components/dialogs/add-offer-dialog";
import { SessionsListTable } from "../components/session/sessions-list";
import { useSessionsList } from "../hooks/use-sessions-list";
import { useSellersV0 as useSellers } from "../hooks/use-sellers";
import { BuyingDeskSettingsDialog } from "../components/dialogs/settings-dialog";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import {
  useBulkArchiveBuyingSessions,
  useBulkUnarchiveBuyingSessions,
  useBulkDeleteBuyingSessions,
} from "../hooks/use-offers";

export function BuyingDeskPageV0() {
  usePageTitle("Buying Desk");
  const [addOfferOpen, setAddOfferOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: buyOffers = [], isLoading: offersLoading } = useSessionsList({ archived: showArchived });
  // Sellers are optional context; don't block page render if they're slow/erroring
  const { data: sellers = [] } = useSellers();

  const loading = offersLoading;

  // Bulk selection
  const bulkSelection = useBulkSelection();

  // Clear selection when switching tabs
  useEffect(() => {
    bulkSelection.clearSelection();
  }, [showArchived]);

  // Bulk mutations
  const bulkArchiveMutation = useBulkArchiveBuyingSessions();
  const bulkUnarchiveMutation = useBulkUnarchiveBuyingSessions();
  const bulkDeleteMutation = useBulkDeleteBuyingSessions();

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
    if (
      confirm(
        `Are you sure you want to permanently delete ${bulkSelection.selectedCount} session(s)? This action cannot be undone.`
      )
    ) {
      await bulkDeleteMutation.mutateAsync(bulkSelection.selectedIds);
      bulkSelection.clearSelection();
    }
  };

  const { totalCartValue, totalExpectedProfit, profitPercentage, activeSessions } = useMemo(() => {
    const list = (Array.isArray(buyOffers) ? buyOffers : []) as any[];
    const totals = list.reduce(
      (acc, item) => {
        const cs = item?.cartSummary;
        acc.totalCartValue += Number(cs?.totalValue ?? 0);
        acc.totalExpectedProfit += Number(cs?.expectedProfit ?? 0);
        if (item?.buyOffer?.status === "active") acc.active += 1;
        return acc;
      },
      { totalCartValue: 0, totalExpectedProfit: 0, active: 0 }
    );
    const profitPct = totals.totalCartValue > 0 ? (totals.totalExpectedProfit / totals.totalCartValue) * 100 : 0;
    return {
      totalCartValue: totals.totalCartValue,
      totalExpectedProfit: totals.totalExpectedProfit,
      profitPercentage: profitPct,
      activeSessions: totals.active,
    };
  }, [buyOffers]);

  const fmtCurrency = useMemo(
    () => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }),
    []
  );

  const summaryCards = [
    { title: "Total Buy List Value", value: loading ? null : fmtCurrency.format(totalCartValue) },
    {
      title: "Expected Profit",
      value: loading ? null : `${fmtCurrency.format(totalExpectedProfit)} (${profitPercentage.toFixed(0)}%)`,
    },
    { title: "Active Sessions", value: loading ? null : `${activeSessions}` },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 space-y-6">
          <div className="mt-2 flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold font-heading">Buying Desk</h1>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8 p-0 sm:inline-flex"
                title="Buying Desk Settings"
                disabled={loading}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex sm:ml-auto">
              <Button onClick={() => setAddOfferOpen(true)} disabled={loading} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                New Session
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {summaryCards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
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

          {/* Active/Archived Tabs */}
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

          {loading ? (
            <div className="h-96 bg-muted rounded animate-pulse" />
          ) : (
            <SessionsListTable
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
              isAllSelected={bulkSelection.isAllSelected(buyOffers.map((o: any) => o.session.id))}
              isSomeSelected={bulkSelection.isSomeSelected(buyOffers.map((o: any) => o.session.id))}
            />
          )}

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
                        variant: "default",
                        loading: bulkArchiveMutation.isPending,
                      },
                    ]
              }
            />
          )}
        </div>
      </main>

      <AddOfferDialog isOpen={addOfferOpen} onClose={() => setAddOfferOpen(false)} />
      <BuyingDeskSettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default BuyingDeskPageV0;


// 🤖 INTERNAL NOTE:
// Purpose: Main Assets section component using modular hooks and components
// Exports: AssetsSection component
// Feature: my-consignments

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import ConsignmentAssetStatusTabs from '../../../consignment-asset-status-tabs';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Eye,
  Package,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreHorizontal,
  Trash2,
  Pencil,
  Search as SearchIcon,
  RefreshCw
} from 'lucide-react';
import type { ConsignmentWithDetails, ConsignorWithContact } from '@shared/schema';
import { SoldItemsTab } from './sold-items-tab';
import { 
  useAssetsSectionState, 
  useAssetMutations,
  useAssetsData,
  useAutoPricing,
  type SortColumn,
  type ConsignmentAssetData,
} from '../hooks';
import { AssetsSectionHeader } from './assets-section-header';
import { cn } from '@/lib/utils';
import { SalesDataStatus } from '@/components/ui/metrics/sales-data-status';
import { AssetSummary } from '@/components/asset/asset-summary';
import { ConfidenceIndicator } from '@/components/ui/metrics/confidence-indicator';
import { LiquidityIndicator } from '@/components/ui/metrics/liquidity-indicator';
import { AddConsignmentAssetModal } from '../../../dialogs';
import { InventoryV2ColumnsPopover } from '@/features/events/components/event-detail/sections/inventory-management/inventory-v2-columns-popover';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ConsignmentAssetStatusPill } from '@/components/status/consignment-asset-status-pill';
import { refreshSales } from '@shared/api/sales-refresh';
import { useQueryClient } from '@tanstack/react-query';
import { BulkActionBar, BulkAction } from '@/components/ui/bulk-action-bar';
import { BulkPricingSidePanel } from './bulk-pricing-side-panel';

interface AssetsSectionProps {
  consignment: ConsignmentWithDetails;
  consignor: ConsignorWithContact;
}

export function AssetsSection({ consignment, consignor }: AssetsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [pricingPanelOpen, setPricingPanelOpen] = useState(false);
  const [activePanelSection, setActivePanelSection] = useState<'all' | 'list-only' | 'reserve-only' | 'split-only' | 'status-only'>('all');

  // Use our modular hooks for state management
  const state = useAssetsSectionState(consignment);
  const mutations = useAssetMutations(consignment.id);
  
  // Use the data hook for assets and market data
  const data = useAssetsData(
    consignment.id,
    state.consignmentDefaultSplit,
    state.setConsignmentDefaultSplit,
    state.activeStatus,
    state.searchQuery
  );

  // Auto-pricing hook
  useAutoPricing({
    editableRows: data.editableRows,
    marketData: data.marketData,
    updateListPriceMutation: mutations.updateListPriceMutation,
    updateReserveMutation: mutations.updateReserveMutation,
  });

  // Sort the filtered data
  const sortedRows = useMemo(() => {
    return [...data.filteredRows].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (state.sortColumn) {
        case 'asset':
          aValue = `${a.playerName || ''} ${a.setName || ''}`.toLowerCase();
          bValue = `${b.playerName || ''} ${b.setName || ''}`.toLowerCase();
          break;
        case 'list':
          aValue = a.askingPrice || 0;
          bValue = b.askingPrice || 0;
          break;
        case 'reserve':
          aValue = a.reservePrice || 0;
          bValue = b.reservePrice || 0;
          break;
        case 'market':
          aValue = data.marketData?.[a.globalAssetId]?.averagePrice || 0;
          bValue = data.marketData?.[b.globalAssetId]?.averagePrice || 0;
          break;
        case 'split':
          aValue = Number(a.splitPercentage ?? state.consignmentDefaultSplit);
          bValue = Number(b.splitPercentage ?? state.consignmentDefaultSplit);
          break;
        case 'profit':
          const aMarket = data.marketData?.[a.globalAssetId]?.averagePrice || 0;
          const bMarket = data.marketData?.[b.globalAssetId]?.averagePrice || 0;
          const aSplit = Number(a.splitPercentage ?? state.consignmentDefaultSplit);
          const bSplit = Number(b.splitPercentage ?? state.consignmentDefaultSplit);
          aValue = aMarket * (100 - aSplit) / 100;
          bValue = bMarket * (100 - bSplit) / 100;
          break;
        case 'confidence':
          aValue = data.marketData?.[a.globalAssetId]?.confidence || 0;
          bValue = data.marketData?.[b.globalAssetId]?.confidence || 0;
          break;
        case 'liquidity':
          aValue = data.marketData?.[a.globalAssetId]?.liquidity || 'cold';
          bValue = data.marketData?.[b.globalAssetId]?.liquidity || 'cold';
          break;
        case 'days':
          aValue = a.addedAt ? Math.floor((Date.now() - new Date(a.addedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          bValue = b.addedAt ? Math.floor((Date.now() - new Date(b.addedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          break;
        case 'status':
          aValue = a.status || 'draft';
          bValue = b.status || 'draft';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return state.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return state.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data.filteredRows, state.sortColumn, state.sortDirection, data.marketData]);

  // Handle sort function
  const handleSort = (column: SortColumn) => {
    if (state.sortColumn === column) {
      state.setSortDirection(state.sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      state.setSortColumn(column);
      state.setSortDirection('asc');
    }
    // Exit edit mode when sorting by that column to reduce confusion
    if (['list','reserve','split','status'].includes(column as any)) {
      state.setEditCols(prev => { const n = new Set(prev); n.delete(column as any); return n; });
    }
  };

  // Handle item selection
  const handleSelectItem = (id: string) => {
    const newSelected = new Set(state.selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    state.setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      state.setSelectedItems(new Set(data.assets.map((asset) => asset.id)));
    } else {
      state.setSelectedItems(new Set());
    }
  };

  // Commit helpers for inline edits (simple & clean)
  const commitListPrice = (assetId: string, raw: string | number | null | undefined) => {
    const val = typeof raw === 'string' ? parseFloat(raw) : (raw ?? 0);
    if (!Number.isFinite(val)) return;
    mutations.updateListPriceMutation.mutate({ assetId, listPrice: Number(val) });
  };

  const commitReservePrice = (assetId: string, raw: string | number | null | undefined) => {
    const val = typeof raw === 'string' ? parseFloat(raw) : (raw ?? 0);
    if (!Number.isFinite(val)) return;
    mutations.updateReserveMutation.mutate({ assetId, reserve: Number(val) });
  };

  const commitSplit = (assetId: string, raw: string | number | null | undefined) => {
    const val = typeof raw === 'string' ? parseFloat(raw) : (raw ?? 0);
    if (!Number.isFinite(val) || val < 0 || val > 100) return;
    mutations.updateSplitMutation.mutate({ assetId, split: Number(val) });
  };

  const commitStatus = (assetId: string, status: string) => {
    if (!status) return;
    mutations.updateStatusMutation.mutate({ assetId, status });
    state.setStatusValues(prev => ({ ...prev, [assetId]: status }));
  };

  // Asset click handler
  const handleAssetClick = (asset: any) => {
    const url = `/assets/${asset.globalAssetId}?from=consignments`;
    window.open(url, '_blank');
  };

  // Delete handlers
  const handleDeleteAsset = (assetId: string, assetTitle: string) => {
    state.setDeleteDialog({
      open: true,
      assetId,
      assetTitle,
    });
  };

  // Manual refresh for a single consignment asset
  const handleRefreshSales = async (assetId: string) => {
    setRefreshing(prev => ({ ...prev, [assetId]: true }));
    try {
      toast({ title: 'Refreshing sales data...', description: 'Fetching latest marketplace data' });
      const res = await refreshSales(assetId, true);
      const newRecords = (res.new_records_added ?? res.savedCount ?? 0) as number;
      const total = (res.total_cached_records ?? res.totalSalesInDatabase ?? 0) as number;
      if (newRecords === 0) {
        toast({ title: 'Sales data up to date', description: `All ${total} sales records are current` });
      } else {
        toast({ title: 'Sales data refreshed', description: `Found ${newRecords} new records` });
      }
    } catch (error: any) {
      toast({ title: 'Refresh failed', description: error?.message || 'Unable to fetch fresh sales data', variant: 'destructive' });
    } finally {
      setRefreshing(prev => {
        const { [assetId]: _omit, ...rest } = prev;
        return rest;
      });
      // Invalidate market snapshot queries to refetch updated pricing
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === '/api/market'
      });
    }
  };

  const confirmDelete = () => {
    if (state.deleteDialog.assetId) {
      mutations.deleteAssetMutation.mutate(state.deleteDialog.assetId, {
        onSettled: () => {
          // Close dialog after mutation completes (success or error)
          state.setDeleteDialog({
            open: false,
            assetId: null,
            assetTitle: '',
          });
        }
      });
    } else {
      // No asset ID, just close dialog
      state.setDeleteDialog({
        open: false,
        assetId: null,
        assetTitle: '',
      });
    }
  };

  const confirmBulkDelete = () => {
    if (state.bulkDeleteDialog.assetIds.length > 0) {
      mutations.bulkDeleteMutation.mutate(state.bulkDeleteDialog.assetIds, {
        onSettled: () => {
          // Close dialog and clear selection after mutation completes
          state.setBulkDeleteDialog({
            open: false,
            assetIds: [],
            count: 0,
          });
          state.setSelectedItems(new Set());
        }
      });
    } else {
      // No assets selected, just close dialog
      state.setBulkDeleteDialog({
        open: false,
        assetIds: [],
        count: 0,
      });
    }
  };

  // Sortable header component
  const SortableHeader = ({ column, children, align = 'left', onToggleEdit, isEditing }: { 
    column: SortColumn; 
    children: React.ReactNode; 
    align?: 'left' | 'right'; 
    onToggleEdit?: () => void; 
    isEditing?: boolean;
  }) => (
    <th className={`px-3 py-3 ${align === 'right' ? 'text-right' : 'text-left'} text-sm font-medium text-muted-foreground whitespace-nowrap transition-colors`}>
      <div className={`flex items-center gap-2 w-full ${align === 'right' ? 'justify-end' : ''}`}>
        <button
          className={`inline-flex items-center gap-1 hover:text-foreground ${align === 'right' ? 'justify-end' : ''}`}
          onClick={() => handleSort(column)}
        >
          {children}
          {state.sortColumn === column ? (
            state.sortDirection === 'asc' ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )
          ) : (
            <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
        {onToggleEdit && (
          <>
            <button
              type="button"
              className={`h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted/50 ${isEditing ? 'bg-muted/70 text-foreground' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleEdit(); }}
              aria-label="Toggle column edit"
              title={isEditing ? 'Stop editing' : 'Edit column'}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {isEditing && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground/80">Editing</span>
            )}
          </>
        )}
      </div>
    </th>
  );

  const headerCheckboxChecked = state.selectedItems.size === data.assets.length;
  const headerCheckboxIndeterminate = state.selectedItems.size > 0 && state.selectedItems.size < data.assets.length;

  return (
    <div className="flex-1 min-w-0 w-full max-w-full h-full flex flex-col">
      {/* Toolbar header with controls - matches EventOrdersPage structure */}
      <div className="hidden lg:block border-b border-border px-8 py-4 min-h-[58px]">
        <div className="flex items-center justify-between gap-4 w-full">
          <h2 className="font-heading text-lg font-semibold text-foreground">Assets</h2>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={state.searchQuery}
                onChange={(e) => state.setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <InventoryV2ColumnsPopover
              open={state.columnsOpen}
              onOpenChange={state.setColumnsOpen}
              columns={state.columns as any}
              onToggle={state.toggleColumn}
              onReset={state.resetColumns}
              showReset={!state.isDefaultColumns}
            />
            <Button onClick={() => state.setShowAddAssetModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Assets
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Status Tabs */}
        <div className="border-b border-border">
          <div>
            <ConsignmentAssetStatusTabs
              value={state.activeStatus}
              onChange={state.setActiveStatus}
              counts={data.statusCounts}
            />
          </div>
        </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {data.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : state.activeStatus === 'sold' ? (
          <div className="p-6">
            <SoldItemsTab 
              assets={data.assets} 
              defaultSplit={Number(consignment.defaultSplitPercentage) || 80} 
            />
          </div>
        ) : data.assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No assets in this consignment</p>
            <p className="text-sm text-muted-foreground">
              Click "Add Assets" to add cards to this consignment.
            </p>
          </div>
        ) : (
          <div className="max-h-full overflow-auto">
            <table className="min-w-full divide-y-2 divide-border">
              <thead className="sticky top-0 bg-background border-b border-border z-10">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap w-12">
                    <Checkbox
                      checked={headerCheckboxChecked}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className="data-[state=indeterminate]:bg-primary/50"
                      style={{ 
                        ...(headerCheckboxIndeterminate && { opacity: 0.7 })
                      }}
                      ref={(checkbox) => {
                        if (checkbox) {
                          (checkbox as any).indeterminate = headerCheckboxIndeterminate;
                        }
                      }}
                    />
                  </th>
                  <SortableHeader column="asset">Asset</SortableHeader>
                  {state.visible.list && (
                    <SortableHeader column="list" align="right" onToggleEdit={() => state.toggleEditCol('list')} isEditing={state.editCols.has('list')}>List Price</SortableHeader>
                  )}
                  {state.visible.reserve && (
                    <SortableHeader column="reserve" align="right" onToggleEdit={() => state.toggleEditCol('reserve')} isEditing={state.editCols.has('reserve')}>Reserve</SortableHeader>
                  )}
                  {state.visible.market && <SortableHeader column="market" align="right">Market Price</SortableHeader>}
                  {state.visible.split && (
                    <SortableHeader column="split" align="right" onToggleEdit={() => state.toggleEditCol('split')} isEditing={state.editCols.has('split')}>Split %</SortableHeader>
                  )}
                  {state.visible.profit && <SortableHeader column="profit" align="right">House Cut</SortableHeader>}
                  {state.visible.confidence && <SortableHeader column="confidence" align="right">Confidence</SortableHeader>}
                  {state.visible.liquidity && <SortableHeader column="liquidity" align="right">Liquidity</SortableHeader>}
                  {state.visible.status && (
                    <SortableHeader column="status" align="right" onToggleEdit={() => state.toggleEditCol('status')} isEditing={state.editCols.has('status')}>Status</SortableHeader>
                  )}
                  {state.visible.days && <SortableHeader column="days" align="right">Days</SortableHeader>}
                  {state.visible.action && (
                    <th className="sticky right-0 bg-background px-3 py-3 text-right text-sm font-medium text-muted-foreground whitespace-nowrap">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {sortedRows.map((asset: ConsignmentAssetData) => {
                  const market = data.marketData?.[asset.globalAssetId] || {};
                  const averagePrice = market.averagePrice || 0;
                  const confidence = market.confidence || 0;
                  const salesCount = market.salesCount || 0;
                  const liquidity = (market.liquidity || 'cold') as 'fire' | 'hot' | 'warm' | 'cool' | 'cold';
                  
                  const isPendingPricing = data.pricingPending[asset.id] !== undefined;
                  
                  const currentStatus = state.statusValues[asset.id] ?? (asset.status || 'draft');

                  return (
                    <tr
                      key={asset.id}
                      className={cn(
                        "group transition-colors",
                        state.recentlyUpdated.has(asset.id) ? "bg-emerald-500/15" : "hover:bg-muted/25"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 whitespace-nowrap w-12">
                        <Checkbox
                          checked={state.selectedItems.has(asset.id)}
                          onCheckedChange={() => handleSelectItem(asset.id)}
                          aria-label={`Select ${asset.playerName} ${asset.setName}`}
                        />
                      </td>

                      {/* Asset */}
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-start gap-3">
                          <div className="h-auto w-10 rounded-sm bg-muted overflow-hidden flex-shrink-0">
                            {asset.psaImageFrontUrl ? (
                              <img src={asset.psaImageFrontUrl} alt="Card" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No Image</div>
                            )}
                          </div>
                          <button onClick={() => handleAssetClick(asset)} className="text-left min-w-0">
                            <AssetSummary
                              year={asset.year}
                              setName={asset.setName}
                              playerName={asset.playerName}
                              cardNumber={asset.cardNumber}
                              grade={asset.grade ?? undefined}
                              gradeCompany="PSA"
                              certNumber={asset.certNumber ?? undefined}
                              size="md"
                            />
                          </button>
                        </div>
                      </td>

                      {/* List Price */}
                      {state.visible.list && (
                        <td className={`px-3 whitespace-nowrap text-right ${state.editCols.has('list') ? 'py-2' : 'py-3'}`}>
                          {state.editCols.has('list') ? (
                            <div className="flex justify-end">
                              <Input
                                className="h-8 w-28 text-right"
                                inputMode="decimal"
                                value={state.priceInputs[asset.id] ?? (asset.askingPrice != null ? String(asset.askingPrice) : '')}
                                onChange={(e) => state.setPriceInputs(prev => ({ ...prev, [asset.id]: e.target.value }))}
                                onBlur={() => commitListPrice(asset.id, state.priceInputs[asset.id])}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitListPrice(asset.id, state.priceInputs[asset.id]);
                                  if (e.key === 'Escape') state.setPriceInputs(prev => ({ ...prev, [asset.id]: asset.askingPrice != null ? String(asset.askingPrice) : '' }));
                                }}
                                disabled={mutations.updateListPriceMutation.isPending}
                              />
                            </div>
                          ) : (
                            <div className="font-medium text-foreground text-sm">
                              ${asset.askingPrice ? Number(asset.askingPrice).toFixed(2) : '0.00'}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Reserve Price */}
                      {state.visible.reserve && (
                        <td className={`px-3 whitespace-nowrap text-right ${state.editCols.has('reserve') ? 'py-2' : 'py-3'}`}>
                          {state.editCols.has('reserve') ? (
                            <div className="flex justify-end">
                              <Input
                                className="h-8 w-28 text-right"
                                inputMode="decimal"
                                value={state.reserveInputs[asset.id] ?? (asset.reservePrice != null ? String(asset.reservePrice) : '')}
                                onChange={(e) => state.setReserveInputs(prev => ({ ...prev, [asset.id]: e.target.value }))}
                                onBlur={() => commitReservePrice(asset.id, state.reserveInputs[asset.id])}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitReservePrice(asset.id, state.reserveInputs[asset.id]);
                                  if (e.key === 'Escape') state.setReserveInputs(prev => ({ ...prev, [asset.id]: asset.reservePrice != null ? String(asset.reservePrice) : '' }));
                                }}
                                disabled={mutations.updateReserveMutation.isPending}
                              />
                            </div>
                          ) : (
                            <div className="font-medium text-foreground text-sm">
                              ${asset.reservePrice ? Number(asset.reservePrice).toFixed(2) : '0.00'}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Market Price */}
                      {state.visible.market && (
                        <td className="px-3 py-3 whitespace-nowrap text-right">
                          {isPendingPricing || data.isMarketDataLoading ? (
                            <div className="animate-pulse">
                              <div className="h-5 w-16 bg-muted/30 rounded mb-1"></div>
                              <div className="h-3 w-12 bg-muted/30 rounded"></div>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-foreground text-sm">
                                ${averagePrice > 0 ? averagePrice.toFixed(2) : '0.00'}
                              </div>
                              <SalesDataStatus
                                loading={Boolean(data.isMarketFetching && (isPendingPricing || !market || (averagePrice ?? 0) <= 0))}
                                salesCount={salesCount || 0}
                                minCount={1}
                                className="text-[11px]"
                              />
                            </>
                          )}
                        </td>
                      )}

                      {/* Split % */}
                      {state.visible.split && (
                        <td className={`px-3 whitespace-nowrap text-right ${state.editCols.has('split') ? 'py-2' : 'py-3'}`}>
                          {state.editCols.has('split') ? (
                            <div className="flex justify-end">
                              <Input
                                className="h-8 w-20 text-right"
                                inputMode="decimal"
                                value={state.splitInputs[asset.id] ?? (asset.splitPercentage != null ? String(asset.splitPercentage) : String(state.consignmentDefaultSplit))}
                                onChange={(e) => state.setSplitInputs(prev => ({ ...prev, [asset.id]: e.target.value }))}
                                onBlur={() => commitSplit(asset.id, state.splitInputs[asset.id])}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitSplit(asset.id, state.splitInputs[asset.id]);
                                  if (e.key === 'Escape') state.setSplitInputs(prev => ({ ...prev, [asset.id]: asset.splitPercentage != null ? String(asset.splitPercentage) : String(state.consignmentDefaultSplit) }));
                                }}
                                disabled={mutations.updateSplitMutation.isPending}
                              />
                            </div>
                          ) : (
                            <div className="font-medium text-foreground text-sm">
                              {Number(asset.splitPercentage ?? state.consignmentDefaultSplit).toFixed(1)}%
                            </div>
                          )}
                        </td>
                      )}

                      {/* House Cut */}
                      {state.visible.profit && (
                        <td className="px-3 py-3 whitespace-nowrap text-right">
                          <div className="font-medium text-foreground text-sm">
                            ${averagePrice > 0 ? ((averagePrice * (100 - Number(asset.splitPercentage ?? state.consignmentDefaultSplit))) / 100).toFixed(2) : '0.00'}
                          </div>
                        </td>
                      )}

                      {/* Confidence */}
                      {state.visible.confidence && (
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <div className="flex justify-center">
                            <ConfidenceIndicator value={confidence || 0} />
                          </div>
                        </td>
                      )}

                      {/* Liquidity */}
                      {state.visible.liquidity && (
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <div className="flex justify-center">
                            <LiquidityIndicator value={liquidity} showExitTime={false} />
                          </div>
                        </td>
                      )}

                      {/* Status */}
                      {state.visible.status && (
                        <td className={`px-3 whitespace-nowrap text-right ${state.editCols.has('status') ? 'py-2' : 'py-3'}`}>
                          {state.editCols.has('status') ? (
                            <div className="flex justify-end">
                              <Select
                                value={(state.statusValues[asset.id] ?? currentStatus) as string}
                                onValueChange={(v) => commitStatus(asset.id, v)}
                              >
                                <SelectTrigger className="h-8 w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end">
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="on_hold">On Hold</SelectItem>
                                  <SelectItem value="sold">Sold</SelectItem>
                                  <SelectItem value="returned">Returned</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <ConsignmentAssetStatusPill 
                                status={currentStatus as 'draft' | 'active' | 'on_hold' | 'sold' | 'returned'} 
                                size="sm" 
                              />
                            </div>
                          )}
                        </td>
                      )}

                      {/* Days */}
                      {state.visible.days && (
                        <td className="px-3 py-3 whitespace-nowrap text-right">
                          <div className="font-medium text-foreground text-sm">
                            {asset.addedAt ? Math.floor((Date.now() - new Date(asset.addedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                          </div>
                        </td>
                      )}

                      {/* Action */}
                      {state.visible.action && (
                        <td className="sticky right-0 bg-background px-3 py-3 whitespace-nowrap text-right">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAssetClick(asset)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Asset
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleRefreshSales(asset.id)}
                                  disabled={!!refreshing[asset.id] || Boolean(data.isMarketDataLoading)}
                                >
                                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing[asset.id] ? 'animate-spin' : ''}`} />
                                  Refresh Sales
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteAsset(asset.id, asset.title || `${asset.playerName} ${asset.setName}`)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddConsignmentAssetModal
        isOpen={state.showAddAssetModal}
        onClose={() => state.setShowAddAssetModal(false)}
        consignmentId={consignment.id}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={state.deleteDialog.open} onOpenChange={(open) => 
        state.setDeleteDialog({ ...state.deleteDialog, open })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset from Consignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{state.deleteDialog.assetTitle}" from this consignment? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => 
              state.setDeleteDialog({ open: false, assetId: null, assetTitle: '' })
            }>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={state.bulkDeleteDialog.open} onOpenChange={(open) => 
        state.setBulkDeleteDialog({ ...state.bulkDeleteDialog, open })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {state.bulkDeleteDialog.count} Assets</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {state.bulkDeleteDialog.count} asset{state.bulkDeleteDialog.count !== 1 ? 's' : ''} from this consignment? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => 
              state.setBulkDeleteDialog({ open: false, assetIds: [], count: 0 })
            }>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete {state.bulkDeleteDialog.count} Asset{state.bulkDeleteDialog.count !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom Action Bar */}
      {state.selectedItems.size > 0 && (
        <BulkActionBar
          selectedCount={state.selectedItems.size}
          onClearSelection={() => state.setSelectedItems(new Set())}
          actions={[
            {
              key: 'status',
              label: 'Status',
              onClick: () => {
                setActivePanelSection('status-only');
                setPricingPanelOpen(true);
              },
              variant: 'outline'
            },
            {
              key: 'list-price',
              label: 'List Price',
              onClick: () => {
                state.setBulkPriceMode('fixed');
                state.setBulkApplyList(true);
                state.setBulkApplyReserve(false);
                setActivePanelSection('list-only');
                setPricingPanelOpen(true);
              },
              variant: 'outline'
            }
          ]}
          menuActions={[
            {
              key: 'reserve',
              label: 'Reserve',
              onClick: () => {
                state.setBulkPriceMode('fixed');
                state.setBulkApplyList(false);
                state.setBulkApplyReserve(true);
                setActivePanelSection('reserve-only');
                setPricingPanelOpen(true);
              },
              variant: 'outline'
            },
            {
              key: 'split',
              label: 'Split %',
              onClick: () => {
                setActivePanelSection('split-only');
                setPricingPanelOpen(true);
              },
              variant: 'outline'
            },
            {
              key: 'delete',
              label: 'Delete',
              onClick: () => {
                const ids = Array.from(state.selectedItems);
                state.setBulkDeleteDialog({
                  open: true,
                  assetIds: ids,
                  count: ids.length
                });
              },
              variant: 'destructive'
            }
          ]}
        />
      )}

      {/* Bulk Pricing Side Panel */}
      <BulkPricingSidePanel
        isOpen={pricingPanelOpen}
        onClose={() => setPricingPanelOpen(false)}
        activeSection={activePanelSection}
        bulkPriceMode={state.bulkPriceMode}
        onPriceModeChange={state.setBulkPriceMode}
        marketListPct={state.marketListPct}
        onMarketListPctChange={state.setMarketListPct}
        marketReserveMode={state.marketReserveMode === 'percent' ? 'percentage' : 'match'}
        onMarketReserveModeChange={(mode) => state.setMarketReserveMode(mode === 'percentage' ? 'percent' : 'match')}
        marketReservePct={state.marketReservePct}
        onMarketReservePctChange={state.setMarketReservePct}
        listRoundStep={state.listRoundStep as 1 | 5 | 10}
        onListRoundStepChange={state.setListRoundStep}
        reserveRoundStep={state.reserveRoundStep as 1 | 5}
        onReserveRoundStepChange={state.setReserveRoundStep}
        bulkApplyList={state.bulkApplyList}
        onBulkApplyListChange={state.setBulkApplyList}
        bulkApplyReserve={state.bulkApplyReserve}
        onBulkApplyReserveChange={state.setBulkApplyReserve}
        bulkListPrice={parseFloat(state.bulkListPrice) || 0}
        onBulkListPriceChange={(value) => state.setBulkListPrice(value.toString())}
        bulkReservePrice={parseFloat(state.bulkReservePrice) || 0}
        onBulkReservePriceChange={(value) => state.setBulkReservePrice(value.toString())}
        bulkSplitPercentage={state.bulkSplitPercentage}
        onBulkSplitPercentageChange={state.setBulkSplitPercentage}
        bulkStatus={state.bulkStatus}
        onBulkStatusChange={state.setBulkStatus}
        onResetToDefaults={() => {
          // Reset values to consignment's configured pricing settings
          state.setMarketListPct(consignment.listPercentAboveMarket ?? 20); // List price % above market
          state.setMarketReserveMode((consignment.reserveStrategy === 'percentage' ? 'percent' : consignment.reserveStrategy) as 'match' | 'percent' ?? 'match');
          state.setMarketReservePct(consignment.reservePercentOfMarket ?? 100);
          state.setListRoundStep((consignment.listRounding as 1 | 5 | 10) ?? 5);
          state.setReserveRoundStep((consignment.reserveRounding as 1 | 5) ?? 1);
          state.setBulkSplitPercentage(Number(consignment.defaultSplitPercentage) || 95); // Seller split %
          toast({ title: "Reset to Defaults", description: "Pricing settings restored to consignment defaults" });
        }}
        onApply={async () => {
          const ids = Array.from(state.selectedItems);
          
          console.log('🔥 BULK APPLY DEBUG START:', {
            activeSection: activePanelSection,
            priceMode: state.bulkPriceMode,
            selectedCount: ids.length,
            selectedIds: ids,
            listPrice: state.bulkListPrice,
            reservePrice: state.bulkReservePrice,
            bulkApplyList: state.bulkApplyList,
            bulkApplyReserve: state.bulkApplyReserve,
            consignmentId: consignment.id
          });
          
          try {
            // Handle Status section - BULK UPDATE
            if (activePanelSection === 'status-only') {
              await mutations.bulkUpdateMutation.mutateAsync({ 
                assetIds: ids, 
                status: state.bulkStatus 
              });
              setPricingPanelOpen(false);
              state.setSelectedItems(new Set());
              return;
            }

            // Handle Split % section - BULK UPDATE
            if (activePanelSection === 'split-only') {
              await mutations.bulkUpdateMutation.mutateAsync({ 
                assetIds: ids, 
                split: state.bulkSplitPercentage 
              });
              setPricingPanelOpen(false);
              state.setSelectedItems(new Set());
              return;
            }

            // Handle list-only mode with FIXED pricing - BULK UPDATE
            if (activePanelSection === 'list-only' && state.bulkPriceMode === 'fixed') {
              console.log('✅ Using BULK UPDATE for list-only fixed pricing');
              const listPrice = parseFloat(state.bulkListPrice);
              console.log('📊 List price parsed:', { raw: state.bulkListPrice, parsed: listPrice, isValid: !isNaN(listPrice) && listPrice > 0 });
              
              if (!isNaN(listPrice) && listPrice > 0) {
                console.log('🚀 Calling bulkUpdateMutation with:', { assetIds: ids, listPrice });
                const result = await mutations.bulkUpdateMutation.mutateAsync({ 
                  assetIds: ids, 
                  listPrice 
                });
                console.log('✅ Bulk update result:', result);
              } else {
                console.error('❌ Invalid list price:', { raw: state.bulkListPrice, parsed: listPrice });
                toast({ 
                  title: "Invalid Price", 
                  description: "Please enter a valid price greater than 0",
                  variant: "destructive" 
                });
              }
              setPricingPanelOpen(false);
              state.setSelectedItems(new Set());
              return;
            }

            // Handle reserve-only mode with FIXED pricing - BULK UPDATE
            if (activePanelSection === 'reserve-only' && state.bulkPriceMode === 'fixed') {
              const reservePrice = parseFloat(state.bulkReservePrice);
              if (!isNaN(reservePrice) && reservePrice > 0) {
                await mutations.bulkUpdateMutation.mutateAsync({ 
                  assetIds: ids, 
                  reserve: reservePrice 
                });
              }
              setPricingPanelOpen(false);
              state.setSelectedItems(new Set());
              return;
            }

            // Handle 'all' section with FIXED pricing mode - BULK UPDATE
            if (activePanelSection === 'all' && state.bulkPriceMode === 'fixed') {
              const listPrice = parseFloat(state.bulkListPrice);
              const reservePrice = parseFloat(state.bulkReservePrice);
              
              const updates: any = {};
              if (!isNaN(listPrice) && listPrice > 0) updates.listPrice = listPrice;
              if (!isNaN(reservePrice) && reservePrice > 0) updates.reserve = reservePrice;
              
              if (Object.keys(updates).length > 0) {
                await mutations.bulkUpdateMutation.mutateAsync({ 
                  assetIds: ids, 
                  ...updates 
                });
              }
              setPricingPanelOpen(false);
              state.setSelectedItems(new Set());
              return;
            }

            // MARKET-BASED PRICING - group by calculated price then bulk update
            if (state.bulkPriceMode === 'market') {
              console.log('📊 Using GROUPED BULK UPDATES for market-based pricing');
              
              // Group assets by their calculated prices
              const listPriceGroups = new Map<number, string[]>();
              const reservePriceGroups = new Map<number, string[]>();
              
              for (const assetId of ids) {
                const asset = data.editableRows.find(a => a.id === assetId);
                if (!asset || !asset.globalAssetId) continue;
                
                const marketValue = data.marketData[asset.globalAssetId]?.averagePrice || 0;
                if (marketValue === 0) continue;
                
                // Calculate list price if enabled (list-only or all mode)
                if ((activePanelSection === 'list-only' || activePanelSection === 'all') && state.bulkApplyList) {
                  const listMultiplier = 1 + (state.marketListPct / 100);
                  let listPrice = marketValue * listMultiplier;
                  listPrice = Math.round(listPrice / state.listRoundStep) * state.listRoundStep;
                  
                  if (!listPriceGroups.has(listPrice)) {
                    listPriceGroups.set(listPrice, []);
                  }
                  listPriceGroups.get(listPrice)!.push(assetId);
                }
                
                // Calculate reserve price if enabled (reserve-only or all mode)
                if ((activePanelSection === 'reserve-only' || activePanelSection === 'all') && state.bulkApplyReserve) {
                  let reservePrice = 0;
                  if (state.marketReserveMode === 'match') {
                    reservePrice = marketValue;
                  } else {
                    const reserveMultiplier = state.marketReservePct / 100;
                    reservePrice = marketValue * reserveMultiplier;
                  }
                  reservePrice = Math.round(reservePrice / state.reserveRoundStep) * state.reserveRoundStep;
                  
                  if (!reservePriceGroups.has(reservePrice)) {
                    reservePriceGroups.set(reservePrice, []);
                  }
                  reservePriceGroups.get(reservePrice)!.push(assetId);
                }
              }
              
              // Execute bulk updates for each price group
              const promises: Promise<any>[] = [];
              
              // Bulk update assets with same list price
              Array.from(listPriceGroups.entries()).forEach(([listPrice, assetIds]) => {
                console.log(`💰 Bulk updating ${assetIds.length} assets to list price $${listPrice}`);
                promises.push(
                  mutations.bulkUpdateMutation.mutateAsync({ 
                    assetIds, 
                    listPrice 
                  })
                );
              });
              
              // Bulk update assets with same reserve price
              Array.from(reservePriceGroups.entries()).forEach(([reservePrice, assetIds]) => {
                console.log(`🔒 Bulk updating ${assetIds.length} assets to reserve $${reservePrice}`);
                promises.push(
                  mutations.bulkUpdateMutation.mutateAsync({ 
                    assetIds, 
                    reserve: reservePrice 
                  })
                );
              });
              
              await Promise.all(promises);
              
              const totalGroups = listPriceGroups.size + reservePriceGroups.size;
              toast({ 
                title: "Market-Based Pricing Applied", 
                description: `Updated ${ids.length} asset(s) with ${totalGroups} bulk operation(s)` 
              });
            }
            
            setPricingPanelOpen(false);
            state.setSelectedItems(new Set());
          } catch (error) {
            toast({
              title: "Error Applying Changes",
              description: error instanceof Error ? error.message : "Failed to update some assets",
              variant: "destructive"
            });
          }
        }}
      />
      </div>
    </div>
  );
}
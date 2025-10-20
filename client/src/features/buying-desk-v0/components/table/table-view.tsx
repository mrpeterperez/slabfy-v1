// 🤖 INTERNAL NOTE:
// Purpose: Pure presentation layer for buying desk table - no business logic
// Exports: TableView component
// Feature: buying-desk-v0
// Dependencies: UI components, table subcomponents

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeletons/table-skeleton";
import BuyingDeskStatusTabs, { type BuyingDeskStatus } from "../ui/status-tabs";
import { AddAssetsDialog } from "../dialogs/add-assets-dialog";
import { RevertPurchaseDialog } from "../dialogs/revert-purchase-dialog";
import { TableHeader } from "./table-header";
import { TableRow } from "./table-row";
import { BulkActionsBar } from "./bulk-actions-bar";
import type { 
  BuyingDeskAsset, 
  TableRow as TableRowData, 
  SortColumn, 
  SortDirection, 
  ColumnConfig 
} from "../../types/table";

interface TableViewProps {
  sessionId: string;
  search: string;
  onSearch: (value: string) => void;
  status: BuyingDeskStatus;
  onStatusChange: (status: BuyingDeskStatus) => void;
  statusCounts: Record<string, number>;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  setSortDirection: (direction: SortDirection) => void;
  columns: ColumnConfig[];
  updatePreferences: (columns: ColumnConfig[]) => void;
  rows: TableRowData[];
  isLoading: boolean;
  items: BuyingDeskAsset[];
  marketData: Record<string, any>;
  selected: Set<string>;
  editCols: Set<'list' | 'status'>;
  toggleEditCol: (col: 'list' | 'status') => void;
  handleSelect: (itemId: string, checked: boolean) => void;
  toggleSelectAll: (checked: boolean) => void;
  handleBulkMove: (targetStatus: 'evaluating' | 'buyList') => void;
  revertDialog: { open: boolean; targetStatus: 'evaluating' | 'buyList' | null };
  handleConfirmRevert: () => void;
  setRevertDialog: (dialog: { open: boolean; targetStatus: 'evaluating' | 'buyList' | null }) => void;
  handlePriceUpdate: (itemId: string, price: number, assetId?: string) => void;
  handleStatusChange: (itemId: string, newStatus: string) => void;
  handleRemoveFromSession: (itemId: string) => void;
}

export function TableView({
  sessionId,
  search,
  onSearch,
  status,
  onStatusChange,
  statusCounts,
  sortColumn,
  sortDirection,
  onSort,
  setSortDirection,
  columns,
  updatePreferences,
  rows,
  isLoading,
  items,
  marketData,
  selected,
  editCols,
  toggleEditCol,
  handleSelect,
  toggleSelectAll,
  handleBulkMove,
  revertDialog,
  handleConfirmRevert,
  setRevertDialog,
  handlePriceUpdate,
  handleStatusChange,
  handleRemoveFromSession
}: TableViewProps) {
  // State for Add Assets dialog
  const [addAssetsOpen, setAddAssetsOpen] = useState(false);
  // Derived state for table presentation
  const visible = {
    asset: true,
    list: true,
    market: true,
    profit: true,
    confidence: status !== 'purchased',
    liquidity: status !== 'purchased',
    seller: status === 'purchased',
    purchaseDate: status === 'purchased',
    paymentMethod: status === 'purchased',
    status: true,
  };

  const headerIds = rows.map(r => r.item.id);
  const allSelected = selected.size > 0 && headerIds.every(id => selected.has(id));
  const headerIndeterminate = selected.size > 0 && !allSelected && headerIds.some(id => selected.has(id));

  const setSort = useCallback((col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(col);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection, onSort, setSortDirection]);

  const formatCurrency = useCallback((n: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0), 
    []
  );

  const toggleColumn = useCallback((key: string) => {
    const newColumns = columns.map(c => 
      c.key === key && !c.locked ? { ...c, visible: !c.visible } : c
    );
    updatePreferences(newColumns);
  }, [columns, updatePreferences]);

  const resetColumns = useCallback(() => {
    const defaultColumns: ColumnConfig[] = [
      { key: 'asset', label: 'Asset', visible: true, locked: true },
      { key: 'list', label: 'Buy Price', visible: true },
      { key: 'market', label: 'Market Price', visible: true },
      { key: 'profit', label: 'Profit', visible: true },
      { key: 'confidence', label: 'Confidence', visible: true },
      { key: 'liquidity', label: 'Liquidity', visible: true },
      { key: 'seller', label: 'Seller', visible: false },
      { key: 'purchaseDate', label: 'Purchase Date', visible: false },
      { key: 'paymentMethod', label: 'Payment', visible: false },
      { key: 'status', label: 'Status', visible: true },
    ];
    updatePreferences(defaultColumns);
  }, [updatePreferences]);

  const handleAssetClick = useCallback((asset: any) => {
    if (!asset?.id) return;
    window.open(`/assets/${asset.id}?from=buying-desk&global=true`, '_blank');
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="hidden lg:block px-6 pb-0 border-border sticky top-0 border-b z-25 bg-background w-full max-w-full">
        <BuyingDeskStatusTabs value={status} onChange={onStatusChange} counts={statusCounts as any} />
      </div>

      <BulkActionsBar 
        selected={selected}
        onBulkMove={handleBulkMove}
      />

      <div className="hidden lg:block overflow-x-auto w-full max-w-full">
        <table className="min-w-full w-full text-sm">
          <TableHeader
            visible={visible}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={setSort}
            editCols={editCols}
            onToggleEditCol={toggleEditCol}
            status={status}
            allSelected={allSelected}
            headerIndeterminate={headerIndeterminate}
            onToggleSelectAll={toggleSelectAll}
          />
          <tbody className="divide-y divide-border bg-background">
            {isLoading ? (
              <TableSkeleton columns={['list', 'market', 'profit', 'status', 'actions']} />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-6 py-10 text-center text-muted-foreground">
                  No cards added yet. Scan some slabs to get started.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.item.id}
                  row={row}
                  visible={visible}
                  selected={selected.has(row.item.id)}
                  editCols={editCols}
                  marketData={marketData}
                  hasPendingPricing={false}
                  formatCurrency={formatCurrency}
                  onSelect={(checked) => handleSelect(row.item.id, checked)}
                  onAssetClick={() => handleAssetClick(row.asset)}
                  onPriceUpdate={handlePriceUpdate}
                  onStatusChange={handleStatusChange}
                  onMoveToCart={() => handleStatusChange(row.item.id, 'ready')}
                  onMoveToEvaluating={() => handleStatusChange(row.item.id, 'evaluating')}
                  onRemoveFromSession={() => handleRemoveFromSession(row.item.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddAssetsDialog 
        open={addAssetsOpen} 
        onOpenChange={setAddAssetsOpen} 
        sessionId={sessionId} 
      />
      
      <RevertPurchaseDialog
        open={revertDialog.open}
        onOpenChange={(open) => setRevertDialog({ ...revertDialog, open })}
        onConfirm={handleConfirmRevert}
        selectedCount={selected.size}
        purchasedCount={rows.filter(row => selected.has(row.item.id) && row.item.status === 'purchased').length}
      />
    </div>
  );
}
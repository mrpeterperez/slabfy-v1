// 🤖 INTERNAL NOTE:
// Purpose: Portfolio table component for v0 with sorting, selection, and actions
// Exports: PortfolioTableV0 component
// Feature: my-portfolio-v0
// Dependencies: react, @/components/ui, @shared/schema, ./hooks

import { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import type { Asset } from '@shared/schema';
import { useSortingV0 } from './hooks/use-sorting-v0';
import { useSelectionV0 } from './hooks/use-selection-v0';
import { PortfolioTableHeaderV0 } from './components/portfolio-table-header-v0';
import { PortfolioTableRowV0 } from './components/portfolio-table-row-v0';

interface PortfolioTableV0Props {
  assets: Asset[];
  isLoading?: boolean;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  visible?: Record<string, boolean>;
  mode?: 'portfolio' | 'collection';
  // Optional pricing data map keyed by globalAssetId
  marketMap?: Record<string, { averagePrice: number; confidence: number; liquidity: string; salesCount?: number }>;
  isPricingLoading?: boolean;
}

export function PortfolioTableV0({
  assets,
  isLoading = false,
  onEdit,
  onDelete,
  visible,
  mode = 'portfolio',
  marketMap,
  isPricingLoading,
}: PortfolioTableV0Props) {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { sortConfig, setSortConfig, sortedAssets } = useSortingV0(assets);
  const { selected, toggle, clear, selectAll, headerState } = useSelectionV0(assets);

  const show = useMemo(() => ({
    ownership: visible?.ownership ?? true,
    type: visible?.type ?? true,
    qty: visible?.qty ?? true,
    price: visible?.price ?? true,
    unrealized: visible?.unrealized ?? true,
    value: visible?.value ?? true,
    confidence: visible?.confidence ?? true,
    liquidity: visible?.liquidity ?? true,
    trend: visible?.trend ?? true,
  }), [visible]);

  const handleBulkDelete = () => {
    if (selected.size === 0 || !onDelete) return;
  // TODO(slabfy): replace system confirm with shadcn Dialog like contacts delete confirm
  const confirmed = window.confirm(`Are you sure you want to delete ${selected.size} asset${selected.size === 1 ? '' : 's'}?`);
    if (confirmed) {
      selected.forEach(id => {
        const asset = assets.find(a => a.id === id);
        if (asset) onDelete(asset);
      });
      clear();
      toast({
        title: 'Assets deleted',
        description: `${selected.size} asset${selected.size === 1 ? '' : 's'} deleted successfully.`
      });
    }
  };

  const handleAssetClick = (asset: Asset) => {
    const url = mode === 'collection' ? `/assets/${asset.id}?from=collections` : `/assets/${asset.id}`;
    window.open(url, '_blank');
  };

  if (assets.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium">No assets found</div>
          <div className="text-sm mt-1">Add assets to see them here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex-shrink-0 p-4 bg-muted/50 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selected.size} asset{selected.size === 1 ? '' : 's'} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clear}>
                Clear Selection
              </Button>
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  Delete Selected
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto border border-border rounded-md"
      >
        <table className="w-full">
          <PortfolioTableHeaderV0
            show={show}
            sortConfig={sortConfig}
            onSort={setSortConfig}
            headerState={headerState}
            onSelectAll={selectAll}
          />
          <tbody>
            {sortedAssets.map((asset) => (
              <PortfolioTableRowV0
                key={asset.id}
                asset={asset}
                show={show}
                isLoading={false}
                isPending={false}
                selected={selected.has(asset.id)}
                onToggle={() => toggle(asset.id)}
                onClickAsset={() => handleAssetClick(asset)}
                onEdit={onEdit}
                onDelete={onDelete}
                marketMap={marketMap}
                isPricingLoading={isPricingLoading}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
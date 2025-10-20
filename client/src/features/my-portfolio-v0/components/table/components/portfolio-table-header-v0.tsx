// 🤖 INTERNAL NOTE:
// Purpose: Portfolio table header component for v0 with sorting and selection
// Exports: PortfolioTableHeaderV0 component
// Feature: my-portfolio-v0
// Dependencies: react, @/components/ui, ./hooks/use-sorting-v0

import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { SortKeyV0, SortConfigV0 } from '../hooks/use-sorting-v0';

interface PortfolioTableHeaderV0Props {
  show: Record<string, boolean>;
  sortConfig: SortConfigV0 | null;
  onSort: (key: SortKeyV0) => void;
  headerState: { all: boolean; indeterminate: boolean };
  onSelectAll: (checked: boolean) => void;
}

export function PortfolioTableHeaderV0({
  show,
  sortConfig,
  onSort,
  headerState,
  onSelectAll
}: PortfolioTableHeaderV0Props) {
  const SortButton = ({ sortKey, children }: { sortKey: SortKeyV0; children: React.ReactNode }) => {
    const isActive = sortConfig?.key === sortKey;
    const direction = sortConfig?.direction;
    
    return (
      <Button
        variant="ghost"
        className="h-auto p-0 font-medium text-left justify-start hover:bg-transparent"
        onClick={() => onSort(sortKey)}
      >
        {children}
        {isActive && (
          <>
            {direction === 'asc' ? (
              <ChevronUp className="ml-1 h-3 w-3" />
            ) : (
              <ChevronDown className="ml-1 h-3 w-3" />
            )}
          </>
        )}
      </Button>
    );
  };

  return (
    <thead className="sticky top-0 bg-background border-b">
      <tr>
        {/* Selection */}
        <th className="w-12 p-4 text-left">
          <Checkbox
            checked={headerState.all}
            onCheckedChange={onSelectAll}
          />
        </th>

        {/* Asset */}
        <th className="p-4 text-left font-medium">
          <SortButton sortKey="asset">Asset</SortButton>
        </th>

        {/* Ownership */}
        {show.ownership && (
          <th className="p-4 text-left font-medium">
            <SortButton sortKey="ownership">Ownership</SortButton>
          </th>
        )}

        {/* Type */}
        {show.type && (
          <th className="p-4 text-left font-medium">
            <SortButton sortKey="type">Type</SortButton>
          </th>
        )}

        {/* Qty */}
        {show.qty && (
          <th className="p-4 text-left font-medium">
            <SortButton sortKey="qty">Qty</SortButton>
          </th>
        )}

        {/* Purchase Price */}
        {show.price && (
          <th className="p-4 text-left font-medium">
            <SortButton sortKey="price">Purchase Price</SortButton>
          </th>
        )}

        {/* Market Value */}
        {show.value && (
          <th className="p-4 text-left font-medium">
            <SortButton sortKey="value">Market Value</SortButton>
          </th>
        )}

        {/* Unrealized */}
        {show.unrealized && (
          <th className="p-4 text-left font-medium">
            <SortButton sortKey="unrealized">Unrealized</SortButton>
          </th>
        )}

        {/* Confidence */}
        {show.confidence && (
          <th className="p-4 text-left font-medium">
            <SortButton sortKey="confidence">Confidence</SortButton>
          </th>
        )}

        {/* Liquidity */}
        {show.liquidity && (
          <th className="p-4 text-left font-medium">
            <SortButton sortKey="liquidity">Liquidity</SortButton>
          </th>
        )}

        {/* Trend */}
        {show.trend && (
          <th className="p-4 text-left font-medium">
            <SortButton sortKey="trend">Trend</SortButton>
          </th>
        )}

        {/* Actions */}
        <th className="w-20 p-4 text-right font-medium">Actions</th>
      </tr>
    </thead>
  );
}
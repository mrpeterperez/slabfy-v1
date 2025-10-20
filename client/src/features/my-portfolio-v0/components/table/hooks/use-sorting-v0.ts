// 🤖 INTERNAL NOTE:
// Purpose: Sorting hook for portfolio v0 table with multiple sort keys
// Exports: useSortingV0 hook, SortKeyV0, SortConfigV0 types
// Feature: my-portfolio-v0
// Dependencies: react, @shared/schema

import { useMemo, useState } from 'react';
import type { Asset } from '@shared/schema';

export type SortKeyV0 = 'asset' | 'ownership' | 'value' | 'confidence' | 'type' | 'qty' | 'price' | 'roi' | 'unrealized' | 'trend' | 'liquidity';

export interface SortConfigV0 { 
  key: SortKeyV0; 
  direction: 'asc' | 'desc'; 
}

export function useSortingV0(assets: Asset[]) {
  const [sortConfig, setSortConfig] = useState<SortConfigV0 | null>(null);

  const sortedAssets = useMemo(() => {
    if (!sortConfig) return assets;
    
    return [...assets].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortConfig.key) {
        case 'asset':
          aValue = `${a.playerName} ${a.year} ${a.setName}`.toLowerCase();
          bValue = `${b.playerName} ${b.year} ${b.setName}`.toLowerCase();
          break;
        case 'ownership':
          aValue = a.ownershipStatus || '';
          bValue = b.ownershipStatus || '';
          break;
        case 'value':
          // Simple fallback to purchase price for v0
          aValue = parseFloat(a.purchasePrice?.toString() || '0');
          bValue = parseFloat(b.purchasePrice?.toString() || '0');
          break;
        case 'confidence':
          aValue = 0; // Placeholder for v0
          bValue = 0;
          break;
        case 'type':
          aValue = a.type || '';
          bValue = b.type || '';
          break;
        case 'qty':
          aValue = 1;
          bValue = 1;
          break;
        case 'price':
          aValue = parseFloat(a.purchasePrice?.toString() || '0');
          bValue = parseFloat(b.purchasePrice?.toString() || '0');
          break;
        case 'roi':
          aValue = 0; // Placeholder for v0
          bValue = 0;
          break;
        case 'unrealized':
          aValue = 0; // Placeholder for v0
          bValue = 0;
          break;
        case 'trend':
          aValue = 0; // Placeholder for v0
          bValue = 0;
          break;
        case 'liquidity':
          aValue = 0; // Placeholder for v0
          bValue = 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [assets, sortConfig]);

  const handleSort = (key: SortKeyV0) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  return {
    sortConfig,
    setSortConfig: handleSort,
    sortedAssets,
  };
}
// 🤖 INTERNAL NOTE:
// Purpose: Filter context provider for portfolio v0 with type, ownership, and grade filters
// Exports: FilterProviderV0 component, useFiltersV0 hook
// Feature: my-portfolio-v0
// Dependencies: react context, @shared/schema

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import type { Asset } from '@shared/schema';

interface FiltersContextV0 {
  // Filter states
  typeFilter: string[];
  ownershipFilter: string[];
  gradeFilter: string[];
  
  // Filter setters
  setTypeFilter: (types: string[]) => void;
  setOwnershipFilter: (ownership: string[]) => void;
  setGradeFilter: (grades: string[]) => void;
  
  // Utilities
  clearFilters: () => void;
  activeCount: number;
  filterAssets: (assets: Asset[]) => Asset[];
}

const FiltersContextV0 = createContext<FiltersContextV0 | null>(null);

interface FilterProviderV0Props {
  children: ReactNode;
}

export function FilterProviderV0({ children }: FilterProviderV0Props) {
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [ownershipFilter, setOwnershipFilter] = useState<string[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string[]>([]);

  const activeCount = useMemo(() => {
    return typeFilter.length + ownershipFilter.length + gradeFilter.length;
  }, [typeFilter.length, ownershipFilter.length, gradeFilter.length]);

  const clearFilters = () => {
    setTypeFilter([]);
    setOwnershipFilter([]);
    setGradeFilter([]);
  };

  const filterAssets = useMemo(() => {
    return (assets: Asset[]) => {
      return assets.filter((asset) => {
        const ownership = asset.ownershipStatus || 'own';

        // Hide sold assets by default unless explicitly included in ownership filter
        if (ownership === 'sold' && !ownershipFilter.includes('sold')) {
          return false;
        }

        // Type filter
        if (typeFilter.length > 0) {
          const assetType = asset.type || '';
          if (!typeFilter.includes(assetType)) return false;
        }

        // Ownership filter 
        if (ownershipFilter.length > 0) {
          if (!ownershipFilter.includes(ownership)) return false;
        }

        // Grade filter
        if (gradeFilter.length > 0) {
          if (!asset.grade || !asset.grader) return false;
          const assetGradeLabel = `${asset.grader} ${asset.grade}`;
          if (!gradeFilter.includes(assetGradeLabel)) return false;
        }

        return true;
      });
    };
  }, [typeFilter, ownershipFilter, gradeFilter]);

  const contextValue: FiltersContextV0 = {
    typeFilter,
    ownershipFilter,
    gradeFilter,
    setTypeFilter,
    setOwnershipFilter,
    setGradeFilter,
    clearFilters,
    activeCount,
    filterAssets,
  };

  return (
    <FiltersContextV0.Provider value={contextValue}>
      {children}
    </FiltersContextV0.Provider>
  );
}

export function useFiltersV0(): FiltersContextV0 {
  const context = useContext(FiltersContextV0);
  if (!context) {
    throw new Error('useFiltersV0 must be used within FilterProviderV0');
  }
  return context;
}
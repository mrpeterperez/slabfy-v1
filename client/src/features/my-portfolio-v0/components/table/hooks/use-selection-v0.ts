// 🤖 INTERNAL NOTE:
// Purpose: Selection hook for portfolio v0 table with multi-select functionality
// Exports: useSelectionV0 hook
// Feature: my-portfolio-v0
// Dependencies: react, @shared/schema

import { useMemo, useState } from 'react';
import type { Asset } from '@shared/schema';

export function useSelectionV0(assets: Asset[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  const clear = () => setSelected(new Set());

  const selectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(assets.map(a => a.id)));
    } else {
      setSelected(new Set());
    }
  };

  const headerState = useMemo(() => {
    const all = assets.length > 0 && selected.size === assets.length;
    const indeterminate = selected.size > 0 && selected.size < assets.length;
    return { all, indeterminate } as const;
  }, [assets.length, selected.size]);

  return { 
    selected, 
    toggle, 
    clear, 
    selectAll, 
    headerState 
  } as const;
}
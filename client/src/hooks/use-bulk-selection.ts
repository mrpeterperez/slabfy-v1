// 🤖 INTERNAL NOTE:
// Purpose: Reusable hook for managing bulk checkbox selection state
// Exports: useBulkSelection hook
// Feature: shared/ui-patterns
// Dependencies: react useState, useMemo

import { useState, useMemo, useCallback } from 'react';

export interface BulkSelectionOptions {
  /**
   * Initial selected IDs (optional)
   */
  initialSelected?: Set<string>;
}

export interface BulkSelectionResult {
  /**
   * Set of currently selected item IDs
   */
  selected: Set<string>;
  
  /**
   * Number of selected items
   */
  selectedCount: number;
  
  /**
   * Array of selected IDs for easy iteration
   */
  selectedIds: string[];
  
  /**
   * Check if a specific item is selected
   */
  isSelected: (id: string) => boolean;
  
  /**
   * Toggle selection for a single item
   */
  toggle: (id: string) => void;
  
  /**
   * Select all items from provided list
   */
  selectAll: (ids: string[]) => void;
  
  /**
   * Clear all selections
   */
  clearSelection: () => void;
  
  /**
   * Check if all items are selected
   */
  isAllSelected: (ids: string[]) => boolean;
  
  /**
   * Check if some but not all items are selected (for indeterminate checkbox)
   */
  isSomeSelected: (ids: string[]) => boolean;
}

/**
 * Hook for managing bulk checkbox selection state
 * Provides utilities for select all, toggle, and clear operations
 * 
 * @example
 * ```tsx
 * const { selected, toggle, selectAll, clearSelection } = useBulkSelection();
 * 
 * return (
 *   <div>
 *     <Checkbox checked={isAllSelected(items)} onChange={() => selectAll(items.map(i => i.id))} />
 *     {items.map(item => (
 *       <Checkbox 
 *         key={item.id}
 *         checked={isSelected(item.id)}
 *         onChange={() => toggle(item.id)}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useBulkSelection(options: BulkSelectionOptions = {}): BulkSelectionResult {
  const [selected, setSelected] = useState<Set<string>>(options.initialSelected || new Set());

  const selectedCount = selected.size;
  
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const isSelected = useCallback((id: string): boolean => {
    return selected.has(id);
  }, [selected]);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isAllSelected = useCallback((ids: string[]): boolean => {
    if (ids.length === 0) return false;
    return ids.every(id => selected.has(id));
  }, [selected]);

  const isSomeSelected = useCallback((ids: string[]): boolean => {
    if (ids.length === 0) return false;
    const selectedCount = ids.filter(id => selected.has(id)).length;
    return selectedCount > 0 && selectedCount < ids.length;
  }, [selected]);

  return {
    selected,
    selectedCount,
    selectedIds,
    isSelected,
    toggle,
    selectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  };
}

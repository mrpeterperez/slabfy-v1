// 🤖 INTERNAL NOTE:
// Purpose: Custom hook for bulk actions and selection logic in buying desk
// Exports: useBulkActions hook
// Feature: buying-desk-v0
// Dependencies: React hooks, mutations, toast

import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface UseBulkActionsProps {
  sessionId: string;
  moveToCart: any;
  removeFromCart: any;
  queryClient: ReturnType<typeof useQueryClient>;
}

export function useBulkActions(sessionId: string, moveToCart: any, removeFromCart: any, queryClient: any) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editCols, setEditCols] = useState<Set<'list' | 'status'>>(new Set());
  const [revertDialog, setRevertDialog] = useState<{
    open: boolean;
    targetStatus: 'evaluating' | 'buyList' | null;
  }>({ open: false, targetStatus: null });

  const toggleEditCol = useCallback((col: 'list' | 'status') => {
    setEditCols(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  }, []);

  const handleSelect = useCallback((itemId: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) {
      next.add(itemId);
    } else {
      next.delete(itemId);
    }
    setSelected(next);
  }, [selected]);

  // Accept rows as parameters instead of storing in state to prevent infinite loops
  const toggleSelectAll = useCallback((checked: boolean, rows: any[]) => {
    const headerIds = rows.map(r => r.item.id);
    const next = new Set(selected);
    if (checked) {
      headerIds.forEach(id => next.add(id));
    } else {
      headerIds.forEach(id => next.delete(id));
    }
    setSelected(next);
  }, [selected]);

  const handleBulkMove = useCallback((targetStatus: 'evaluating' | 'buyList', rows: any[]) => {
    if (selected.size === 0) return;

    const selectedItems = rows.filter(row => selected.has(row.item.id));
    const purchasedItems = selectedItems.filter(row => row.item.status === 'purchased');

    if (purchasedItems.length > 0) {
      setRevertDialog({ open: true, targetStatus });
    } else {
      processBulkMove(targetStatus, rows);
    }
  }, [selected]);

  const processBulkMove = useCallback(async (targetStatus: 'evaluating' | 'buyList', rows: any[]) => {
    if (selected.size === 0) return;

    try {
      const selectedItems = rows.filter((row: any) => selected.has(row.item.id));
      
      for (const { item } of selectedItems) {
        if (item.status === 'purchased') {
          const assetId = (item as any).assetId || (item.asset as any)?.id;
          await apiRequest('DELETE', `/api/buying-desk/sessions/${sessionId}/revert/${assetId}`);
        } else if (targetStatus === 'buyList' && item.status === 'evaluating') {
          await moveToCart.mutateAsync({ evaluationId: item.id, offerPrice: 0 });
        } else if (targetStatus === 'evaluating' && item.status === 'ready') {
          await removeFromCart.mutateAsync(item.id);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["buying-desk", "assets", sessionId] });
      setSelected(new Set());
      toast({ title: `Moved ${selected.size} items` });
    } catch (error) {
      toast({ title: "Failed to move items", variant: "destructive" });
    }
  }, [selected, sessionId, moveToCart, removeFromCart, queryClient]);

  const handleConfirmRevert = useCallback((rows: any[]) => {
    if (revertDialog.targetStatus) {
      processBulkMove(revertDialog.targetStatus, rows);
    }
    setRevertDialog({ open: false, targetStatus: null });
  }, [revertDialog.targetStatus, processBulkMove]);

  return {
    selected,
    editCols,
    revertDialog,
    toggleEditCol,
    handleSelect,
    toggleSelectAll,
    handleBulkMove,
    processBulkMove,
    handleConfirmRevert,
    setRevertDialog
  };
}
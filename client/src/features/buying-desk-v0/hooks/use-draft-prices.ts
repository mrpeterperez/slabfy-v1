// 🤖 INTERNAL NOTE:
// Purpose: Custom hook for managing draft prices in buying desk
// Exports: useDraftPrices hook
// Feature: buying-desk-v0
// Dependencies: React hooks

import { useState, useCallback } from "react";

export function useDraftPrices(sessionId: string) {
  const [draftPrices, setDraftPrices] = useState<Record<string, number>>(() => {
    try {
      const raw = sessionStorage.getItem(`buying-desk-v0:draftPrices:${sessionId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const updateDraftPrice = useCallback((assetId: string, price: number) => {
    if (!assetId) return;
    
    setDraftPrices((prev) => {
      const next = { ...prev, [assetId]: Math.max(0, Number(price) || 0) };
      try { 
        sessionStorage.setItem(`buying-desk-v0:draftPrices:${sessionId}`, JSON.stringify(next)); 
      } catch {}
      return next;
    });
  }, [sessionId]);

  const clearDraftPrice = useCallback((assetId: string) => {
    if (!assetId) return;
    
    setDraftPrices((prev) => {
      const next = { ...prev };
      delete next[assetId];
      try { 
        sessionStorage.setItem(`buying-desk-v0:draftPrices:${sessionId}`, JSON.stringify(next)); 
      } catch {}
      return next;
    });
  }, [sessionId]);

  return {
    draftPrices,
    updateDraftPrice,
    clearDraftPrice
  };
}
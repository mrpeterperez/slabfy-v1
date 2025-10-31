// 🤖 INTERNAL NOTE:
// Purpose: Container logic for buying desk table - handles data fetching and state management
// Exports: TableContainer component
// Feature: buying-desk-v0
// Dependencies: React Query, hooks, types

import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useCartActionsV0 as useCartActions } from "../../hooks/use-cart";
import { useColumnPreferences } from "../../hooks/use-column-preferences";
import { useBulkActions } from "../../hooks/use-bulk-actions";
import { useDraftPrices } from "../../hooks/use-draft-prices";
import { TableView } from "./table-view";
import type { 
  BuyingDeskAsset, 
  MarketData, 
  TableRow as TableRowData, 
  SortColumn, 
  SortDirection, 
  ColumnConfig 
} from "../../types/table";

interface Props { 
  sessionId: string; 
  onOpenCart?: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function TableContainer({ sessionId, onOpenCart, search: externalSearch, onSearchChange }: Props) {
  const queryClient = useQueryClient();
  const { moveToCart, removeFromCart } = useCartActions(sessionId);
  
  // Core table state - keep it minimal
  const [internalSearch, setInternalSearch] = useState("");
  const search = externalSearch !== undefined ? externalSearch : internalSearch;
  const setSearch = onSearchChange || setInternalSearch;
  const [sortColumn, setSortColumn] = useState<SortColumn>("asset");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [status, setStatus] = useState<'all' | 'evaluating' | 'buyList' | 'purchased'>('evaluating');

  // Extract complex state into custom hooks
  const { draftPrices, updateDraftPrice, clearDraftPrice } = useDraftPrices(sessionId);
  const bulkActions = useBulkActions(sessionId, moveToCart, removeFromCart, queryClient);

  // Fetch assets data
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["buying-desk", "assets", sessionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/buying-desk/sessions/${sessionId}/assets`);
      return res.json() as Promise<BuyingDeskAsset[]>;
    },
    // Cache settings handled by global QueryClient defaults
  });

  // Market data fetch
  const assetIds = useMemo(() => {
    // Only process if items are loaded and not empty
    if (!items || items.length === 0) return [];
    const ids = items.map(item => item.asset?.id).filter(Boolean) as string[];
    return Array.from(new Set(ids)).sort();
  }, [items]);

  const { data: marketData = {}, isLoading: isMarketDataLoading } = useQuery({
    queryKey: ['/api/market', assetIds],
    queryFn: async () => {
      if (!assetIds.length) return {} as Record<string, MarketData>;
      const res = await apiRequest('GET', `/api/market?ids=${assetIds.join(',')}`);
      return res.json() as Promise<Record<string, MarketData>>;
    },
    enabled: !isLoading && assetIds.length > 0, // Wait for assets to load first
    staleTime: 0, // Always consider data stale so it refetches when assetIds change
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 2, // Retry failed requests
  });

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: items.length, evaluating: 0, buyList: 0, purchased: 0 };
    items.forEach((item) => {
      const s = item.status || 'evaluating';
      if (s === 'evaluating') counts.evaluating++;
      else if (s === 'ready') counts.buyList++;
      else if (s === 'purchased') counts.purchased++;
    });
    return counts;
  }, [items]);

  // Column configuration
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

  const { columns, updatePreferences } = useColumnPreferences(sessionId, defaultColumns);

  // Process and filter rows
  const rows = useMemo(() => {
    return items
      .filter((item) => {
        // Status filter
        if (status !== 'all') {
          const s = item.status || 'evaluating';
          if (status === 'evaluating' && s !== 'evaluating') return false;
          if (status === 'buyList' && s !== 'ready') return false;
          if (status === 'purchased' && s !== 'purchased') return false;
        }
        
        // Search filter
        if (search) {
          const a = item.asset as any || {};
          const query = search.toLowerCase();
          const searchText = [
            a.playerName || '',
            a.setName || '',
            a.year || '',
            a.cardNumber || '',
            a.grade || '',
            a.certNumber || ''
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!searchText.includes(query)) return false;
        }
        return true;
      })
      .map((item): TableRowData => {
        const asset = item.asset as any || {};
        const market = marketData[asset.id || ''] || { 
          averagePrice: 0, 
          confidence: 0, 
          liquidity: 'cold', 
          salesCount: 0 
        };
        
        // Calculate buy price based on status and draft prices
        let buyPrice = 0;
        if (item.status === 'evaluating') {
          const draft = draftPrices[asset.id || ''];
          buyPrice = typeof draft === 'number' ? Math.max(0, draft) : (Number(item.offerPrice || 0) || 0);
        } else if (item.status === 'purchased') {
          buyPrice = Number(item.purchasePrice || item.offerPrice || 0) || 0;
        } else {
          buyPrice = Number(item.offerPrice || 0) || 0;
        }
        
        // Calculate profit
        let profit: number | null = null;
        if (item.status === 'purchased') {
          profit = Number(item.realizedProfit) || null;
        } else if (market.averagePrice > 0 && buyPrice > 0) {
          profit = market.averagePrice - buyPrice;
        }

        return {
          item,
          asset: {
            id: asset.id || '',
            playerName: asset.playerName || '',
            setName: asset.setName || '',
            year: asset.year || '',
            cardNumber: asset.cardNumber || '',
            grade: asset.grade || '',
            certNumber: asset.certNumber || '',
            title: asset.title || '',
            psaImageFrontUrl: asset.psaImageFrontUrl || '',
          },
          market,
          averagePrice: market.averagePrice,
          confidence: market.confidence,
          liquidity: market.liquidity,
          salesCount: market.salesCount,
          buyPrice,
          displayProfit: profit,
          seller: item.seller,
          purchaseDate: item.purchaseDate,
          paymentMethod: item.paymentMethod,
        };
      })
      .sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        let aVal: any = 0;
        let bVal: any = 0;

        switch (sortColumn) {
          case 'asset':
            aVal = `${a.asset?.playerName || ''} ${a.asset?.setName || ''}`.toLowerCase();
            bVal = `${b.asset?.playerName || ''} ${b.asset?.setName || ''}`.toLowerCase();
            break;
          case 'list':
            aVal = a.buyPrice || 0;
            bVal = b.buyPrice || 0;
            break;
          case 'market':
            aVal = a.averagePrice || 0;
            bVal = b.averagePrice || 0;
            break;
          case 'profit':
            aVal = a.displayProfit ?? -Infinity;
            bVal = b.displayProfit ?? -Infinity;
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * dir;
        }
        return String(aVal).localeCompare(String(bVal)) * dir;
      });
  }, [items, marketData, search, status, sortColumn, sortDirection, draftPrices]);

  // Action handlers
  const handlePriceUpdate = useCallback(async (itemId: string, price: number, assetId?: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (item.status === 'evaluating') {
      updateDraftPrice(assetId || (item.asset as any)?.id || '', Math.max(0, Number(price) || 0));
      return;
    }

    try {
      await apiRequest("PATCH", `/api/buying-desk/sessions/${sessionId}/assets/${itemId}`, { 
        offerPrice: Math.max(0, Number(price) || 0) 
      });
      // Refetch the assets to ensure UI is updated
      await queryClient.invalidateQueries({ queryKey: ["buying-desk", "assets", sessionId] });
    } catch (error) {
      console.error("Price update failed:", error);
      toast({ 
        title: "Failed to update price", 
        description: "The asset may have been moved or removed. Please refresh and try again.",
        variant: "destructive" 
      });
      // Refetch assets to sync UI with server state
      await queryClient.invalidateQueries({ queryKey: ["buying-desk", "assets", sessionId] });
    }
  }, [items, sessionId, updateDraftPrice, queryClient]);

  const handleStatusChange = useCallback(async (itemId: string, newStatus: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (newStatus === 'ready') {
      // Give any active input fields a chance to blur and save their values
      // This prevents race conditions when editing price and changing status simultaneously
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const aId = (item.asset as any)?.id || '';
      const draft = draftPrices[aId];
      const price = typeof draft === 'number' ? Math.max(0, draft) : (item.offerPrice || 0);
      moveToCart.mutate({ evaluationId: itemId, offerPrice: Number(price) || 0 });
      
      if (typeof draft === 'number' && aId) {
        clearDraftPrice(aId);
      }
      onOpenCart?.();
    } else if (newStatus === 'evaluating') {
      removeFromCart.mutate(itemId);
    }
  }, [items, moveToCart, removeFromCart, onOpenCart, draftPrices, clearDraftPrice]);

  const handleRemoveFromSession = useCallback(async (itemId: string) => {
    try {
      await apiRequest("DELETE", `/api/buying-desk/sessions/${sessionId}/assets/${itemId}`);
      const current = queryClient.getQueryData<any[]>(["buying-desk", "assets", sessionId]);
      if (Array.isArray(current)) {
        queryClient.setQueryData(["buying-desk", "assets", sessionId], current.filter(item => item.id !== itemId));
      }
    } catch {
      toast({ title: "Failed to remove asset", variant: "destructive" });
      await queryClient.invalidateQueries({ queryKey: ["buying-desk", "assets", sessionId] });
    }
  }, [sessionId, queryClient]);

  return (
    <TableView
      sessionId={sessionId}
      search={search}
      onSearch={setSearch}
      status={status}
      onStatusChange={setStatus}
      statusCounts={statusCounts}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={setSortColumn}
      setSortDirection={setSortDirection}
      columns={columns}
      updatePreferences={updatePreferences}
      rows={rows}
      isLoading={isLoading}
      items={items}
      marketData={marketData}
      selected={bulkActions.selected}
      editCols={bulkActions.editCols}
      toggleEditCol={bulkActions.toggleEditCol}
      handleSelect={bulkActions.handleSelect}
      toggleSelectAll={(checked: boolean) => bulkActions.toggleSelectAll(checked, rows)}
      handleBulkMove={(targetStatus: 'evaluating' | 'buyList') => bulkActions.handleBulkMove(targetStatus, rows)}
      revertDialog={bulkActions.revertDialog}
      handleConfirmRevert={() => bulkActions.handleConfirmRevert(rows)}
      setRevertDialog={bulkActions.setRevertDialog}
      handlePriceUpdate={handlePriceUpdate}
      handleStatusChange={handleStatusChange}
      handleRemoveFromSession={handleRemoveFromSession}
    />
  );
}
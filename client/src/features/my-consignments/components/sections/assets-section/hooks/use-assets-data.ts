// 🤖 INTERNAL NOTE:
// Purpose: Asset data fetching and processing hook for consignments
// Exports: useAssetsData hook
// Feature: my-consignments

import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBatchMarketSnapshot } from '@/hooks/use-market-snapshot';
import type { Asset } from '@shared/schema';
import type { ConsignmentAssetData, MarketData } from '../types';
import type { ConsignmentAssetStatus } from '../../../consignment-asset-status-tabs';

export function useAssetsData(
  consignmentId: string,
  consignmentDefaultSplit: number,
  setConsignmentDefaultSplit: (split: number) => void,
  activeStatus: ConsignmentAssetStatus,
  searchQuery: string
) {
  // Fetch assets for this consignment
  const { data: assets = [], isLoading, error } = useQuery<ConsignmentAssetData[]>({
    queryKey: [`/api/consignments/${consignmentId}/assets`],
    enabled: !!consignmentId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 60_000, // 1 minute - rely on manual invalidation from mutations
  });

  // Convert ConsignmentAssetData to Asset type for useBatchMarketSnapshot hook
  const assetsForPricing = useMemo((): Asset[] => {
    return assets.map(asset => ({
      id: asset.id,
      userId: asset.userId,
      type: 'graded',  // Default type for consignment assets
      globalAssetId: asset.globalAssetId,
      title: asset.title,
      playerName: asset.playerName,
      setName: asset.setName,
      year: asset.year,
      cardNumber: asset.cardNumber,
      variant: asset.variant,
      grader: null,  // Not available in ConsignmentAssetData
      grade: asset.grade,
      certNumber: null,  // Not available in ConsignmentAssetData
      purchasePrice: asset.purchasePrice,
      purchaseDate: asset.purchaseDate,
      notes: asset.notes,
      serialNumbered: asset.serialNumbered,
      serialNumber: asset.serialNumber,
      serialMax: asset.serialMax,
      ownershipStatus: asset.ownershipStatus,
      assetStatus: null,  // Not available in ConsignmentAssetData
      sourceSlug: null,  // Not available in ConsignmentAssetData
      imageUrl: null,  // Not available in ConsignmentAssetData
      assetImages: asset.assetImages,
      createdAt: undefined,  // Not available in ConsignmentAssetData
      updatedAt: asset.updatedAt,
      category: null,  // Not available in ConsignmentAssetData
      psaImageFrontUrl: asset.psaImageFrontUrl,
      psaImageBackUrl: null,  // Not available in ConsignmentAssetData
      totalPopulation: null,  // Not available in ConsignmentAssetData
      totalPopulationWithQualifier: null,  // Not available in ConsignmentAssetData
      populationHigher: null,  // Not available in ConsignmentAssetData
      isPsaDna: null,  // Not available in ConsignmentAssetData
      isDualCert: null,  // Not available in ConsignmentAssetData
      autographGrade: null,  // Not available in ConsignmentAssetData
    } as Asset));
  }, [assets]);

  // Use the unified market pricing hook - same as portfolio
  const assetIds = useMemo(() => assetsForPricing.map(a => a.globalAssetId || a.id), [assetsForPricing]);
  const { marketData: marketPricingData, isLoading: pricingIsLoading, isFetching: pricingIsFetching, pending: pricingPending } = useBatchMarketSnapshot(assetIds, {
    refetchOnWindowFocus: false,
    staleTime: 60_000, // 1 minute
  });
  
  // Map the market data to use globalAssetId as the key for compatibility
  const marketData = useMemo(() => {
    const mapped: Record<string, MarketData> = {};
    Object.entries(marketPricingData).forEach(([assetId, data]) => {
      // assetId from marketPricingData is actually the globalAssetId
      const asset = assets.find(a => a.globalAssetId === assetId);
      if (asset?.globalAssetId) {
        mapped[asset.globalAssetId] = data;
      }
    });
    return mapped;
  }, [marketPricingData, assets]);

  // Listen for split changes from Business Terms and show apply banner
  useEffect(() => {
    const handler = (e: Event) => {
      // @ts-ignore
      const detail = (e as CustomEvent).detail as { consignmentId: string; newSplit: string; oldSplit: string };
      if (!detail || detail.consignmentId !== consignmentId) return;
      const next = parseFloat(detail.newSplit);
      const prev = parseFloat(detail.oldSplit);
      if (Number.isNaN(next) || Number.isNaN(prev)) return;
      // Update the local default immediately so House Cut reflects new default even before per-asset apply
      setConsignmentDefaultSplit(Math.max(0, Math.min(100, next)));
    };
    window.addEventListener('consignmentSplitUpdated' as any, handler);
    return () => window.removeEventListener('consignmentSplitUpdated' as any, handler);
  }, [consignmentId, setConsignmentDefaultSplit]);

  // Transform and enhance asset data with defaults
  const editableRows = useMemo(() => {
    return (assets || []).map((row) => ({
      ...row,
      // Map API field names to expected names - assets from API already have askingPrice
      listPrice: row.askingPrice ?? null,
      reservePrice: row.reservePrice ?? null,
      // Use consignment default when asset-level split is not set
      splitPercentage: (row as any).splitPercentage ?? consignmentDefaultSplit,
      status: row.status ?? 'draft', // statuses per spec
      addedAt: row.addedAt ?? row.addedAt ?? null, // Use addedAt since that's what the API provides
    }));
  }, [assets, consignmentDefaultSplit]);

  const filteredRows = useMemo(() => {
    let filtered = editableRows;
    
    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((a: any) =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.playerName || '').toLowerCase().includes(q) ||
        (a.setName || '').toLowerCase().includes(q) ||
        (a.certNumber || '').toLowerCase().includes(q) ||
        String(a.year || '').toLowerCase().includes(q) ||
        String(a.cardNumber || '').toLowerCase().includes(q)
      );
    }
    
    // Apply status filter
    if (activeStatus !== 'all') {
      filtered = filtered.filter((a: any) => {
        const assetStatus = (a.status || 'draft').toLowerCase();
        return assetStatus === activeStatus;
      });
    }
    
    return filtered;
  }, [editableRows, searchQuery, activeStatus]);

  // Calculate status counts for tabs
  const statusCounts = useMemo(() => {
    const counts = {
      all: editableRows.length,
      active: 0,
      on_hold: 0,
      returned: 0,
      sold: 0,
      draft: 0,
    };
    
    editableRows.forEach((asset: any) => {
      const status = (asset.status || 'draft').toLowerCase();
      if (status === 'active') counts.active++;
      else if (status === 'on_hold') counts.on_hold++;
      else if (status === 'returned') counts.returned++;
      else if (status === 'sold') counts.sold++;
      else counts.draft++;
    });
    
    return counts;
  }, [editableRows]);

  return {
    // Raw data
    assets,
    isLoading,
    error,

    // Market data
    marketData,
    isMarketDataLoading: pricingIsLoading,
    isMarketFetching: pricingIsFetching,
    pricingPending,

    // Processed data
    editableRows,
    filteredRows,
    statusCounts,
  };
}
import React, { useMemo } from 'react';
import { GroupedPortfolioTableV0 as PortfolioTable } from '@/features/my-portfolio-v0/components/grouped-table/grouped-table';
import type { Asset } from '@shared/schema';
import { getOwnershipType } from '@/components/ui/ownership-badge';
import { useQuery } from '@tanstack/react-query';

export type CollectionRow = {
  id: string;
  globalAssetId: string;
  userAssetId?: string;
  consignmentAssetId?: string;
  title?: string | null;
  playerName?: string | null;
  setName?: string | null;
  year?: string | null;
  cardNumber?: string | null;
  variant?: string | null;
  grader?: string | null;
  grade?: string | null;
  certNumber?: string | null;
  ownershipType?: 'portfolio' | 'consignment';
  psaImageFrontUrl?: string | null;
  globalAsset?: Partial<CollectionRow>;
};

type Mode = 'portfolio' | 'collection';

type Props = {
  items: Asset[] | CollectionRow[];
  isLoading?: boolean;
  mode?: Mode;
  visible?: Record<string, boolean>;
  onEditAsset?: (asset: Asset) => void;
  onDeleteAsset?: (asset: Asset) => void;
  onRemoveFromCollection?: (globalAssetId: string) => void;
  // Optional map: globalAssetId -> userAssetId for owned assets (helps when API payload lacks userAssetId due to caching)
  ownedByGlobal?: Record<string, string>;
};

function isCollectionRowArray(items: any[]): items is CollectionRow[] {
  return items.length > 0 && (items[0] as any).globalAssetId != null;
}

function mapCollectionToAssets(rows: CollectionRow[]): Asset[] {
  return rows.map((a) => {
    // Server returns global fields under `asset`; also tolerate legacy `globalAsset`
    const src: any = (a as any).asset || (a as any).globalAsset || a;
    const ownership = getOwnershipType({ ownershipType: a.ownershipType });
    return {
      id: a.globalAssetId,
      userId: '',
      type: 'graded',
      title: src.title ?? '',
      playerName: src.playerName ?? '',
      setName: src.setName ?? '',
      year: src.year ?? '',
      cardNumber: src.cardNumber ?? '',
      variant: src.variant ?? '',
      grader: (src.grader as any) ?? '',
      grade: src.grade ?? '',
      certNumber: src.certNumber ?? '',
      purchasePrice: null,
      purchaseDate: null,
      notes: null,
      serialNumbered: null,
      serialNumber: null,
      serialMax: null,
      ownershipStatus: ownership === 'consignment' ? 'consignment' : 'own',
      assetStatus: null,
      sourceSlug: null,
      imageUrl: null,
      assetImages: null,
      createdAt: undefined,
      updatedAt: undefined,
      category: null,
      psaImageFrontUrl: (src.psaImageFrontUrl as any) ?? null,
      psaImageBackUrl: (src.psaImageBackUrl as any) ?? null,
      totalPopulation: null,
      totalPopulationWithQualifier: null,
      populationHigher: null,
      isPsaDna: null,
      isDualCert: null,
      autographGrade: null,
      globalAssetId: a.globalAssetId,
      // Preserve consignment info for the OwnershipBadge to work correctly
      consignmentId: (a as any).consignmentAssetId || null,
    } as Asset;
  });
}export function PortfolioAssetsTable({ items, isLoading = false, mode, visible, onEditAsset, onDeleteAsset, onRemoveFromCollection, ownedByGlobal }: Props) {
  const effectiveMode: Mode = mode ?? (isCollectionRowArray(items as any[]) ? 'collection' : 'portfolio');
  const assets: Asset[] = effectiveMode === 'collection' && isCollectionRowArray(items as any[])
    ? mapCollectionToAssets(items as CollectionRow[])
    : (items as Asset[]);

  // Build unique global asset ids for pricing lookup (collection mode maps id to globalAssetId)
  const globalAssetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of assets) {
      const id = (a as any).globalAssetId || a.id;
      if (id) ids.add(id);
    }
    return Array.from(ids);
  }, [assets]);

  // Fetch batch pricing so Market/Confidence/Liquidity populate
  const { data: marketMap = {}, isLoading: isPricingLoading } = useQuery<{ [id: string]: { averagePrice: number; confidence: number; liquidity: string; salesCount: number } }>({
    queryKey: ['/api/pricing/batch', globalAssetIds],
    enabled: globalAssetIds.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const res = await fetch('/api/pricing/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalAssetIds }),
      });
      if (!res.ok) return {} as any;
      return res.json();
    },
  });

  // GroupedPortfolioTableV0 uses useSimplePricing which expects pricing keyed by globalAssetId/id
  // We need to set up a mock pricing context or pass the data in a compatible way
  // For now, we'll remove the pricing fetch since GroupedPortfolioTableV0 handles its own pricing

  const defaults: Record<string, boolean> = effectiveMode === 'collection'
    ? { ownership: true, type: true, qty: true, price: false, unrealized: false, value: true, confidence: true, liquidity: true, trend: false }
    : { ownership: true, type: true, qty: true, price: true, value: true, confidence: true, liquidity: true, trend: true };

  const visibleMap = { ...defaults, ...(visible || {}) };

  const handleDelete = onDeleteAsset
    ? onDeleteAsset
    : (onRemoveFromCollection && effectiveMode === 'collection')
      ? (asset: Asset) => onRemoveFromCollection(asset.id)
      : undefined;

  // When in collection mode, map row clicks to the correct underlying owner-specific id when present
  const getClickId = effectiveMode === 'collection' && isCollectionRowArray(items as any[])
    ? (asset: Asset) => {
        const row = (items as CollectionRow[]).find(r => r.globalAssetId === asset.globalAssetId);
        if (!row) return asset.globalAssetId || asset.id;
        // Prefer consignment routes when applicable
        if (row.ownershipType === 'consignment' && row.consignmentAssetId) {
          return row.consignmentAssetId;
        }
        // Otherwise prefer owned user asset; fallback to global
        return row.userAssetId
          || (ownedByGlobal ? ownedByGlobal[asset.globalAssetId as string] : undefined)
          || row.globalAssetId
          || asset.id;
      }
    : undefined;

  return (
    <PortfolioTable
      assets={assets}
      visible={visibleMap}
      onEdit={onEditAsset}
      onDelete={handleDelete}
    />
  );
}

export default PortfolioAssetsTable;

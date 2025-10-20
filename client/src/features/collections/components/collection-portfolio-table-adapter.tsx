// Reusable adapter: render collection assets using the portfolio-style table
// Keeps the exact /portfolio table look and behavior while mapping collection data
import React from 'react';
import { PortfolioTableV0 as PortfolioTable } from '@/features/my-portfolio-v0/components/table/portfolio-table-v0';
import type { Asset } from '@shared/schema';
import { getOwnershipType } from '@/components/ui/ownership-badge';

// Minimal shape we rely on from collection assets
export interface CollectionAssetLike {
  id: string; // collection asset id (not used by table)
  globalAssetId: string; // used for pricing + view
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
  // Optional nested global asset fields (common in joins)
  globalAsset?: Partial<CollectionAssetLike>;
}

type Props = {
  assets: CollectionAssetLike[];
  isLoading?: boolean;
  // Called when user selects Delete in row menu; we pass the globalAssetId
  onRemoveAsset?: (globalAssetId: string) => void;
  // Optional visibility overrides for portfolio columns
  visible?: Record<string, boolean>;
};

export function CollectionPortfolioTableAdapter({ assets, isLoading = false, onRemoveAsset, visible }: Props) {
  // Map collection assets to Asset-like objects that PortfolioTable can render
  const mapped: Asset[] = assets.map((a) => {
    const src = a.globalAsset || a; // prefer nested global data if present
    const ownership = getOwnershipType({ ownershipType: a.ownershipType });
    return {
      // IMPORTANT: use globalAssetId as id so pricing/sales map correctly
      id: a.globalAssetId,
      userId: '',
      type: 'graded',
      title: src.title ?? '',
      playerName: src.playerName ?? undefined,
      setName: src.setName ?? undefined,
      year: src.year ?? undefined,
      cardNumber: src.cardNumber ?? undefined,
      variant: src.variant ?? undefined,
      grader: (src.grader as any) ?? undefined,
      grade: src.grade ?? undefined,
      certNumber: src.certNumber ?? undefined,
      purchasePrice: null, // collections typically don't store per-item cost here
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
      psaImageFrontUrl: (src.psaImageFrontUrl as any) ?? undefined,
      psaImageBackUrl: undefined,
      totalPopulation: null,
      totalPopulationWithQualifier: null,
      populationHigher: null,
      isPsaDna: null,
      isDualCert: null,
      autographGrade: null,
      globalAssetId: a.globalAssetId,
    } as Asset;
  });

  // Default visibility suited for collections: hide purchase price and trend by default
  const visibleMap: Record<string, boolean> = {
    ownership: true,
    type: true,
    qty: true,
    price: false, // no purchase price at collection level
    value: true,
    confidence: true,
    liquidity: true,
    trend: false, // sparkline may rely on user asset context; hide for now
    ...(visible || {}),
  };

  return (
    <PortfolioTable
      assets={mapped}
      isLoading={isLoading}
      visible={visibleMap}
      // Map delete to collection removal using globalAssetId (we set id to globalAssetId)
      onDelete={onRemoveAsset ? (asset) => onRemoveAsset(asset.id) : undefined}
      // No edit behavior here by default
    />
  );
}

export default CollectionPortfolioTableAdapter;

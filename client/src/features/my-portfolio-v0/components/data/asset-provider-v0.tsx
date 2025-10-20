// 🤖 INTERNAL NOTE:
// Purpose: Data provider for portfolio assets with caching and normalization
// Exports: AssetProviderV0 component, useAssetsV0 hook
// Feature: my-portfolio-v0
// Dependencies: @tanstack/react-query, @shared/schema, react context

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Asset } from '@shared/schema';

interface AssetContextV0 {
  assets: Asset[];
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

const AssetContextV0 = createContext<AssetContextV0 | null>(null);

interface AssetProviderV0Props {
  userId: string;
  children: ReactNode;
}

export function AssetProviderV0({ userId, children }: AssetProviderV0Props) {
  // Load all assets for this user (shared cache with portfolio components)
  const { data: assetsRaw, isLoading, error, refetch } = useQuery<Asset[]>({
    queryKey: [userId ? `/api/user/${userId}/assets` : ''],
    enabled: !!userId,
    staleTime: 0, // 🔥 KILL CACHE - Always fetch fresh data for consignment changes
    gcTime: 0, // Don't cache at all - consignment assets change frequently
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Normalize ownership field to a stable value
  const normalizedAssets = useMemo(() => {
    const list = Array.isArray(assetsRaw) ? assetsRaw : [];
    return list.map((asset) => {
      const ownershipType = (asset as any).ownershipType;
      const ownershipStatus = (asset as any).ownershipStatus;
      let normalized: string = 'own';
      
      // Handle sold assets first
      if (ownershipStatus === 'sold') {
        normalized = 'sold';
      }
      // Then handle consignments  
      else if (ownershipStatus === 'consignment' || ownershipType === 'consignment') {
        normalized = 'consignment';
      }
      
      return { ...asset, ownershipStatus: normalized } as Asset;
    });
  }, [assetsRaw]);

  const contextValue: AssetContextV0 = {
    assets: normalizedAssets,
    isLoading,
    error,
    refetch,
  };

  return (
    <AssetContextV0.Provider value={contextValue}>
      {children}
    </AssetContextV0.Provider>
  );
}

export function useAssetsV0(): AssetContextV0 {
  const context = useContext(AssetContextV0);
  if (!context) {
    throw new Error('useAssetsV0 must be used within AssetProviderV0');
  }
  return context;
}
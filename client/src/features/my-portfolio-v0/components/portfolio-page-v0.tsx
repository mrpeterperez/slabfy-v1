// 🤖 INTERNAL NOTE:
// Purpose: Main portfolio page component for v0 rebuild
// Exports: PortfolioPageV0 component
// Feature: my-portfolio-v0
// Dependencies: @tanstack/react-query, @shared/schema, ./asset-provider-v0, ./portfolio-layout-v0

import { useAuth } from '@/components/auth-provider';
import type { Asset } from '@shared/schema';
import { AssetProviderV0 } from './data/asset-provider-v0';
import { PortfolioLayoutV0 } from './portfolio-layout-v0';

interface PortfolioPageV0Props {
  userId?: string;
  onViewAsset?: (asset: Asset) => void;
  onEditAsset?: (asset: Asset) => void;
  onDeleteAsset?: (asset: Asset) => void;
  onAddAsset?: () => void;
}

export function PortfolioPageV0({
  userId,
  onViewAsset,
  onEditAsset,
  onDeleteAsset,
  onAddAsset,
}: PortfolioPageV0Props) {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  if (!effectiveUserId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          Please sign in to view your portfolio.
        </div>
      </div>
    );
  }

  return (
    <AssetProviderV0 userId={effectiveUserId}>
      <PortfolioLayoutV0
        userId={effectiveUserId}
        onViewAsset={onViewAsset}
        onEditAsset={onEditAsset}
        onDeleteAsset={onDeleteAsset}
        onAddAsset={onAddAsset}
      />
    </AssetProviderV0>
  );
}
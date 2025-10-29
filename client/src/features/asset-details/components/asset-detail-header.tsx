// 🤖 INTERNAL NOTE (LLM):
// Purpose: Header section for Asset Detail page. Renders sticky tabs only.
// Exports: AssetDetailHeader (named)
// Feature: asset-details
// Dependencies: AssetDetailsTabs

import AssetDetailsTabs from "./asset-details-tabs";
import type { Asset } from "@shared/schema";

interface Props {
  asset: Asset;
  assetId: string;
  activeTab: string;
  isOwner?: boolean;
  isSold?: boolean;
}

export function AssetDetailHeader({ asset, assetId, activeTab, isOwner, isSold }: Props) {
  return (
    <div className="!hidden lg:!block sticky h-18 top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container">
        {/* Tabs with actions menu - sticky to top */}
        <AssetDetailsTabs assetId={assetId} currentTab={activeTab} asset={asset} isOwner={isOwner} isSold={isSold} />
      </div>
    </div>
  );
}

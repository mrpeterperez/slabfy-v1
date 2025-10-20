// 🤖 INTERNAL NOTE (LLM):
// Purpose: Mobile/Tablet content layout for Asset Detail page.
// Exports: AssetDetailMobile (named)
// Feature: asset-details
// Dependencies: MobileChartLayout, AssetImages, ChartComponent, MarketValueCard, AverageCostCard, AssetBreakdownTable, AssetDetailsCard, GradingDetailsCard

import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MobileChartLayout } from "./mobile-chart-layout";
import { AssetImages } from "./asset-images";
import { ChartComponent, AssetDetailsCard, GradingDetailsCard, MarketValueCard, AverageCostCard, AssetBreakdownTable } from "./overview-tab";
import { VariationsTable } from "./variations";
import { SalesView } from "./sales-comp";
import type { Asset } from "@shared/schema";

interface Props {
  asset: Asset;
  isOwner: boolean;
  isSold?: boolean;
  ownershipStatus?: string;
  activeTab: string;
  relatedAssets: Asset[];
  variations: Asset[];
  isLoadingVariations: boolean;
}

export function AssetDetailMobile({ asset, isOwner, isSold, ownershipStatus, activeTab, relatedAssets, variations, isLoadingVariations }: Props) {
  return (
    <div className="block lg:hidden">
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="block sm:hidden">
            <MobileChartLayout asset={asset} />
          </div>
          <div className="hidden sm:grid grid-cols-5 gap-6">
            <div className="col-span-2 min-h-[300px] flex items-center">
              <AssetImages asset={asset} />
            </div>
            <div className="col-span-3 min-h-[300px]">
              <ChartComponent cardData={asset} />
            </div>
          </div>
          <div className="space-y-12 mt-3">
            <div>
              <h2 className="text-xl font-semibold font-heading mb-3">Asset Overview</h2>
              <Separator className="mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-1">
                <div className="md:col-span-1 mb-3">
                  <MarketValueCard asset={asset} />
                </div>
                {isOwner && (
                  <div className="md:col-span-2">
                    <AverageCostCard asset={asset} />
                  </div>
                )}
              </div>
            </div>

            {isOwner && (
              <div>
                <h2 className="text-xl font-semibold font-heading mb-4">Asset Breakdown</h2>
                <Separator className="mb-6" />
                <AssetBreakdownTable asset={asset} relatedAssets={relatedAssets} />
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold font-heading mb-3">Slab Details</h2>
              <Separator className="mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AssetDetailsCard asset={asset} />
                <GradingDetailsCard asset={asset} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "variations" && (
        <div className="mt-6">
          {isLoadingVariations ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !isOwner ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-lg font-semibold text-muted-foreground mb-2">
                No Variations Owned
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                You don't own any variations of this card yet. Add this card to your collection to track all your variants.
              </p>
            </div>
          ) : (
            <VariationsTable baseAsset={asset} variations={variations} />
          )}
        </div>
      )}

      {activeTab === "sales-comp" && (
        <div className="mt-6">
          <SalesView asset={asset} enabled={activeTab === "sales-comp"} />
        </div>
      )}

      {!["overview", "variations", "sales-comp"].includes(activeTab) && (
        <div className="mt-6">
          <p className="text-muted-foreground">This tab is coming soon.</p>
        </div>
      )}
    </div>
  );
}

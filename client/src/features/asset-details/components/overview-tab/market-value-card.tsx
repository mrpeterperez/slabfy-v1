/**
 * @file market-value-card.tsx
 * @description Component that displays the market value information for an asset
 * @exports MarketValueCard
 * @feature asset-details
 */
import React, { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Asset } from "@shared/schema";
import { SalesRecord } from "@shared/sales-types";
import ConfidenceMeter from "./confidence-rating/confidence-meter";
import { LiquidityIndicator } from "@/components/ui/metrics/liquidity-indicator";
import { ResponsiveTooltip } from "@/components/ui/responsive-tooltip";

interface RealTimePricingData {
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  liquidity: string;
  confidence: number; // 0-100 percentage
  salesCount: number;
  lastSaleDate: string;
}

interface MarketValueCardProps {
  asset: Asset;
  relatedAssets?: Asset[];
  salesData?: SalesRecord[];
}

const MarketValueCard = ({
  asset,
  relatedAssets = [],
  salesData,
}: MarketValueCardProps) => {
  // Calculate total assets owned (like shares)
  const assetsOwned = 1 + relatedAssets.length;

  // Fetch real-time pricing data from pricing API
  const { data: pricingData, isLoading } = useQuery<RealTimePricingData>({
    queryKey: ["pricing", asset.id],
    queryFn: async () => {
      const response = await fetch(`/api/pricing/${asset.id}`);
      if (!response.ok) throw new Error("Failed to fetch pricing data");
      return response.json();
    },
    enabled: !!asset.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Calculate total market value based on assets owned
  const totalMarketValue = useMemo(() => {
    if (!pricingData || pricingData.averagePrice === 0) return 0;
    return pricingData.averagePrice * assetsOwned;
  }, [pricingData?.averagePrice, assetsOwned]);





  // Format currency helper
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  // Skeleton loading component
  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-lg border">
        <div className="pb-4 border-b border-border">
          <div className="text-muted-foreground text-sm">Your Market Value</div>
          <div className="h-8 w-32 bg-skeleton rounded animate-pulse mb-2"></div>
          <div className="h-3 w-48 bg-skeleton rounded animate-pulse"></div>

          {/* Confidence Meter Skeleton */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Confidence</span>
            <div className="flex-1 ml-3 flex items-center gap-3">
              <div className="h-4 w-8 bg-skeleton rounded animate-pulse"></div>
              <div className="h-2 w-16 bg-skeleton rounded animate-pulse"></div>
              <div className="h-4 w-12 bg-skeleton rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="py-3 border-b border-border flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Avg Sale Price</div>
          <div className="h-4 w-20 bg-skeleton rounded animate-pulse"></div>
        </div>

        <div className="py-3 border-b border-border flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Liquidity</div>
          <div className="h-4 w-8 bg-skeleton rounded animate-pulse"></div>
        </div>


      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-lg border">
      <div className="pb-4 border-b border-border">
        <div className="text-muted-foreground text-sm">Your Market Value</div>
        <div className="text-xl font-bold">
          {formatCurrency(totalMarketValue)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {pricingData?.averagePrice
            ? `${formatCurrency(pricingData.averagePrice)} × ${assetsOwned} ${assetsOwned === 1 ? "asset" : "assets"}`
            : "Loading pricing data..."}
        </div>

        {/* Confidence Meter */}
        {pricingData && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Price Reliability</span>
            <ConfidenceMeter
              confidence={pricingData.confidence || 0}
              salesCount={pricingData.salesCount || 0}
              className="flex-2 ml-3"
            />
          </div>
        )}
      </div>

      <div className="py-3 border-b border-border flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Avg Sale Price</div>
        <div className="text-right text-sm font-semibold">
          {pricingData?.averagePrice
            ? formatCurrency(pricingData.averagePrice)
            : "--"}
        </div>
      </div>

      <div className="py-3 flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Liquidity</div>
        <div className="text-right flex items-center gap-1.5">
          {pricingData?.liquidity ? (
            <>
              <LiquidityIndicator value={pricingData.liquidity} showBars={true} showExitTime={false} />
              <ResponsiveTooltip
                title="Liquidity Rating"
                content={
                  <div>
                    <p className="font-medium mb-2">Liquidity Rating</p>
                    <div className="space-y-1 text-xs">
                      <p>Measures how quickly this card typically sells</p>
                      <p className="text-muted-foreground mt-2">
                        <strong>High:</strong> Extremely active market, sells within 1-3 weeks<br/>
                        <strong>Medium:</strong> Moderate demand, sells within 3-4 weeks<br/>
                        <strong>Low:</strong> Limited demand, 4+ weeks to sell<br/>
                        <strong>Unknown:</strong> Not enough sales data
                      </p>
                    </div>
                  </div>
                }
                trigger={<Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />}
              />
            </>
          ) : (
            <span className="text-sm font-semibold">--</span>
          )}
        </div>
      </div>


    </div>
  );
};

export default MarketValueCard;
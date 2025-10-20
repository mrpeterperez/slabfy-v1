/**
 * @file average-cost-card.tsx
 * @description Component that displays core investment metrics for an asset
 * @exports AverageCostCard
 * @feature asset-details
 */
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Asset } from "@shared/schema";
import { useVariations } from "../variations/variations-hook";

interface PricingData {
  averagePrice: number;
  confidence: number;
  liquidity: string;
}

interface AverageCostCardProps {
  asset: Asset;
  relatedAssets?: Asset[];
}

export const AverageCostCard: React.FC<AverageCostCardProps> = ({ asset, relatedAssets = [] }) => {
  // Get variations of the same card
  const { variations } = useVariations({ baseAsset: asset });

  // Fetch real-time pricing data from pricing API
  const { data: pricingData, isLoading } = useQuery<PricingData>({
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

  // Calculate metrics from real data
  const investmentData = useMemo(() => {
    // Calculate total assets owned (current + related)
    const assetsOwned = 1 + relatedAssets.length; // Current asset + related assets
    
    // Calculate total cost across all assets
    const currentPrice = asset.purchasePrice ? Number(asset.purchasePrice) : 0;
    const relatedPrices = relatedAssets.reduce((sum, relatedAsset) => {
      return sum + (relatedAsset.purchasePrice ? Number(relatedAsset.purchasePrice) : 0);
    }, 0);
    const totalCost = currentPrice + relatedPrices;
    const averageCost = assetsOwned > 0 ? totalCost / assetsOwned : 0;
    
    // Use stored PSA population data from the asset for this specific grade
    const totalPopForThisGrade = asset.totalPopulation || 0;
    
    // Calculate unrealized gain using real market data
    let unrealizedGain = null;
    let unrealizedGainPercent = null;
    if (pricingData?.averagePrice && totalCost > 0) {
      const totalMarketValue = pricingData.averagePrice * assetsOwned;
      const gainValue = totalMarketValue - totalCost;
      const gainPercent = (gainValue / totalCost) * 100;
      unrealizedGain = gainValue;
      unrealizedGainPercent = gainPercent;
    }
    
    return {
      averageCost,
      assetsOwned,
      totalPopForThisGrade,
      unrealizedGain,
      unrealizedGainPercent
    };
  }, [asset, relatedAssets, pricingData]);

  // Calculate holding period
  const holdingPeriod = useMemo(() => {
    if (!asset.purchaseDate) return "Not specified";
    
    const purchaseDate = new Date(asset.purchaseDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - purchaseDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} days`;
  }, [asset.purchaseDate]);

  const percentOwned = investmentData.totalPopForThisGrade > 0 
    ? (() => {
        const percentage = (investmentData.assetsOwned / investmentData.totalPopForThisGrade) * 100;
        // Show more precision for very small percentages
        if (percentage < 0.1 && percentage > 0) {
          return percentage.toFixed(3);
        } else {
          return percentage.toFixed(1);
        }
      })()
    : "0.0";

  // Get the actual grade for display
  const gradeDisplay = asset.grade || "Unknown";

  return (
    <div className="bg-card p-6 rounded-lg border">
      <div className="pb-4 border-b border-border">
        <div className="text-muted-foreground text-sm">Your Average Cost</div>
        <div className="text-xl font-bold">
          {investmentData.averageCost > 0 ? (
            `$${investmentData.averageCost.toFixed(2)}`
          ) : (
            <span className="text-muted-foreground">No Purchase Price</span>
          )}
        </div>
      </div>

      <div className="py-3 border-b border-border flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Assets Owned</div>
        <div className="font-semibold text-right text-sm">
          {investmentData.assetsOwned}
          {investmentData.totalPopForThisGrade > 0 && (
            <span className="text-sm text-muted-foreground ml-2 font-normal">
              ({percentOwned}% of {gradeDisplay})
            </span>
          )}
        </div>
      </div>

      <div className="py-3 border-b border-border flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Unrealized Gain</div>
        <div className="text-right text-sm">
          {isLoading ? (
            <div className="h-4 w-24 bg-skeleton rounded animate-pulse"></div>
          ) : investmentData.unrealizedGain !== null ? (
            <span className={`font-semibold ${investmentData.unrealizedGain >= 0 ? "text-success" : "text-destructive"}`}>
              {investmentData.unrealizedGain >= 0 ? "+" : ""}${Math.abs(investmentData.unrealizedGain).toFixed(2)}({investmentData.unrealizedGain >= 0 ? "+" : ""}{investmentData.unrealizedGainPercent?.toFixed(2)}%)
            </span>
          ) : (
            <span className="text-muted-foreground">No Purchase Price</span>
          )}
        </div>
      </div>

      <div className="py-3 flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Holding Period</div>
        <div className="font-semibold text-right text-sm">
          {holdingPeriod}
        </div>
      </div>
    </div>
  );
};

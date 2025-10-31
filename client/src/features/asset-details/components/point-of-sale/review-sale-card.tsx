// 🤖 INTERNAL NOTE (LLM):
// This file defines the ReviewSaleCard component for handling in-person card sales.
// It displays a transaction interface with price input, quantity selection, and profit calculation.
// Part of the `asset-details` feature, under the point-of-sale subfolder.
// Enhanced with real pricing data and proper calculations.

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Asset } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/query-keys";
import { PRICING_CACHE } from "@/lib/cache-tiers";

interface RealTimePricingData {
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  liquidity: string;
  confidence: number;
  salesCount: number;
  lastSaleDate: string;
}

interface ReviewSaleCardProps {
  asset: Asset;
  relatedAssets?: Asset[];
  isOwner?: boolean;
  isSold?: boolean;
}

export const ReviewSaleCard: React.FC<ReviewSaleCardProps> = ({ 
  asset, 
  relatedAssets = [],
  isOwner = false,
  isSold: soldFromProps = false
}) => {
  // Check if asset is sold (from props or asset data)
  const isSold = soldFromProps || asset?.ownershipStatus === 'sold';
  
  const [activeTab, setActiveTab] = useState("sell");
  const [sellPrice, setSellPrice] = useState("0.00");
  const [quantity, setQuantity] = useState(1);

  // Calculate total assets owned
  const assetsOwned = 1 + relatedAssets.length;

  // Fetch real-time pricing data
  const { data: pricingData, isLoading, isFetching } = useQuery<RealTimePricingData>({
    queryKey: queryKeys.pricing.single(asset.id),
    queryFn: async () => {
      const response = await fetch(`/api/pricing/${asset.id}`);
      if (!response.ok) throw new Error("Failed to fetch pricing data");
      return response.json();
    },
    enabled: !!asset?.id,
    placeholderData: (previousData) => previousData,
    ...PRICING_CACHE,
  });

  // Set default sell price when pricing data loads
  React.useEffect(() => {
    if (pricingData?.averagePrice && sellPrice === "0.00") {
      setSellPrice(pricingData.averagePrice.toFixed(2));
    }
  }, [pricingData?.averagePrice, sellPrice]);

  // Use the asset data with real pricing
  const assetData = useMemo(() => ({
    currentPrice: pricingData?.averagePrice || 0,
    availableQuantity: assetsOwned,
    costPerAsset: Number(asset?.purchasePrice) || pricingData?.averagePrice || 0,
  }), [pricingData?.averagePrice, assetsOwned, asset.purchasePrice]);

  // Calculate values
  const numericSellPrice = parseFloat(sellPrice) || 0;
  const pricePercentDiff = assetData.currentPrice > 0 
    ? ((numericSellPrice - assetData.currentPrice) / assetData.currentPrice) * 100
    : 0;
  const totalSale = numericSellPrice * quantity;
  const totalCost = assetData.costPerAsset * quantity;
  const netProfit = totalSale - totalCost;

  // Handle quantity adjustments
  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const incrementQuantity = () => {
    if (quantity < assetData.availableQuantity) setQuantity(quantity + 1);
  };

  // If user doesn't own this asset, show "Buy Asset (Coming Soon)" placeholder
  if (!isOwner) {
    return (
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="flex border-b">
          <div className="flex-1 py-5 text-center font-bold text-md border-b-4 border-primary">
            Buy Asset
          </div>
        </div>
        <div className="p-6 flex flex-col items-center justify-center min-h-[320px]">
          <div className="text-lg font-bold text-muted-foreground mb-2">
            Coming Soon
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Contact dealers to purchase this card.
          </p>
          {pricingData && (
            <div className="mt-4 text-center">
              <div className="text-xs text-muted-foreground">Market Price</div>
              <div className="text-2xl font-bold text-success">
                ${pricingData.averagePrice.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="flex border-b">
          <div className="flex-1 py-5 text-center font-bold text-md border-b-4 border-success">
            {isSold ? "Asset Sold" : "Sell Asset"}
          </div>
          {!isSold && (
            <div className="flex-1 py-4 text-center font-bold text-md text-muted-foreground">
              Buy Asset
            </div>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div className="h-16 bg-skeleton rounded animate-pulse"></div>
          <div className="h-16 bg-skeleton rounded animate-pulse"></div>
          <div className="h-8 bg-skeleton rounded animate-pulse"></div>
          <div className="h-8 bg-skeleton rounded animate-pulse"></div>
          <div className="h-8 bg-skeleton rounded animate-pulse"></div>
          <div className="h-10 bg-skeleton rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // If asset is sold, show sold state
  if (isSold) {
    return (
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="flex border-b">
          <div className="flex-1 py-5 text-center font-bold text-md border-b-4 border-muted">
            Asset Sold
          </div>
        </div>
        <div className="p-6 flex flex-col items-center justify-center min-h-[320px]">
          <div className="text-lg font-bold text-muted-foreground">
            This asset has been sold
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            This asset is no longer in your active inventory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b">
        <Button
          variant="ghost"
          size="lg"
          onClick={() => setActiveTab("sell")}
          className={`flex-1 rounded-none font-bold ${activeTab === "sell" ? "border-b-4 border-success text-foreground" : "text-muted-foreground border-b-4 border-transparent"}`}
        >
          Sell Asset
        </Button>
        {!isSold && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setActiveTab("buy")}
            className={`flex-1 rounded-none font-bold ${activeTab === "buy" ? "border-b-4 border-success text-foreground" : "text-muted-foreground border-b-4 border-transparent"}`}
          >
            Buy Asset
          </Button>
        )}
      </div>

      {/* Sell Content */}
      {activeTab === "sell" ? (
        <div className="p-5">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="text-md font-medium mb-0">Sell Price</div>
                <div className="flex items-baseline">
                  <span className="text-lg font-bold">$</span>
                  <span className="text-lg font-bold">
                    {Number(assetData.currentPrice || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="relative">
                <span
                  className="absolute text-lg font-normal text-muted-foreground"
                  style={{
                    left: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  $
                </span>
                <input
                  type="text"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="bg-primary-container w-28 h-12 pl-1 pr-2 py-4 border rounded-full text-right text-lg font-normal pr-4 "
                />
              </div>
            </div>
            {pricePercentDiff !== 0 && (
              <div className="text-right mt-2 text-sm">
                <span
                  className={
                    pricePercentDiff > 0
                      ? "text-emerald-500"
                      : "text-destructive"
                  }
                >
                  {pricePercentDiff > 0 ? "+" : ""}
                  {Number(pricePercentDiff || 0).toFixed(2)}%
                </span>
                <span className="text-muted-foreground ml-1">vs market</span>
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="flex justify-between">
              <div className="text">
                <div className="text-sm font-medium">Quantity</div>
                <div className="text-sm text-muted-foreground">
                  {assetsOwned} Available
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center ${quantity <= 1 ? "text-muted-foreground/50" : "text-foreground hover:bg-hover-muted"}`}
                >
                  <span className="text-sm">−</span>
                </button>
                <div className="w-12 h-9 mx-2 rounded-full border flex items-center justify-center text-base">
                  {quantity}
                </div>
                <button
                  onClick={incrementQuantity}
                  disabled={quantity >= assetData.availableQuantity}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center ${quantity >= assetData.availableQuantity ? "text-muted-foreground/50" : "text-foreground hover:bg-hover-muted"}`}
                >
                  <span className="text-sm">+</span>
                </button>
              </div>
            </div>
          </div>

          <div className="py-3 border-t border-border flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Avg Cost</div>
            <div className="text-sm font-semibold text-right">
              ${Number(assetData.costPerAsset || 0).toFixed(2)}
            </div>
          </div>

          <div className="py-3 border-t border-border flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Total Sale</div>
            <div className="text-sm font-bold text-right">
              ${Number(totalSale || 0).toFixed(2)}
            </div>
          </div>

          <div className="py-3 border-t flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Net Profit</div>
            <div
              className={`text-sm font-bold text-right ${netProfit >= 0 ? "text-success" : "text-destructive"}`}
            >
              {netProfit >= 0 ? "+" : ""}${Math.abs(Number(netProfit || 0)).toFixed(2)}
            </div>
          </div>

          {/* Review Sale Button with Coming Soon Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full mt-6 rounded-full h-9 font-bold text-sm">
                Review Sale
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Coming Soon</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-muted-foreground">
                  Point of sale functionality is coming soon! We're working hard to bring you a complete sales tracking system.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="p-6 flex flex-col items-center justify-center min-h-[320px]">
          <div className="text-lg font-bold text-muted-foreground">
            Coming Soon
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            The buying feature is under development and will be available soon.
          </p>
        </div>
      )}
    </div>
  );
};

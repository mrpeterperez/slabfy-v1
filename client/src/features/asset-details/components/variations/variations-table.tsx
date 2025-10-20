// 🤖 INTERNAL NOTE (LLM):
// This file defines the VariationsTable component that displays owned variants of a specific card.
// Shows different grades, variants, and parallels of the same base card in a portfolio-style table.
// Part of the `asset-details` feature, under the variations subfolder.
// Depends on shared Asset schema and portfolio table styling patterns.

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Asset } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Award,
  TrendingUp, 
  Hash,
  Palette,
  List,
  Grid3X3,
  DollarSign
} from "lucide-react";

import { GridViewV0 } from "@/features/my-portfolio-v0/components/grid-view/grid-view-v0";
import { OwnershipBadge, getOwnershipType } from "@/components/ui/ownership-badge";
import { PortfolioSparkline } from "@/components/ui/metrics/sparkline/portfolio-sparkline";

// Optimized thumbnail component for cached image data
const VariationThumbnail = ({ 
  src, 
  alt, 
  className 
}: { 
  src: string; 
  alt: string; 
  className: string; 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImageError(true);
      return;
    }
    
    setImageLoaded(false);
    setImageError(false);
    
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  // Show skeleton while image loads
  if (!imageError && !imageLoaded && src) {
    return <Skeleton className="w-full h-full" />;
  }

  // Show fallback icon for error or no source
  if (!src || imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Award className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  // Show actual image when loaded
  return <img src={src} alt={alt} className={className} />;
};


export interface VariationsTableProps {
  baseAsset: Asset;
  variations: Asset[];
}

interface VariationItem {
  id: string;
  title: string;
  certNumber: string;
  grade: string;
  grader: string;
  variant: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  estimatedValue: number | null;
  returnPercentage: number | null;
  imageUrl: string | null;
  ownType: string;
  psaImageUrl: string | null;
}

// Pricing API response type (matching backend structure)
interface PricingData {
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  liquidity: string;
  confidence: number;
  lastSaleDate: string | null;
  salesCount: number;
  exitTime: string;
  pricingPeriod: string;
  thirtyDaySalesCount: number;
}

// Pricing component for individual assets in the Current Value column
const VariationPricing = ({ assetId }: { assetId: string }) => {
  const { data: pricingData, isLoading } = useQuery<PricingData>({
    queryKey: [`/api/pricing/${assetId}`],
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-12 bg-skeleton rounded"></div>
      </div>
    );
  }

  const marketValue = pricingData?.averagePrice || 0;
  const formattedValue = marketValue > 0 ? marketValue.toFixed(2) : "-";

  return (
    <span className="font-medium">{formattedValue}</span>
  );
};

function formatCurrency(amount: number | null): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export const VariationsTable: React.FC<VariationsTableProps> = ({
  baseAsset,
  variations
}) => {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const variationItems = useMemo(() => {
    // Include the base asset in the variations list
    const allVariations = [baseAsset, ...variations];
    
    return allVariations.map(asset => {
      const purchasePrice = asset.purchasePrice ? Number(asset.purchasePrice) : null;
      const estimatedValue = purchasePrice; // Using purchase price as estimated value for now
      const returnPercentage = calculateReturn(purchasePrice, estimatedValue);
      
      return {
        id: asset.id,
        title: asset.title || 'Unknown Card',
        certNumber: asset.certNumber || 'Unknown',
        grade: asset.grade || 'Ungraded',
        grader: asset.grader || 'Unknown',
        variant: asset.variant,
        purchasePrice,
        purchaseDate: asset.purchaseDate || null,
        estimatedValue,
        returnPercentage,
        imageUrl: asset.imageUrl || null,
        ownershipStatus: asset.ownershipStatus || 'own',
        psaImageUrl: asset.psaImageFrontUrl || null
      };
    });
  }, [baseAsset, variations]);

  function calculateReturn(purchasePrice: number | null, currentValue: number | null): number | null {
    if (!purchasePrice || !currentValue || purchasePrice === 0) return null;
    return ((currentValue - purchasePrice) / purchasePrice) * 100;
  }



  function formatPercentage(percentage: number | null): string {
    if (percentage === null) return '-';
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  }

  function getVariantDisplay(variant: string | null | undefined): string {
    if (!variant) return 'Base';
    return variant;
  }

  function getReturnColor(percentage: number | null): string {
    if (percentage === null) return 'text-muted-foreground';
    return percentage >= 0 ? 'text-success' : 'text-destructive';
  }

  // Convert variation items to Asset objects for grid view
  const allVariationsAssets = useMemo(() => {
    return [baseAsset, ...variations];
  }, [baseAsset, variations]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Variations
        </h2>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="w-9 h-9 p-0 flex items-center justify-center"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="w-9 h-9 p-0 flex items-center justify-center"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Separator className="mb-6"/>
      
      <Card>
      <CardContent>
        {variationItems.length > 0 ? (
          viewMode === "list" ? (
            /* List View - Table - matching asset-breakdown-table layout exactly */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-card border-b">
                    <th className="text-left py-4 px-4 font-medium text-sm w-1/4">
                      Card
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-sm">
                      Grade
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-sm">
                      Parallel
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-sm">
                      Ownership
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-sm">
                      Price
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-sm">
                      Return
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-sm w-28">
                      Trend
                    </th>
                  </tr>
                </thead>
                  <tbody>
                    {variationItems.map((item, index) => {
                      // Determine return text color class based on value
                      const returnColorClass = item.returnPercentage && item.returnPercentage >= 0 
                        ? 'text-success' 
                        : 'text-destructive';

                      // Determine grade badge color class
                      let gradeBadgeClass = 'bg-muted text-foreground'; // Default for other grades
                      
                      if (item.grade.includes('10')) {
                        gradeBadgeClass = 'bg-success-subtle text-success';
                      } else if (item.grade.includes('9')) {
                        gradeBadgeClass = 'bg-brand-subtle text-brand';
                      } else if (item.grade.includes('PSA')) {
                        gradeBadgeClass = 'bg-warning-subtle text-warning';
                      }

                      return (
                        <tr 
                          key={index} 
                          className="border-b border-border hover:bg-hover-muted last:border-b-0 cursor-pointer"
                          onClick={() => window.open(`/assets/${item.id}`, '_blank')}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {/* Thumbnail */}
                              <div className="w-16 h-auto bg-muted rounded border flex items-center justify-center overflow-hidden relative flex-shrink-0">
                                <VariationThumbnail 
                                  src={(item.psaImageUrl || item.imageUrl) || ''}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              {/* Title and Cert Number */}
                              <div className="flex flex-col min-w-0 max-w-[140px]">
                                <span className="font-medium text-xs leading-tight">
                                  {item.title}
                                </span>
                                <div className="flex items-center gap-1 mt-1">
                                  <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="text-xs text-muted-foreground">
                                    {item.certNumber}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-4">
                            <span className={`${gradeBadgeClass} py-1 px-2 rounded-lg text-xs font-medium`}>
                              {item.grader} {item.grade}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm">
                              {getVariantDisplay(item.variant)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <OwnershipBadge type={getOwnershipType({ ownershipStatus: item.ownershipStatus })} />
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center">
                              <DollarSign className="text-muted-foreground mr-1" size={16} />
                              <VariationPricing assetId={item.id} />
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {item.returnPercentage !== null ? (
                              <div className="flex items-center">
                                <TrendingUp className={`${returnColorClass} mr-1`} size={16} />
                                <span className={`font-medium ${returnColorClass}`}>
                                  {item.returnPercentage >= 0 ? '+' : ''}{item.returnPercentage.toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center">
                              <PortfolioSparkline assetId={item.id} className="" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
          ) : (
            /* Grid View */
            <GridViewV0 
              assets={allVariationsAssets}
              onEdit={(asset) => window.open(`/assets/${asset.id}`, '_blank')}
              onDelete={() => {}} 
              size="m"
              visible={{}}
            />
          )
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No variations found for this card</p>
          </div>
        )}

        {variationItems.length === 1 && (
          <div className=" text-center py-4 text-muted-foreground border-t">
            <p className="text-sm">
              You own 1 variation of this card. Future updates will show all available market variations.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};
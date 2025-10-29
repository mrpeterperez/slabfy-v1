/**
 * ChartLegend Component
 * 
 * Purpose: Displays comprehensive chart information in top-left corner including confidence meter
 * Exports: ChartLegend (default)
 * Feature: asset-details/trading-chart
 * 
 * Usage: Complete chart header with asset details, pricing, and confidence
 */

import { useRef, useState } from 'react';
import { Asset } from "@shared/schema";
import { ConfidenceMeter } from "../confidence-rating";
import { SalesRecord } from "@shared/sales-types";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import { ImageLightbox } from '@/components/ui/image-lightbox';




interface ChartLegendProps {
  cardData?: Asset | null;
  symbolName?: string;
  averagePrice?: number;
  hoveredPrice?: number | null;
  hoveredDate?: string | null;
  isMobile?: boolean;
  salesData?: SalesRecord[];
  isLoadingSales?: boolean;
  salesCount?: number;
  liquidityRating?: string;
  confidence?: number; // 0-100 percentage from pricing API
  pricingData?: any; // Include full pricing data
  isMarkerTooltipVisible?: boolean; // Hide legend price when marker tooltip is shown
  isRollingAverage?: boolean; // True when hovering over rolling average vs individual sale
  rollingAveragePrice?: number | null; // Rolling average price when hovering
  individualSalePrice?: number | null; // Individual sale price when hovering
  saleType?: string | null; // Type of sale (Buy It Now, Auction, etc.)
  source?: string | null; // Source of sale (ebay, slabfy_cash, slabfy_credit_card)
}

export default function ChartLegend({
  cardData,
  symbolName = '',
  averagePrice = 0,
  hoveredPrice = null,
  hoveredDate = null,
  isMobile = false,
  salesData = [],
  isLoadingSales = false,
  salesCount = 0,
  liquidityRating = 'cold',
  confidence = 0,
  pricingData,
  isMarkerTooltipVisible = false,
  isRollingAverage = false,
  rollingAveragePrice = null,
  individualSalePrice = null,
  saleType = null,
  source = null
}: ChartLegendProps) {
  const legendRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Build image array for lightbox
  const lightboxImages: string[] = [];
  if (cardData?.psaImageFrontUrl) lightboxImages.push(cardData.psaImageFrontUrl);
  if (cardData?.psaImageBackUrl) lightboxImages.push(cardData.psaImageBackUrl);
  if (cardData?.assetImages && Array.isArray(cardData.assetImages)) {
    lightboxImages.push(...cardData.assetImages);
  }
  if (lightboxImages.length === 0 && cardData?.imageUrl) {
    lightboxImages.push(cardData.imageUrl);
  }

  // Display image for thumbnail (first image or placeholder)
  const displayImage = cardData?.psaImageFrontUrl || 
                       (cardData?.assetImages && cardData.assetImages[0]) || 
                       cardData?.imageUrl || 
                       PLACEHOLDER_IMAGE_URL;

  // Format price with dollar sign
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  // When hovering: show hovered price, but hide it if we have a custom tooltip showing
  // When not hovering: show market value (averagePrice from pricing API)
  const displayPrice = hoveredPrice !== null ? hoveredPrice : averagePrice;
  
  // When not hovering, show dynamic market average period from API
  const getMarketAveragePeriod = () => {
    if (pricingData?.pricingPeriod) {
      return `Average (${pricingData.pricingPeriod})`;
    }
    return 'Average'; // Fallback if pricing data not available
  };
  
  // When hovering over rolling average or individual sales, show appropriate label
  const getHoverLabel = () => {
    if (hoveredDate) {
      if (isRollingAverage) {
        return `Rolling Average • ${hoveredDate}`;
      } else {
        return `Sale • ${hoveredDate}`;
      }
    }
    return getMarketAveragePeriod();
  };
  
  const displayDate = hoveredPrice !== null ? getHoverLabel() : getMarketAveragePeriod();
  const formattedPrice = displayPrice ? formatPrice(displayPrice) : null;
  
  // Only show confidence when not hovering over any data points
  const showConfidence = hoveredPrice === null && !isMarkerTooltipVisible;
  
  // Show price when not hovering (market average) OR when hovering over rolling average 
  const showPrice = !isMarkerTooltipVisible;
  
  // Loading state for pricing data
  const isPricingLoading = !averagePrice && isLoadingSales;

  // Build complete asset title with variant
  const buildAssetTitle = () => {
    if (cardData) {
      const parts = [];
      if (cardData.year) parts.push(cardData.year);
      if (cardData.setName) parts.push(cardData.setName);
      return parts.join(' ');
    }
    return symbolName;
  };

  // Build player info with variant
  const buildPlayerInfo = () => {
    if (cardData) {
      const parts = [];
      if (cardData.playerName) parts.push(cardData.playerName);
      if (cardData.variant && cardData.variant !== "BASE") parts.push(`- ${cardData.variant}`);
      if (cardData.cardNumber) parts.push(`- #${cardData.cardNumber}`);
      if (cardData.grade) {
        // Include grading company (PSA) before the grade
        if (cardData.grade.toLowerCase().includes('gem mt')) {
          parts.push('- PSA GEM MT 10');
        } else if (cardData.grade.toLowerCase().includes('psa')) {
          parts.push(`- ${cardData.grade}`);
        } else {
          parts.push(`- PSA ${cardData.grade}`);
        }
      }
      return parts.join(' ');
    }
    return '';
  };

  const assetTitle = buildAssetTitle();
  const playerInfo = buildPlayerInfo();

  return (
    <div 
      ref={legendRef}
      className={`${isMobile ? 'relative' : 'absolute top-3 left-3'} z-20 pointer-events-auto ${isMobile ? 'flex gap-3' : ''}`}
      style={{
        fontFamily: 'inherit',
        maxWidth: isMobile ? '100%' : '70%'
      }}
    >
      {/* Mobile: 68px Image on the left */}
      {isMobile && cardData && (
        <div className="w-20 h-auto flex-shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
          <img
            src={displayImage}
            alt="Card"
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              setLightboxIndex(0);
              setLightboxOpen(true);
            }}
          />
        </div>
      )}

      {/* Legend Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Asset Set Title */}
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
          <span className="truncate">{assetTitle}</span>
          {cardData && <VerifiedBadge asset={cardData} className="flex-shrink-0" />}
        </div>
      
        {/* Player Name and Variant */}
        {playerInfo && (
          <div className="text-xs text-muted-foreground mb-1 truncate">
            {playerInfo}
          </div>
        )}

        {/* Serial Number */}
        {cardData?.serialNumbered && (cardData?.serialNumber || cardData?.serialMax) && (
          <div className="text-xs text-muted-foreground mb-1 truncate">
            Serial: {cardData?.serialNumber || "?"}/{cardData?.serialMax || "?"}
          </div>
        )}
      
        {/* Price with Optional Confidence */}
        <div className="flex items-center gap-3 mb-1">
          {isPricingLoading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
          ) : showPrice ? (
            <div className="flex items-center gap-3">
              {/* Primary price - rolling average when available, otherwise regular price */}
              <span className="text-2xl font-bold text">
                {rollingAveragePrice ? formatPrice(rollingAveragePrice) : formattedPrice}
              </span>
              
              {/* Secondary price - individual sale when both are available */}
              {rollingAveragePrice && individualSalePrice && (
                <span className="flex items-center gap-1">
                  <span className="text-sm font-bold text-success">
                    {formatPrice(individualSalePrice)}
                  </span>
                  {source && (
                    <>
                      <span className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>•</span>
                      <span className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                        {source.includes('slabfy') ? 'Slabfy' : 'eBay'}
                      </span>
                    </>
                  )}
                  {saleType && (
                    <>
                      <span className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>•</span>
                      <span className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                        {saleType}
                      </span>
                    </>
                  )}
                </span>
              )}
            </div>
          ) : null}
          {showConfidence && !isPricingLoading && confidence > 0 && (
            <ConfidenceMeter 
              confidence={confidence} 
              salesCount={pricingData?.salesCount || salesCount || 0} 
            />
          )}
        </div>
        
        {/* Date/Period */}
        <div className="text-xs text-muted-foreground mb-2 truncate">
          {displayDate}
        </div>

        {/* Sales Count and Liquidity Rating - hide when hovering over specific data points */}
        {isPricingLoading ? (
          <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
        ) : (salesCount > 0 && showConfidence) ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{salesCount} sales</span>
            <span>•</span>
            <span className={`capitalize ${
              liquidityRating === 'fire' ? 'text-destructive' :
              liquidityRating === 'hot' ? 'text-warning' :
              liquidityRating === 'warm' ? 'text-warning' :
              liquidityRating === 'cool' ? 'text-brand' :
              'text-muted-foreground'
            }`}>
              {liquidityRating}
            </span>
          </div>
        ) : null}
      </div>

      {/* Lightbox */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
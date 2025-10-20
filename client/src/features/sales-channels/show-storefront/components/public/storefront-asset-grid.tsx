// 🤖 INTERNAL NOTE:
// Purpose: Storefront inventory grid - completely rebuilt with proper brand color control
// Exports: StorefrontAssetGrid component
// Feature: sales-channels/show-storefront
// Dependencies: Basic HTML elements with inline styles for bulletproof brand color application

import { useState, useEffect } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { AssetSummary } from '@/components/asset/asset-summary';
import { AssetTypeBadge } from '@/components/ui/asset-type-badge';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import { ShoppingCart } from 'lucide-react';
import { getActiveColors } from '../../utils/theme-utils';
import { getContrastColor } from '../../utils/color-utils';
import type { StorefrontInventoryItem } from '../../hooks/use-storefront-inventory';
import type { StorefrontSettings } from '@shared/schema';

interface StorefrontAssetGridProps {
  assets: StorefrontInventoryItem[];
  settings: Partial<StorefrontSettings> | null;
  onAddToCart?: (asset: StorefrontInventoryItem) => void;
  onAssetClick?: (asset: StorefrontInventoryItem) => void;
  size?: 's' | 'm' | 'l';
}

const StorefrontAssetCard = ({
  asset,
  settings,
  onAddToCart,
  onAssetClick,
  size = 'm',
}: {
  asset: StorefrontInventoryItem;
  settings: Partial<StorefrontSettings> | null;
  onAddToCart?: (asset: StorefrontInventoryItem) => void;
  onAssetClick?: (asset: StorefrontInventoryItem) => void;
  size?: 's' | 'm' | 'l';
}) => {
  // Force re-render when theme changes via floating toggle
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const handleThemeChange = () => forceUpdate({});
    window.addEventListener('storage', handleThemeChange);
    return () => window.removeEventListener('storage', handleThemeChange);
  }, []);
  
  // Get active theme colors
  const colors = getActiveColors(settings);
  const buttonRadius = settings?.buttonRadius || 16;
  const headingFont = settings?.headingFont || 'Inter';
  const bodyFont = settings?.fontStyle || 'Inter';
  
  // Calculate muted text color (60% opacity of main text color)
  const mutedTextColor = colors.textColor + '99'; // Add alpha for opacity
  
  // List price from inventory asking price
  const listPrice = asset.askingPrice ? parseFloat(asset.askingPrice) : 0;

  const handleCardClick = () => {
    if (onAssetClick) {
      onAssetClick(asset);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(asset);
    }
  };

  return (
    <div className={cn(
      "group transition-all duration-200",
      size === 's' && "text-[13px]"
    )}>
      {/* Card Image */}
      <div 
        className={cn(
          "w-full mb-3 relative overflow-hidden cursor-pointer bg-white",
          size === 's' ? 'rounded-sm' : 'rounded-lg'
        )}
        onClick={handleCardClick}
      >
        <img
          src={asset.psaImageFrontUrl || PLACEHOLDER_IMAGE_URL}
          alt={asset.title || 'Card'}
          className="w-full h-auto transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Card Details */}
      <div 
        className={cn(
          "space-y-2 px-0",
          size === 's' && "space-y-1.5"
        )}
      >
        {/* Card Info */}
        <div 
          className={cn(
            "cursor-pointer",
            size === 'l' ? 'text-base' : 'text-sm'
          )}
          onClick={handleCardClick}
        >
          <AssetSummary
            year={asset.year as any}
            setName={asset.setName}
            playerName={asset.playerName}
            cardNumber={asset.cardNumber as any}
            grade={asset.grade as any}
            gradeCompany={(asset as any).grader || 'PSA'}
            certNumber={(asset as any).certNumber as any}
            size={size === 's' ? 'sm' : 'md'}
            className="w-full"
            headingFont={headingFont}
            bodyFont={bodyFont}
            textColor={colors.textColor}
            mutedTextColor={mutedTextColor}
          />
        </div>

        {/* Type Badge */}
        <div className="flex gap-1 flex-wrap">
          <AssetTypeBadge type={asset.type || 'raw'} />
        </div>

        {/* List Price */}
        <div className="space-y-1">
          <div className={cn(
            "flex justify-between items-center",
            size === 's' ? 'text-xs' : 'text-sm'
          )}>
            <span 
              style={{ 
                fontFamily: bodyFont,
                color: mutedTextColor,
              }}
            >
              List Price:
            </span>
            <span 
              className="font-mono font-semibold text-lg"
              style={{ 
                fontFamily: bodyFont,
                color: colors.textColor,
              }}
            >
              {formatCurrency(listPrice)}
            </span>
          </div>
        </div>
        
        {/* Add to Cart Button - Below price */}
        <button
          onClick={handleAddToCart}
          className="w-full mt-3 px-4 py-2.5 font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-80"
          style={{
            backgroundColor: colors.primaryColor,
            color: getContrastColor(colors.primaryColor),
            borderRadius: `${buttonRadius}px`,
            fontFamily: headingFont,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <ShoppingCart className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>
  );
};

export function StorefrontAssetGrid({ 
  assets, 
  settings,
  onAddToCart,
  onAssetClick,
  size = 'm' 
}: StorefrontAssetGridProps) {
  // Get active theme colors for empty state
  const colors = getActiveColors(settings);
  
  // Empty state
  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center" style={{ color: colors.textColor, opacity: 0.6 }}>
          <div className="text-lg font-medium">No inventory available</div>
          <div className="text-sm mt-1">Check back soon for new items</div>
        </div>
      </div>
    );
  }

  // Responsive grid layout based on size
  const layoutClass = size === 's'
    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3'
    : size === 'l'
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6'
      : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5';

  return (
    <div className={cn('px-2 sm:px-4 md:px-6 lg:px-8 pt-2 sm:pt-4 md:pt-6 lg:pt-8', layoutClass)}>
      {assets.map((asset) => (
        <StorefrontAssetCard
          key={asset.id}
          asset={asset}
          settings={settings}
          onAddToCart={onAddToCart}
          onAssetClick={onAssetClick}
          size={size}
        />
      ))}
    </div>
  );
}

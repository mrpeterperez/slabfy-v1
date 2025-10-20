// 🤖 INTERNAL NOTE:
// Purpose: Storefront inventory tab - Clean mobile-first version
// Exports: StorefrontInventoryTab component
// Feature: sales-channels/show-storefront

import { useState, useEffect } from "react";
import { Search, ArrowLeft, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getContrastColor } from "../../utils/color-utils";
import { getActiveColors } from "../../utils/theme-utils";
import { StorefrontAssetGrid } from "./storefront-asset-grid";
import type { StorefrontSettings } from "@shared/schema";
import type { Asset } from "@shared/schema";

export type ThemeMode = "light" | "dark" | "auto";

interface StorefrontInventoryTabProps {
  settings: Partial<StorefrontSettings> | null;
  assets: any[];
  isLoading?: boolean;
  userId?: string;
  themeMode?: ThemeMode;
  cartItemCount?: number;
  isPreview?: boolean; // Preview mode flag
  onNavigateHome?: () => void;
  onNavigateToAsset?: (assetId: string) => void;
  onAddToCart?: (asset: Asset) => void;
  onCartClick?: () => void;
}

export function StorefrontInventoryTab({ 
  settings, 
  assets, 
  isLoading = false,
  userId,
  themeMode = "light",
  cartItemCount = 0,
  isPreview = false,
  onNavigateHome,
  onNavigateToAsset,
  onAddToCart,
  onCartClick
}: StorefrontInventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const handleThemeChange = () => forceUpdate({});
    window.addEventListener('storage', handleThemeChange);
    return () => window.removeEventListener('storage', handleThemeChange);
  }, []);
  
  const colors = getActiveColors(settings);
  const contrastColor = getContrastColor(colors.primaryColor);

  const filteredAssets = (assets || []).filter((asset: any) => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    const fields = [
      asset.playerName,
      asset.setName,
      asset.variant,
      asset.cardNumber ? `#${asset.cardNumber}` : undefined,
      asset.year?.toString()
    ]
      .filter(Boolean)
      .map((v: string) => v.toLowerCase());
    return fields.some((f: string) => f.includes(search));
  });

  return (
    <div className={`${isPreview ? '' : 'h-screen'} flex flex-col`} style={{ backgroundColor: colors.backgroundColor }}>
      <div 
        className="flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${colors.primaryColor} 0%, ${colors.accentColor} 100%)`,
        }}
      >
        <div className="h-16 px-4 flex justify-between items-center relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNavigateHome}
            className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
            style={{ color: contrastColor }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            {settings?.storeLogo ? (
              <img 
                src={settings.storeLogo} 
                alt={settings.storeName || 'Store'} 
                className="w-8 h-8 rounded-full border-2 border-white"
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold border-2 border-white"
                style={{ color: settings?.primaryColor || "#0d9488" }}
              >
                {settings?.storeName?.split(' ').slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase() || 'SC'}
              </div>
            )}
            <h2 
              className="text-lg font-bold"
              style={{ 
                fontFamily: settings?.headingFont || "Inter",
                color: contrastColor
              }}
            >
              {settings?.storeName || "Store"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden md:flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-2 border border-white/30">
              <Search className="h-4 w-4 flex-shrink-0" style={{ color: contrastColor }} />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-32 bg-transparent border-0 text-sm placeholder:text-white/70 focus:outline-none"
                style={{ 
                  fontFamily: settings?.fontStyle || "Inter",
                  color: contrastColor
                }}
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onCartClick}
              className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 relative"
              style={{ color: contrastColor }}
            >
              <ShoppingCart className="h-5 w-5" />
              <div
                className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-xs font-bold flex items-center justify-center ${
                  cartItemCount > 0 ? 'bg-red-500' : 'bg-gray-400'
                }`}
              >
                {cartItemCount}
              </div>
            </Button>
          </div>
        </div>

        <div className="md:hidden px-4 pb-3">
          <div className="relative flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-2 border border-white/30">
            <Search className="h-4 w-4 flex-shrink-0" style={{ color: contrastColor }} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-0 text-sm placeholder:text-white/70 focus:outline-none"
              style={{ 
                fontFamily: settings?.fontStyle || "Inter",
                color: contrastColor
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-16 pt-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="mt-4 text-sm text-muted-foreground">Loading inventory...</p>
              </div>
            </div>
          ) : (
            <StorefrontAssetGrid
              assets={filteredAssets}
              settings={settings}
              onAddToCart={onAddToCart ? (asset) => onAddToCart(asset as any) : undefined}
              onAssetClick={onNavigateToAsset ? (asset) => onNavigateToAsset(asset.id) : undefined}
              size="m"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile Asset Detail Header
// Shows back chevron (left) + cert number (center) + 3-dot menu (right)
// Only visible on mobile (lg:hidden)

import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import AssetActions from "./asset-actions";
import type { Asset } from "@shared/schema";

interface MobileAssetHeaderProps {
  asset: Asset;
  isOwner?: boolean;
  isSold?: boolean;
}

export function MobileAssetHeader({ asset, isOwner, isSold }: MobileAssetHeaderProps) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    // Go back to previous page or default to portfolio
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/my-portfolio");
    }
  };

  // Build header text: "Grade - Player/Product Name"
  const getHeaderText = () => {
    // For graded cards
    if (asset.grader && asset.grade) {
      const graderPrefix = asset.grader === 'PSA' ? 'PSA' : asset.grader;
      const playerName = asset.playerName || asset.title || 'Card';
      return `${graderPrefix} ${asset.grade} - ${playerName}`;
    }
    
    // For raw cards
    if (asset.type === 'raw') {
      const playerName = asset.playerName || asset.title || 'Card';
      return `Raw - ${playerName}`;
    }
    
    // For sealed products
    if (asset.type === 'sealed') {
      const productName = asset.title || asset.setName || 'Sealed Product';
      return `Sealed - ${productName}`;
    }
    
    // Fallback
    return asset.playerName || asset.title || 'Asset Details';
  };

  return (
    <div className="!block lg:!hidden fixed top-0 inset-x-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto w-full px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Back Button - Left */}
          <button
            onClick={handleBack}
            className="flex items-center justify-center min-w-[48px] min-h-[48px] -ml-3"
            aria-label="Go back"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          {/* Cert Number - Center */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center max-w-[60%]">
            <h1 className="text-base font-semibold truncate">
              {getHeaderText()}
            </h1>
          </div>

          {/* 3-Dot Menu - Right */}
          <div className="flex items-center justify-center min-w-[48px] min-h-[48px]">
            <AssetActions asset={asset} isOwner={isOwner} isSold={isSold} />
          </div>
        </div>
      </div>
      {/* Safe area padding */}
      <div className="pt-[env(safe-area-inset-top)]" aria-hidden />
    </div>
  );
}

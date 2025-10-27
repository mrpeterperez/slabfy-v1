// 🤖 INTERNAL NOTE:
// Purpose: Mobile card view for portfolio assets with auto-scrolling ticker
// Exports: MobilePortfolioCard component
// Feature: my-portfolio-v0
// Dependencies: react, framer-motion, asset components, sparkline

import { motion } from 'framer-motion';
import type { Asset } from '@shared/schema';
import { AssetSummary } from '@/components/asset/asset-summary';
import { PortfolioSparkline } from '@/components/ui/metrics/sparkline';
import { Badge } from '@/components/ui/badge';
import { ConfidenceIndicator } from '@/components/ui/metrics/confidence-indicator';
import { LiquidityIndicator } from '@/components/ui/metrics/liquidity-indicator';
import { formatCurrency } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import { getOwnershipType } from '@/components/ui/ownership-badge';
import { AssetTypeBadge } from '@/components/ui/asset-type-badge';

interface MobilePortfolioCardProps {
  asset: Asset;
  market?: { 
    averagePrice: number; 
    confidence: number; 
    salesCount: number; 
    liquidity: string 
  };
  index: number;
  onClick: (asset: Asset) => void;
}

export function MobilePortfolioCard({ asset, market, index, onClick }: MobilePortfolioCardProps) {
  const averagePrice = market?.averagePrice || 0;
  const salesCount = market?.salesCount || 0;
  const confidence = market?.confidence || 0;
  const liquidity = market?.liquidity || 'cold';
  const hasMarket = (salesCount > 0) || (averagePrice > 0);

  // Build ticker content with all stats
  const ownershipLabel = getOwnershipType(asset) === 'consignment' ? 'Consignment' : 'Own';
  const typeLabel = (asset as any).type === 'graded' ? 'Graded' : (asset as any).type === 'raw' ? 'Raw' : 'Autograph';

  return (
    <motion.div
      className="w-full bg-background px-6 py-2 pt-4 text-left hover:bg-muted/30 transition-colors"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
    >
      {/* Main content row */}
      <div className="flex gap-4 relative">
        {/* Thumbnail - same as table */}
        <div className="h-auto w-14 flex-shrink-0 bg-muted rounded overflow-hidden flex items-center justify-center relative">
          <img 
            src={asset.psaImageFrontUrl || PLACEHOLDER_IMAGE_URL} 
            alt="card" 
            className="w-full h-full object-cover" 
          />
          {!asset.psaImageFrontUrl && (
            <div className="absolute bottom-1 right-1 h-3 w-3 bg-muted-foreground/80 rounded-full flex items-center justify-center">
              <span className="text-[8px] text-background font-bold">?</span>
            </div>
          )}
        </div>

        {/* Text content - clickable */}
        <button
          type="button"
          onClick={() => onClick(asset)}
          className="flex-1 min-w-0 text-left"
        >
          <AssetSummary
            year={asset.year as any}
            setName={asset.setName}
            playerName={asset.playerName}
            cardNumber={asset.cardNumber as any}
            grade={asset.grade as any}
            gradeCompany={(asset as any).grader || 'PSA'}
            certNumber={(asset as any).certNumber as any}
            size="md"
          />
        </button>

        {/* Price + Sparkline - top right */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 pr-2">
          <div className="text-base font-semibold tabular-nums">
            {hasMarket ? formatCurrency(averagePrice) : '—'}
          </div>
          <div className="w-32">
            <PortfolioSparkline assetId={asset.globalAssetId || asset.id} className="h-12" />
          </div>
        </div>
      </div>

      {/* Scrollable ticker */}
      <div 
        className="relative overflow-x-auto overflow-y-hidden h-7 flex items-center mt-2 -mx-6 px-6" 
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap pb-2">
          {/* Badge that scrolls with the ticker */}
          <AssetTypeBadge type={(asset as any).type} className="flex-shrink-0" />
          <span className="text-[10px]">{ownershipLabel}</span>
          <span className="text-muted-foreground/50">•</span>
          
          {/* Confidence Indicator */}
          <div className="flex items-center gap-1">
            <span className="text-[10px]">CNF:</span>
            <ConfidenceIndicator value={confidence} bars={4} className="scale-75 origin-left" />
          </div>
          <span className="text-muted-foreground/50">•</span>
          
          {/* Liquidity Indicator */}
          <div className="flex items-center gap-1">
            <span className="text-[10px]">LQ:</span>
            <LiquidityIndicator value={liquidity} showExitTime={false} showBars={true} className="scale-75 origin-left" />
          </div>
          <span className="text-muted-foreground/50">•</span>
          
          <span className="text-[10px]">LS: {hasMarket ? formatCurrency(averagePrice) : 'N/A'}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-[10px]">{salesCount} COMPS</span>

          {/* Duplicate for seamless loop */}
          <AssetTypeBadge type={(asset as any).type} className="flex-shrink-0 ml-6" />
          <span className="text-[10px]">{ownershipLabel}</span>
          <span className="text-muted-foreground/50">•</span>
          
          <div className="flex items-center gap-1">
            <span className="text-[10px]">CNF:</span>
            <ConfidenceIndicator value={confidence} bars={4} className="scale-75 origin-left" />
          </div>
          <span className="text-muted-foreground/50">•</span>
          
          <div className="flex items-center gap-1">
            <span className="text-[10px]">LQ:</span>
            <LiquidityIndicator value={liquidity} showExitTime={false} showBars={true} className="scale-75 origin-left" />
          </div>
          <span className="text-muted-foreground/50">•</span>
          
          <span className="text-[10px]">LS: {hasMarket ? formatCurrency(averagePrice) : 'N/A'}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-[10px]">{salesCount} COMPS</span>

          {/* Third repeat */}
          <AssetTypeBadge type={(asset as any).type} className="flex-shrink-0 ml-6" />
          <span className="text-[10px]">{ownershipLabel}</span>
          <span className="text-muted-foreground/50">•</span>
          
          <div className="flex items-center gap-1">
            <span className="text-[10px]">CNF:</span>
            <ConfidenceIndicator value={confidence} bars={4} className="scale-75 origin-left" />
          </div>
          <span className="text-muted-foreground/50">•</span>
          
          <div className="flex items-center gap-1">
            <span className="text-[10px]">LQ:</span>
            <LiquidityIndicator value={liquidity} showExitTime={false} showBars={true} className="scale-75 origin-left" />
          </div>
          <span className="text-muted-foreground/50">•</span>
          
          <span className="text-[10px]">LS: {hasMarket ? formatCurrency(averagePrice) : 'N/A'}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-[10px]">{salesCount} COMPS</span>
        </div>
      </div>

      {/* Bottom border */}
      <div className="h-px bg-border mt-2" />
    </motion.div>
  );
}

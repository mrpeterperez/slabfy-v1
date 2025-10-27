// 🤖 INTERNAL NOTE:
// Purpose: Mobile card view for portfolio assets with 3D rotating cube stats
// Exports: MobilePortfolioCard component
// Feature: my-portfolio-v0
// Dependencies: react, framer-motion, asset components, sparkline

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(false);
  const averagePrice = market?.averagePrice || 0;
  const salesCount = market?.salesCount || 0;
  const confidence = market?.confidence || 0;
  const liquidity = market?.liquidity || 'cold';
  const hasMarket = (salesCount > 0) || (averagePrice > 0);

  // Build stats for cube faces
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

      {/* 3D Rotating Cube Stats */}
      <AnimatePresence mode="wait">
        {!expanded ? (
          <motion.div 
            key="cube"
            className="relative h-16 flex items-center mt-2 cursor-pointer -mx-6"
            style={{ perspective: 1000 }}
            onClick={() => setExpanded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full h-full flex items-center px-4"
              animate={{ rotateX: [0, 90, 180, 270, 360] }}
              transition={{
                rotateX: {
                  repeat: Infinity,
                  duration: 12,
                  ease: "linear"
                }
              }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Face 1: Type, Ownership, Comps */}
              <motion.div
                className="absolute inset-0 flex items-center gap-2 px-4 text-xs text-muted-foreground"
                style={{ 
                  backfaceVisibility: "hidden",
                  transform: "rotateX(0deg) translateZ(32px)"
                }}
              >
                <AssetTypeBadge type={(asset as any).type} className="flex-shrink-0 text-[9px] h-5" />
                <span className="text-[10px]">{ownershipLabel}</span>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-[10px]">{salesCount} comps</span>
                {asset.certNumber && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-[9px] font-mono">#{asset.certNumber}</span>
                  </>
                )}
              </motion.div>

              {/* Face 2: Confidence & Liquidity bars */}
              <motion.div
                className="absolute inset-0 flex items-center gap-2 px-4 text-xs text-muted-foreground"
                style={{ 
                  backfaceVisibility: "hidden",
                  transform: "rotateX(90deg) translateZ(32px)"
                }}
              >
                <span className="text-[10px]">CNF:</span>
                <ConfidenceIndicator value={confidence} bars={4} className="scale-75 origin-left" />
                <span className="text-muted-foreground/50">•</span>
                <span className="text-[10px]">LQ:</span>
                <LiquidityIndicator value={liquidity} showExitTime={false} showBars={true} className="scale-75 origin-left" />
              </motion.div>

              {/* Face 3: Pricing data */}
              <motion.div
                className="absolute inset-0 flex items-center gap-2 px-4 text-xs text-muted-foreground"
                style={{ 
                  backfaceVisibility: "hidden",
                  transform: "rotateX(180deg) translateZ(32px)"
                }}
              >
                <span className="text-[10px]">LS: {hasMarket ? formatCurrency(averagePrice) : 'N/A'}</span>
                {asset.purchasePrice && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-[10px]">Cost: {formatCurrency(Number(asset.purchasePrice))}</span>
                  </>
                )}
                {asset.grader && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-[10px]">{asset.grader.toUpperCase()}</span>
                  </>
                )}
              </motion.div>

              {/* Face 4: Additional details */}
              <motion.div
                className="absolute inset-0 flex items-center gap-2 px-4 text-xs text-muted-foreground"
                style={{ 
                  backfaceVisibility: "hidden",
                  transform: "rotateX(270deg) translateZ(32px)"
                }}
              >
                {asset.serialNumbered && asset.serialNumber ? (
                  <>
                    <span className="text-[10px]">Serial: {asset.serialNumber}/{asset.serialMax || '?'}</span>
                    <span className="text-muted-foreground/50">•</span>
                  </>
                ) : null}
                {asset.purchaseDate && (
                  <>
                    <span className="text-[10px]">Acquired: {new Date(asset.purchaseDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    <span className="text-muted-foreground/50">•</span>
                  </>
                )}
                {asset.assetStatus && (
                  <span className="text-[10px] capitalize">{asset.assetStatus.replace('_', ' ')}</span>
                )}
              </motion.div>
            </motion.div>

            {/* Expand indicator */}
            <div className="absolute bottom-0 right-4 text-muted-foreground/50">
              <ChevronDown className="h-4 w-4" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            layout
            className="-mx-6 mt-2 cursor-pointer"
            onClick={() => setExpanded(false)}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Expanded full-width grid view */}
            <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-muted/30">
              {/* Row 1 */}
              {/* Type Badge */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-muted-foreground/70 uppercase">Type</span>
                <AssetTypeBadge type={(asset as any).type} className="flex-shrink-0 text-[9px] h-5" />
              </div>

              {/* Ownership */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-muted-foreground/70 uppercase">Own</span>
                <span className="text-[10px] font-medium">{ownershipLabel}</span>
              </div>

              {/* Comps Count */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-muted-foreground/70 uppercase">Comps</span>
                <span className="text-[10px] font-medium tabular-nums">{salesCount}</span>
              </div>

              {/* Row 2 */}
              {/* Confidence */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-muted-foreground/70 uppercase">Confidence</span>
                <ConfidenceIndicator value={confidence} bars={4} className="scale-75 origin-left" />
              </div>

              {/* Liquidity */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-muted-foreground/70 uppercase">Liquidity</span>
                <LiquidityIndicator value={liquidity} showExitTime={false} showBars={true} className="scale-75 origin-left" />
              </div>

              {/* Last Sale */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-muted-foreground/70 uppercase">Last Sale</span>
                <span className="text-[10px] font-medium tabular-nums">{hasMarket ? formatCurrency(averagePrice) : 'N/A'}</span>
              </div>

              {/* Row 3 - Additional data points */}
              {/* Purchase Price */}
              {asset.purchasePrice && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground/70 uppercase">Cost Basis</span>
                  <span className="text-[10px] font-medium tabular-nums">{formatCurrency(Number(asset.purchasePrice))}</span>
                </div>
              )}

              {/* Cert Number */}
              {asset.certNumber && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground/70 uppercase">Cert #</span>
                  <span className="text-[9px] font-mono text-muted-foreground truncate">{asset.certNumber}</span>
                </div>
              )}

              {/* Serial Number if available */}
              {asset.serialNumbered && asset.serialNumber && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground/70 uppercase">Serial</span>
                  <span className="text-[10px] font-medium tabular-nums">{asset.serialNumber}/{asset.serialMax || '?'}</span>
                </div>
              )}

              {/* Purchase Date */}
              {asset.purchaseDate && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground/70 uppercase">Acquired</span>
                  <span className="text-[9px] text-muted-foreground">{new Date(asset.purchaseDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              )}

              {/* Grader */}
              {asset.grader && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground/70 uppercase">Grader</span>
                  <span className="text-[10px] font-medium">{asset.grader.toUpperCase()}</span>
                </div>
              )}

              {/* Asset Status */}
              {asset.assetStatus && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground/70 uppercase">Status</span>
                  <span className="text-[10px] font-medium capitalize">{asset.assetStatus.replace('_', ' ')}</span>
                </div>
              )}
            </div>

            {/* Collapse indicator */}
            <div className="flex justify-center py-1 bg-muted/30">
              <ChevronUp className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom border */}
      <div className="h-px bg-border mt-2" />
    </motion.div>
  );
}

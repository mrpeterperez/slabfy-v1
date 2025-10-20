// 🤖 INTERNAL NOTE:
// Purpose: Auto-accept engine for smart buying desk filtering
// Exports: evaluateScan, calculateBuyPrice, estimateFlipTime
// Feature: buying-desk-v0

export interface BuyingDeskSettings {
  // Buy price
  defaultOfferPercentage: number;      // 90 = 90% of market
  housePercentage: number;             // 10 = 10% profit to you
  priceRounding: 1 | 5 | 10;
  
  // Smart filters
  autoDenyEnabled: boolean;
  minLiquidityLevel: 'fire' | 'hot' | 'warm' | 'cool' | 'cold';
  minConfidenceLevel: number;          // 0-100
  minMarketValue: number;              // $10 minimum
  
  // Exit strategy
  targetFlipDays: number;              // 14 = 2 weeks
  minRoiPercentage: number;            // 50 = 50% minimum ROI
}

export interface MarketData {
  averagePrice: number;
  confidence: number;
  liquidity: 'fire' | 'hot' | 'warm' | 'cool' | 'cold';
  salesCount: number;
}

export interface AssetData {
  id: string;
  playerName?: string;
  setName?: string;
  year?: string | number;
  cardNumber?: string;
  grade?: string;
  certNumber?: string;
}

export interface EvaluationResult {
  action: 'auto-accept' | 'auto-deny' | 'review';
  buyPrice?: number;
  expectedProfit?: number;
  expectedRoi?: number;
  reason: string;
  details?: string[];
}

// Liquidity ranking for comparison
const LIQUIDITY_RANK = {
  fire: 5,
  hot: 4,
  warm: 3,
  cool: 2,
  cold: 1,
};

/**
 * Calculate buy price based on market value and settings
 */
export function calculateBuyPrice(
  marketValue: number,
  offerPercentage: number,
  rounding: 1 | 5 | 10
): number {
  const rawPrice = marketValue * (offerPercentage / 100);
  
  // Round to nearest specified amount
  if (rounding === 1) {
    return Math.round(rawPrice);
  }
  
  return Math.round(rawPrice / rounding) * rounding;
}

/**
 * Estimate flip time based on liquidity rating
 */
export function estimateFlipTime(liquidity: string): number {
  const estimates: Record<string, number> = {
    fire: 7,      // 1 week
    hot: 14,      // 2 weeks
    warm: 21,     // 3 weeks
    cool: 30,     // 1 month
    cold: 60,     // 2 months
  };
  
  return estimates[liquidity] || 30;
}

/**
 * Check if liquidity meets minimum threshold
 */
function isLiquidityBelowThreshold(
  cardLiquidity: string,
  minLiquidity: string
): boolean {
  const cardRank = LIQUIDITY_RANK[cardLiquidity as keyof typeof LIQUIDITY_RANK] || 0;
  const minRank = LIQUIDITY_RANK[minLiquidity as keyof typeof LIQUIDITY_RANK] || 0;
  
  return cardRank < minRank;
}

/**
 * Main evaluation function - determines if card should be auto-accepted, auto-denied, or needs review
 */
export function evaluateScan(
  asset: AssetData,
  marketData: MarketData,
  settings: BuyingDeskSettings
): EvaluationResult {
  const details: string[] = [];

  // If auto-deny is disabled, everything goes to review
  if (!settings.autoDenyEnabled) {
    const buyPrice = calculateBuyPrice(
      marketData.averagePrice,
      settings.defaultOfferPercentage,
      settings.priceRounding
    );
    const expectedProfit = marketData.averagePrice - buyPrice;
    const expectedRoi = buyPrice > 0 ? (expectedProfit / buyPrice) * 100 : 0;

    return {
      action: 'review',
      buyPrice,
      expectedProfit,
      expectedRoi,
      reason: 'Manual review required (auto-filtering disabled)',
      details: [`Buy at $${buyPrice.toFixed(2)}`, `Sell at $${marketData.averagePrice.toFixed(2)}`, `Profit: $${expectedProfit.toFixed(2)} (${expectedRoi.toFixed(0)}% ROI)`],
    };
  }

  // Filter 1: Liquidity check
  if (isLiquidityBelowThreshold(marketData.liquidity, settings.minLiquidityLevel)) {
    return {
      action: 'auto-deny',
      reason: `Low liquidity (${marketData.liquidity})`,
      details: [
        `Card liquidity: ${marketData.liquidity}`,
        `Minimum required: ${settings.minLiquidityLevel}`,
        'This card may be difficult to sell',
      ],
    };
  }
  details.push(`✓ Liquidity: ${marketData.liquidity}`);

  // Filter 2: Confidence check
  if (marketData.confidence < settings.minConfidenceLevel) {
    return {
      action: 'auto-deny',
      reason: `Low confidence (${marketData.confidence}%)`,
      details: [
        `Data confidence: ${marketData.confidence}%`,
        `Minimum required: ${settings.minConfidenceLevel}%`,
        `Only ${marketData.salesCount} recent sales`,
      ],
    };
  }
  details.push(`✓ Confidence: ${marketData.confidence}%`);

  // Filter 3: Market value check
  if (marketData.averagePrice < settings.minMarketValue) {
    return {
      action: 'auto-deny',
      reason: `Low market value ($${marketData.averagePrice.toFixed(2)})`,
      details: [
        `Market value: $${marketData.averagePrice.toFixed(2)}`,
        `Minimum required: $${settings.minMarketValue.toFixed(2)}`,
        'Below minimum value threshold',
      ],
    };
  }
  details.push(`✓ Market value: $${marketData.averagePrice.toFixed(2)}`);

  // Calculate buy price and profit
  const buyPrice = calculateBuyPrice(
    marketData.averagePrice,
    settings.defaultOfferPercentage,
    settings.priceRounding
  );
  const expectedProfit = marketData.averagePrice - buyPrice;
  const expectedRoi = buyPrice > 0 ? (expectedProfit / buyPrice) * 100 : 0;

  // Filter 4: ROI check
  if (expectedRoi < settings.minRoiPercentage) {
    return {
      action: 'auto-deny',
      reason: `Low ROI (${expectedRoi.toFixed(0)}%)`,
      details: [
        `Expected ROI: ${expectedRoi.toFixed(0)}%`,
        `Minimum required: ${settings.minRoiPercentage}%`,
        `Buy: $${buyPrice.toFixed(2)} → Sell: $${marketData.averagePrice.toFixed(2)}`,
        `Profit: $${expectedProfit.toFixed(2)}`,
      ],
    };
  }
  details.push(`✓ ROI: ${expectedRoi.toFixed(0)}%`);

  // Filter 5: Exit time check (warning, not denial)
  const expectedFlipDays = estimateFlipTime(marketData.liquidity);
  if (expectedFlipDays > settings.targetFlipDays) {
    return {
      action: 'review',
      buyPrice,
      expectedProfit,
      expectedRoi,
      reason: `Slow exit time (~${expectedFlipDays} days)`,
      details: [
        `Estimated flip time: ${expectedFlipDays} days`,
        `Target: ${settings.targetFlipDays} days`,
        `Buy: $${buyPrice.toFixed(2)}`,
        `Expected profit: $${expectedProfit.toFixed(2)} (${expectedRoi.toFixed(0)}% ROI)`,
      ],
    };
  }
  details.push(`✓ Flip time: ~${expectedFlipDays} days`);

  // PASSED ALL FILTERS! 🎉
  return {
    action: 'auto-accept',
    buyPrice,
    expectedProfit,
    expectedRoi,
    reason: 'Passed all filters automatically',
    details: [
      `Buy: $${buyPrice.toFixed(2)}`,
      `Market: $${marketData.averagePrice.toFixed(2)}`,
      `Profit: $${expectedProfit.toFixed(2)} (${expectedRoi.toFixed(0)}% ROI)`,
      `Liquidity: ${marketData.liquidity}`,
      `Confidence: ${marketData.confidence}%`,
      `Est. flip: ${expectedFlipDays} days`,
    ],
  };
}

/**
 * Load buying desk settings from localStorage
 */
export function loadBuyingDeskSettings(): BuyingDeskSettings {
  try {
    const saved = localStorage.getItem('buyingDeskSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        defaultOfferPercentage: parsed.defaultOfferPercentage ?? 90,
        housePercentage: parsed.housePercentage ?? 10,
        priceRounding: parsed.priceRounding ?? 5,
        autoDenyEnabled: parsed.autoDenyEnabled ?? true,
        minLiquidityLevel: parsed.minLiquidityLevel ?? 'cold',
        minConfidenceLevel: parsed.minConfidenceLevel ?? 40,
        minMarketValue: parsed.minMarketValue ?? 10,
        targetFlipDays: parsed.targetFlipDays ?? 14,
        minRoiPercentage: parsed.minRoiPercentage ?? 50,
      };
    }
  } catch (error) {
    console.error('[Auto-Accept Engine] Error loading settings:', error);
  }

  // Return defaults
  return {
    defaultOfferPercentage: 90,
    housePercentage: 10,
    priceRounding: 5,
    autoDenyEnabled: true,
    minLiquidityLevel: 'cold',
    minConfidenceLevel: 40,
    minMarketValue: 10,
    targetFlipDays: 14,
    minRoiPercentage: 50,
  };
}

// 🤖 INTERNAL NOTE (LLM):
// This utility calculates market value and confidence rating from eBay comparable sales.
// Part of the `assets` feature pricing functionality.

// Local minimal interfaces to avoid missing import from a non-existent db path
export interface PricingInfo {
  value: number;
  range: [number, number];
  lastSold: { date: string; price: number } | null;
}

export interface ConfidenceRating {
  rating: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  factors: string[];
}

export function calculateMarketValue(comps: any[]): PricingInfo {
  if (!comps.length) {
    return {
      value: 0,
      range: [0, 0],
      lastSold: null,
    };
  }

  // Extract and process prices
  const prices = comps.map((comp) => parseFloat(comp.price.value));

  // Calculate average as the main value
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  // Calculate price range (exclude outliers)
  prices.sort((a, b) => a - b);
  const q1Index = Math.max(0, Math.floor(prices.length * 0.25));
  const q3Index = Math.min(prices.length - 1, Math.floor(prices.length * 0.75));
  const min = prices[q1Index];
  const max = prices[q3Index];

  // Find most recent sale
  comps.sort(
    (a, b) => new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime(),
  );
  const lastSold = comps.length
    ? {
        date: comps[0].soldDate,
        price: parseFloat(comps[0].price.value),
      }
    : null;

  return {
    value: Math.round(avg * 100) / 100,
    range: [Math.round(min * 100) / 100, Math.round(max * 100) / 100],
    lastSold,
  };
}

export function calculateConfidence(comps: any[]): ConfidenceRating {
  // No comps means no confidence
  if (!comps.length) {
    return {
      rating: "LOW",
      score: 0,
      factors: ["No comparable sales found"],
    };
  }

  // Extract relevance scores
  const relevanceScores = comps.map((comp) => comp.relevanceScore || 0);
  const avgRelevance =
    relevanceScores.reduce((sum, score) => sum + score, 0) /
    relevanceScores.length;

  // Calculate price variance
  const prices = comps.map((comp) => parseFloat(comp.price.value));
  const avgPrice =
    prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.map((price) => Math.abs(price - avgPrice) / avgPrice);
  const avgVariance = variance.reduce((sum, v) => sum + v, 0) / variance.length;

  // Count recent sales (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSales = comps.filter(
    (comp) => new Date(comp.soldDate) >= thirtyDaysAgo,
  ).length;

  // Calculate overall confidence score (0-100)
  let score = 0;
  const factors = [];

  // Factor 1: Number of comps (0-40 points)
  const compsScore = Math.min(comps.length * 5, 40);
  score += compsScore;
  if (comps.length >= 8) {
    factors.push("Large sample size of comparable sales");
  } else if (comps.length <= 2) {
    factors.push("Limited number of comparable sales");
  }

  // Factor 2: Relevance (0-30 points)
  const relevanceScore = avgRelevance * 30;
  score += relevanceScore;
  if (avgRelevance >= 0.9) {
    factors.push("Very close matches to your card");
  } else if (avgRelevance <= 0.75) {
    factors.push("Comparable sales are not exact matches");
  }

  // Factor 3: Price consistency (0-20 points)
  const consistencyScore = (1 - avgVariance) * 20;
  score += consistencyScore;
  if (avgVariance <= 0.1) {
    factors.push("Consistent pricing across sales");
  } else if (avgVariance >= 0.25) {
    factors.push("High price variability between sales");
  }

  // Factor 4: Recency (0-10 points)
  const recencyScore = (recentSales / comps.length) * 10;
  score += recencyScore;
  if (recentSales === 0) {
    factors.push("No recent sales in the last 30 days");
  } else if (recentSales >= 3) {
    factors.push("Multiple recent sales data points");
  }

  // Determine rating
  let rating: "HIGH" | "MEDIUM" | "LOW";
  if (score >= 80) {
    rating = "HIGH";
  } else if (score >= 50) {
    rating = "MEDIUM";
  } else {
    rating = "LOW";
  }

  return {
    rating,
    score: Math.round(score),
    factors,
  };
}

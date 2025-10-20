/**
 * Confidence Calculator
 * 
 * Purpose: Analyzes sales data patterns to determine market confidence rating
 * Exports: calculateConfidence, ConfidenceResult
 * Feature: asset-details/confidence-rating
 * 
 * Logic: Evaluates sales volume, price consistency, recency, and data quality
 */

import { SalesRecord } from "@shared/sales-types";

export interface ConfidenceResult {
  level: number; // 0-100 percentage
  color: "red" | "yellow" | "green";
  factors: string[];
  details: {
    salesVolume: number;
    priceConsistency: number;
    recency: number;
    dataQuality: number;
  };
}

export function calculateConfidence(salesData: SalesRecord[]): ConfidenceResult {
  if (!salesData || salesData.length === 0) {
    return {
      level: 0,
      color: "red",
      factors: ["No sales data available"],
      details: {
        salesVolume: 0,
        priceConsistency: 0,
        recency: 0,
        dataQuality: 0
      }
    };
  }

  // Filter for recent sales (30 days) to match liquidity rating logic
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentSales = salesData.filter(sale => {
    if (!sale.sold_date) return false;
    return new Date(sale.sold_date) >= thirtyDaysAgo;
  });

  const factors: string[] = [];
  const details = {
    salesVolume: 0,
    priceConsistency: 0,
    recency: 0,
    dataQuality: 0
  };

  // 1. Sales Volume Analysis (0-30 points) - Based on recent sales (30 days)
  const salesCount = recentSales.length;
  if (salesCount >= 15) {
    details.salesVolume = 30;
    factors.push("Strong sales volume");
  } else if (salesCount >= 8) {
    details.salesVolume = 20;
    factors.push("Good sales volume");
  } else if (salesCount >= 3) {
    details.salesVolume = 10;
    factors.push("Limited sales volume");
  } else {
    details.salesVolume = 0;
    factors.push("Very few sales");
  }

  // 2. Price Consistency Analysis (0-30 points) - Based on recent sales
  const prices = recentSales.map(sale => {
    // Use our actual sales data format (final_price + shipping)
    const price = sale.final_price || 0;
    const shipping = sale.shipping || 0;
    return parseFloat(price.toString()) + parseFloat(shipping.toString());
  }).filter(price => price > 0);
  
  if (prices.length === 0) {
    details.priceConsistency = 0;
    factors.push("No valid pricing data");
    return {
      level: 0,
      color: "red",
      factors: ["No valid pricing data"],
      details
    };
  }
  
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const priceVariance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
  const priceStdDev = Math.sqrt(priceVariance);
  const coefficientOfVariation = priceStdDev / avgPrice;

  if (coefficientOfVariation <= 0.15) {
    details.priceConsistency = 30;
    factors.push("Very consistent pricing");
  } else if (coefficientOfVariation <= 0.25) {
    details.priceConsistency = 25;
    factors.push("Consistent pricing");
  } else if (coefficientOfVariation <= 0.40) {
    details.priceConsistency = 15;
    factors.push("Moderate price variation");
  } else if (coefficientOfVariation <= 0.60) {
    details.priceConsistency = 8;
    factors.push("High price variation");
  } else {
    details.priceConsistency = 0;
    factors.push("Extreme price volatility");
  }

  // 3. Recency Analysis (0-25 points) - Based on recent vs total sales ratio
  const recentRatio = recentSales.length / salesData.length;

  if (recentRatio >= 0.5) {
    details.recency = 25;
    factors.push("Recent market activity");
  } else if (recentRatio >= 0.3) {
    details.recency = 20;
    factors.push("Some recent activity");
  } else if (recentRatio >= 0.1) {
    details.recency = 10;
    factors.push("Limited recent activity");
  } else {
    details.recency = 0;
    factors.push("Stale market data");
  }

  // 4. Data Quality Analysis (0-15 points) - Based on recent sales
  const hasImages = recentSales.filter(sale => sale.image_url).length;
  const hasCondition = recentSales.filter(sale => sale.condition && sale.condition !== "Unknown").length;
  const hasShipping = recentSales.filter(sale => (sale.shipping || 0) > 0).length;
  
  const imageRatio = hasImages / recentSales.length;
  const conditionRatio = hasCondition / recentSales.length;
  const shippingRatio = hasShipping / recentSales.length;
  
  const dataQualityScore = (imageRatio + conditionRatio + shippingRatio) / 3;

  if (dataQualityScore >= 0.8) {
    details.dataQuality = 15;
    factors.push("High data quality");
  } else if (dataQualityScore >= 0.6) {
    details.dataQuality = 12;
    factors.push("Good data quality");
  } else if (dataQualityScore >= 0.4) {
    details.dataQuality = 8;
    factors.push("Fair data quality");
  } else {
    details.dataQuality = 5;
    factors.push("Limited data quality");
  }

  // Calculate total confidence level
  const totalScore = details.salesVolume + details.priceConsistency + details.recency + details.dataQuality;
  const level = Math.min(100, Math.max(0, totalScore));

  // Determine color based on level
  let color: "red" | "yellow" | "green";
  if (level >= 75) {
    color = "green";
  } else if (level >= 50) {
    color = "yellow";
  } else {
    color = "red";
  }

  // Special case adjustments
  if (salesCount <= 2) {
    color = "red";
    factors.unshift("Insufficient sales data");
  }

  if (coefficientOfVariation > 0.8) {
    color = "red";
    factors.unshift("Extreme price volatility");
  }

  return {
    level: Math.round(level),
    color,
    factors: factors.slice(0, 4), // Limit to 4 most important factors
    details
  };
}
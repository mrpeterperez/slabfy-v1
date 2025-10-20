// PRICING CONTROLLER 🎯
// Does the heavy lifting for price calculations
// Takes card ID, gets sales data, calculates averages and liquidity
import { Request, Response } from 'express';
import { findCard } from '../cardFinder';
import { getSavedSales } from '../salesGetter';

interface PricingData {
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  liquidity: 'fire' | 'hot' | 'warm' | 'cool' | 'cold';
  confidence: number; // 0-100 percentage
  lastSaleDate: string | null;
  salesCount: number;
  exitTime: string; // How quickly asset can be sold based on liquidity
  pricingPeriod: string; // Which period was used for pricing calculation
  thirtyDaySalesCount: number; // Number of sales in 30-day period
}

export async function calculatePricing(req: Request, res: Response) {
  const { cardId } = req.params;
  
  try {
    // Use modular helpers to get card and sales data
    const card = await findCard(cardId);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const salesData = await getSavedSales(card.cardId || card.globalId); // Use card_id for grouped sales data
    
    // Filter to last 30 days for pricing calculations
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const thirtyDaySalesData = salesData.filter(sale => {
      if (sale.sold_date?.date?.raw) {
        const saleDate = new Date(sale.sold_date.date.raw);
        return saleDate >= thirtyDaysAgo;
      } else if (sale.sold_date && typeof sale.sold_date === 'string') {
        const saleDate = new Date(sale.sold_date);
        return saleDate >= thirtyDaysAgo;
      }
      return false;
    });
    
    // Calculate pricing from 30-day sales data
    let averagePrice = 0;
    let highestPrice = 0;
    let lowestPrice = 0;
    let lastSaleDate = null;
    let pricingPeriod = "30 days";
    let usedThirtyDayData = true;
    
    if (thirtyDaySalesData.length > 0) {
      // Use weighted average: verified sales 100%, unverified sales 50%
      let totalWeightedPrice = 0;
      let totalWeight = 0;
      let allPrices: number[] = [];
      
      thirtyDaySalesData.forEach(sale => {
        const salePrice = sale.sold_price.value;
        const shipping = parseFloat((sale.shipping || 0).toString());
        const totalPrice = salePrice + shipping;
        
        // Determine weight based on verification status
        const weight = sale.verified ? 1.0 : 0.5; // 100% for verified, 50% for unverified
        
        totalWeightedPrice += totalPrice * weight;
        totalWeight += weight;
        allPrices.push(totalPrice); // For high/low calculations
      });
      
      averagePrice = totalWeight > 0 ? totalWeightedPrice / totalWeight : 0; // Weighted average
      highestPrice = Math.max(...allPrices);
      lowestPrice = Math.min(...allPrices);
      
      // Get most recent sale date from 30-day data
      const latestSale = thirtyDaySalesData[0];
      lastSaleDate = latestSale.sold_date?.date?.raw || null;
    } else if (salesData.length > 0) {
      // Fallback to all data if no 30-day sales exist - use weighted average
      pricingPeriod = "All time";
      usedThirtyDayData = false;
      
      let totalWeightedPrice = 0;
      let totalWeight = 0;
      let allPrices: number[] = [];
      
      salesData.forEach(sale => {
        const salePrice = sale.sold_price.value;
        const shipping = parseFloat((sale.shipping || 0).toString());
        const totalPrice = salePrice + shipping;
        
        // Determine weight based on verification status
        const weight = sale.verified ? 1.0 : 0.5; // 100% for verified, 50% for unverified
        
        totalWeightedPrice += totalPrice * weight;
        totalWeight += weight;
        allPrices.push(totalPrice); // For high/low calculations
      });
      
      averagePrice = totalWeight > 0 ? totalWeightedPrice / totalWeight : 0; // Weighted average
      highestPrice = Math.max(...allPrices);
      lowestPrice = Math.min(...allPrices);
      
      const latestSale = salesData[0];
      lastSaleDate = latestSale.sold_date?.date?.raw || null;
    }
    
    // Determine liquidity based on sales volume
    let liquidity: 'fire' | 'hot' | 'warm' | 'cool' | 'cold' = 'cold';
    if (salesData.length >= 50) liquidity = 'fire';
    else if (salesData.length >= 30) liquidity = 'hot';
    else if (salesData.length >= 15) liquidity = 'warm';
    else if (salesData.length >= 5) liquidity = 'cool';
    
    // Calculate confidence percentage (0-100) based on RECENT sales volume (last 90 days)
    // This reflects current market data reliability with reasonable timeframe
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const recentSales = salesData.filter(sale => {
      if (sale.sold_date?.date?.raw) {
        const saleDate = new Date(sale.sold_date.date.raw);
        return saleDate >= ninetyDaysAgo;
      } else if (sale.sold_date && typeof sale.sold_date === 'string') {
        const saleDate = new Date(sale.sold_date);
        return saleDate >= ninetyDaysAgo;
      }
      return false;
    });
    
    // Calculate price consistency for recent sales (coefficient of variation)
    let priceConsistency = 1; // Default to consistent if not enough data
    if (recentSales.length >= 3) {
      const recentPrices = recentSales.map(sale => {
        const salePrice = sale.sold_price.value;
        const shipping = parseFloat((sale.shipping || 0).toString());
        return salePrice + shipping;
      });
      
      const mean = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
      const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / recentPrices.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
      
      // Convert to consistency factor (lower CV = higher consistency)
      priceConsistency = Math.max(0.3, 1 - coefficientOfVariation);
    }
    
    // Base confidence on recent sales volume
    let baseConfidence = 0;
    if (recentSales.length >= 15) baseConfidence = 95;      // High: 15+ recent sales
    else if (recentSales.length >= 8) baseConfidence = 85;  // Good: 8-14 recent sales  
    else if (recentSales.length >= 5) baseConfidence = 70;  // Medium: 5-7 recent sales
    else if (recentSales.length >= 3) baseConfidence = 55;  // Low: 3-4 recent sales
    else if (recentSales.length >= 1) baseConfidence = 35;  // Very low: 1-2 recent sales
    // 0 recent sales = 0% confidence
    
    // For cards with limited recent sales but good historical data, boost confidence
    if (recentSales.length < 3 && salesData.length >= 3) {
      // Use 180-day window for historical boost calculation (6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
      
      const extendedRecentSales = salesData.filter(sale => {
        if (sale.sold_date?.date?.raw) {
          const saleDate = new Date(sale.sold_date.date.raw);
          return saleDate >= sixMonthsAgo;
        } else if (sale.sold_date && typeof sale.sold_date === 'string') {
          const saleDate = new Date(sale.sold_date);
          return saleDate >= sixMonthsAgo;
        }
        return false;
      });
      
      if (extendedRecentSales.length >= 2) {
        // Boost confidence based on extended recent sales
        const historicalBoost = Math.min(55, 25 + extendedRecentSales.length * 8);
        baseConfidence = Math.max(baseConfidence, historicalBoost);
      }
    }
    
    // Adjust confidence based on price consistency
    const confidence = Math.round(baseConfidence * priceConsistency);
    
    // Calculate exit time based on liquidity and recent sales activity
    const calculateExitTime = (liquidity: string, recentSalesCount: number): string => {
      switch (liquidity) {
        case 'fire':
          return recentSalesCount >= 10 ? '1-2 weeks' : '2-3 weeks';
        case 'hot':
          return '2-3 weeks';
        case 'warm':
          return '3-4 weeks';
        case 'cool':
          return '4-6 weeks';
        case 'cold':
        default:
          return '6+ weeks';
      }
    };
    
    const exitTime = calculateExitTime(liquidity, recentSales.length);
    
    const pricingData: PricingData = {
      averagePrice: Math.round(averagePrice * 100) / 100,
      highestPrice: Math.round(highestPrice * 100) / 100,
      lowestPrice: Math.round(lowestPrice * 100) / 100,
      liquidity,
      confidence,
      lastSaleDate,
      salesCount: salesData.length, // Total sales for liquidity calculation
      exitTime,
      pricingPeriod, // "30 days" or "All time"
      thirtyDaySalesCount: thirtyDaySalesData.length // Number of sales in 30-day period
    };
    
    res.json(pricingData);
  } catch (error) {
    console.error('Error calculating pricing:', error);
    res.status(500).json({ error: 'Failed to calculate pricing' });
  }
}
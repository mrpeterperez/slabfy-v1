/**
 * @file sales-metrics.ts
 * @description Unified sales metrics calculation service
 * @feature shared
 */

interface SalesRecord {
  price: { value: number };
  sold_price?: { value: number };
  shipping?: number;
  sold_date?: { date: { raw: string } } | null;
}

export interface SalesMetrics {
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  salesCount: number;
}

/**
 * Calculate standardized sales metrics from sales data
 * Used by both market value card and sales comparison components
 */
export function calculateSalesMetrics(salesData: SalesRecord[], timeframeDays: number = 30): SalesMetrics {
  if (!salesData || salesData.length === 0) {
    return {
      averagePrice: 0,
      highestPrice: 0,
      lowestPrice: 0,
      salesCount: 0
    };
  }

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);
  
  // Filter sales data by date
  const filteredSales = salesData.filter(sale => {
    if (!sale.sold_date?.date?.raw) return true; // Include sales without dates
    const saleDate = new Date(sale.sold_date.date.raw);
    return saleDate >= cutoffDate;
  });

  if (filteredSales.length === 0) {
    return {
      averagePrice: 0,
      highestPrice: 0,
      lowestPrice: 0,
      salesCount: 0
    };
  }

  // Calculate price metrics from filtered sales data
  const prices = filteredSales.map(sale => {
    const salePrice = sale.sold_price?.value || sale.price.value;
    const shipping = sale.shipping || 0;
    return salePrice + shipping; // Total price including shipping
  });

  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);
  const salesCount = filteredSales.length;

  return {
    averagePrice,
    highestPrice,
    lowestPrice,
    salesCount
  };
}
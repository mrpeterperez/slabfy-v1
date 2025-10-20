// SALES GETTER 📦
// Gets sales data from our database - lightning fast
// No external calls, just pure cached speed
import { db } from '../../db';
import { salesHistory } from '../../../shared/schema';
import { eq, sql } from 'drizzle-orm';

export interface FormattedSale {
  title: string;
  price: { value: number };
  sold_price: { value: number };
  listing_price: { value: number };
  shipping: number;
  sold_date: { date: { raw: string } } | null;
  condition: string;
  is_auction: boolean;
  listingType: string;
  seller_info: {
    name: string;
    review_count: number;
    positive_feedback_percent: number;
  };
  best_offer?: boolean;
  url: string;
  imageUrl: string;
  image_url: string;
  thumbnail: string;
  marketplace: string;
  // Verified sales tracking fields
  source: string; // 'ebay' | 'slabfy_credit_card' | 'slabfy_cash'
  verified: boolean; // Credit card/eBay = true, Cash = false
}

// Batch version for super-fast portfolio loading - BOOM!
export async function getSavedSalesBatch(assetIds: string[]): Promise<Map<string, FormattedSale[]>> {
  if (!assetIds.length) return new Map();
  
  const { inArray } = await import('drizzle-orm');
  
  // Get all sales for all assets in ONE query - ultra fast!
  const allSales = await db
    .select()
    .from(salesHistory)
    .where(inArray(salesHistory.card_id, assetIds))
    .orderBy(sql`sold_date DESC, created_at DESC, id ASC`);
  
  // Group by card_id for instant lookup
  const salesByCardId = new Map<string, FormattedSale[]>();
  
  for (const sale of allSales) {
    const cardId = sale.card_id || '';
    if (!salesByCardId.has(cardId)) {
      salesByCardId.set(cardId, []);
    }
    
    const finalPrice = Number(sale.final_price) || 0;
    const listingPrice = Number(sale.listing_price) || 0;
    const shipping = Number(sale.shipping) || 0;
    const primaryImage = sale.image_url || '';
    
    salesByCardId.get(cardId)!.push({
      title: sale.title,
      price: { value: finalPrice },
      sold_price: { value: finalPrice },
      listing_price: { value: listingPrice },
      shipping: shipping,
      sold_date: sale.sold_date ? { date: { raw: sale.sold_date.toISOString() } } : null,
      condition: sale.condition || 'Unknown',
      is_auction: sale.listing_type === 'Auction',
      listingType: sale.listing_type || 'Buy It Now',
      seller_info: {
        name: sale.seller_name || 'Unknown',
        review_count: sale.seller_feedback || 0,
        positive_feedback_percent: parseFloat(sale.seller_rating?.toString() || '100')
      },
      best_offer: sale.listing_type === 'Best Offer',
      url: sale.listing_url || '',
      imageUrl: primaryImage,
      image_url: primaryImage,
      thumbnail: primaryImage,
      marketplace: sale.marketplace || 'ebay',
      source: sale.source || 'ebay',
      verified: sale.verified ?? true
    });
  }
  
  // Also check by global_asset_id for any missing ones
  const missingIds = assetIds.filter(id => !salesByCardId.has(id));
  if (missingIds.length > 0) {
    const backupSales = await db
      .select()
      .from(salesHistory)
      .where(inArray(salesHistory.global_asset_id, missingIds))
      .orderBy(sql`sold_date DESC, created_at DESC, id ASC`);
    
    for (const sale of backupSales) {
      const assetId = sale.global_asset_id || '';
      if (!salesByCardId.has(assetId)) {
        salesByCardId.set(assetId, []);
      }
      
      const finalPrice = Number(sale.final_price) || 0;
      const listingPrice = Number(sale.listing_price) || 0;
      const shipping = Number(sale.shipping) || 0;
      const primaryImage = sale.image_url || '';
      
      salesByCardId.get(assetId)!.push({
        title: sale.title,
        price: { value: finalPrice },
        sold_price: { value: finalPrice },
        listing_price: { value: listingPrice },
        shipping: shipping,
        sold_date: sale.sold_date ? { date: { raw: sale.sold_date.toISOString() } } : null,
        condition: sale.condition || 'Unknown',
        is_auction: sale.listing_type === 'Auction',
        listingType: sale.listing_type || 'Buy It Now',
        seller_info: {
          name: sale.seller_name || 'Unknown',
          review_count: sale.seller_feedback || 0,
          positive_feedback_percent: parseFloat(sale.seller_rating?.toString() || '100')
        },
        best_offer: sale.listing_type === 'Best Offer',
        url: sale.listing_url || '',
        imageUrl: primaryImage,
        image_url: primaryImage,
        thumbnail: primaryImage,
        marketplace: sale.marketplace || 'ebay',
        source: sale.source || 'ebay',
        verified: sale.verified ?? true
      });
    }
  }
  
  return salesByCardId;
}

export async function getSavedSales(assetId: string): Promise<FormattedSale[]> {
  // First try by card_id (for grouped sales across identical cards)
  let savedSales = await db
    .select()
    .from(salesHistory)
    .where(eq(salesHistory.card_id, assetId))
    .orderBy(sql`sold_date DESC, created_at DESC, id ASC`);
  


  // If no results by card_id, try by global_asset_id (for backward compatibility)
  if (savedSales.length === 0) {
    savedSales = await db
      .select()
      .from(salesHistory)
      .where(eq(salesHistory.global_asset_id, assetId))
      .orderBy(sql`sold_date DESC, created_at DESC, id ASC`);
  }

  // Match Countdown API format exactly with all required fields
  return savedSales.map(sale => {
    const finalPrice = Number(sale.final_price) || 0;
    const listingPrice = Number(sale.listing_price) || 0;
    const shipping = Number(sale.shipping) || 0;
  // Defensive image normalization (edge funcs may rotate field names later)
  const primaryImage = sale.image_url || '';
    
    return {
    title: sale.title,
    price: { value: finalPrice },
    sold_price: { value: finalPrice },
    listing_price: { value: listingPrice },
    shipping: shipping,
    sold_date: sale.sold_date ? { date: { raw: sale.sold_date.toISOString() } } : null,
    condition: sale.condition || 'Unknown',
    is_auction: sale.listing_type === 'Auction',
    listingType: sale.listing_type || 'Buy It Now',
    seller_info: {
      name: sale.seller_name || 'Unknown',
      review_count: sale.seller_feedback || 0,
      positive_feedback_percent: parseFloat(sale.seller_rating?.toString() || '100')
    },
    best_offer: sale.listing_type === 'Best Offer',
    url: sale.listing_url || '',
  imageUrl: primaryImage,
  image_url: primaryImage,
  thumbnail: primaryImage,
    marketplace: sale.marketplace || 'ebay',
    source: sale.source || 'ebay',
    verified: sale.verified ?? true
    };
  });
}
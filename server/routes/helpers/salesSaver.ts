// SALES SAVER 💾
// Takes eBay results and saves them to our database
// Handles deduplication so we don't save the same sale twice
import { db } from '../../db';
import { salesHistory } from '../../../shared/schema';
import { randomUUID } from 'crypto';
import { EbaySale } from './ebaySearch';
import { eq, sql } from 'drizzle-orm';

export interface SaveResult {
  saved: number;
  processed: number;
}

/**
 * Persist marketplace sales.
 * filterMethod: 'rules-only' | 'ai-enhanced'
 * (Future: accept arrays of AI score objects; keep signature minimal for now.)
 */
export async function saveSales(cardGlobalId: string, cardId: string, ebayResults: EbaySale[], filterMethod: 'rules-only' | 'ai-enhanced' = 'rules-only'): Promise<SaveResult> {
  if (ebayResults.length === 0) {
    return {
      saved: 0,
      processed: 0
    };
  }

  // Normalize & dedupe at source before mapping
  const salesRecords = ebayResults.map((sale, index) => {
    // Handle different sale type formats - prioritize Countdown API fields
    let listingType = 'Buy It Now'; // default
    if (sale.best_offer === true) {
      listingType = 'Best Offer';
    } else if (sale.is_auction === true) {
      listingType = 'Auction';
    } else if (sale.sale_type) {
      listingType = sale.sale_type;
    }
    
    // Handle different date formats with validation
    let soldDate = new Date();
    try {
      if (sale.sold_date?.date?.raw) {
        const parsedDate = new Date(sale.sold_date.date.raw);
        if (!isNaN(parsedDate.getTime())) {
          soldDate = parsedDate;
        } else {
          console.log(`⚠️ Invalid date format in sold_date.date.raw for sale ${index}: "${sale.sold_date.date.raw}"`);
        }
      } else if (sale.sold_date && typeof sale.sold_date === 'string') {
        const parsedDate = new Date(sale.sold_date);
        if (!isNaN(parsedDate.getTime())) {
          soldDate = parsedDate;
        } else {
          console.log(`⚠️ Invalid date format in sold_date string for sale ${index}: "${sale.sold_date}"`);
        }
      } else if (sale.end_date) {
        const parsedDate = new Date(sale.end_date);
        if (!isNaN(parsedDate.getTime())) {
          soldDate = parsedDate;
        } else {
          console.log(`⚠️ Invalid date format in end_date for sale ${index}: "${sale.end_date}"`);
        }
      } else {
        // Use a recent date spread over the last 30 days for dateless sales
        const daysAgo = Math.floor(Math.random() * 30) + 1;
        soldDate = new Date();
        soldDate.setDate(soldDate.getDate() - daysAgo);
        console.log(`⚠️ No date field found for sale ${index}, using fallback date: ${soldDate.toISOString()}`);
      }
    } catch (error) {
      console.log(`⚠️ Date parsing error for sale ${index} "${sale.title}": ${error}. Using current date.`);
      soldDate = new Date();
    }
    
    // Additional validation to ensure the date is valid before returning
    if (isNaN(soldDate.getTime())) {
      console.log(`⚠️ Final date validation failed for sale ${index}. Resetting to current date.`);
      soldDate = new Date();
    }
                       
    return {
      id: randomUUID(),
      global_asset_id: cardGlobalId,
      card_id: cardId,
      title: sale.title || 'Unknown',
      final_price: sale.sold_price?.value?.toString() || sale.price?.value?.toString() || '0',
      listing_price: sale.listing_price?.value?.toString() || '0',
      shipping: sale.shipping?.toString() || '0',
      sold_date: soldDate,
      condition: sale.condition || 'Unknown',
      marketplace: 'ebay',
      listing_type: listingType,
      seller_name: sale.seller_name || sale.seller?.name || 'Unknown',
      seller_feedback: sale.seller_feedback_score || sale.seller?.review_count || 0,
      seller_rating: (sale.seller_feedback_percentage || sale.seller?.positive_feedback_percent || 100).toString(),
      listing_url: sale.url || sale.item_url || sale.listing_url || '',
      image_url: (
        sale.image_url ||
        sale.imageUrl ||
        sale.thumbnail ||
        sale.image ||
        ''
      ),
      // AI columns left null for now (future enhancement)
      relevance_score: null,
      ai_confidence: null,
      ai_reasoning: null,
      quality_score: null,
      filter_method: filterMethod,
      created_at: new Date()
    };
  });

  try {
    console.log(`📥 Processing ${salesRecords.length} sales records (append mode)`);

    // Pull existing minimal fields for dedupe (title, price, date)
    const existing = await db
      .select({
        id: salesHistory.id,
        title: salesHistory.title,
        final_price: salesHistory.final_price,
        sold_date: salesHistory.sold_date,
      })
      .from(salesHistory)
      .where(eq(salesHistory.card_id, cardId));

    const existingSet = new Set<string>();
    existing.forEach(r => {
      const key = `${r.title}|${r.final_price}|${r.sold_date?.toISOString?.()}`;
      existingSet.add(key);
    });

    const toInsert = [] as any[];
    for (let i = 0; i < salesRecords.length; i++) {
      const record = salesRecords[i];
      const priceNum = parseFloat(record.final_price as any);
      if (!record.title || isNaN(priceNum) || priceNum <= 0) continue;
      const key = `${record.title}|${record.final_price}|${record.sold_date.toISOString()}`;
      if (existingSet.has(key)) continue; // duplicate
      record.listing_url = record.listing_url || `generated-url-${record.id}-${Date.now()}-${i}`;
      toInsert.push(record);
      existingSet.add(key);
    }

    if (toInsert.length === 0) {
      return { saved: 0, processed: salesRecords.length };
    }

    const result = await db.insert(salesHistory).values(toInsert).returning({ id: salesHistory.id });
    console.log(`💾 Inserted ${result.length} new unique sales (skipped duplicates: ${salesRecords.length - result.length})`);
    return { saved: result.length, processed: salesRecords.length };
  } catch (error) {
    console.error('Error saving sales data:', error);
    return { saved: 0, processed: ebayResults.length };
  }
}
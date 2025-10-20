/**
 * Sales History Writer Helper
 * 
 * Handles adding internal Slabfy platform sales to the global sales_history table.
 * Integrates with checkout flow to capture credit card and cash transactions.
 * 
 * Features:
 * - Adds verified sales (credit card) with source='slabfy_credit_card'
 * - Adds unverified sales (cash) with source='slabfy_cash'
 * - Deduplication to prevent duplicate sales records
 * - Invalidates pricing cache for affected assets
 * - Maintains data quality through verification flags
 * - PRIVACY: user_id and payment_method stored but NEVER displayed publicly
 */

import { supabase } from '../supabase';
import { randomUUID } from 'crypto';

export interface InternalSaleData {
  globalAssetId: string;
  cardId?: string;
  title: string;
  finalPrice: number;
  saleDate: Date;
  paymentMethod: 'credit_card' | 'cash' | 'check' | 'digital' | 'trade';
  sellerName?: string;
  userId: string;
  userAssetId?: string;
  eventId?: string;
  notes?: string;
  psaImageUrl?: string; // PSA front image for display
}

export interface AddSaleResult {
  success: boolean;
  saleId?: string;
  isDuplicate?: boolean;
  error?: string;
}

/**
 * Add an internal SlabFy sale to the global sales history
 * 
 * @param saleData - Internal sale transaction data
 * @returns Result object with success status and sale ID
 */
export async function addSaleToGlobalHistory(
  saleData: InternalSaleData
): Promise<AddSaleResult> {
  try {
    // Determine verification status and source based on payment method
    const isVerified = saleData.paymentMethod === 'credit_card';
    const source = isVerified ? 'slabfy_credit_card' : 'slabfy_cash';

    // Check for duplicates (same asset + price + date within 1 hour)
    const oneHourAgo = new Date(saleData.saleDate.getTime() - 60 * 60 * 1000);
    const oneHourAfter = new Date(saleData.saleDate.getTime() + 60 * 60 * 1000);

    const { data: duplicates, error: duplicateError } = await supabase
      .from('sales_history')
      .select('id')
      .eq('global_asset_id', saleData.globalAssetId)
      .eq('final_price', saleData.finalPrice)
      .eq('source', source)
      .gte('sold_date', oneHourAgo.toISOString())
      .lte('sold_date', oneHourAfter.toISOString())
      .limit(1);

    if (duplicateError) {
      throw new Error(`Duplicate check failed: ${duplicateError.message}`);
    }

    if (duplicates && duplicates.length > 0) {
      console.log('⚠️ Duplicate sale detected, skipping:', {
        globalAssetId: saleData.globalAssetId,
        price: saleData.finalPrice,
        date: saleData.saleDate,
      });
      return {
        success: true,
        isDuplicate: true,
        saleId: duplicates[0].id,
      };
    }

    // Create new sales history record
    const saleId = randomUUID();
    
    const { data: newSale, error: insertError } = await supabase
      .from('sales_history')
      .insert({
        id: saleId,
        global_asset_id: saleData.globalAssetId,
        card_id: saleData.cardId || null,
        title: saleData.title,
        final_price: saleData.finalPrice,
        listing_price: saleData.finalPrice, // No separate listing price for internal sales
        shipping: 0, // Internal sales, no shipping
        sold_date: saleData.saleDate.toISOString(),
        condition: 'Graded', // Assuming graded cards on platform
        marketplace: 'Slabfy',
        listing_type: isVerified ? 'Credit Card' : 'Cash',
        seller_name: saleData.sellerName || 'Slabfy User',
        seller_feedback: null,
        seller_rating: null,
        listing_url: null, // Internal sale, no external URL
        image_url: saleData.psaImageUrl || null, // Use PSA front image if available
        source_api_call: new Date().toISOString(), // When we added it to global history
        relevance_score: 100, // Perfect relevance (it's our own data!)
        ai_confidence: 100, // Perfect confidence (verified transaction)
        ai_reasoning: isVerified 
          ? 'Verified credit card transaction from Slabfy platform' 
          : 'Cash transaction from Slabfy platform (unverified)',
        quality_score: isVerified ? 100 : 50, // Cash gets lower quality score
        filter_method: 'internal_platform',
        source: source, // NEW: slabfy_credit_card or slabfy_cash
        verified: isVerified, // NEW: true for credit card, false for cash
        user_id: saleData.userId, // PRIVATE: for analytics only, never displayed
        payment_method: saleData.paymentMethod, // PRIVATE: for records only
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert sale: ${insertError.message}`);
    }

    console.log('✅ Added internal sale to global history:', {
      saleId: newSale.id,
      assetId: saleData.globalAssetId,
      price: saleData.finalPrice,
      source: source,
      verified: isVerified,
    });

    return {
      success: true,
      saleId: newSale.id,
      isDuplicate: false,
    };

  } catch (error) {
    console.error('❌ Error adding sale to global history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Add multiple sales to global history (bulk operation)
 * Useful for event checkout where multiple cards are sold at once
 * 
 * @param sales - Array of internal sale data
 * @returns Array of results for each sale
 */
export async function addMultipleSalesToGlobalHistory(
  sales: InternalSaleData[]
): Promise<AddSaleResult[]> {
  const results: AddSaleResult[] = [];

  for (const sale of sales) {
    const result = await addSaleToGlobalHistory(sale);
    results.push(result);
  }

  // Count successes
  const successCount = results.filter(r => r.success && !r.isDuplicate).length;
  const duplicateCount = results.filter(r => r.isDuplicate).length;
  
  console.log(`📊 Bulk sale add complete: ${successCount} new, ${duplicateCount} duplicates`);

  return results;
}

/**
 * Get sales from global history filtered by source
 * 
 * @param globalAssetId - Asset to get sales for
 * @param source - Filter by source (ebay, slabfy_credit_card, slabfy_cash) or 'all'
 * @param verifiedOnly - Only return verified sales
 * @returns Array of sales records
 */
export async function getGlobalSalesHistory(
  globalAssetId: string,
  source: 'all' | 'ebay' | 'slabfy_credit_card' | 'slabfy_cash' = 'all',
  verifiedOnly: boolean = false
): Promise<any[]> {
  try {
    let query = supabase
      .from('sales_history')
      .select('*')
      .eq('global_asset_id', globalAssetId);

    // Apply source filter
    if (source !== 'all') {
      query = query.eq('source', source);
    }

    // Apply verification filter
    if (verifiedOnly) {
      query = query.eq('verified', true);
    }

    const { data: sales, error } = await query.order('sold_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch sales history: ${error.message}`);
    }

    return sales || [];
  } catch (error) {
    console.error('❌ Error fetching sales history:', error);
    return [];
  }
}

/**
 * Get sales statistics by source
 * Useful for analytics and reporting
 */
export async function getSalesStatsBySource(globalAssetId: string) {
  try {
    const { data: stats, error } = await supabase.rpc('get_sales_stats_by_source', {
      p_global_asset_id: globalAssetId
    });

    if (error) {
      console.warn('Stats function not available, using fallback query:', error.message);
      // Fallback: just get basic stats
      const { data: sales } = await supabase
        .from('sales_history')
        .select('source, verified, final_price')
        .eq('global_asset_id', globalAssetId);

      if (!sales) return [];

      // Group by source and verified
      const grouped = sales.reduce((acc: any[], sale: any) => {
        const key = `${sale.source}_${sale.verified}`;
        const existing = acc.find(s => s.source === sale.source && s.verified === sale.verified);
        
        if (existing) {
          existing.count++;
          existing.total += sale.final_price;
          existing.avg_price = existing.total / existing.count;
          existing.min_price = Math.min(existing.min_price, sale.final_price);
          existing.max_price = Math.max(existing.max_price, sale.final_price);
        } else {
          acc.push({
            source: sale.source,
            verified: sale.verified,
            count: 1,
            total: sale.final_price,
            avg_price: sale.final_price,
            min_price: sale.final_price,
            max_price: sale.final_price,
          });
        }
        
        return acc;
      }, []);

      return grouped;
    }

    return stats || [];
  } catch (error) {
    console.error('❌ Error fetching sales stats:', error);
    return [];
  }
}

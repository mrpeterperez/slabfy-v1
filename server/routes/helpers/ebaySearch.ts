// EBAY SEARCH 🛒
// Goes to eBay and gets real sales data via Supabase edge function
// Returns pre-filtered marketplace results to optimize token usage
import { supabaseEdge } from '../../supabase';
import { SearchTerms } from './searchBuilder';
import { preFilterSales } from './preFilter';

export interface EbaySale {
  title?: string;
  sold_price?: { value: string };
  price?: { value: string };
  listing_price?: { value: string };
  shipping?: string;
  sold_date?: { date: { raw: string } };
  end_date?: string;
  condition?: string;
  marketplace?: string;
  sale_type?: string;
  // Countdown API fields for sale type detection
  best_offer?: boolean;
  is_auction?: boolean;
  buy_it_now?: boolean;
  // External API format
  seller_name?: string;
  seller_feedback_score?: number;
  seller_feedback_percentage?: number;
  // Legacy format (keep for backwards compatibility)
  seller?: {
    name: string;
    review_count: number;
    positive_feedback_percent: number;
  };
  url?: string;
  image_url?: string;
  imageUrl?: string;
  // Newer marketplace / edge function field names
  thumbnail?: string; // countdown-pricing edge fn
  item_url?: string;  // alternate listing url key
  listing_url?: string; // some sources use listing_url
  image?: string; // occasional generic key
}

export interface EbaySearchResult {
  sales: EbaySale[];
  searchTerm: string;
  totalAttempts: number;
}

export async function searchEbay(searchTerms: SearchTerms, targetCard?: string): Promise<EbaySearchResult> {
  // Use main search term - no fallbacks to avoid contamination
  const term = searchTerms.main;
  console.log(`🌐 Calling marketplace API with query: "${term}"`);
  console.log(`🎯 Target card for pre-filtering: "${targetCard}"`);

  try {
    const { data, error } = await supabaseEdge.functions.invoke('countdown-pricing', {
      body: { search_term: term }
    });

    if (error) {
      console.log(`⚠️ API call failed: ${error.message}`);
      return { sales: [], searchTerm: term, totalAttempts: 1 };
    }

    if (data?.search_results?.length > 0) {
      let sales = data.search_results.slice(0, 50); // Limit for performance
      console.log(`📦 Returned ${sales.length} raw sales from API`);
      
      // Apply pre-filtering if target card is provided
      if (targetCard) {
        const beforeCount = sales.length;
        sales = preFilterSales(sales, targetCard);
        console.log(`🔍 Pre-filter: ${beforeCount} → ${sales.length} sales (${((sales.length/beforeCount)*100).toFixed(1)}% kept)`);
      } else {
        console.log(`⚠️ No target card provided - skipping pre-filtering`);
      }
      
      console.log(`🔍 First 3 filtered titles:`, sales.slice(0, 3).map((s: EbaySale) => s.title));
      
      return {
        sales,
        searchTerm: term,
        totalAttempts: 1
      };
    }

    console.log(`📭 No sales found for: ${term}`);
    return { sales: [], searchTerm: term, totalAttempts: 1 };

  } catch (searchError) {
    console.log(`⚠️ Search failed: ${searchError}`);
    return { sales: [], searchTerm: term, totalAttempts: 1 };
  }
}


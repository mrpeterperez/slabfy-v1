// REFRESH CONTROLLER ⚡
// The muscle behind refresh requests - goes to eBay, gets fresh data
// Called by refresh.ts route, does all the real work
import { Request, Response } from 'express';
import { findCard } from '../cardFinder';
import { buildSearchTerms } from '../searchBuilder';
import { searchEbay } from '../ebaySearch';
import { saveSales } from '../salesSaver';
import { supabaseEdge } from '../../../supabase';
import { getSavedSales } from '../salesGetter';

// For server-side cache invalidation
import fetch from 'node-fetch';

// Lightweight return type for programmatic refresh
export interface RefreshResult {
  success: boolean;
  message: string;
  salesCount: number;
  savedCount: number;
  totalSalesInDatabase: number;
  searchTermUsed?: string;
  aiReason?: string; // reason AI not used or fallback triggered
}

/**
 * Core refresh implementation that can be reused without Express req/res.
 * Accepts a card/global asset ID and performs the marketplace refresh.
 */
export async function refreshCardSalesById(assetId: string, useAIFiltering = true): Promise<RefreshResult> {
  const t0 = Date.now();
  if (!assetId) {
    throw new Error('Card ID is required');
  }

  // Step 1: Find the card in our database
  const card = await findCard(assetId);
  if (!card) {
    throw new Error('Card not found');
  }

  const cardName = card.title || `${card.player} ${card.year} ${card.set} #${card.number} ${card.grade}`;
  console.log(`🔄 Refreshing sales for: ${cardName}`);

  // Step 2: Build search terms
  const searchTerms = buildSearchTerms(card);
  console.log(`🎯 Generated search terms: main="${searchTerms.main}", backup=[${searchTerms.backup.join(', ')}]`);

  // Step 3: Search eBay for sales with pre-filtering  
  // Build target card string for filtering - handle both graded and raw cards
  let targetCardForFiltering = `${card.player} ${card.year} ${card.set} #${card.number}`;
  if (card.grader && card.grade) {
    targetCardForFiltering += ` ${card.grader} ${card.grade}`;
  }
  if (card.variant) {
    targetCardForFiltering += ` ${card.variant}`;
  }
  
  const searchResult = await searchEbay(searchTerms, targetCardForFiltering);
  const rawCount = searchResult.sales.length;

  if (searchResult.sales.length === 0) {
    console.log(`📭 No sales found after ${searchResult.totalAttempts} attempts`);
    return {
      success: true,
      message: `No new sales found for ${cardName}`,
      salesCount: 0,
      savedCount: 0,
      totalSalesInDatabase: (await getSavedSales(card.cardId || '')).length,
      searchTermUsed: searchResult.searchTerm,
    };
  }

  let filteredSales = searchResult.sales;
  let filterMethod: 'rules-only' | 'ai-enhanced' = 'rules-only';
  let aiReason: string | undefined;

  // --- AI Filtering Guardrail -------------------------------------------------
  const aiEnvOk = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;
  if (!aiEnvOk && useAIFiltering) {
    aiReason = 'env_missing';
    console.log('🧪 AI disabled: missing SUPABASE_URL / SUPABASE_ANON_KEY environment variables');
  }

  if (!useAIFiltering) {
    aiReason = aiReason || 'flag_disabled';
    console.log('🧪 AI explicitly disabled by caller (useAIFiltering=false)');
  }

  if (useAIFiltering && aiEnvOk && filteredSales.length > 0) {
    try {
      console.log('🤖 Invoking GROQ AI filtering edge function (groq-sales-filter)');
      // Build target card for AI - handle both graded and raw cards
      let targetCard = `${card.year} ${card.set} ${card.player} #${card.number}`;
      if (card.grader && card.grade) {
        targetCard += ` ${card.grader} ${card.grade}`;
      }
      if (card.variant) {
        targetCard += ` ${card.variant}`;
      }
      
      const { data, error } = await supabaseEdge.functions.invoke('groq-sales-filter', {
        body: {
          targetCard,
          salesData: filteredSales.map(s => ({
            title: s.title || '',
            final_price: parseFloat(s.sold_price?.value || s.price?.value || '0')
          }))
        }
      });
      if (!error && data?.success && Array.isArray(data?.sales)) {
        const before = filteredSales.length;
        filteredSales = data.sales.map((aiSale: any) => {
          // Find original sale by matching title and price
          return filteredSales.find(originalSale => 
            originalSale.title === aiSale.title && 
            parseFloat(originalSale.sold_price?.value || originalSale.price?.value || '0') === aiSale.final_price
          );
        }).filter(Boolean);
        console.log(`🤖 AI filter: ${before} → ${filteredSales.length} kept`);
        filterMethod = 'ai-enhanced';
      } else if (error) {
        aiReason = `edge_error:${error.message || 'unknown'}`;
        console.log('⚠️ AI filtering error, falling back to rules-only:', error.message);
      } else {
        aiReason = 'unexpected_format';
        console.log('⚠️ AI filtering returned unexpected format, using rules-only results');
      }
    } catch (aiErr) {
      aiReason = `invoke_fail:${(aiErr as Error)?.message || 'unknown'}`;
      console.log('⚠️ AI filtering invocation failed, continuing with rules-only:', aiErr);
    }
  }

  // Step 4: Save the sales to database with card grouping + filter method
  console.log(`📦 Storing ${filteredSales.length} sales records (filter=${filterMethod})`);
  const saveResult = await saveSales(card.globalId, card.cardId || '', filteredSales, filterMethod);

  // Step 5: Get updated sales data using card_id for grouping
  const updatedSales = await getSavedSales(card.cardId || '');

  const dur = Date.now() - t0;
  // Structured one-line summary for observability
  console.log(
  `🧾 sales_refresh cardId=${card.cardId} globalId=${card.globalId} raw=${rawCount} kept=${filteredSales.length} processed=${saveResult.processed} saved=${saveResult.saved} method=${filterMethod} ai=${useAIFiltering ? 'on' : 'off'} aiReason=${aiReason || 'none'} envAI=${aiEnvOk ? 'present' : 'missing'} ms=${dur}`
  );

  // Server-side cache invalidation after successful refresh
  if (saveResult.saved > 0) {
    try {
      // Use environment-aware port for cache purge - works in dev, staging, production!
      const port = process.env.PORT || 3001;
      await fetch(`http://localhost:${port}/api/market/purge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [card.globalId] })
      });
      console.log(`🧹 Server cache purged for asset ${card.globalId} after background refresh (port ${port})`);
    } catch (error) {
      console.warn('Failed to purge server cache after background refresh:', error);
    }
  }

  return {
    success: true,
    message: `Refresh completed successfully. ${saveResult.saved} new records added.`,
    salesCount: filteredSales.length,
    savedCount: saveResult.saved,
    totalSalesInDatabase: updatedSales.length,
  searchTermUsed: searchResult.searchTerm,
  aiReason,
  };
}

/**
 * Schedules a background refresh for a given asset if needed.
 * Skips redundant calls when sales already exist for the card.
 */
export async function scheduleSalesRefresh(assetId: string, opts?: { delayMs?: number; useAIFiltering?: boolean }): Promise<any> {
  try {
    const card = await findCard(assetId);
    if (!card) {
      console.log(`❌ scheduleSalesRefresh: Card not found for id=${assetId}`);
      return { success: false, message: 'Card not found' };
    }

    // ⚡ INSTANT PRICING: If we already have sales data, return immediately
    if (card.cardId) {
      const existing = await getSavedSales(card.cardId);
      if (existing.length > 0) {
        console.log(`⚡ INSTANT PRICING: ${card.cardId} has ${existing.length} existing sales - no API call needed`);
        return {
          success: true,
          message: `Instant pricing available: using existing ${existing.length} sales records`,
          salesCount: existing.length,
          savedCount: 0,
          totalSalesInDatabase: existing.length,
          instant: true
        };
      }
    }

    // Only do background refresh if no existing data
    // In-memory dedupe to avoid duplicate scheduling bursts
    if (pendingRefresh.has(assetId)) {
      return { success: true, message: 'Refresh already scheduled', instant: false };
    }
    
    pendingRefresh.add(assetId);
    const delayMs = opts?.delayMs ?? 0;
    const useAIFiltering = opts?.useAIFiltering ?? true;

    // Fire-and-forget background task for cards without existing data
    setTimeout(() => {
      refreshCardSalesById(assetId, useAIFiltering)
        .then(r => {
          console.log(`🪄 Background refresh completed for ${assetId}: ${r.message}`);
        })
        .catch(err => console.error(`Background refresh failed for ${assetId}:`, err))
        .finally(() => {
          pendingRefresh.delete(assetId);
        });
    }, delayMs);

    return { 
      success: true, 
      message: 'Background refresh scheduled', 
      instant: false 
    };
  } catch (err) {
    console.error('scheduleSalesRefresh error:', err);
    pendingRefresh.delete(assetId);
    return { success: false, message: 'Error scheduling refresh' };
  }
}

// Module-level set for deduping schedules per-process
const pendingRefresh: Set<string> = new Set();

export async function refreshCardSales(req: Request, res: Response) {
  try {
    const { assetId, useAIFiltering = true } = req.body;
    if (!assetId) {
      return res.status(400).json({ error: 'Card ID is required' });
    }

    try {
      const result = await refreshCardSalesById(assetId, useAIFiltering);
      return res.json(result);
    } catch (err: any) {
      if (typeof err?.message === 'string' && err.message.includes('not found')) {
        console.log(`❌ Card not found: ${assetId}`);
        return res.status(404).json({ error: 'Card not found' });
      }
      throw err;
    }

  } catch (error) {
    console.error('Error in refreshCardSales:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
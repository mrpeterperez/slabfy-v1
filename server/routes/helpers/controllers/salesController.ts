// SALES CONTROLLER 📊
// Gets cached sales data from database - pure speed, no eBay calls
// Returns sales history instantly from local storage
import { Request, Response } from 'express';
import { findCard } from '../cardFinder';
import { getSavedSales } from '../salesGetter';

export async function getSalesComparison(req: Request, res: Response) {
  try {
    const { userAssetId } = req.params;

    if (!userAssetId) {
      return res.status(400).json({
        sales_history: [],
        liquidity_rating: "cold",
        from_cache: false,
        total_results: 0,
        ai_filtered: false,
        message: "User asset ID is required"
      });
    }

    // Use modular helper to find the card
    const card = await findCard(userAssetId);
    if (!card) {
      return res.status(404).json({
        sales_history: [],
        liquidity_rating: "cold", 
        from_cache: false,
        total_results: 0,
        ai_filtered: false,
        message: "Card not found"
      });
    }

    // Validate required fields
    if (!card.player || !card.set || !card.grade) {
      return res.status(400).json({
        sales_history: [],
        liquidity_rating: "cold",
        from_cache: false,
        total_results: 0,
        ai_filtered: false,
        message: "Missing required data for sales comparison (player name, set, or grade)"
      });
    }

    console.log(`Getting sales history for card ID: ${card.cardId} (global ID: ${card.globalId})`);

    // Use modular helper to get saved sales by card_id for grouped sales data
    const salesData = await getSavedSales(card.cardId || card.globalId);

    console.log(`Found ${salesData.length} sales records for card ${card.cardId || card.globalId}`);

    return res.json({
      sales_history: salesData,
      liquidity_rating: "cold",
      from_cache: true,
      cached_at: new Date().toISOString(),
      next_update: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      total_results: salesData.length,
      ai_filtered: false,
      message: salesData.length > 0 ? "Sales data retrieved from cache" : "No sales data available"
    });

  } catch (error) {
    console.error('Error in sales-comp-universal endpoint:', error);
    return res.status(500).json({
      sales_history: [],
      liquidity_rating: "cold",
      from_cache: false,
      total_results: 0,
      ai_filtered: false,
      message: "Internal server error"
    });
  }
}
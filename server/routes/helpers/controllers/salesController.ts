// SALES CONTROLLER 📊
// Returns cached sales from database - background refresh populates data
import { Request, Response } from 'express';
import { findCard } from '../cardFinder';
import { getSavedSales } from '../salesGetter';

export async function getSalesComparison(req: Request, res: Response) {
  try {
    const { userAssetId } = req.params;
    if (!userAssetId) {
      return res.status(400).json({ sales_history: [] });
    }

    const card = await findCard(userAssetId);
    if (!card) {
      return res.json({ sales_history: [] });
    }

    const sales = await getSavedSales(card.cardId || card.globalId);
    return res.json({ sales_history: sales });
  } catch (error) {
    console.error('Sales lookup failed:', error);
    return res.status(500).json({ sales_history: [] });
  }
}
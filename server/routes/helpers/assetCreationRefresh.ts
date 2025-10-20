// ASSET CREATION REFRESH TRIGGER 🎯
// Extracted from giant routes.ts to keep things tidy.
// Schedules a background sales refresh for a newly created asset (user or consignment).
// Keep dead‑simple but scalable: instant pricing re-use + staggered delay.
import { scheduleSalesRefresh } from './controllers/refreshController';

/**
 * Kick off background pricing fetch for a freshly created asset.
 * Safe: swallows internal errors, caller shouldn't await.
 */
export function triggerAssetCreationRefresh(assetId: string, opts?: { type?: 'user' | 'consignment'; delayMs?: number }) {
  if (!assetId) return;
  const assetType = opts?.type === 'consignment' ? 'consignment asset' : 'user asset';
  const delay = typeof opts?.delayMs === 'number' ? opts!.delayMs : (Math.random() * 3000 + 2000); // 2‑5s
  console.log(`🎯 Scheduling background sales refresh for ${assetType}: ${assetId} (delay: ${Math.round(delay)}ms)`);
  scheduleSalesRefresh(assetId, { delayMs: delay, useAIFiltering: true })
    .then(result => {
      if (result?.instant) {
        console.log(`⚡ INSTANT PRICING: ${assetType} ${assetId} has existing sales data`);
      }
    })
    .catch(err => console.warn(`Background sales refresh error for ${assetType}:`, err));
}

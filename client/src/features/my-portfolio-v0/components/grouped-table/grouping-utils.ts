import type { Asset } from '@shared/schema';

// Prefer stable server-generated cardId for grouping. Fallback to composite fingerprint if missing.
export function buildGroupKey(a: Asset): string {
  if ((a as any).cardId) return `CARDID::${(a as any).cardId}`;
  const y = (a.year || '').trim().toUpperCase();
  const s = (a.setName || '').trim().toUpperCase();
  const n = (a.cardNumber || '').trim().toUpperCase();
  const v = (a.variant || 'BASE').trim().toUpperCase();
  const gco = (a.grader || '').toString().trim().toUpperCase();
  const gr = (a.grade || '').trim().toUpperCase();
  return [y, s, n, v, gco, gr].join(' | ');
}

export function groupAssets(assets: Asset[]): Asset[][] {
  const map = new Map<string, Asset[]>();
  for (const a of assets) {
    const key = buildGroupKey(a) || `__single__:${a.id}`;
    const bucket = map.get(key);
    if (bucket) bucket.push(a); else map.set(key, [a]);
  }
  
  // Sort each group so assets with images (assetImages or PSA images) come first (better visual representation)
  const groups = Array.from(map.values());
  groups.forEach(group => {
    group.sort((a, b) => {
      const aHasImage = !!((a as any).assetImages?.[0] || (a.psaImageFrontUrl && a.psaImageFrontUrl.trim()));
      const bHasImage = !!((b as any).assetImages?.[0] || (b.psaImageFrontUrl && b.psaImageFrontUrl.trim()));
      
      // Sort assets with images first
      if (aHasImage && !bHasImage) return -1;
      if (!aHasImage && bHasImage) return 1;
      
      // If both have images or both don't, maintain original order
      return 0;
    });
  });
  
  return groups;
}

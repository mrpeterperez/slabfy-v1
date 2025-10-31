import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MarketPricing, SessionAssetV2 } from "../types";
import { TIER_3_DYNAMIC, PRICING_CACHE } from "@/lib/cache-tiers";
import { queryKeys } from "@/lib/query-keys";

async function http<T>(url: string): Promise<T> {
        const res = await apiRequest("GET", url);
        return res.json() as Promise<T>;
}

export function useSessionAssets(sessionId: string) {
	// Buying desk assets change frequently - use TIER_3_DYNAMIC
	return useQuery<SessionAssetV2[]>({
		queryKey: queryKeys.buyingDesk.assets(sessionId),
		queryFn: () => http(`/api/buying-desk/sessions/${sessionId}/assets`),
		enabled: !!sessionId,
		...TIER_3_DYNAMIC, // 1min stale, refetch on mount
	});
}

export function useAssetPricing(globalAssetId: string) {
	// Pricing uses standard PRICING_CACHE tier
	return useQuery<MarketPricing>({
		queryKey: queryKeys.pricing.single(globalAssetId),
		queryFn: () => http(`/api/pricing/${globalAssetId}`),
		enabled: !!globalAssetId,
		placeholderData: (previousData) => previousData,
		...PRICING_CACHE,
	});
}

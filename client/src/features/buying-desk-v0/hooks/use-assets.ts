import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MarketPricing, SessionAssetV2 } from "../types";

async function http<T>(url: string): Promise<T> {
        const res = await apiRequest("GET", url);
        return res.json() as Promise<T>;
}

const keys = {
        assets: (sessionId: string) => ["buying-desk", "assets", sessionId] as const,
        pricing: (assetId: string) => ["pricing", assetId] as const,
};

export function useSessionAssets(sessionId: string) {
	return useQuery<SessionAssetV2[]>({
		queryKey: keys.assets(sessionId),
		queryFn: () => http(`/api/buying-desk/sessions/${sessionId}/assets`),
		enabled: !!sessionId,
		staleTime: 60_000, // 1 minute - critical for buying desk workflow
		refetchOnMount: true, // Refetch when component mounts for fresh data
		refetchOnWindowFocus: true, // Refetch when returning to tab
		refetchOnReconnect: true, // Refetch on reconnect to ensure fresh data
	});
}

export function useAssetPricing(globalAssetId: string) {
	return useQuery<MarketPricing>({
		queryKey: keys.pricing(globalAssetId),
		queryFn: () => http(`/api/pricing/${globalAssetId}`),
		enabled: !!globalAssetId,
		staleTime: 5 * 60_000, // 5 minutes - pricing data less volatile
		refetchOnWindowFocus: false, // Disable for pricing to reduce API load
		refetchOnMount: false, // Rely on staleTime for pricing freshness
	});
}

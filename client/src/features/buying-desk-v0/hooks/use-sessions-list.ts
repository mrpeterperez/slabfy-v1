import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { buyingDeskApi } from "../lib/api";
import type { BuySession } from "../types";
import { useBuyOffersV0 } from "./use-offers";

const key = { 
        list: ["buying-desk", "sessions"] as const,
        listByEvent: (eventId: string) => ["buying-desk", "sessions", "event", eventId] as const
};

export function useSessionsList(param?: { archived?: boolean; eventId?: string }) {
        const { data: sessions, isLoading, error } = useBuyOffersV0(param);
        
        return {
		data: sessions?.map((s) => ({
			session: {
				id: s.buyOffer.id,
				sessionNumber: s.buyOffer.offerNumber,
				status: s.buyOffer.status ?? "active",
				notes: s.buyOffer.notes ?? null,
				createdAt: s.buyOffer.createdAt ?? new Date().toISOString(),
				expiryDate: s.buyOffer.expiryDate ?? null,
			},
                        contact: s.contact,
                        event: s.event ?? null,
                        cartSummary: {
                                count: s.cartSummary.count,
                                totalValue: s.cartSummary.totalValue,
                                expectedProfit: s.cartSummary.expectedProfit,
                        },
                })),
                isLoading,
                error,
        };
}

export function useDeleteSessionItem() {
        const qc = useQueryClient();
        return useMutation({
                mutationFn: async (id: string) => { await buyingDeskApi.sessions.delete(id); },
                onSuccess: () => { 
                        // Invalidate both global and event-scoped caches
                        qc.invalidateQueries({ queryKey: key.list });
                        qc.invalidateQueries({ queryKey: ["buying-desk", "sessions", "event"], exact: false });
                },
        });
}

export function useUpdateSessionItem() {
        const qc = useQueryClient();
        return useMutation({
                mutationFn: async ({ id, data }: { id: string; data: { status?: BuySession["status"]; notes?: string } }) => buyingDeskApi.sessions.update(id, data as Partial<BuySession>),
                onSuccess: () => {
                        // Invalidate both global and event-scoped caches
                        qc.invalidateQueries({ queryKey: key.list });
                        qc.invalidateQueries({ queryKey: ["buying-desk", "sessions", "event"], exact: false });
                        qc.invalidateQueries({ queryKey: ["/api/contacts"], predicate: (query) => query.queryKey.length === 3 && query.queryKey[2] === "references" });
                },
        });
}

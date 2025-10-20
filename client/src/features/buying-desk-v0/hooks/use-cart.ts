import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { buyingDeskApi } from "../lib/api";
import { setDraftPrice } from "../lib/draft-prices";

const keys = { assets: (sessionId: string) => ["buying-desk", "assets", sessionId] as const };

export function useCartActionsV0(sessionId: string) {
        const qc = useQueryClient();
        // Persist in-flight IDs across renders to prevent double-submits
        const inflightRef = useRef<Set<string>>(new Set());

        const moveToCart = useMutation({
                mutationFn: (payload: { evaluationId: string; offerPrice: number; notes?: string }) =>
                        buyingDeskApi.sessions.moveToCart(sessionId, payload),
                onMutate: async (payload) => {
                        if (inflightRef.current.has(payload.evaluationId)) return {} as any;
                        inflightRef.current.add(payload.evaluationId);
                        await qc.cancelQueries({ queryKey: keys.assets(sessionId) });
                        const prev = qc.getQueryData<any[]>(keys.assets(sessionId));
                        if (Array.isArray(prev)) {
                                qc.setQueryData(keys.assets(sessionId), prev.map((it) => (
                                        it.id === payload.evaluationId ? { ...it, status: 'ready', offerPrice: payload.offerPrice } : it
                                )));
                        }
                        return { prev };
                },
                onSuccess: (data, payload) => {
                        if (!payload?.evaluationId) {
                                return;
                        }

                        const current = qc.getQueryData<any[]>(keys.assets(sessionId));
                        if (!Array.isArray(current) || !current.length) {
                                qc.invalidateQueries({ queryKey: keys.assets(sessionId) });
                                return;
                        }

                        const responseIsAsset = Boolean(data && typeof data === 'object' && 'id' in data);
                        if (!responseIsAsset) {
                                qc.setQueryData(keys.assets(sessionId), current.map((it) => (
                                        it.id === payload.evaluationId ? { ...it, status: 'ready', offerPrice: payload.offerPrice } : it
                                )));
                                qc.invalidateQueries({ queryKey: keys.assets(sessionId) });
                                return;
                        }

                        const next = current.map((it) => {
                                if (it.id !== payload.evaluationId) return it;

                                const mergedAsset = data.asset ? { ...it.asset, ...data.asset } : it.asset;
                                const rawOffer = (data as { offerPrice?: number | string | null }).offerPrice;
                                const normalizedOffer = typeof rawOffer === 'number' ? rawOffer : Number(rawOffer ?? payload.offerPrice);

                                return {
                                        ...it,
                                        ...data,
                                        id: data.id as string,
                                        status: (data.status as string) ?? 'ready',
                                        offerPrice: Number.isFinite(normalizedOffer) ? normalizedOffer : payload.offerPrice,
                                        asset: mergedAsset ?? it.asset,
                                };
                        });

                        qc.setQueryData(keys.assets(sessionId), next);
                        qc.invalidateQueries({ queryKey: keys.assets(sessionId) });
                },
                onError: (_err, payload, ctx) => {
                        if (payload?.evaluationId) inflightRef.current.delete(payload.evaluationId);
                        if (ctx?.prev) qc.setQueryData(keys.assets(sessionId), ctx.prev);
                },
                onSettled: (_data, _err, payload) => {
                        if (payload?.evaluationId) inflightRef.current.delete(payload.evaluationId);
                        // Don't invalidate immediately - let optimistic updates stick
                },
        });

        const removeFromCart = useMutation({
                mutationFn: (cartId: string) => buyingDeskApi.sessions.removeCartItem(sessionId, cartId),
                onMutate: async (cartId) => {
                        if (inflightRef.current.has(cartId)) return {} as any;
                        inflightRef.current.add(cartId);
                        await qc.cancelQueries({ queryKey: keys.assets(sessionId) });
                        const prev = qc.getQueryData<any[]>(keys.assets(sessionId));
                        if (Array.isArray(prev)) {
                                qc.setQueryData(keys.assets(sessionId), prev.map((it) => {
                                        if (it.id === cartId) {
                                                // Preserve the current offer price when moving back to evaluating
                                                const currentPrice = Number(it.offerPrice || 0);
                                                // Store the price in draft prices to persist across re-renders
                                                if (it.asset?.id) {
                                                        setDraftPrice(sessionId, it.asset.id, currentPrice);
                                                }
                                                return { ...it, status: 'evaluating', offerPrice: currentPrice };
                                        }
                                        return it;
                                }));
                        }
                        return { prev };
                },
                onSuccess: (_data, cartId) => {
                        // Confirm the item is in evaluating state after successful removal
                        const current = qc.getQueryData<any[]>(keys.assets(sessionId));
                        if (Array.isArray(current)) {
                                qc.setQueryData(keys.assets(sessionId), current.map((it) => 
                                        it.id === cartId ? { ...it, status: 'evaluating' } : it
                                ));
                        }
                },
                onError: (_err, cartId, ctx) => {
                        if (cartId) inflightRef.current.delete(cartId);
                        if (ctx?.prev) qc.setQueryData(keys.assets(sessionId), ctx.prev);
                },
                onSettled: (_data, _err, cartId) => {
                        if (cartId) inflightRef.current.delete(cartId);
                        // Don't invalidate immediately - let optimistic updates stick
                },
        });

        return { moveToCart, removeFromCart };
}

export function useCartTotalsV0(assets: Array<any>, market: Record<string, { average?: number }>) {
        const marketValue = (assets || []).reduce((sum, a) => sum + (market[a.asset?.id || a.assetId]?.average ?? 0), 0);
        const offerTotal = (assets || []).filter(a => a.status === 'ready').reduce((sum, a) => sum + (a.offerPrice ?? 0), 0);
        const expectedProfit = Math.max(0, marketValue - offerTotal);
        return { marketValue, offerTotal, expectedProfit };
}

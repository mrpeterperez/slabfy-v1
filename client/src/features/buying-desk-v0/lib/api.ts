// v0-local copy of buying-desk API adapters
import type { BuySession, CheckoutFinalizePayload, CheckoutFinalizeResponse, CreateBuySessionData } from "../types";
import { apiRequest } from "@/lib/queryClient";

const BASE = "/api/buying-desk";

async function http<T>(input: string, init?: { method?: string; body?: any }): Promise<T> {
        const method = init?.method ?? "GET";
        const body = init?.body ? (typeof init.body === "string" ? JSON.parse(init.body) : init.body) : undefined;
        const res = await apiRequest(method, input, body);

        if (res.status === 204) return undefined as unknown as T;
        const text = await res.text();
        if (!text) return undefined as unknown as T;
        try {
                return JSON.parse(text) as T;
        } catch {
                return undefined as unknown as T;
        }
}

export const buyingDeskApi = {
        sellers: {},
        sessions: {
                list: (eventId?: string) => {
                        const params = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
                        return http<any[]>(`${BASE}/sessions${params}`);
                },
                create: (payload: CreateBuySessionData) => http<BuySession>(`${BASE}/sessions`, { method: "POST", body: JSON.stringify(payload) }),
                update: (id: string, data: Partial<BuySession>) => http<BuySession>(`${BASE}/sessions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
                get: (id: string) => http<BuySession>(`${BASE}/sessions/${id}`),
                delete: (id: string) => http<void>(`${BASE}/sessions/${id}`, { method: "DELETE" }),
                addStagingAsset: (sessionId: string, data: { assetId?: string; certNumber?: string }) => http<any>(`${BASE}/sessions/${sessionId}/assets`, { method: "POST", body: JSON.stringify(data) }),
                assets: (sessionId: string) => http<any[]>(`${BASE}/sessions/${sessionId}/assets`),
                moveToCart: (sessionId: string, data: { evaluationId: string; offerPrice: number; notes?: string }) => http<any>(`${BASE}/sessions/${sessionId}/cart/move`, { method: "POST", body: JSON.stringify(data) }),
                removeCartItem: (sessionId: string, cartId: string) => http<void>(`${BASE}/sessions/${sessionId}/cart/${cartId}`, { method: "DELETE" }),
                finalizeCheckout: (sessionId: string, payload: CheckoutFinalizePayload) => http<CheckoutFinalizeResponse>(`${BASE}/sessions/${sessionId}/checkout/finalize`, { method: "POST", body: JSON.stringify(payload) }),
        },
};

export const psaApi = {
        getByCert: async (certNumber: string) => http<any>(`/api/psa-cert/${encodeURIComponent(certNumber)}`),
};

export const globalAssetsApi = {
        create: (data: any) => http<any>(`/api/global-assets`, { method: "POST", body: JSON.stringify(data) }),
};

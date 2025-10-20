// Types for buying-desk-v0 (local copy)
export interface SellerWithContact {
        id: string;
        name: string;
        email?: string | null;
        company?: string | null;
        phoneNumber?: string | null;
        description?: string | null;
}

export type SessionStatus = "in_progress" | "sent" | "completed" | "cancelled";

export interface Session {
        id: string;
        sellerId: string;
        status: SessionStatus;
        notes?: string | null;
        createdAt?: string;
        updatedAt?: string;
}

export interface StagingAsset {
        id: string;
        globalAssetId?: string;
        cert?: string;
        title?: string;
        imageUrl?: string;
}

export interface CartAsset {
        id: string;
        stagingId?: string;
        offerPrice?: number | null;
}

export interface SessionAssetV2 {
        id: string;
        sessionId: string;
        assetId: string;
        status?: string;
        notes?: string | null;
        // Purchased-only enrichments
        seller?: { id?: string | null; sellerId?: string | null; name?: string };
        purchaseDate?: string;
        paymentMethod?: PaymentMethod | string;
        asset: {
                id: string;
                title?: string;
                playerName?: string;
                setName?: string;
                year?: number | string;
                cardNumber?: string;
                variant?: string | null;
                grader?: string | null;
                grade?: string | null;
                certNumber?: string | null;
                psaImageFrontUrl?: string | null;
                psaImageBackUrl?: string | null;
        };
}

export type CartMovePayload = { evaluationId: string; offerPrice: number; notes?: string };

export interface MarketPricing {
        average: number;
        salesCount?: number;
        liquidity?: "fire" | "hot" | "warm" | "cool" | "cold";
        confidence?: number;
        exitTime?: string;
        cached?: boolean;
}

export type PaymentMethod = 'cash' | 'check' | 'digital' | 'trade';

// Simplified payload that matches server schema
export interface CheckoutFinalizePayload {
        paymentMethod: PaymentMethod;
        amountPaid?: number;
        notes?: string;
        buyerName?: string;
}

export interface CheckoutFinalizeResponse { receiptId: string; sessionId: string; total: number; paidAt: string }

export interface BuySession {
	id: string;
	sessionNumber: string;
	sellerId?: string;
	eventId?: string;
	notes?: string;
	status: 'active' | 'closed'; // Simplified statuses (80/20 rule)
	createdAt: string;
	updatedAt?: string;
	seller?: { id: string; name: string; email?: string; phone?: string };
	event?: { id: string; name: string; location?: string };
	assetCount?: number;
	cartCount?: number;
	totalValue?: number;
	expectedProfit?: number;
}export type AssetStatus = 'evaluating' | 'ready' | 'purchased' | 'passed';

export interface BuySessionAsset {
        id: string;
        sessionId: string;
        assetId: string;
        status: AssetStatus;
        offerPrice?: number;
        offerPercentage?: number;
        marketValueAtOffer?: number;
        confidenceLevel?: number;
        expectedProfit?: number;
        notes?: string;
        addedAt: string;
        updatedAt?: string;
        asset: {
                id: string;
                title?: string;
                playerName?: string;
                setName?: string;
                year?: number;
                cardNumber?: string;
                variant?: string;
                grader?: string;
                grade?: string;
                certNumber?: string;
                psaImageFrontUrl?: string;
                psaImageBackUrl?: string;
        };
}

export interface CreateBuySessionData { sellerId?: string; contactId?: string; eventId?: string; notes?: string }
export interface UpdateBuySessionData { sellerId?: string; eventId?: string; notes?: string; status?: BuySession['status'] }
export interface UpdateAssetData { status?: AssetStatus; offerPrice?: number; offerPercentage?: number; notes?: string }

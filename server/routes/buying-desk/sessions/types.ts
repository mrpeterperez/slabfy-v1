// 🤖 INTERNAL NOTE:
// Purpose: Shared TypeScript types for buying desk session API responses
// Exports: SessionSummary
// Feature: buying-desk
// Dependencies: @shared/schema

import type { BuyOfferStatus } from "@shared/schema";

export interface SessionSummary {
  id: string;
  sessionNumber: string;
  eventId?: string;
  notes?: string;
  status: BuyOfferStatus;
  createdAt: Date;
  updatedAt: Date;
  event?: {
    id: string;
    name: string;
    location: string | null;
  };
  seller?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  assetCount: number;
  cartCount: number;
  totalValue: number;
  expectedProfit: number;
}

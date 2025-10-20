// 🤖 INTERNAL NOTE:
// Purpose: TypeScript interfaces for buying desk table components
// Exports: table-related type definitions and interfaces
// Feature: buying-desk-v0
// Dependencies: shared types

export interface BuyingDeskAsset {
  id: string;
  status: 'evaluating' | 'ready' | 'purchased';
  offerPrice?: number;
  purchasePrice?: number; // Available for purchased items
  asset?: {
    id: string;
    playerName?: string;
    setName?: string;
    year?: string;
    cardNumber?: string;
    grade?: string;
    certNumber?: string;
    title?: string;
    psaImageFrontUrl?: string;
  };
  seller?: {
    id?: string;
    name?: string;
  };
  purchaseDate?: string;
  paymentMethod?: string;
  realizedProfit?: number;
}

export interface MarketData {
  averagePrice: number;
  confidence: number;
  liquidity: string;
  salesCount: number;
  isLoading?: boolean;
  hasData?: boolean;
}

export interface TableRow {
  item: BuyingDeskAsset;
  asset: BuyingDeskAsset['asset'];
  market: MarketData;
  averagePrice: number;
  confidence: number;
  liquidity: string;
  salesCount: number;
  buyPrice: number;
  displayProfit: number | null;
  seller?: BuyingDeskAsset['seller'];
  purchaseDate?: string;
  paymentMethod?: string;
}

export interface ColumnVisibility {
  asset: boolean;
  list: boolean;
  market: boolean;
  profit: boolean;
  confidence: boolean;
  liquidity: boolean;
  seller: boolean;
  purchaseDate: boolean;
  paymentMethod: boolean;
  status: boolean;
}

export interface ColumnConfig {
  key: keyof ColumnVisibility;
  label: string;
  visible: boolean;
  locked?: boolean;
}

export type SortColumn = 'asset' | 'list' | 'market' | 'profit' | 'confidence' | 'liquidity' | 'status' | 'seller' | 'purchaseDate' | 'paymentMethod';
export type SortDirection = 'asc' | 'desc';

export interface TableProps {
  sessionId: string;
  onOpenCart?: () => void;
}
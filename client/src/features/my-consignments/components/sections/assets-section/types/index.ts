// 🤖 INTERNAL NOTE:
// Purpose: Type definitions for assets section
// Exports: All types used in assets section components
// Feature: my-consignments

import type { UserAsset, ConsignmentWithDetails, ConsignorWithContact } from '@shared/schema';

// Type for the consignment asset data that comes from the API (UserAsset joined with GlobalAsset)
export interface ConsignmentAssetData extends UserAsset {
  // GlobalAsset fields
  playerName?: string | null;
  setName?: string | null;
  year?: string | null;
  cardNumber?: string | null;
  variant?: string | null;
  grade?: string | null;
  title?: string | null;
  certNumber?: string | null;
  psaImageFrontUrl?: string | null;
  assetImages?: string[] | null;
  liquidityRating?: string | null;
  // Market data fields
  marketPrice?: number | null;
  confidence?: number | null;
  // API compatibility
  askingPrice?: number | null;
  soldPrice: string | null;
  buyerName: string | null;
  buyerContactId: string | null;
}

// Market data type from pricing API
export interface MarketData {
  averagePrice: number;
  confidence: number;
  liquidity: string;
  salesCount: number;
}

export interface AssetsSectionProps {
  consignment: ConsignmentWithDetails;
  consignor: ConsignorWithContact;
}

export type SortColumn = 'asset' | 'market' | 'confidence' | 'list' | 'reserve' | 'split' | 'profit' | 'days' | 'status' | 'liquidity';
export type SortDirection = 'asc' | 'desc';

// Column configuration interface
export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean;
}

// Skip save state for edit cancellation
export interface SkipSaveState {
  list: Set<string>;
  reserve: Set<string>;
  split: Set<string>;
  status: Set<string>;
}

// Delete dialog state
export interface DeleteDialogState {
  open: boolean;
  assetId: string | null;
  assetTitle: string;
}

// Bulk delete dialog state
export interface BulkDeleteDialogState {
  open: boolean;
  assetIds: string[];
  count: number;
}

// Split apply state
export interface PendingSplitApply {
  newSplit: number;
  oldSplit: number;
  scope: 'smart' | 'selected' | 'all';
}
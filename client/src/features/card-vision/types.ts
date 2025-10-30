// 🤖 INTERNAL NOTE:
// Purpose: TypeScript types for AI card vision analysis
// Exports: CardAnalysisResult, CardType, AnalyzedCardFields
// Feature: card-vision
// Dependencies: None

export type CardType = 'psa' | 'bgs' | 'sgc' | 'cgc' | 'raw' | 'tcg';

export interface AnalyzedCardFields {
  certNumber?: string;
  sport?: string;
  year?: string;
  brand?: string;
  series?: string;
  playerName?: string;
  cardNumber?: string;
  parallel?: string;
  variant?: string;
  gradingCompany?: string;
  grade?: string;
  estimatedCondition?: string;
  serialNumber?: string;
  serialMax?: string;
}

export interface CardAnalysisResult {
  cardType: CardType;
  confidence: number;
  isPSAFastPath?: boolean; // If true, use cert# for PSA lookup instead of field extraction
  certNumber?: string; // PSA cert number for fast path
  fields: AnalyzedCardFields;
  frontAnalysis?: string; // What was detected from front image
  backAnalysis?: string; // What was detected from back image
  reasoning?: string;
}

export interface CardAnalysisError {
  error: string;
  details?: string;
  rawResponse?: string;
}

// NEW: For dual-scan camera queue
export interface QueuedCard {
  id: string;
  frontImage: string;
  backImage?: string;
  thumbnail: string;
  status: 'processing' | 'success' | 'failed';
  result?: CardAnalysisResult;
  error?: string;
  timestamp: number;
}

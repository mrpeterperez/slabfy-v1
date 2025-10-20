// 🤖 INTERNAL NOTE (LLM):
// Shared types used for slab scanning across PSA commands and consuming features.

export interface CertMetadata {
  cert: string;
  player: string;
  year: string;
  set: string;
  grade: string;
  grader: string;
  cardNumber?: string;
  // Image URLs
  psaImageFrontUrl?: string;
  psaImageBackUrl?: string;
  // Basic metadata fields
  category?: string;
  labelType?: string;
  specId?: number;
  specNumber?: string;
  reverseBarCode?: boolean;
  // Population data
  totalPopulation?: number;
  totalPopulationWithQualifier?: number;
  populationHigher?: number;
  t206PopulationAllBacks?: number | null;
  t206PopulationHigherAllBacks?: number | null;
  // Authentication data
  isPsaDna?: boolean;
  isDualCert?: boolean;
  autographGrade?: string | null;
  // Additional fields
  variant?: string | null;
  itemStatus?: string | null;
}

export interface PriceComp {
  title: string;
  price: number;
  soldDate: string;
}

export interface SlabScanResult {
  cert: string;
  metadata: CertMetadata;
  comps: PriceComp[];
}

// 🤖 INTERNAL NOTE (LLM):
// Type definitions for the PSA cert lookup Edge Function.
// Includes PSA Public API response interfaces and our mapped asset type.
// Used in `psa-cert-lookup/index.ts` and all related utilities.
//
// 🔁 Maps raw PSA cert data → our asset schema (InsertAsset).
// 📸 Includes types for PSA slab image lookup as well.

////////////////////
// Request Payload
////////////////////

/**
 * Request body for PSA cert lookup
 */
export interface CertLookupRequest {
  certNumber: string;
}

////////////////////
// PSA API Types
////////////////////

/**
 * PSA API response for cert lookup (PSACert)
 * Matches the response from GET /cert/GetByCertNumber/{certNumber}
 * Note: PSA API returns both camelCase and PascalCase variants
 */
export interface PSACert {
  CertNumber: number;
  Subject: string;
  Brand: string;
  Year: string;
  CardNumber?: string;
  Variety?: string;
  GradeDescription: string;
  Category?: string;
  LabelType?: string;
  // Population fields - PSA returns both camelCase and PascalCase
  TotalPopulation?: number;
  totalPopulation?: number;
  TotalPopulationWithQualifier?: number;
  totalPopulationWithQualifier?: number;
  PopulationHigher?: number;
  populationHigher?: number;
  T206PopulationAllBacks?: number;
  t206PopulationAllBacks?: number;
  T206PopulationHigherAllBacks?: number;
  t206PopulationHigherAllBacks?: number;
  IsPSADNA: boolean;
  IsDualCert: boolean;
  PrimarySigners?: string[];
  OtherSigners?: string[];
  AutographGrade?: string;
  SpecID?: number;
  SpecNumber?: string;
  ReverseBarCode: boolean;
  ItemStatus?: string;
}

/**
 * PSA API response for image lookup
 * Matches GET /cert/GetImagesByCertNumber/{certNumber}
 */
export interface PSAImage {
  ImageURL: string;
  LargeImageUrl?: string; // Some PSA responses use LargeImageUrl instead of ImageURL
  IsFrontImage: boolean;
}

////////////////////
// Mapped Asset (our format)
////////////////////

/**
 * Mapped asset fields from PSA data
 * Matches schema.ts (used in shared/schema.ts)
 */
export interface MappedAsset {
  type: "graded";
  title: string;
  sourceSlug: "psa";
  grader: "PSA";

  playerName: string | null;
  setName: string | null;
  year: string | null;
  cardNumber: string | null;
  variant: string | null;
  grade: string | null;
  certNumber: string | null;

  category: string | null;
  labelType: string | null;

  totalPopulation: number | null;
  totalPopulationWithQualifier: number | null;
  populationHigher: number | null;
  t206PopulationAllBacks: number | null;
  t206PopulationHigherAllBacks: number | null;

  isPsaDna: boolean;
  isDualCert: boolean;
  primarySigners: string[];
  otherSigners: string[];
  autographGrade: string | null;

  specId: number | null;
  specNumber: string | null;
  reverseBarCode: boolean;
  itemStatus: string | null;

  psaImageFrontUrl: string | null;
  psaImageBackUrl: string | null;
}

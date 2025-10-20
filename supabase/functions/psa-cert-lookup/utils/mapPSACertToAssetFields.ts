// 🤖 INTERNAL NOTE (LLM):
// Maps PSA API response data to our asset schema format.
// Translates PSA's naming conventions to our database field names.
// Used by the Edge Function to normalize PSA data for frontend consumption.

import { PSACert, MappedAsset } from "../types.ts";

/**
 * Maps PSA certificate data to our asset schema format
 * @param psaCert - The PSA certificate data from the API
 * @returns Asset fields mapped to our schema format
 */
export function mapPSACertToAssetFields(psaCert: PSACert): MappedAsset {
  if (!psaCert) {
    throw new Error("No PSA certificate data provided");
  }

  // Assemble a human-readable title from card details
  const title = [
    psaCert.Subject,
    psaCert.Year,
    psaCert.Brand,
    psaCert.CardNumber ? `#${psaCert.CardNumber}` : "",
    psaCert.Variety ? `(${psaCert.Variety})` : "",
    psaCert.GradeDescription,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    // Fixed values for graded PSA cards
    type: "graded",
    title,
    sourceSlug: "psa",
    grader: "PSA",

    // Basic card details
    playerName: psaCert.Subject || null,
    setName: psaCert.Brand || null,
    year: psaCert.Year || null,
    cardNumber: psaCert.CardNumber || null,
    variant: psaCert.Variety || null,
    grade: psaCert.GradeDescription || null,
    certNumber: psaCert.CertNumber?.toString() || null,

    // Classification fields
    category: psaCert.Category || null,
    labelType: psaCert.LabelType || null,

    // Population report fields - PSA API returns camelCase, handle both cases
    totalPopulation: psaCert.totalPopulation ?? psaCert.TotalPopulation ?? null,
    totalPopulationWithQualifier: psaCert.totalPopulationWithQualifier ?? psaCert.TotalPopulationWithQualifier ?? null,
    populationHigher: psaCert.populationHigher ?? psaCert.PopulationHigher ?? null,
    t206PopulationAllBacks: psaCert.t206PopulationAllBacks ?? psaCert.T206PopulationAllBacks ?? null,
    t206PopulationHigherAllBacks: psaCert.t206PopulationHigherAllBacks ?? psaCert.T206PopulationHigherAllBacks ?? null,

    // Authentication fields
    isPsaDna: psaCert.IsPSADNA ?? false,
    isDualCert: psaCert.IsDualCert ?? false,
    autographGrade: psaCert.AutographGrade ?? null,
    primarySigners: psaCert.PrimarySigners ?? [],
    otherSigners: psaCert.OtherSigners ?? [],

    // Specification fields - match PSA DB identifiers
    specId: psaCert.SpecID ?? null,
    specNumber: psaCert.SpecNumber ?? null,
    reverseBarCode: psaCert.ReverseBarCode ?? false,
    itemStatus: psaCert.ItemStatus ?? null,

    // Image URLs - will be populated by enrichWithImages function after this mapping
    psaImageFrontUrl: null,
    psaImageBackUrl: null,
  };
}

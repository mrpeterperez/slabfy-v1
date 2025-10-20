// 🤖 INTERNAL NOTE (LLM):
// Fetches cert metadata for PSA slabs using Supabase Edge Function.
// Part of `psa-slab-scanning` shared module.

import { CertMetadata } from "../types";

export async function fetchCertMetadata(
  certNumber: string,
): Promise<CertMetadata> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/psa-cert-lookup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ certNumber }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch cert metadata: ${errorText}`);
    }

    const data = await response.json();
    
    // Log the received data to see what we're getting
    console.log("PSA cert data received by client:", data);
    
    // Create a robust function that shows detailed debugging for each field
    const logMissingFields = (data: any) => {
      console.log("PSA data field check (client):");
      console.log("playerName:", data.playerName);
      console.log("year:", data.year);
      console.log("setName:", data.setName);
      console.log("grade:", data.grade);
      console.log("cardNumber:", data.cardNumber);
    };
    
    logMissingFields(data);
    
    // Check for null fields and throw an error if all critical fields are null
    if (!data.playerName && !data.year && !data.setName && !data.grade) {
      console.warn("All critical PSA data fields are null - checking for API authentication issues");
      
      // Check if we need to refresh the PSA token
      if (data.type === "graded" && data.sourceSlug === "psa") {
        throw new Error("The PSA API returned empty data. The token may need to be refreshed or the certificate number is invalid.");
      }
    }
    
    // Create the CertMetadata object with all available fields
    const metadata: CertMetadata = {
      cert: certNumber,
      player: data.playerName || "Unknown",
      year: data.year || "Unknown",
      set: data.setName || "Unknown",
      grade: data.grade || "Unknown",
      grader: (data.grader || "PSA") as string,
      cardNumber: data.cardNumber || undefined,
      // Include image URLs directly
      psaImageFrontUrl: data.psaImageFrontUrl || undefined,
      psaImageBackUrl: data.psaImageBackUrl || undefined,
      // Include additional metadata
      category: data.category,
      labelType: data.labelType,
      specId: data.specId,
      specNumber: data.specNumber,
      reverseBarCode: data.reverseBarCode,
      // Include population data
      totalPopulation: data.totalPopulation,
      totalPopulationWithQualifier: data.totalPopulationWithQualifier,
      populationHigher: data.populationHigher,
      t206PopulationAllBacks: data.t206PopulationAllBacks,
      t206PopulationHigherAllBacks: data.t206PopulationHigherAllBacks,
      // Include authentication data
      isPsaDna: data.isPsaDna,
      isDualCert: data.isDualCert,
      autographGrade: data.autographGrade,
      // Include any other useful fields
      variant: data.variant,
      itemStatus: data.itemStatus,
    };
    
    // Log the image URLs for debugging
    console.log("PSA Front Image URL:", metadata.psaImageFrontUrl);
    console.log("PSA Back Image URL:", metadata.psaImageBackUrl);
    
    console.log("Metadata being returned:", metadata);
    
    return metadata;
  } catch (error) {
    console.error("Error fetching PSA cert metadata:", error);
    throw error;
  }
}

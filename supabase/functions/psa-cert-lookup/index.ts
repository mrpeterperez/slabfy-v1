// 🤖 INTERNAL NOTE (LLM):
// This is a Supabase Edge Function for cert scanning workflows.
// It fetches PSA metadata and slab images using certNumber,
// maps them to our InsertAsset schema,
// and returns a normalized object to the frontend.
// Used in `shared/psa-slab-scanning/commands/fetchCertMetadata.ts`
//
// 🧠 Follows all slabfyrules.md structure and naming conventions.
// 📚 For context, see shared/psa-slab-scanning/README.md

import { serve, getCorsHeaders } from "../_shared/deps.ts";
import { CertLookupRequest, MappedAsset } from "./types.ts";
import { callPsaApi } from "./utils/callPsaApi.ts";
import { callImageApi } from "./utils/callImageApi.ts";
import { mapPSACertToAssetFields } from "./utils/mapPSACertToAssetFields.ts";
import { enrichWithImages } from "./utils/enrichWithImages.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const origin = req.headers.get("Origin") ?? undefined;
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    // Parse request body
    const requestData: CertLookupRequest = await req.json();
    const { certNumber } = requestData;

    // Validate cert number
    if (!certNumber || certNumber.length < 4) {
      return new Response(
        JSON.stringify({ error: "Invalid certification number" }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Call PSA API for cert data
    const psaCert = await callPsaApi(certNumber);

    if (!psaCert) {
      return new Response(
        JSON.stringify({ 
          error: "Certificate not found or has no data", 
          message: "The PSA database either doesn't have this certificate, or it exists but contains no data."
        }),
        {
          status: 404,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        }
      );
    }


    // Map cert data to our schema
    const mappedAsset: MappedAsset = mapPSACertToAssetFields(psaCert);
    

    // Get images and add to the mapped data
    const images = await callImageApi(certNumber);
    const enrichedAsset = enrichWithImages(mappedAsset, images);
    

    // Return the complete data
    return new Response(
      JSON.stringify(enrichedAsset),
      {
        status: 200,
        headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
      }
    );
  } catch (error) {
    console.error("Error processing PSA cert lookup:", error);
    
    // Check for specific error types for better error messages
    let errorMessage = "Failed to process certificate lookup";
    let statusCode = 500;
    
    if (error instanceof Error) {
      
      if (error.message.includes("PSA API authentication failed")) {
        errorMessage = "Authentication error with PSA API. The API token may need to be updated.";
        statusCode = 401;
      } else if (error.message.includes("PSA API token")) {
        errorMessage = "PSA API token configuration issue. Please check your environment variables.";
        statusCode = 500;
      }
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.message : undefined
      }),
      {
        status: statusCode,
        headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
      }
    );
  }
});
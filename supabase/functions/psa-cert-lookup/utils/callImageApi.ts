// 🤖 INTERNAL NOTE (LLM):
// Utility function to fetch PSA slab images from the PSA API.
// Used by the Edge Function to get front and back images by cert number.
// PSA API endpoint: GET /cert/GetImagesByCertNumber/{certNumber}

import { PSAImage } from "../types.ts";

/**
 * Fetches PSA slab images by cert number
 * @param certNumber - The PSA certification number
 * @returns Array of PSA image objects or empty array if not found
 */
export async function callImageApi(certNumber: string): Promise<PSAImage[]> {
  const apiToken = Deno.env.get("PSA_API_TOKEN");
  
  if (!apiToken) {
    console.error("PSA API token not found");
    throw new Error("PSA API token not configured");
  }
  
  if (apiToken.trim() === "") {
    console.error("PSA API token is empty");
    throw new Error("PSA API token is empty");
  }
  
  // Check if token format is Bearer or direct token
  const authToken = apiToken.startsWith("Bearer ") ? apiToken : `Bearer ${apiToken}`;

  try {
    const response = await fetch(
      `https://api.psacard.com/publicapi/cert/GetImagesByCertNumber/${certNumber}`,
      {
        method: "GET",
        headers: {
          "Authorization": authToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`PSA Image API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching PSA images:", error);
    return [];
  }
}
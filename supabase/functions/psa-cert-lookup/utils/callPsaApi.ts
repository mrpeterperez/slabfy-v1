// 🤖 INTERNAL NOTE (LLM):
// Utility function to fetch PSA certificate metadata from the PSA API.
// Used by the Supabase Edge Function to get card details by cert number.
// PSA API endpoint: GET /cert/GetByCertNumber/{certNumber}

import { PSACert } from "../types.ts";

/**
 * Fetches PSA certificate metadata by cert number
 * @param certNumber - The PSA certification number
 * @returns The PSA certificate data or null if not found
 */
export async function callPsaApi(certNumber: string): Promise<PSACert | null> {
  const apiToken = Deno.env.get("PSA_API_TOKEN");

  if (!apiToken || apiToken.trim() === "") {
    console.error("❌ PSA API token is missing or empty.");
    throw new Error("PSA API token is not configured.");
  }

  const authHeader = apiToken.startsWith("Bearer ")
    ? apiToken
    : `Bearer ${apiToken}`;

  try {
    const response = await fetch(
      `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        `❌ PSA API error: ${response.status} ${response.statusText}`,
      );

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Authentication failed: PSA API token is invalid or expired.",
        );
      }

      return null;
    }

    const json = await response.json();
    console.log("📦 Raw PSA API response:", JSON.stringify(json, null, 2));

    const cert = json?.PSACert as PSACert;

    if (!cert) {
      console.warn("⚠️ PSA API response missing 'PSACert'.");
      return null;
    }

    // Log critical fields for debugging
    console.log("✅ PSA cert critical fields:");
    console.log("  Subject:", cert.Subject);
    console.log("  Brand:", cert.Brand);
    console.log("  Year:", cert.Year);
    console.log("  Grade:", cert.GradeDescription);

    if (!cert.Subject && !cert.Brand && !cert.Year && !cert.GradeDescription) {
      console.warn("⚠️ PSA returned cert, but all critical fields are empty.");
      return null;
    }

    return cert;
  } catch (err) {
    console.error("❌ Error fetching PSA cert:", err);
    return null;
  }
}

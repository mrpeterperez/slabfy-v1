import { Router, type Request, type Response } from "express";
import { usernameSchema, psaCertCache, userAssets, globalAssets } from "@shared/schema";
import { storage } from "../../storage-mod/registry";
import { db } from "../../db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/psa-cert/{certNumber} (cached PSA cert lookup)
router.get("/psa-cert/:certNumber", async (req: Request, res: Response) => {
  try {
    const { certNumber } = req.params;
    
    if (!certNumber || certNumber.length < 4) {
      return res.status(400).json({ error: "Invalid certification number" });
    }

    console.log(`🔍 PSA cert lookup: ${certNumber}`);

    // 1. Check cache first
    const [cachedEntry] = await db
      .select()
      .from(psaCertCache)
      .where(eq(psaCertCache.certNumber, certNumber))
      .limit(1);

    if (cachedEntry) {
      console.log(`💾 Cache HIT for ${certNumber} - returning cached data`);
      return res.json({ data: cachedEntry.rawData });
    }

    console.log(`🌐 Cache MISS for ${certNumber} - fetching from PSA API`);

    // 2. Not in cache, fetch from Supabase Edge Function
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration for PSA cert lookup");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/psa-cert-lookup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ certNumber }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PSA cert lookup failed for ${certNumber}:`, errorText);
      return res.status(response.status).json({ 
        error: "Failed to lookup PSA certificate",
        details: errorText 
      });
    }

    const data = await response.json();
    
    // 3. Save to cache for next time
    try {
      await db.insert(psaCertCache).values({
        certNumber: certNumber,
        rawData: data,
        frontImageUrl: data.psaImageFrontUrl || null,
        backImageUrl: data.psaImageBackUrl || null,
      });
      console.log(`💾 Cached PSA cert data for ${certNumber}`);
    } catch (cacheError) {
      console.error(`Failed to cache PSA cert data for ${certNumber}:`, cacheError);
      // Don't fail the request if caching fails
    }

    return res.json({ data });
  } catch (error) {
    console.error("Error in PSA cert lookup:", error);
    return res.status(500).json({ error: "Failed to process PSA certificate lookup" });
  }
});


// POST /api/username/check (backwards-compatible public endpoint)
router.post("/username/check", async (req: Request, res: Response) => {
  try {
    const { username } = req.body as { username?: string };
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Username is required" });
    }

    const validation = usernameSchema.safeParse(username);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid username format", details: validation.error.errors });
    }

    const existing = await storage.getUserByUsername(username);
    return res.json({ available: !existing });
  } catch (error) {
    console.error("Error checking username availability:", error);
    return res.status(500).json({ error: "Failed to check username availability" });
  }
});

export default router;

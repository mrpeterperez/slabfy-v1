// Supabase Edge Function: groq-sales-filter  
// Model-agnostic card-sale matcher with optional price-outlier trim.
//
// Deploy:  supabase functions deploy groq-sales-filter
// Call:    POST /groq-sales-filter  (JSON body: { targetCard, salesData, model?, trim? })

import { serve, getCorsHeaders, jsonResponse } from "../_shared/deps.ts";

/* ---------- Types ---------- */
interface Sale {
  title: string;
  final_price: number;
}
interface RequestBody {
  targetCard: string; // e.g. "2018 Panini Prizm Luka Doncic #280 PSA 10"
  salesData: Sale[]; // array of listings
  model?: string; // optional: override default/ENV model
  trim?: boolean; // optional: true-to-trim (default) or false
}

/* ---------- Config ---------- */
const API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const DEF_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";
const BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

/* ---------- Helpers ---------- */
const json = (data: unknown, status = 200, origin?: string) =>
  jsonResponse(data, status, origin);

const cutOutliers = (sales: Sale[]) => {
  if (sales.length < 5) return sales;
  const prices = sales.map((s) => s.final_price).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  return sales.filter(
    (s) => s.final_price >= median * 0.2 && s.final_price <= median * 3,
  );
};

/* ---------- Groq AI-Powered Smart Filter ---------- */
async function groqAIFilter(targetCard: string, sales: Sale[]): Promise<Sale[]> {
  if (!API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const prompt = `You are an expert sports card matching system. Analyze if eBay sales match the target card.

TARGET CARD: "${targetCard}"

MATCHING RULES:
1. Player name MUST match (allow minor variations: "Kobe Bryant" = "K. Bryant")
2. Year MUST match (1996 = 1996-97 = 96-97)
3. Set MUST match (fuzzy OK: "Collector's Choice" = "Collectors Choice")
4. Card number MUST match exactly
5. Grade MUST match (PSA 10 = PSA GEM MT 10 = GEM MINT 10)
6. Grading company MUST match (PSA only, not BGS/SGC/CGC)

EXCLUDE:
- Different players
- Different years (±1 year tolerance)
- Different grades
- Raw/ungraded cards
- Lots/bundles (unless 1-2 cards)
- Autographed versions (unless target has "auto")
- Numbered parallels (unless target has /XX)
- Wrong card numbers

SALES TO ANALYZE:
${sales.map((s, i) => `${i}. "${s.title}" - $${s.final_price}`).join('\n')}

Return JSON with array of matching indices only:
{"matches": [0, 2, 5, ...]}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: DEF_MODEL,
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in Groq response');
    }

    const result = JSON.parse(content);
    const matchIndices = result.matches || [];
    
    return matchIndices.map((idx: number) => sales[idx]).filter(Boolean);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/* ---------- Fallback: Relaxed Local Filter ---------- */
function relaxedLocalFilter(targetCard: string, sales: Sale[]): Sale[] {
  const target = targetCard.toLowerCase();
  
  // Extract only critical components
  const targetGrader = target.match(/\b(psa|bgs|sgc|cgc)\b/i)?.[0]?.toLowerCase();
  const targetGrade = target.match(/(?:psa|bgs|sgc|cgc)\s*(?:gem\s*mt\s*)?(\d+(?:\.\d)?)/i)?.[1];
  const targetNumber = target.match(/#(\w+)/i)?.[1];

  return sales.filter(sale => {
    const title = sale.title.toLowerCase();
    
    // 1. Grader match (if specified)
    if (targetGrader && !new RegExp(`\\b${targetGrader}\\b`).test(title)) {
      return false;
    }
    
    // 2. Grade match (if specified)
    if (targetGrade && !new RegExp(targetGrade).test(title)) {
      return false;
    }
    
    // 3. Card number match (if specified)
    if (targetNumber && !new RegExp(targetNumber, 'i').test(title)) {
      return false;
    }
    
    // 4. Exclude obvious lots
    if (/\b(lot|bundle|set of \d+)\b/i.test(title)) {
      return false;
    }
    
    return true;
  });
}



/* ---------- Main ---------- */
serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? undefined;

  // CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }
  if (req.method !== "POST") return json({ error: "POST only" }, 405, origin);

  try {
    const {
      targetCard,
      salesData = [],
      model,
      trim = true,
    } = (await req.json()) as RequestBody;
    if (!targetCard) throw new Error("targetCard missing");

    const useModel = model || DEF_MODEL;
    let matches: Sale[] = [];
    let filterMethod = 'ai-enhanced';
    let fallbackUsed = false;

    // 1) Try Groq AI filter first (BEST ACCURACY)
    try {
      console.log(`🤖 Attempting Groq AI filter for "${targetCard}"`);
      matches = await groqAIFilter(targetCard, salesData);
      console.log(`✅ AI filter: ${salesData.length} → ${matches.length} matches`);
    } catch (aiError: any) {
      // Fallback to relaxed local rules if AI fails
      console.log(`⚠️ AI filter failed: ${aiError.message}, using relaxed fallback`);
      matches = relaxedLocalFilter(targetCard, salesData);
      filterMethod = 'rules-fallback';
      fallbackUsed = true;
      console.log(`✅ Fallback filter: ${salesData.length} → ${matches.length} matches`);
    }
    
    // Safety check: if AI returns 0 matches, try fallback
    if (matches.length === 0 && !fallbackUsed) {
      console.log('⚠️ AI returned 0 matches, trying relaxed fallback');
      matches = relaxedLocalFilter(targetCard, salesData);
      filterMethod = 'rules-fallback';
      fallbackUsed = true;
      console.log(`✅ Fallback filter: ${salesData.length} → ${matches.length} matches`);
    }

    // 2) Optional: drop obvious graded lots when target indicates graded single
    const looksGradedTarget = /\b(psa|bgs|sgc|cgc)\b/i.test(targetCard);
    const singles = looksGradedTarget
      ? matches.filter(
          (s: Sale) => !/\b(lot|lots|bundle|set of \d+|\d+.*card.*set)\b/i.test(s.title),
        )
      : matches;

    // 3) Optional: trim price outliers
    const final = trim ? cutOutliers(singles) : singles;

    return json(
      {
        success: true,
        model: useModel,
        filterMethod,
        fallback: fallbackUsed,
        original: salesData.length,
        matched: matches.length,
        final: final.length,
        sales: final,
      },
      200,
      origin,
    );
  } catch (err: any) {
    return json(
      { success: false, error: err.message ?? String(err) },
      400,
      origin,
    );
  }
});

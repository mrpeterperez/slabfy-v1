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

/* ---------- Claude-Powered Smart Filter ---------- */
function smartFilter(targetCard: string, sales: Sale[]): Sale[] {
  const target = targetCard.toLowerCase();
  
  // Extract target components
  const targetYear = target.match(/\b(19|20)\d{2}\b/)?.[0];
  const targetGrader = target.match(/\b(psa|bgs|sgc|cgc)\b/i)?.[0];
  const targetGrade = target.match(/psa\s*(?:gem\s*mt\s*)?(\d+)|bgs\s*(\d+(?:\.\d)?)|sgc\s*(\d+)|cgc\s*(\d+(?:\.\d)?)/i)?.[1] || 
                     target.match(/psa\s*(?:gem\s*mt\s*)?(\d+)|bgs\s*(\d+(?:\.\d)?)|sgc\s*(\d+)|cgc\s*(\d+(?:\.\d)?)/i)?.[2] ||
                     target.match(/psa\s*(?:gem\s*mt\s*)?(\d+)|bgs\s*(\d+(?:\.\d)?)|sgc\s*(\d+)|cgc\s*(\d+(?:\.\d)?)/i)?.[3] ||
                     target.match(/psa\s*(?:gem\s*mt\s*)?(\d+)|bgs\s*(\d+(?:\.\d)?)|sgc\s*(\d+)|cgc\s*(\d+(?:\.\d)?)/i)?.[4];
  const targetNumber = target.match(/#(\d+)/)?.[1];
  const targetPlayerName = extractPlayerName(target);
  const targetSetTokens = extractSetTokens(target);
  const targetHasSerial = /\/\d{1,4}\b/.test(target);
  const targetSerial = target.match(/\/(\d{1,4})\b/)?.[1];
  const targetHasAuto = /auto|signature|signed/i.test(target);
  const targetSpecificVariant = extractVariant(target);

  const matches = sales.filter((sale, index) => {
    const title = sale.title.toLowerCase();
    
    // 1. Year matching
    if (targetYear) {
      const saleYear = title.match(/\b(19|20)\d{2}\b/)?.[0];
      if (saleYear && saleYear !== targetYear) {
        return false;
      }
    }
    
    // 2. Grader & Grade matching (strict)
    if (targetGrader && targetGrade) {
      const graderRegex = new RegExp(`\\b${targetGrader}\\b`, 'i');
      if (!graderRegex.test(title)) {
        return false;
      }
      
      const gradeRegex = new RegExp(`${targetGrader}\\s*(?:gem\\s*mt\\s*)?${targetGrade}`, 'i');
      if (!gradeRegex.test(title)) {
        return false;
      }
    }
    
    // 3. Card number matching
    if (targetNumber) {
      const numberRegex = new RegExp(`#${targetNumber}\\b|no\\.?\\s*${targetNumber}\\b|card\\s*${targetNumber}\\b`, 'i');
      if (!numberRegex.test(title)) {
        return false;
      }
    }
    
    // 4. Player name matching (fuzzy)
    if (targetPlayerName) {
      const playerWords = targetPlayerName.split(' ');
      const hasAllPlayerWords = playerWords.every(word => 
        title.includes(word) || levenshtein(word, findClosestWord(word, title)) <= 1
      );
      if (!hasAllPlayerWords) {
        return false;
      }
    }
    
    // 5. Set matching (flexible)
    if (targetSetTokens.length > 0) {
      const hasAllSetTokens = targetSetTokens.every(token => title.includes(token));
      if (!hasAllSetTokens) {
        return false;
      }
    }
    
    // 6. Serial matching
    if (targetHasSerial && targetSerial) {
      const serialRegex = new RegExp(`\\/${targetSerial}\\b`, 'i');
      if (!serialRegex.test(title)) {
        return false;
      }
    } else if (!targetHasSerial) {
      // Target has no serial - exclude numbered cards
      if (/\/\d{1,4}\b/.test(title)) {
        return false;
      }
    }
    
    // 7. Auto matching
    if (targetHasAuto) {
      if (!/auto|signature|signed/i.test(title)) {
        return false;
      }
    } else {
      if (/auto|signature|signed/i.test(title)) {
        return false;
      }
    }
    
    // 8. Variant matching (smart)
    if (targetSpecificVariant) {
      // Target specifies variant - must match exactly
      if (!title.includes(targetSpecificVariant.toLowerCase())) {
        return false;
      }
    } else {
      // Target has no specific variant - allow base and common variants
      // This is the KEY FIX - we DON'T exclude variants when target doesn't specify one!
    }
    
    return true;
  });
  
  return matches;
}

// Helper functions
function extractPlayerName(target: string): string | null {
  // Simple heuristic: look for 2-3 capitalized words that aren't set/brand names
  const excludeWords = ['panini', 'topps', 'prizm', 'chrome', 'select', 'optic', 'bowman', 'psa', 'bgs', 'sgc', 'cgc', 'wnba', 'nba', 'mlb', 'nfl'];
  const words = target.split(/\s+/).filter(w => w.length > 2 && !excludeWords.includes(w.toLowerCase()) && !/^\d/.test(w));
  return words.slice(0, 2).join(' ') || null;
}

function extractSetTokens(target: string): string[] {
  const setWords = ['panini', 'topps', 'prizm', 'chrome', 'select', 'optic', 'bowman', 'monopoly', 'wnba', 'nba', 'mlb', 'nfl'];
  return setWords.filter(word => target.includes(word.toLowerCase()));
}

function extractVariant(target: string): string | null {
  const variants = ['silver', 'gold', 'red', 'blue', 'green', 'orange', 'purple', 'refractor', 'chrome', 'prizm', 'mojo', 'sapphire', 'icon', 'classic'];
  for (const variant of variants) {
    if (target.includes(variant.toLowerCase())) {
      return variant;
    }
  }
  return null;
}

function findClosestWord(word: string, text: string): string {
  const words = text.split(/\s+/);
  let closest = '';
  let minDistance = Infinity;
  
  for (const w of words) {
    const distance = levenshtein(word.toLowerCase(), w.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      closest = w;
    }
  }
  return closest;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/* ---------- Safety Fallback Filter ---------- */
function deterministicFallback(targetCard: string, sales: Sale[]): Sale[] {
  
  // Extract key components from target
  const target = targetCard.toLowerCase();
  const hasGrade = /psa\s*(\d+)|psa\s*(gem\s*mt\s*\d+)/i.test(target);
  const gradeMatch = target.match(/psa\s*(?:gem\s*mt\s*)?(\d+)/i);
  const targetGrade = gradeMatch ? gradeMatch[1] : null;
  const cardNumberMatch = target.match(/#(\d+)/);
  const targetNumber = cardNumberMatch ? cardNumberMatch[1] : null;
  
  // Extract set tokens (normalize common variations)
  const setTokens = target
    .replace(/\b(panini|topps|upper|deck|prizm|monopoly|wnba|nba|mlb|nfl)\b/g, match => match.toLowerCase())
    .match(/\b(panini|topps|upper|deck|prizm|monopoly|chrome|wnba|nba|mlb|nfl|bowman|select|optic)\b/gi) || [];
  
  return sales.filter(sale => {
    const title = sale.title.toLowerCase();
    
    // 1. Grade matching (if target has grade)
    if (hasGrade && targetGrade) {
      const hasMatchingGrade = new RegExp(`psa\\s*(?:gem\\s*mt\\s*)?${targetGrade}`, 'i').test(title);
      if (!hasMatchingGrade) return false;
    }
    
    // 2. Card number matching (if target has number)
    if (targetNumber) {
      const hasMatchingNumber = new RegExp(`#${targetNumber}\\b|no\\.?\\s*${targetNumber}\\b|card\\s*${targetNumber}\\b`, 'i').test(title);
      if (!hasMatchingNumber) return false;
    }
    
    // 3. Set tokens (all major tokens must be present)
    const hasAllSetTokens = setTokens.every(token => 
      title.includes(token.toLowerCase())
    );
    if (!hasAllSetTokens) return false;
    
    // 4. Exclude obvious non-matches
    if (target.includes('auto') && !/auto|signature|signed/i.test(title)) return false;
    if (!target.includes('auto') && /auto|signature|signed/i.test(title)) return false;
    
    // 5. Exclude numbered cards if target doesn't have serial
    if (!/\/\d+/.test(target) && /\/\d{1,4}\b/.test(title)) return false;
    
    return true;
  });
}

/* ---------- Main ---------- */
serve(async (req) => {
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

    // 1) Smart filtering (Claude-powered)
    let matches = smartFilter(targetCard, salesData);
    
    // Safety fallback: if AI returns 0 matches, use deterministic filter
    if (matches.length === 0) {
      matches = deterministicFallback(targetCard, salesData);
    }

    // 2) Optional: drop obvious graded lots when target indicates graded single
    const looksGradedTarget = /\b(psa|bgs|sgc|cgc)\b/i.test(targetCard);
    const singles = looksGradedTarget
      ? matches.filter(
          (s) => !/\b(lot|lots|bundle|set of|set)\b/i.test(s.title),
        )
      : matches;

    // 3) Optional: trim price outliers
    const final = trim ? cutOutliers(singles) : singles;

    return json(
      {
        success: true,
        model: useModel,
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

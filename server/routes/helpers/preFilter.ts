// PRE-FILTER 🚫
// Cheap rules to eliminate obvious mismatches before Groq AI.
// Works for both sports cards and TCG.

import { EbaySale } from './ebaySearch';

interface TargetCardInfo {
  year?: string;
  cardNumber?: string;
  grade?: string;        // normalized "10", "95", or "gemmt10"
  grader?: string;       // PSA/BGS/SGC/CGC/etc.
  variantTokens: string[];
  isAutograph: boolean;
  serialNumber?: string; // normalized digits, e.g. "25" or "1" (for 1/1)
}

function normalizeToken(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

function parseTargetCard(targetCard: string): TargetCardInfo {
  const t = targetCard.toLowerCase();

  // Year
  const yearMatch = t.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : undefined;

  // Grader + grade (expanded to handle PSA descriptive grades)
  const gradeMatch = t.match(/\b(psa|bgs|sgc|cgc)\s*((?:gem\s*)?(?:mt|mint|nm[-\s]*mt|ex[-\s]*mt|vg[-\s]*ex|good|fair|poor|authentic)\s*[0-9]+(?:\.[0-9])?|[0-9]+(?:\.[0-9])?|gem\s*mt\s*10)\b/i);
  const grader = gradeMatch ? gradeMatch[1].toUpperCase() : undefined;
  // Normalize grade by removing spaces and hyphens but preserving decimal points
  const grade = gradeMatch ? gradeMatch[2].toLowerCase().replace(/[\s\-]/g, "") : undefined;

  // Card number (#280, No.280, Card 280)
  const numMatch = t.match(/\b(?:#|no\.?|card)\s*([0-9]{1,4}[A-Z]?)\b/i);
  const cardNumber = numMatch ? numMatch[1] : undefined;

  // Serial (/25, /099, /199, 1/1, "1 of 1", "one of one")
  let serialNumber: string | undefined;
  const serialMatch = t.match(/\/(\d{1,4})\b/);
  if (serialMatch) {
    serialNumber = serialMatch[1].replace(/^0+/, "");
  } else if (/\b1\/1\b|\b\/1\b|\b1 of 1\b|\bone of one\b/i.test(t)) {
    serialNumber = "1";
  }

  // Variant tokens (split multi-word phrases into single words)
  const VARIANT_PHRASES = [
    "silver", "prizm", "holo", "refractor", "gold", "chrome",
    "shadowless", "first edition", "reverse holo", "beam", "team", 
    "members", "only", "special", "insert", "parallel"
  ];
  const variantTokens: string[] = [];
  for (const phrase of VARIANT_PHRASES) {
    if (new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`).test(t)) {
      phrase.split(/\s+/).forEach(w => variantTokens.push(w));
    }
  }

  const isAutograph = /\b(auto|autograph|signed|signature)\b/i.test(t);

  return { year, cardNumber, grade, grader, variantTokens, isAutograph, serialNumber };
}

export function preFilterSales(sales: EbaySale[], targetCard: string): EbaySale[] {
  const target = parseTargetCard(targetCard);

  return sales.filter(sale => {
    const n = sale.title?.toLowerCase() || "";
    const norm = normalizeToken(n);
    const normTight = n.replace(/[^a-z0-9]/g, "");

    // --- Grader + grade ---
    if (target.grader && target.grade) {
      // Target card IS graded - match specific grader and grade
      const graderWord = target.grader.toLowerCase();
      const graderOk = new RegExp(`\\b${graderWord}\\b`).test(n);

      const pureNumeric = /^\d+$/.test(target.grade);
      let gradeOk: boolean;

      if (pureNumeric) {
        // Require number near grader (<=6 chars), not from serial, not qty like "10 card lot"
        gradeOk =
          new RegExp(
            `\\b${graderWord}\\b[^a-z0-9]{0,6}\\b${target.grade}\\b(?!\\s*(?:card|cards|lot|bundle|set))`
          ).test(n) &&
          !new RegExp(`/${target.grade}\\b`).test(n);
      } else {
        // Non-pure grades (gemmt10, 9.5, etc.) - also handle descriptive PSA grades
        if (target.grade?.includes("mt") || target.grade?.includes("mint")) {
          // For descriptive grades like "nmmt8", also look for just the number
          const gradeNumber = target.grade.match(/(\d+(?:\.\d+)?)/)?.[1];
          const descriptiveMatch = norm.includes(target.grade) || normTight.includes(target.grade);
          const numberOnlyMatch = gradeNumber ? 
            new RegExp(`\\b${graderWord}\\b[^a-z0-9]{0,6}\\b${gradeNumber}\\b(?!\\s*(?:card|cards|lot|bundle|set))`).test(n) &&
            !new RegExp(`/${gradeNumber}\\b`).test(n) : false;
          gradeOk = (descriptiveMatch || numberOnlyMatch) && !new RegExp(`/${target.grade}\\b`).test(n);
        } else {
          gradeOk =
            (norm.includes(target.grade) || normTight.includes(target.grade)) &&
            !new RegExp(`/${target.grade}\\b`).test(n);
        }
      }

      if (!(graderOk && gradeOk)) return false;

      // Reject if other graders mentioned
      const otherGraders = ["psa","bgs","sgc","cgc"].filter(g => g !== graderWord);
      if (otherGraders.some(g => new RegExp(`\\b${g}\\b`).test(n))) return false;
    } else {
      // Target card is RAW (no grader) - reject ANY graded cards
      const hasGrader = /\b(psa|bgs|sgc|cgc)\b/i.test(n);
      if (hasGrader) return false;
    }

    // --- Card number (don’t confuse with serials) ---
    if (target.cardNumber) {
      const num = target.cardNumber.toLowerCase();
      const hasExplicit = new RegExp(`\\b(?:#|no\\.?|card)\\s*${num}\\b`).test(n);
      const hasStandalone = new RegExp(`\\b${num}\\b`).test(n) && !new RegExp(`/${num}\\b`).test(n);
      if (!(hasExplicit || hasStandalone)) return false;
    }

    // --- Serial handling ---
    const hasSerialInListing =
      /\/\d{1,4}\b/.test(n) ||
      /\b1 of 1\b/i.test(n) ||
      /\bone of one\b/i.test(n) ||
      /\b1\/1\b(?!\s*style)/i.test(n) ||
      /\b\/1\b(?!\s*style)/i.test(n);

    if (target.serialNumber) {
      if (target.serialNumber === "1") {
        const isOneOfOne =
          /(?:\b1\/1\b(?!\s*style)|\b\/1\b(?!\s*style)|\b1 of 1\b|\bone of one\b)/i.test(n);
        if (!isOneOfOne) return false;
      } else {
        const s = target.serialNumber;
        const serialOk =
          new RegExp(`/${s}\\b`).test(n) || new RegExp(`/0+${s}\\b`).test(n);
        if (!serialOk) return false;
      }
    } else {
      if (hasSerialInListing) return false;
    }

    // --- Year ---
    if (target.year) {
      const titleYear = n.match(/\b(19|20)\d{2}\b/);
      if (titleYear) {
        const y = parseInt(titleYear[0], 10);
        const ty = parseInt(target.year, 10);
        if (Math.abs(y - ty) > 1) return false;
      }
    }

    // --- Autographs ---
    const isAutoInTitle = /\b(auto|autograph|signed|signature)\b/.test(n);
    const isNonAuto = /\bnon[- ]?auto\b/.test(n);
    if (!target.isAutograph && isAutoInTitle && !isNonAuto) return false;
    if (target.isAutograph && !isAutoInTitle) return false;

    // --- Variant tokens (RELAXED - let AI handle this) ---
    // Removed strict variant matching - too conservative
    // AI will handle "Lakers Team Set" vs "Team Insert" variations

    return true;
  });
}

// Relaxed version for fallback when AI fails
export function relaxedPreFilter(sales: EbaySale[], targetCard: string): EbaySale[] {
  const target = parseTargetCard(targetCard);

  return sales.filter(sale => {
    const n = sale.title?.toLowerCase() || "";

    // Only check CRITICAL fields - much more permissive!
    
    // --- Grader + grade (if specified) ---
    if (target.grader && target.grade) {
      const graderWord = target.grader.toLowerCase();
      const graderOk = new RegExp(`\\b${graderWord}\\b`).test(n);
      if (!graderOk) return false;
      
      // Allow fuzzy grade matching
      const pureNumeric = /^\d+$/.test(target.grade);
      if (pureNumeric) {
        const hasGrade = new RegExp(`${graderWord}[^a-z0-9]{0,8}${target.grade}`).test(n);
        if (!hasGrade) return false;
      }
    }

    // --- Card number (if specified) ---
    if (target.cardNumber) {
      const num = target.cardNumber.toLowerCase();
      const hasNumber = new RegExp(`(?:#|no\\.?|card)\\s*${num}|\\b${num}\\b`).test(n);
      if (!hasNumber) return false;
    }

    // Skip variant matching, set matching, year exact matching
    // Let AI handle the nuances!
    
    return true;
  });
}

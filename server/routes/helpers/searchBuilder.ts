// SEARCH BUILDER 🔧
// Builds perfect search terms for eBay API calls
// Takes card info and makes search strings that actually work
import { Card } from './cardFinder';

export interface SearchTerms {
  main: string;
  backup: string[];
}

export function buildSearchTerms(card: Card): SearchTerms {
  // Build serial number suffix for search targeting
  // Use "/99" format (not "37/99") to find all cards of that parallel type
    const parts: string[] = [];
    // ... existing logic assembling player, year, set, card #, grade etc.
    // Try to infer serial info from variant if explicit fields are missing (e.g., "... /99")
    let serialMaxFromVariant: number | undefined;
    if ((!card.serialNumbered || !card.serialMax) && card.variant) {
      const m = card.variant.match(/\/(\d{1,4})\b/);
      if (m) serialMaxFromVariant = parseInt(m[1], 10);
    }
    const effectiveSerialMax = card.serialMax || serialMaxFromVariant;
    const hasSerial = (card.serialNumbered && !!effectiveSerialMax) || !!serialMaxFromVariant;
    if (hasSerial && effectiveSerialMax) {
      const alreadyInVariant = card.variant?.includes(`/${effectiveSerialMax}`);
      if (!alreadyInVariant) {
        parts.push(`/${effectiveSerialMax}`);
      }
    }
    // Normalize grade format for better eBay matching
    let normalizedGrade = '';
    if (card.grader && card.grade) {
      // Extract numeric grade from formats like "GEM MT 10" -> "10"
      const gradeMatch = card.grade.match(/(\d+)$/);
      const numericGrade = gradeMatch ? gradeMatch[1] : card.grade;
      normalizedGrade = `${card.grader} ${numericGrade}`;
    }

    const mainTerm = [
      card.year,
      card.set,
      card.player,
      card.number ? `#${card.number}` : '',
      card.variant,
      ...parts, // Add serial targeting like "/99"
      normalizedGrade
    ]
    .filter(part => part) // Remove empty parts
    .join(' ');

  // Main search term with all details including serial targeting

  // Backup search with player, card number, and grade (more targeted than just player + number)
  const backupNormalizedGrade = card.grader && card.grade ? 
    `${card.grader} ${card.grade.match(/(\d+)$/)?.[1] || card.grade}` : '';
  const backupTerm = `${card.player} ${card.number ? `#${card.number}` : ''} ${backupNormalizedGrade}`.trim();
  
  // DISABLED: Enable fallback search for broader matching when main search fails
  // const enableFallback = true;
  
  return {
    main: mainTerm,
    // backup: enableFallback ? [backupTerm] : []  // Enable/disable fallback here
    backup: [] // Currently disabled - fallback would be: "JAYDEN DANIELS #108 PSA 10"
  };
}
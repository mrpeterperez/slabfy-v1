/**
 * Card Fingerprint Utilities
 * Generates normalized identifiers for card deduplication
 * 
 * Purpose: Same card scanned multiple times should share the same global_asset and pricing
 * 
 * Examples:
 * - "Lionel Messi / Steph Curry" → "curry messi"
 * - "Messi/Curry" → "curry messi"
 * - "Lionel Messi and Steph Curry" → "curry messi"
 */

/**
 * Normalize player names for consistent matching
 * - Converts to lowercase
 * - Removes accents/diacritics (José → jose)
 * - Removes common separators (/, &, and, etc.)
 * - Removes Jr/Sr/III suffixes
 * - Splits into individual names
 * - Sorts alphabetically
 * - Joins with space
 */
export function normalizePlayerName(playerName: string | null | undefined): string {
  if (!playerName) return '';
  
  return playerName
    .toLowerCase()
    .trim()
    // Remove accents/diacritics (José → jose, Ramírez → ramirez)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace common separators with space
    .replace(/[\/&,]+/g, ' ')
    // Remove " and " (case insensitive)
    .replace(/\s+and\s+/gi, ' ')
    // Remove Jr/Sr/III/II suffixes
    .replace(/\b(jr|sr|iii|ii|iv|v)\b\.?/gi, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Split into words, sort alphabetically, and join
    .split(' ')
    .filter(word => word.length > 0)
    .sort()
    .join(' ');
}

/**
 * Normalize a generic string field (set name, variant, etc.)
 * - Converts to lowercase
 * - Trims whitespace
 * - Removes extra spaces
 */
export function normalizeField(field: string | null | undefined): string {
  if (!field) return '';
  
  return field
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a fingerprint for a card
 * Format: player|set|year|cardNumber|variant|grade|grader
 * 
 * PSA cards use cert number as fingerprint (already unique)
 * Raw/graded cards use normalized metadata combo
 */
export function generateCardFingerprint(card: {
  certNumber?: string | null;
  playerName?: string | null;
  setName?: string | null;
  year?: string | null;
  cardNumber?: string | null;
  variant?: string | null;
  grade?: string | null;
  grader?: string | null;
}): string {
  // PSA cards: Use cert number (already unique and immutable)
  if (card.certNumber) {
    return card.certNumber;
  }
  
  // Raw/other graded cards: Build normalized fingerprint
  const parts = [
    normalizePlayerName(card.playerName),
    normalizeField(card.setName),
    normalizeField(card.year),
    normalizeField(card.cardNumber),
    normalizeField(card.variant),
    normalizeField(card.grade),
    normalizeField(card.grader),
  ];
  
  return parts.join('|');
}

/**
 * Check if a fingerprint is for a PSA card
 * PSA cert numbers are 8-9 digits, no pipe separators
 */
export function isPSAFingerprint(fingerprint: string): boolean {
  return /^\d{8,9}$/.test(fingerprint);
}

/**
 * Parse a fingerprint back into its components (for debugging)
 */
export function parseFingerprint(fingerprint: string): {
  type: 'psa' | 'raw';
  certNumber?: string;
  playerName?: string;
  setName?: string;
  year?: string;
  cardNumber?: string;
  variant?: string;
  grade?: string;
  grader?: string;
} {
  if (isPSAFingerprint(fingerprint)) {
    return {
      type: 'psa',
      certNumber: fingerprint,
    };
  }
  
  const [playerName, setName, year, cardNumber, variant, grade, grader] = fingerprint.split('|');
  
  return {
    type: 'raw',
    playerName: playerName || undefined,
    setName: setName || undefined,
    year: year || undefined,
    cardNumber: cardNumber || undefined,
    variant: variant || undefined,
    grade: grade || undefined,
    grader: grader || undefined,
  };
}

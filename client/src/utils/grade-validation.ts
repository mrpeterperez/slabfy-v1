/**
 * Grade validation utilities for determining if a card is graded or raw
 */

/**
 * Determines if a grade value represents a meaningful graded card
 * Filters out common "raw" aliases like "raw", "ungraded", "N/A", "none"
 * 
 * @param grade - Grade value from AI vision or user input
 * @returns true if grade represents an actual graded card, false for raw cards
 * 
 * @example
 * isMeaningfulGrade("10") // true
 * isMeaningfulGrade("PSA 10") // true
 * isMeaningfulGrade("raw") // false
 * isMeaningfulGrade("N/A") // false
 * isMeaningfulGrade(null) // false
 */
export function isMeaningfulGrade(grade: unknown): boolean {
  if (!grade) return false;
  
  const s = String(grade).trim();
  if (!s) return false;
  
  // Explicitly exclude common "raw" aliases
  if (/^(raw|ungraded|none|n\/?a|na|-|null)$/i.test(s.replace(/\s+/g, ''))) {
    return false;
  }
  
  // Consider it graded if there is a digit present (e.g., 10, 9.5) or common grading words
  if (/(\d|gem|mint|pristine)/i.test(s)) {
    return true;
  }
  
  return false;
}

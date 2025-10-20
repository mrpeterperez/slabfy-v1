// 🤖 INTERNAL NOTE:
// Purpose: Generate URL-safe slugs from event names
// Exports: slugify function
// Feature: sales-channels/show-storefront/utils
// Dependencies: none

/**
 * Convert event name to URL-safe slug
 * Example: "First Row Sports Show" → "first-row-sports-show"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars except -
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start
    .replace(/-+$/, '');         // Trim - from end
}

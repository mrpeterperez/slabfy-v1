// CARD ID GENERATOR 🔗
// Generates consistent card_id from PSA data to group identical cards
// Uses PSA metadata (excluding cert number) for perfect grouping

export interface PSACardData {
  playerName?: string | null;
  setName?: string | null;
  year?: string | null;
  grade?: string | null;
  cardNumber?: string | null;
  variant?: string | null;
}

export function generateCardId(psaData: PSACardData): string {
  // PSA ensures this data is standardized and accurate
  // Identical cards will always have identical PSA metadata (except cert number)
  const components = [
    psaData.playerName,
    psaData.setName,
    psaData.year,
    psaData.grade,
    psaData.cardNumber,
    psaData.variant || ''
  ]
  .filter(Boolean) // Remove null/undefined values
  .map(component => 
    String(component)
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
  )
  .filter(component => component.length > 0);

  const cardId = components.join('_');
  
  // Ensure we have a valid card ID
  if (!cardId || cardId === '_') {
    throw new Error('Unable to generate card_id: insufficient PSA data');
  }

  return cardId;
}

// Example usage:
// Input: { playerName: "Cooper Flagg", setName: "2024-25 Bowman U Now", year: "2024", grade: "GEM MT 10", cardNumber: "#44" }
// Output: "Cooper_Flagg_2024_25_Bowman_U_Now_2024_GEM_MT_10_44"
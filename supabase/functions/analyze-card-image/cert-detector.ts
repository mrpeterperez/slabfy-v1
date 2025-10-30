// 🤖 INTERNAL NOTE:
// Purpose: Smart PSA certification number detection from images
// Exports: detectPSACert function
// Feature: card-vision
// Dependencies: None

/**
 * Detects if an image contains a PSA certification label and extracts the cert number
 * PSA cert numbers are typically 8-9 digits
 */
export function buildPSACertDetectionPrompt(): string {
  return `
PRIORITY TASK: Check if this image contains a PSA grading label.

PSA labels typically show:
- "PSA" logo/text
- Certification number (8-9 digits)
- Grade number (1-10)
- Located on back of slab or visible on front

If you detect a PSA label:
1. Extract the certification number ONLY
2. Return in this format:
{
  "isPSA": true,
  "certNumber": "12345678",
  "confidence": 0.95
}

If NO PSA label detected or unclear:
{
  "isPSA": false,
  "confidence": 0
}

CRITICAL: Be conservative. Only set isPSA=true if you clearly see PSA branding AND a cert number.
Return ONLY valid JSON, no markdown or explanation.
  `.trim();
}

/**
 * Builds the full dual-image analysis prompt
 * This is used when PSA cert is NOT detected or for comprehensive analysis
 */
export function buildDualImagePrompt(): string {
  return `
You are analyzing BOTH SIDES of a sports card or graded slab.

IMAGE 1: Front of the card (player photo, design, or card visible through slab)
IMAGE 2: Back of the card (stats, info, grading label, or back of slab)

GRADED SLABS (PSA/BGS/SGC/CGC):
- Front: Card visible through protective case
- Back: Grading company label with cert number, grade, card details

RAW CARDS:
- Front: Player photo, team, brand logo
- Back: Stats, card number, copyright, set info

Extract ALL available information from BOTH images combined:

FROM FRONT IMAGE:
- Player name
- Year (copyright or design year)
- Brand (Topps, Panini, Upper Deck, etc.)
- Series/Set (Prizm, Chrome, Optic, etc.)
- Parallel type (Silver, Gold, Refractor, etc.)
- Visual condition (if raw card)

FROM BACK IMAGE:
- Grading company (PSA, BGS, SGC, CGC)
- Certification number (if graded)
- Grade number (if graded)
- Card number from set
- Serial number (if numbered /XX)
- Set name/series confirmation
- Additional variant info

Return this exact JSON structure:
{
  "cardType": "psa" | "bgs" | "sgc" | "cgc" | "raw" | "tcg",
  "confidence": 0.85,
  "fields": {
    "certNumber": "12345678",
    "sport": "Basketball",
    "year": "2018",
    "brand": "Panini",
    "series": "Prizm",
    "playerName": "Luka Doncic",
    "cardNumber": "280",
    "parallel": "Silver",
    "variant": "Rookie Card",
    "gradingCompany": "PSA",
    "grade": "10",
    "serialNumber": "45",
    "serialMax": "99"
  },
  "frontAnalysis": "Brief description of what front image shows",
  "backAnalysis": "Brief description of what back image shows",
  "reasoning": "Why this confidence score"
}

CONFIDENCE SCORING:
- 0.95-1.0: Both images crystal clear, all text readable
- 0.85-0.94: Good quality, minor glare on one side
- 0.70-0.84: Decent, some fields unclear
- 0.50-0.69: Poor quality or missing info
- Below 0.50: Cannot reliably identify card

CRITICAL RULES:
1. If you can't read something clearly, omit that field
2. Use info from BOTH images to cross-verify
3. Be conservative with confidence scores
4. Handle glare, reflections, and blur gracefully
5. If it's clearly NOT a sports card, return confidence < 0.5

Return ONLY valid JSON, no markdown or explanation.
  `.trim();
}

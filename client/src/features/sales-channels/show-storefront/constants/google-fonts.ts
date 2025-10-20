// 🤖 INTERNAL NOTE:
// Purpose: Elite Google Fonts list for storefront design
// Exports: GOOGLE_FONTS array
// Feature: sales-channels/show-storefront
// Dependencies: None

export interface GoogleFont {
  name: string;
  category: string;
  vibe: string;
}

export const GOOGLE_FONTS: GoogleFont[] = [
  // Display/Hero (Bold & Impactful)
  { name: "Bebas Neue", category: "Display", vibe: "Bold & Athletic" },
  { name: "Righteous", category: "Display", vibe: "Modern & Strong" },
  { name: "Black Ops One", category: "Display", vibe: "Military & Intense" },
  { name: "Oswald", category: "Display", vibe: "Condensed & Professional" },
  { name: "Anton", category: "Display", vibe: "Heavy & Impactful" },
  
  // Modern & Clean
  { name: "Inter", category: "Modern", vibe: "Clean & Minimal (Default)" },
  { name: "Poppins", category: "Modern", vibe: "Geometric & Friendly" },
  { name: "Montserrat", category: "Modern", vibe: "Urban & Contemporary" },
  { name: "Work Sans", category: "Modern", vibe: "Professional & Versatile" },
  { name: "DM Sans", category: "Modern", vibe: "Low-Contrast & Clean" },
  { name: "Space Grotesk", category: "Modern", vibe: "Tech & Futuristic" },
  
  // Elegant & Sophisticated
  { name: "Playfair Display", category: "Elegant", vibe: "Luxury & Editorial" },
  { name: "Cormorant Garamond", category: "Elegant", vibe: "Classic & Refined" },
  { name: "Crimson Text", category: "Elegant", vibe: "Literary & Timeless" },
  { name: "Lora", category: "Elegant", vibe: "Balanced & Readable" },
  
  // Fun & Playful
  { name: "Pacifico", category: "Playful", vibe: "Surf & Casual" },
  { name: "Fredoka", category: "Playful", vibe: "Rounded & Friendly" },
  { name: "Caveat", category: "Playful", vibe: "Handwritten & Personal" },
  { name: "Permanent Marker", category: "Playful", vibe: "Hand-drawn & Fun" },
  
  // Professional & Corporate
  { name: "Roboto", category: "Professional", vibe: "Neutral & Reliable" },
  { name: "IBM Plex Sans", category: "Professional", vibe: "Tech & Corporate" },
  { name: "Source Sans Pro", category: "Professional", vibe: "Clean & Professional" },
  { name: "Open Sans", category: "Professional", vibe: "Humanist & Friendly" },
  
  // Retro & Vintage
  { name: "Rubik", category: "Retro", vibe: "80s & Geometric" },
  { name: "Archivo Black", category: "Retro", vibe: "Bold & Vintage" },
  { name: "Bungee", category: "Retro", vibe: "Chromatic & Fun" },
];

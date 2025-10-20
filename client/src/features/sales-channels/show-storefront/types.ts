// 🤖 INTERNAL NOTE:
// Purpose: TypeScript types for Show Storefront feature
// Exports: StorefrontSettings, EventStorefrontSettings, and form types
// Feature: sales-channels/show-storefront
// Dependencies: @shared/schema types

// Re-export from shared schema
export type {
  StorefrontSettings,
  InsertStorefrontSettings,
  UpdateStorefrontSettings,
  EventStorefrontSettings,
  InsertEventStorefrontSettings,
  UpdateEventStorefrontSettings,
} from "@shared/schema";

// Font style options for storefront
export const fontStyleOptions = [
  { value: "modern", label: "Modern (Inter)" },
  { value: "classic", label: "Classic (Georgia)" },
  { value: "playful", label: "Playful (Comic Sans)" },
  { value: "professional", label: "Professional (Arial)" },
] as const;

export type FontStyle = (typeof fontStyleOptions)[number]["value"];

// QR code style options
export const qrCodeStyleOptions = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded Corners" },
  { value: "dots", label: "Dots" },
] as const;

export type QrCodeStyle = (typeof qrCodeStyleOptions)[number]["value"];

// Form state for settings management
export interface StorefrontSettingsFormData {
  // General Settings
  displayName: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  
  // Customer Actions
  enableBuying: boolean;
  enableCheckPrices: boolean;
  enableCart: boolean;
  cartHoldMinutes: number;
  autoSoldOnHold: boolean;
  
  // Design
  brandColor: string;
  accentColor: string;
  fontStyle: FontStyle;
  
  // Preview & Publish
  qrCodeStyle: QrCodeStyle;
  showLogo: boolean;
}

// Image upload response
export interface ImageUploadResult {
  url: string;
  path: string;
}

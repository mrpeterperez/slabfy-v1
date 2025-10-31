// 🤖 INTERNAL NOTE:
// Purpose: Configuration constants for AI card analysis
// Exports: AI_CONFIG
// Feature: card-vision
// Dependencies: None

export const AI_CONFIG = {
  // GROQ Llama 4 Scout Vision - BRAND NEW multimodal model!
  MODEL: 'meta-llama/llama-4-scout-17b-16e-instruct',
  
  // Token limits for different analysis types
  PSA_CERT_MAX_TOKENS: 300,
  FULL_ANALYSIS_MAX_TOKENS: 1000,
  
  // Temperature (0-1, lower = more deterministic)
  TEMPERATURE: 0.1,
  
  // Image detail level (GROQ uses 'high' same as OpenAI)
  IMAGE_DETAIL: 'high' as const,
  
  // Maximum image size validation (4MB for base64 per GROQ docs)
  MAX_IMAGE_SIZE: 4 * 1024 * 1024,
  
  // Log truncation for privacy
  MAX_LOG_LENGTH: 100,
} as const;

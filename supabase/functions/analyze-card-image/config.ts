// 🤖 INTERNAL NOTE:
// Purpose: Configuration constants for AI card analysis
// Exports: AI_CONFIG
// Feature: card-vision
// Dependencies: None

export const AI_CONFIG = {
  // OpenAI Model Configuration
  MODEL: 'gpt-4o',
  
  // Token limits for different analysis types
  PSA_CERT_MAX_TOKENS: 300,
  FULL_ANALYSIS_MAX_TOKENS: 1000,
  
  // Temperature (0-1, lower = more deterministic)
  TEMPERATURE: 0.1,
  
  // Image detail level
  IMAGE_DETAIL: 'high' as const,
  
  // Maximum image size validation (10MB)
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,
  
  // Log truncation for privacy
  MAX_LOG_LENGTH: 100,
} as const;

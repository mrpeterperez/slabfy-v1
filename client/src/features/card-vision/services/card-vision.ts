// 🤖 INTERNAL NOTE:
// Purpose: Client service for calling analyze-card-image Supabase Edge Function
// Exports: analyzeCardImage function
// Feature: card-vision
// Dependencies: @supabase/supabase-js

import { supabase } from '@/lib/supabase';
import type { CardAnalysisResult, CardAnalysisError } from '../types';

/**
 * Analyzes card image(s) using AI Vision via Supabase Edge Function
 * 
 * @param frontImage - Base64 encoded front image or data URL (required)
 * @param backImage - Base64 encoded back image or data URL (optional)
 * @returns Promise<CardAnalysisResult> - Extracted card data with confidence score
 * @throws Error if analysis fails
 */
export async function analyzeCardImages(
  frontImage: string,
  backImage?: string
): Promise<CardAnalysisResult> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-card-image', {
      body: { 
        frontImage,
        backImage,
        mode: backImage ? 'dual' : 'single'
      },
    });

    if (error) {
      throw new Error(`Failed to analyze card: ${error.message}`);
    }

    // Check if response contains an error
    const responseData = data as CardAnalysisResult | CardAnalysisError;
    if ('error' in responseData) {
      throw new Error(responseData.error);
    }

    return responseData as CardAnalysisResult;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Unknown error during card analysis');
  }
}

/**
 * Legacy function for single image (backward compatibility)
 * @deprecated Use analyzeCardImages instead
 */
export async function analyzeCardImage(imageData: string): Promise<CardAnalysisResult> {
  return analyzeCardImages(imageData);
}

/**
 * Converts a File object to base64 data URL
 * 
 * @param file - Image file to convert
 * @returns Promise<string> - Base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image to reduce size before sending to API
 * 
 * @param dataUrl - Original image data URL
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Promise<string> - Compressed image data URL
 */
export function compressImage(
  dataUrl: string, 
  maxWidth: number = 1920, 
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

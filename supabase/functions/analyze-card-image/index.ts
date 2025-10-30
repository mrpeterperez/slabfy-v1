// 🤖 INTERNAL NOTE:
// Purpose: Supabase Edge Function for analyzing card images with AI Vision
// Exports: Deno.serve handler
// Feature: card-vision
// Dependencies: OpenAI API, Deno stdlib

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { MASTER_PROMPT } from './prompt.ts';
import { buildPSACertDetectionPrompt, buildDualImagePrompt } from './cert-detector.ts';
import { AI_CONFIG } from './config.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

/**
 * Checks if an image contains a PSA certification label
 */
async function checkForPSACert(imageUrl: string): Promise<{ isPSA: boolean; certNumber?: string; confidence: number }> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: buildPSACertDetectionPrompt() },
            { type: 'image_url', image_url: { url: imageUrl, detail: AI_CONFIG.IMAGE_DETAIL } },
          ],
        }],
        max_tokens: AI_CONFIG.PSA_CERT_MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE,
      }),
    });

    if (!response.ok) {
      return { isPSA: false, confidence: 0 };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) return { isPSA: false, confidence: 0 };

    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanContent);
    return result;
  } catch (error) {
    return { isPSA: false, confidence: 0 };
  }
}

interface CardAnalysisRequest {
  frontImage: string; // Base64 encoded image or data URL (required)
  backImage?: string; // Base64 encoded image or data URL (optional for single-side scan)
  mode?: 'dual' | 'single'; // Default: 'dual' if backImage provided, else 'single'
}

interface CardAnalysisResponse {
  cardType: 'psa' | 'bgs' | 'sgc' | 'cgc' | 'raw' | 'tcg';
  confidence: number;
  isPSAFastPath?: boolean; // NEW: Indicates if PSA cert was detected for fast lookup
  certNumber?: string; // NEW: PSA cert number for fast path
  fields: {
    certNumber?: string;
    sport?: string;
    year?: string;
    brand?: string;
    series?: string;
    playerName?: string;
    cardNumber?: string;
    parallel?: string;
    variant?: string;
    gradingCompany?: string;
    grade?: string;
    estimatedCondition?: string;
    serialNumber?: string;
    serialMax?: string;
  };
  frontAnalysis?: string; // NEW: What was detected from front
  backAnalysis?: string; // NEW: What was detected from back
  reasoning?: string;
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { frontImage, backImage, mode } = await req.json() as CardAnalysisRequest;

    if (!frontImage) {
      return new Response(
        JSON.stringify({ error: 'Front image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image size
    const frontSize = frontImage.length;
    const backSize = backImage?.length || 0;
    const totalSize = frontSize + backSize;

    if (totalSize > AI_CONFIG.MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Images too large (max 10MB total)' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image format for front
    const isValidFront = frontImage.startsWith('data:image/') || frontImage.startsWith('/9j/');
    if (!isValidFront) {
      return new Response(
        JSON.stringify({ error: 'Invalid front image format. Must be base64 or data URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate back image if provided
    if (backImage) {
      const isValidBack = backImage.startsWith('data:image/') || backImage.startsWith('/9j/');
      if (!isValidBack) {
        return new Response(
          JSON.stringify({ error: 'Invalid back image format. Must be base64 or data URL.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Ensure proper data URL format
    const frontUrl = frontImage.startsWith('data:') ? frontImage : `data:image/jpeg;base64,${frontImage}`;
    const backUrl = backImage ? (backImage.startsWith('data:') ? backImage : `data:image/jpeg;base64,${backImage}`) : null;

    // STEP 1: Smart PSA Detection (only if backImage provided)
    // Check back image first since PSA cert is usually on the back
    if (backUrl) {
      const psaCheck = await checkForPSACert(backUrl);
      
      if (psaCheck.isPSA && psaCheck.certNumber) {
        // PSA FAST PATH: Just return cert number
        return new Response(
          JSON.stringify({
            cardType: 'psa',
            confidence: psaCheck.confidence,
            isPSAFastPath: true,
            certNumber: psaCheck.certNumber,
            fields: {
              certNumber: psaCheck.certNumber,
              gradingCompany: 'PSA',
            },
            reasoning: 'PSA certification detected - using fast lookup path'
          } as CardAnalysisResponse),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // STEP 2: Full Dual-Image Analysis
    // Build content array for AI Vision
    const imageContent: any[] = [];
    
    if (backUrl) {
      // Dual-image mode
      imageContent.push(
        { type: 'text', text: buildDualImagePrompt() },
        { type: 'image_url', image_url: { url: frontUrl, detail: AI_CONFIG.IMAGE_DETAIL } },
        { type: 'image_url', image_url: { url: backUrl, detail: AI_CONFIG.IMAGE_DETAIL } }
      );
    } else {
      // Single-image mode (fallback)
      imageContent.push(
        { type: 'text', text: MASTER_PROMPT },
        { type: 'image_url', image_url: { url: frontUrl, detail: AI_CONFIG.IMAGE_DETAIL } }
      );
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.MODEL,
        messages: [{
          role: 'user',
          content: imageContent,
        }],
        max_tokens: AI_CONFIG.FULL_ANALYSIS_MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return new Response(
        JSON.stringify({ error: 'Failed to analyze image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON response from AI
    let analysisResult: CardAnalysisResponse;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      // Log truncated response for privacy
      const truncatedContent = content.substring(0, AI_CONFIG.MAX_LOG_LENGTH);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse AI response'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate confidence score
    if (analysisResult.confidence < 0 || analysisResult.confidence > 1) {
      analysisResult.confidence = Math.max(0, Math.min(1, analysisResult.confidence));
    }

    return new Response(
      JSON.stringify(analysisResult),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Custom hook for camera card processing and AI analysis
 * Handles vision analysis, result mapping, and error handling
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { analyzeCardImages } from '@/features/card-vision/services/card-vision';
import type { QueuedCard, CardAnalysisResult } from '@/features/card-vision/types';
import { apiRequest } from '@/lib/queryClient';

interface ProcessCardParams {
  frontImage: string;
  backImage: string;
  card: QueuedCard;
  onUpdate: (updates: Partial<QueuedCard>) => void;
  onComplete: () => void;
}

interface PSACardData {
  certNumber: string;
  title: string;
  playerName: string;
  setName: string;
  year: string;
  cardNumber: string;
  variant: string;
  grade: string;
  category: string;
  psaImageFrontUrl?: string;
  psaImageBackUrl?: string;
}

export function useCardProcessing() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const processCard = useCallback(async ({
    frontImage,
    backImage,
    card,
    onUpdate,
    onComplete
  }: ProcessCardParams) => {
    setIsProcessing(true);
    
    try {
      console.log('🔍 Processing card:', card.id);
      
      // Update status to processing
      onUpdate({ status: 'processing' });

      // Call AI vision analysis
      const analysisResult: CardAnalysisResult = await analyzeCardImages(frontImage, backImage);
      
      console.log('✅ Analysis complete:', {
        confidence: analysisResult.confidence,
        isPSAFastPath: (analysisResult as any).isPSAFastPath,
        certNumber: analysisResult.fields.certNumber,
        player: analysisResult.fields.playerName,
        grader: analysisResult.fields.gradingCompany,
        grade: analysisResult.fields.grade
      });

      // PSA FAST PATH: If cert number detected, fetch from PSA API
      if ((analysisResult as any).isPSAFastPath && analysisResult.fields.certNumber) {
        console.log('🚀 PSA Fast Path detected! Fetching cert:', analysisResult.fields.certNumber);
        
        try {
          const psaResponse = await apiRequest('GET', `/api/psa/${analysisResult.fields.certNumber}`);
          const psaData: PSACardData = await psaResponse.json();
          
          console.log('✅ PSA data fetched:', psaData);
          
          // Merge PSA data with analysis result
          const enhancedResult: CardAnalysisResult = {
            ...analysisResult,
            confidence: 1.0, // PSA API data is 100% accurate
            fields: {
              certNumber: psaData.certNumber,
              playerName: psaData.playerName,
              year: psaData.year,
              brand: psaData.setName?.split(' ')[0], // Extract brand from set name
              series: psaData.setName,
              cardNumber: psaData.cardNumber,
              variant: psaData.variant,
              gradingCompany: 'PSA',
              grade: psaData.grade,
              sport: psaData.category,
            }
          };
          
          // Store PSA data for later use in upload
          (enhancedResult as any).psaData = psaData;
          
          onUpdate({
            status: 'success',
            result: enhancedResult,
            frontImage,
            backImage,
          });

          toast({
            title: "PSA card detected!",
            description: `${psaData.playerName} - ${psaData.grade} - Cert #${psaData.certNumber}`,
          });

          onComplete();
          setIsProcessing(false);
          return;
          
        } catch (psaError) {
          console.warn('⚠️ PSA API fetch failed, falling back to AI extraction:', psaError);
          // Fall through to use AI-extracted data
        }
      }

      // Standard AI extraction path (non-PSA or PSA fetch failed)
      onUpdate({
        status: 'success',
        result: analysisResult,
        frontImage,
        backImage,
      });

      // Show feedback based on confidence
      if (analysisResult.confidence >= 0.7) {
        toast({
          title: "High confidence scan!",
          description: `${analysisResult.fields.playerName} detected with ${Math.round(analysisResult.confidence * 100)}% confidence`,
        });
      } else {
        toast({
          title: "Low confidence scan",
          description: `Please review details for ${analysisResult.fields.playerName}`,
          variant: "default",
        });
      }

      onComplete();
      
    } catch (error) {
      console.error('❌ Card processing error:', error);
      
      onUpdate({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Analysis failed'
      });

      toast({
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });

      onComplete();
      
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  return {
    processCard,
    isProcessing
  };
}

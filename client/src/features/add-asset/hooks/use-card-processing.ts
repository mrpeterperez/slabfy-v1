/**
 * Custom hook for camera card processing and AI analysis
 * Handles vision analysis, result mapping, and error handling
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { analyzeCardImages } from '@/features/card-vision/services/card-vision';
import type { QueuedCard, CardAnalysisResult } from '@/features/card-vision/types';

interface ProcessCardParams {
  frontImage: string;
  backImage: string;
  card: QueuedCard;
  onUpdate: (updates: Partial<QueuedCard>) => void;
  onComplete: () => void;
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
        player: analysisResult.fields.playerName,
        grader: analysisResult.fields.gradingCompany,
        grade: analysisResult.fields.grade
      });

      // Update card with results
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

/**
 * Custom hook for handling dual-scan camera card uploads
 * Manages image upload, asset creation, and pricing refresh for camera-scanned cards
 */

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import type { QueuedCard } from '@/features/card-vision/types';
import { dataURLToBlob } from '@/utils/image-utils';
import { isMeaningfulGrade } from '@/utils/grade-validation';
import { getAuthHeaders } from '@/utils/auth-utils';

export function useDualScanUpload() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const uploadCardBatch = async (cards: QueuedCard[]) => {
    console.log('🎯 handleDualScanAddCards called with cards:', cards);
    console.log('🔍 Card details:', cards.map(c => ({
      id: c.id,
      status: c.status,
      hasResult: !!c.result,
      confidence: c.result?.confidence,
      player: c.result?.fields.playerName
    })));
    
    // Filter successful cards only
    const successfulCards = cards.filter(c => c.status === 'success' && c.result);
    
    console.log('✅ Successful cards:', successfulCards.length, successfulCards);
    
    if (successfulCards.length === 0) {
      toast({
        title: "No cards to add",
        description: "All scanned cards failed analysis",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add cards",
        variant: "destructive",
      });
      return;
    }

    // Separate high confidence vs low confidence cards
    const highConfidenceCards = successfulCards.filter(c => (c.result?.confidence || 0) >= 0.7);
    const lowConfidenceCards = successfulCards.filter(c => (c.result?.confidence || 0) < 0.7);

    console.log('🎯 High confidence cards:', highConfidenceCards.length);
    console.log('⚠️ Low confidence cards:', lowConfidenceCards.length);

    // Auto-add high confidence cards directly to portfolio
    if (highConfidenceCards.length > 0) {
      try {
        // Upload images first and get URLs
        const assetsToAdd = await Promise.all(highConfidenceCards.map(async (card) => {
          console.log('🔍 Card result fields:', card.result?.fields);
          
          // Upload front and back images
          let frontUrl = null;
          let backUrl = null;
          
          try {
            // Convert base64 to blob and upload
            if (card.frontImage) {
              const frontBlob = dataURLToBlob(card.frontImage);
              const frontFile = new File([frontBlob], `card-front-${Date.now()}.jpg`, { type: frontBlob.type || 'image/jpeg' });
              const frontFormData = new FormData();
              frontFormData.append('image', frontFile);
              
              console.log('📤 Uploading front image...', { size: frontFile.size, type: frontFile.type });
              const authHeaders = await getAuthHeaders();
              console.log('🔐 Auth headers:', authHeaders);
              
              const frontResponse = await fetch(`/api/user/${user.id}/asset-images`, {
                method: 'POST',
                headers: authHeaders,
                body: frontFormData,
              });
              
              console.log('📥 Front upload response status:', frontResponse.status, frontResponse.statusText);
              
              if (frontResponse.ok) {
                const frontData = await frontResponse.json();
                frontUrl = frontData.imageUrl;
                console.log('✅ Front image uploaded:', frontUrl);
              } else {
                const errorText = await frontResponse.text();
                console.error('❌ Front image upload failed:', frontResponse.status, errorText);
              }
            }
            
            if (card.backImage) {
              const backBlob = dataURLToBlob(card.backImage);
              const backFile = new File([backBlob], `card-back-${Date.now()}.jpg`, { type: backBlob.type || 'image/jpeg' });
              const backFormData = new FormData();
              backFormData.append('image', backFile);
              
              console.log('📤 Uploading back image...', { size: backFile.size, type: backFile.type });
              const authHeaders = await getAuthHeaders();
              
              const backResponse = await fetch(`/api/user/${user.id}/asset-images`, {
                method: 'POST',
                headers: authHeaders,
                body: backFormData,
              });
              
              console.log('📥 Back upload response status:', backResponse.status, backResponse.statusText);
              
              if (backResponse.ok) {
                const backData = await backResponse.json();
                backUrl = backData.imageUrl;
                console.log('✅ Back image uploaded:', backUrl);
              } else {
                const errorText = await backResponse.text();
                console.error('❌ Back image upload failed:', backResponse.status, errorText);
              }
            }
          } catch (uploadError) {
            console.error('Failed to upload images:', uploadError);
          }
          
          // Build assetImages array from uploaded camera images
          const assetImages: string[] = [];
          if (frontUrl) assetImages.push(frontUrl);
          if (backUrl) assetImages.push(backUrl);

          // Determine if card is graded based on meaningful grade string
          const isGraded = isMeaningfulGrade(card.result!.fields.grade);
          const cardType = isGraded ? 'graded' : 'raw';
          const normalizedGrade = isGraded ? String(card.result!.fields.grade) : null;
          
          return {
            type: cardType,
            title: `${card.result!.fields.year || ''} ${card.result!.fields.series || card.result!.fields.brand || ''} ${card.result!.fields.playerName || ''} #${card.result!.fields.cardNumber || ''} ${card.result!.fields.grade || ''}`.trim(),
            grader: isGraded ? (card.result!.fields.gradingCompany || 'PSA') : null,
            playerName: card.result!.fields.playerName,
            setName: card.result!.fields.series || card.result!.fields.brand,
            year: card.result!.fields.year,
            cardNumber: card.result!.fields.cardNumber,
            variant: card.result!.fields.variant || card.result!.fields.parallel,
            grade: normalizedGrade,
            certNumber: card.result!.fields.certNumber || null,
            category: card.result!.fields.sport,
            ownershipStatus: 'own',
            assetImages: assetImages.length > 0 ? assetImages : null,
          };
        }));

        // De-duplicate assets (same player, set, year, number, variant, grade)
        const seen = new Set<string>();
        const dedupedAssets = assetsToAdd.filter(a => {
          const key = [a.playerName, a.setName, a.year, a.cardNumber, a.variant || '', a.grade || ''].join('|').toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Debug: log payload
        console.log('🚀 Batch payload:', JSON.stringify({ assets: dedupedAssets }, null, 2));

        // Show immediate feedback
        toast({
          title: `Adding ${highConfidenceCards.length} card${highConfidenceCards.length > 1 ? 's' : ''}...`,
          description: "High confidence detection - auto-adding to portfolio",
        });

        // Call batch endpoint
        let response;
        try {
          response = await apiRequest('POST', `/api/user/${user.id}/assets/batch`, {
            assets: dedupedAssets
          });
        } catch (err: any) {
          console.error('❌ Batch add error:', err);
          toast({
            title: "Failed to add cards",
            description: err?.error || err?.message || "Please try again",
            variant: "destructive",
          });
          return;
        }

        const result = await response.json();
        
        console.log('🎯 Batch add result:', result);

        // Extra assurance: explicitly trigger background refresh for each global asset
        try {
          if (Array.isArray(result?.assets)) {
            await Promise.all(
              result.assets
                .map((a: any) => a?.globalAssetId)
                .filter(Boolean)
                .map((globalAssetId: string) =>
                  apiRequest('POST', '/api/refresh', { assetId: globalAssetId, useAIFiltering: true })
                    .then(r => r.ok ? r.json() : null)
                    .then(data => console.log('🔄 Explicit refresh queued:', globalAssetId, data?.message || ''))
                    .catch(err => console.warn('Refresh trigger failed:', globalAssetId, err?.message || err))
                )
            );
          }
        } catch (e) {
          console.warn('Failed to trigger explicit refresh after batch add:', e);
        }

        // Invalidate cache to show new assets
        await queryClient.invalidateQueries({
          queryKey: [`/api/user/${user.id}/assets`]
        });
        
        await queryClient.invalidateQueries({
          queryKey: ['assets']
        });
        
        await queryClient.invalidateQueries({
          queryKey: ['portfolio']
        });

        toast({
          title: "Cards added!",
          description: `Successfully added ${result.success} card${result.success > 1 ? 's' : ''} to your portfolio`,
        });

        // Navigate to portfolio to see new cards
        navigate('/my-portfolio');
        
      } catch (error) {
        console.error('❌ Batch add error:', error);
        toast({
          title: "Failed to add cards",
          description: error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        });
      }
    }

    // Return low confidence cards for manual review
    return {
      lowConfidenceCards,
      highConfidenceCount: highConfidenceCards.length
    };
  };

  return { uploadCardBatch };
}

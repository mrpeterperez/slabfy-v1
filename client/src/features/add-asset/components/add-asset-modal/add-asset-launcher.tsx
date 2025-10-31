// 🤖 INTERNAL NOTE:
// Purpose: Pre-dialog launcher for Add Asset flow with animated option cards
// Exports: AddAssetLauncher component
// Feature: add-asset
// Dependencies: framer-motion, lucide-react, shadcn button

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ScanLine, Camera, Barcode, Smartphone, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { AddAssetModalSimple } from './add-asset-modal-simple';
import { ManualAddAssetDialog } from '../manual-asset-entry';
import { CameraScanner } from '../camera-scanner';
import { analyzeCardImage, type AnalyzedCardFields } from '@/features/card-vision';
import { DualScanCamera } from '@/features/card-vision/components/dual-scan-camera';
import { analyzeCardImages } from '@/features/card-vision/services/card-vision';
import type { QueuedCard } from '@/features/card-vision/types';
import { apiRequest } from '@/lib/queryClient';

// Helper to get auth headers for image uploads
async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!(window as any).supabase) {
    console.warn('Supabase client not available');
    return {};
  }
  
  try {
    const { data: { session } } = await (window as any).supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (e) {
    console.warn('Could not get auth token for upload', e);
    return {};
  }
}

interface AddAssetLauncherProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
}

export function AddAssetLauncher({ 
  open: controlledOpen, 
  onOpenChange,
  triggerButton 
}: AddAssetLauncherProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [scanOptionsOpen, setScanOptionsOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [dualScanOpen, setDualScanOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [scannedCertNumber, setScannedCertNumber] = useState<string | undefined>(undefined);
  const [prefilledData, setPrefilledData] = useState<AnalyzedCardFields | undefined>(undefined);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const handleClose = () => {
    setOpen(false);
    // Reset to main menu when closing
    setScanOptionsOpen(false);
    setShouldAnimate(true);
  };

  const handleOpen = () => {
    setOpen(true);
    // Always start at main menu when opening
    setScanOptionsOpen(false);
    setShouldAnimate(true);
  };

  const handleScanPSAClick = () => {
    // Show scan options instead of going directly to scan modal
    setScanOptionsOpen(true);
    setShouldAnimate(true);
  };

  const handleBackToMain = () => {
    setScanOptionsOpen(false);
    setShouldAnimate(false); // No animation when going back
  };

  const handleScanGunClick = () => {
    // Open scan modal but keep launcher open in background
    setScanModalOpen(true);
  };

  const handlePhoneCameraClick = () => {
    // Open camera scanner
    setCameraOpen(true);
    setOpen(false);
  };

  const handlePhotoClick = () => {
    // Open dual-scan camera
    setDualScanOpen(true);
    setOpen(false);
  };

  const handleDualScanAddCards = async (cards: QueuedCard[]) => {
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

    // Close camera immediately to prevent multiple calls
    setDualScanOpen(false);

    // Separate high confidence vs low confidence cards
    const highConfidenceCards = successfulCards.filter(c => (c.result?.confidence || 0) >= 0.7);
    const lowConfidenceCards = successfulCards.filter(c => (c.result?.confidence || 0) < 0.7);

    console.log('🎯 High confidence cards:', highConfidenceCards.length, highConfidenceCards.map(c => ({ 
      player: c.result?.fields.playerName,
      confidence: c.result?.confidence 
    })));
    console.log('⚠️ Low confidence cards:', lowConfidenceCards.length, lowConfidenceCards.map(c => ({ 
      player: c.result?.fields.playerName,
      confidence: c.result?.confidence 
    })));

    // Auto-add high confidence cards directly to portfolio
    if (highConfidenceCards.length > 0) {
      try {
        // Helpers
        const dataURLToBlob = (dataURL: string): Blob => {
          const [header, base64] = dataURL.split(',');
          const mimeMatch = header.match(/data:(.*?);base64/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const binary = atob(base64);
          const len = binary.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
          return new Blob([bytes], { type: mime });
        };

        const isMeaningfulGrade = (grade: unknown): boolean => {
          if (!grade) return false;
          const s = String(grade).trim();
          if (!s) return false;
          if (/^(raw|ungraded|none|n\/?a|na|-|null)$/i.test(s.replace(/\s+/g, ''))) return false;
          // Consider it graded if there is a digit present (e.g., 10, 9.5) or common grading words
          if (/(\d|gem|mint|pristine)/i.test(s)) return true;
          return false;
        };

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
              
              console.log('📤 Uploading front image...');
              const frontResponse = await fetch(`/api/user/${user.id}/asset-images`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: frontFormData,
              });
              
              if (frontResponse.ok) {
                const frontData = await frontResponse.json();
                frontUrl = frontData.imageUrl;
                console.log('✅ Front image uploaded:', frontUrl);
              } else {
                const error = await frontResponse.text();
                console.error('❌ Front image upload failed:', error);
              }
            }
            
            if (card.backImage) {
              const backBlob = dataURLToBlob(card.backImage);
              const backFile = new File([backBlob], `card-back-${Date.now()}.jpg`, { type: backBlob.type || 'image/jpeg' });
              const backFormData = new FormData();
              backFormData.append('image', backFile);
              
              console.log('📤 Uploading back image...');
              const backResponse = await fetch(`/api/user/${user.id}/asset-images`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: backFormData,
              });
              
              if (backResponse.ok) {
                const backData = await backResponse.json();
                backUrl = backData.imageUrl;
                console.log('✅ Back image uploaded:', backUrl);
              } else {
                const error = await backResponse.text();
                console.error('❌ Back image upload failed:', error);
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
            assetImages: assetImages.length > 0 ? assetImages : null, // User-uploaded camera images
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
          // Show server error details in toast
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
        
        // Also invalidate the global assets list and portfolio queries
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

    // Show manual dialog for low confidence cards (user can review/edit)
    if (lowConfidenceCards.length > 0 && highConfidenceCards.length === 0) {
      const firstLowConfidence = lowConfidenceCards[0];
      toast({
        title: "Low confidence detection",
        description: "Please review and confirm card details",
      });
      setPrefilledData(firstLowConfidence.result!.fields);
      setManualModalOpen(true);
    }
  };

  const handleProcessCardInCamera = async (card: QueuedCard): Promise<QueuedCard> => {
    try {
      const result = await analyzeCardImages(card.frontImage, card.backImage);
      
      console.log('🔍 AI Vision Analysis Result:', result);
      console.log('📊 Extracted Fields:', result.fields);
      console.log('🎯 Card Type:', result.cardType);
      console.log('💯 Confidence:', result.confidence);
      
      toast({
        title: "Card analyzed!",
        description: `${result.fields.playerName || 'Card'} ready to add`,
      });

      // Return updated card with success status
      return {
        ...card,
        status: 'success' as const,
        result
      };
    } catch (error) {
      console.error('❌ Card analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze card",
        variant: "destructive",
      });

      // Return card with failed status
      return {
        ...card,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    }
  };

  const handleManualClick = () => {
    // Directly swap modals - no delay needed
    setManualModalOpen(true);
    setOpen(false);
  };

  const handleCameraScan = (scannedValue: string) => {
    // Camera scanned a value - process it and open scan modal
    setCameraOpen(false);
    setScannedCertNumber(scannedValue);
    setScanModalOpen(true);
  };

  return (
    <>
      {/* Trigger Button */}
      {triggerButton && (
        <div onClick={handleOpen} className="inline-block">
          {triggerButton}
        </div>
      )}

      {/* Launcher Modal */}
      {open && (
        <motion.div
          className="fixed inset-0 z-[99998] bg-background text-foreground"
          role="dialog"
          aria-modal="true"
          aria-labelledby="launcher-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
        >
          {!scanOptionsOpen ? (
            <>
              {/* Main Options - Mobile Header */}
              <div className="lg:hidden">
                <div className="flex items-center p-4">
                  <button
                    onClick={handleClose}
                    className="flex items-center justify-center min-w-[48px] min-h-[48px] -ml-3"
                    aria-label="Close"
                  >
                    <X className="h-7 w-7" />
                  </button>
                </div>
                <motion.div 
                  className="px-4"
                  initial={shouldAnimate ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <h1 id="launcher-title" className="text-[34px] font-heading font-bold leading-none">
                    Add Assets
                  </h1>
                </motion.div>
              </div>

              {/* Main Options - Desktop Header */}
              <div className="hidden lg:flex relative items-center justify-center p-4 sm:p-6 border-b border-border">
                <button 
                  onClick={handleClose} 
                  className="absolute left-4 sm:left-6 p-2 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
                <motion.h2 
                  id="launcher-title"
                  className="text-2xl font-heading font-semibold"
                  initial={shouldAnimate ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.05 }}
                >
                  Add Assets
                </motion.h2>
              </div>

              {/* Main Options - Content */}
              <div className="px-4 sm:px-6 py-6 lg:py-12 overflow-y-auto h-[calc(100vh-80px)] lg:h-[calc(100vh-88px)]">
                <div className="max-w-xl mx-auto space-y-6">
                  {/* Option Cards */}
                  <div className="space-y-4">
                    {/* Scan PSA Slabs Card */}
                    <motion.button
                      onClick={handleScanPSAClick}
                      className="w-full h-24 bg-card hover:bg-card/80 rounded-2xl px-7 flex items-center gap-4 transition-all text-left shadow-elevated hover:shadow-elevated-hover"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
                      whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                    >
                      <div className="flex-shrink-0 w-[34px] h-[34px] flex items-center justify-center">
                        <ScanLine className="w-[34px] h-[34px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-heading font-semibold">Scan PSA Slabs</h3>
                        <p className="text-sm text-muted-foreground">Use your phone or scanner</p>
                      </div>
                    </motion.button>

                    {/* Take A Photo Card */}
                    <motion.button
                      onClick={handlePhotoClick}
                      className="w-full h-24 bg-card hover:bg-card/80 rounded-2xl px-7 flex items-center gap-4 transition-all text-left shadow-elevated hover:shadow-elevated-hover"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
                      whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                    >
                      <div className="flex-shrink-0 w-[34px] h-[34px] flex items-center justify-center">
                        <Camera className="w-[34px] h-[34px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-heading font-semibold">Take A Photo</h3>
                        <p className="text-sm text-muted-foreground">Capture images of your cards</p>
                      </div>
                    </motion.button>
                  </div>

                  {/* Manual Entry Link */}
                  <motion.div 
                    className="flex justify-center pt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
                  >
                    <button
                      onClick={handleManualClick}
                      className="text-primary hover:text-primary/80 text-sm font-medium underline underline-offset-4 transition-colors"
                    >
                      Enter Asset Manually
                    </button>
                  </motion.div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Scan Options - Mobile Header */}
              <div className="lg:hidden">
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={handleBackToMain}
                    className="flex items-center justify-center min-w-[48px] min-h-[48px] -ml-3"
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-7 w-7" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex items-center justify-center min-w-[48px] min-h-[48px] -mr-3"
                    aria-label="Close"
                  >
                    <X className="h-7 w-7" />
                  </button>
                </div>
                <motion.div 
                  className="px-4"
                  initial={shouldAnimate ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <h1 className="text-[34px] font-heading font-bold leading-none">
                    Scan PSA Slabs
                  </h1>
                </motion.div>
              </div>

              {/* Scan Options - Desktop Header */}
              <div className="hidden lg:flex relative items-center justify-center p-4 sm:p-6 border-b border-border">
                <button 
                  onClick={handleBackToMain} 
                  className="absolute left-4 sm:left-6 p-2 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <motion.h2 
                  className="text-2xl font-heading font-semibold"
                  initial={shouldAnimate ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.05 }}
                >
                  Scan PSA Slabs
                </motion.h2>
                <button 
                  onClick={handleClose} 
                  className="absolute right-4 sm:right-6 p-2 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Scan Options - Content */}
              <div className="px-4 sm:px-6 py-6 lg:py-12 overflow-y-auto h-[calc(100vh-80px)] lg:h-[calc(100vh-88px)]">
                <div className="max-w-xl mx-auto">
                  {/* Scan Method Cards - Side by Side Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Scan Gun Card */}
                    <motion.button
                      onClick={handleScanGunClick}
                      className="flex flex-col items-center justify-center gap-4 p-6 bg-card hover:bg-card/80 rounded-2xl transition-all text-center shadow-elevated hover:shadow-elevated-hover aspect-square"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
                      whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                    >
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Barcode className="w-8 h-8 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold mb-1">Scan Gun</h3>
                        <p className="text-xs text-muted-foreground">Use barcode scanner</p>
                      </div>
                    </motion.button>

                    {/* Phone Camera Card */}
                    <motion.button
                      onClick={handlePhoneCameraClick}
                      className="flex flex-col items-center justify-center gap-4 p-6 bg-card hover:bg-card/80 rounded-2xl transition-all text-center shadow-elevated hover:shadow-elevated-hover aspect-square"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
                      whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                    >
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Smartphone className="w-8 h-8 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold mb-1">Phone Camera</h3>
                        <p className="text-xs text-muted-foreground">Use device camera</p>
                      </div>
                    </motion.button>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Scan Modal */}
      <AddAssetModalSimple 
        open={scanModalOpen} 
        onOpenChange={(isOpen) => {
          setScanModalOpen(isOpen);
          if (!isOpen) {
            setScannedCertNumber(undefined);
            // When scan modal closes via X, also close the launcher
            setOpen(false);
            setScanOptionsOpen(false);
          }
        }}
        initialCertNumber={scannedCertNumber}
        onBack={() => {
          // ChevronLeft: Just close scan modal, launcher is already open underneath
          setScanModalOpen(false);
          setScannedCertNumber(undefined);
        }}
      />

      {/* Manual Entry Modal */}
      <ManualAddAssetDialog
        open={manualModalOpen}
        onOpenChange={setManualModalOpen}
        initialData={prefilledData} // Pass AI-detected data
      />

      {/* Camera Scanner - Barcode Mode */}
      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={handleCameraScan}
        mode="scan"
      />

      {/* Dual-Scan Camera for AI Analysis */}
      <DualScanCamera
        open={dualScanOpen}
        onClose={() => setDualScanOpen(false)}
        onAddCards={handleDualScanAddCards}
        onProcessCard={handleProcessCardInCamera}
      />
    </>
  );
}

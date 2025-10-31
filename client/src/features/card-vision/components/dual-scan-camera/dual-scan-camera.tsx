// 🤖 INTERNAL NOTE:
// Purpose: Full-screen dual-scan camera for capturing front and back of cards
// Exports: DualScanCamera component
// Feature: card-vision
// Dependencies: lucide-react, @/hooks/use-toast

import { useState, useRef, useEffect } from 'react';
import { X, Camera, Check, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '../../services/card-vision';
import type { QueuedCard } from '../../types';
import { AssetSummary } from '@/components/asset/asset-summary';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';

interface DualScanCameraProps {
  open: boolean;
  onClose: () => void;
  onAddCards: (cards: QueuedCard[]) => void; // Called when user clicks Add button with all cards
  onProcessCard?: (card: QueuedCard) => Promise<QueuedCard>; // Optional: Process card in camera view
}

type ScanSide = 'front' | 'back';

export function DualScanCamera({ open, onClose, onAddCards, onProcessCard }: DualScanCameraProps) {
  const [currentSide, setCurrentSide] = useState<ScanSide>('front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedCards, setCapturedCards] = useState<QueuedCard[]>([]);
  const [isQueueExpanded, setIsQueueExpanded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Start camera when modal opens
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      // Reset state when closed
      setCurrentSide('front');
      setFrontImage(null);
      setBackImage(null);
      setError(null);
    }

    return () => {
      // Clean up timeout and camera on unmount
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      streamRef.current = stream;
      setIsStreaming(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMsg);
      toast({
        title: 'Camera Error',
        description: 'Please allow camera access to scan cards.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || isCompressing) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast({ title: 'Error', description: 'Failed to capture photo', variant: 'destructive' });
      return;
    }

    ctx.drawImage(video, 0, 0);
    const rawImageData = canvas.toDataURL('image/jpeg', 0.9);

    try {
      setIsCompressing(true);
      
      // Compress image to reduce size (max 1920px width, 80% quality)
      const compressedImageData = await compressImage(rawImageData, 1920, 0.8);
      
      setIsCompressing(false);

      if (currentSide === 'front') {
        setFrontImage(compressedImageData);
        setCurrentSide('back');
        toast({ title: 'Front captured!', description: 'Now scan the back of the card' });
      } else {
        setBackImage(compressedImageData);
        
        // Both sides captured - create queued card
        const thumbnail = frontImage || compressedImageData;
        const queuedCard: QueuedCard = {
          id: crypto.randomUUID(),
          frontImage: frontImage!,
          backImage: compressedImageData,
          thumbnail,
          status: 'processing', // This will be updated by parent after Add is clicked
          timestamp: Date.now(),
        };

        // Add card to queue
        setCapturedCards(prev => [...prev, queuedCard]);

        toast({ title: 'Card captured!', description: 'Analyzing card...' });

        // Process card if handler provided
        if (onProcessCard) {
          processCardInCamera(queuedCard);
        }

        // Reset for next scan
        setFrontImage(null);
        setBackImage(null);
        setCurrentSide('front');
        
        // Camera stays open for continuous scanning - no need to stop/restart
      }
    } catch (error) {
      setIsCompressing(false);
      toast({ 
        title: 'Compression Error', 
        description: 'Failed to process image. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const handleRetake = () => {
    if (currentSide === 'back') {
      setCurrentSide('front');
      setFrontImage(null);
      toast({ title: 'Starting over', description: 'Scan the front again' });
    }
  };

  const handleClose = () => {
    stopCamera();
    // Reset all state
    setCapturedCards([]);
    setFrontImage(null);
    setBackImage(null);
    setCurrentSide('front');
    setIsQueueExpanded(false);
    onClose();
  };

  const handleAddCards = () => {
    // Pass all captured cards to parent
    onAddCards(capturedCards);
    handleClose();
  };

  const handleRemoveCard = (cardId: string) => {
    setCapturedCards(prev => prev.filter(card => card.id !== cardId));
  };

  const processCardInCamera = async (card: QueuedCard) => {
    if (!onProcessCard) return;

    try {
      // Call parent's processing function
      const processedCard = await onProcessCard(card);
      
      // Update card in local state with processed result
      setCapturedCards(prev => 
        prev.map(c => c.id === card.id ? processedCard : c)
      );
    } catch (error) {
      // Update card with error state
      setCapturedCards(prev => 
        prev.map(c => c.id === card.id ? { 
          ...c, 
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Analysis failed'
        } : c)
      );
    }
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCompressing(true);

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawImageData = e.target?.result as string;
        
        try {
          // Compress image
          const compressedImageData = await compressImage(rawImageData, 1920, 0.8);
          
          setIsCompressing(false);

          if (currentSide === 'front') {
            setFrontImage(compressedImageData);
            setCurrentSide('back');
            toast({ title: 'Front image uploaded!', description: 'Now upload the back of the card' });
          } else {
            setBackImage(compressedImageData);
            
            // Both sides uploaded - create queued card
            const thumbnail = frontImage || compressedImageData;
            const queuedCard: QueuedCard = {
              id: crypto.randomUUID(),
              frontImage: frontImage!,
              backImage: compressedImageData,
              thumbnail,
              status: 'processing',
              timestamp: Date.now(),
            };

            // Add card to queue
            setCapturedCards(prev => [...prev, queuedCard]);

            toast({ title: 'Card uploaded!', description: 'Analyzing card...' });

            // Process card if handler provided
            if (onProcessCard) {
              processCardInCamera(queuedCard);
            }

            // Reset for next upload
            setFrontImage(null);
            setBackImage(null);
            setCurrentSide('front');
          }
        } catch (error) {
          setIsCompressing(false);
          toast({ 
            title: 'Compression Error', 
            description: 'Failed to process image. Please try again.',
            variant: 'destructive' 
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsCompressing(false);
      toast({
        title: 'Upload Error',
        description: 'Failed to read image file',
        variant: 'destructive',
      });
    }

    // Reset file input
    event.target.value = '';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Progress Indicator */}
        <div className="flex gap-2">
          <div className={`h-1.5 w-12 rounded-full transition-colors ${
            frontImage ? 'bg-primary' : currentSide === 'front' ? 'bg-white' : 'bg-white/30'
          }`} />
          <div className={`h-1.5 w-12 rounded-full transition-colors ${
            backImage ? 'bg-primary' : currentSide === 'back' ? 'bg-white' : 'bg-white/30'
          }`} />
        </div>

        {/* Add Button (shows when cards are captured) */}
        {capturedCards.length > 0 ? (
          <Button
            onClick={handleAddCards}
            disabled={capturedCards.some(c => c.status === 'processing')}
            className="bg-white text-black hover:bg-white/90 font-semibold px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {capturedCards.some(c => c.status === 'processing') ? 'Processing...' : 'Add'}
          </Button>
        ) : (
          <div className="w-10" /> // Spacer for centering
        )}
      </div>

      {/* Camera View */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ display: isStreaming ? 'block' : 'none' }}
        />

        {/* Frame Guide Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">          
          {/* Card frame with shadow overlay */}
          <div 
            className="relative z-20 w-[280px] h-[390px] md:w-[320px] md:h-[440px]"
            style={{
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* Corner guides */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white px-6">
              <p className="text-lg font-semibold mb-2">Camera Error</p>
              <p className="text-sm text-white/70 mb-4">{error}</p>
              <Button onClick={startCamera} variant="outline" className="text-black">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-safe">
        {/* Thumbnail Queue - Collapsible */}
        {capturedCards.length > 0 && (
          <div 
            className={`bg-black/90 backdrop-blur-sm border-t border-white/10 transition-all duration-300 ${
              isQueueExpanded ? 'h-[60vh]' : 'h-32'
            }`}
          >
            {/* Drag Handle */}
            <div 
              className="flex justify-center py-2 cursor-pointer"
              onClick={() => setIsQueueExpanded(!isQueueExpanded)}
            >
              <div className="w-12 h-1 bg-white/30 rounded-full" />
            </div>

            {/* Queue Content */}
            <div className={`${isQueueExpanded ? 'h-full overflow-y-auto pb-24' : 'overflow-x-auto px-2'}`}>
              <div className={isQueueExpanded ? 'space-y-0' : 'flex gap-0'}>
                {capturedCards.map((card, index) => (
                  <div key={card.id} className={`${isQueueExpanded ? 'w-full' : 'min-w-full flex-shrink-0'}`}>
                    {/* EXACT Portfolio Mobile Card Layout */}
                    <div className="w-full bg-background px-6 py-2 pt-4 text-left relative">
                      {/* Main content row */}
                      <div className="flex gap-4 relative">
                        {/* Thumbnail */}
                        <div className="h-auto w-14 flex-shrink-0 bg-muted rounded overflow-hidden flex items-center justify-center relative">
                          <img 
                            src={card.thumbnail || PLACEHOLDER_IMAGE_URL} 
                            alt="card" 
                            className="w-full h-full object-cover" 
                          />
                          
                          {/* Processing Overlay */}
                          {card.status === 'processing' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                          
                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveCard(card.id)}
                            disabled={card.status === 'processing'}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10 shadow-md"
                            aria-label="Remove card"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Text content */}
                        <div className="flex-1 min-w-0 text-left">
                          {card.status === 'success' && card.result ? (
                            <AssetSummary
                              year={card.result.fields.year as any}
                              setName={card.result.fields.series || card.result.fields.brand}
                              playerName={card.result.fields.playerName}
                              cardNumber={card.result.fields.cardNumber as any}
                              grade={card.result.fields.grade as any}
                              gradeCompany={card.result.fields.gradingCompany || 'PSA'}
                              certNumber={card.result.fields.certNumber as any}
                              size="md"
                            />
                          ) : card.status === 'failed' ? (
                            <div className="text-sm text-destructive">
                              <p className="font-semibold">Analysis Failed</p>
                              <p className="text-xs text-muted-foreground">{card.error || 'Try again'}</p>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              <p className="font-semibold">Analyzing...</p>
                              <p className="text-xs">Processing card data</p>
                            </div>
                          )}
                        </div>

                        {/* Price + Sparkline - Removed, pricing will be fetched after adding to portfolio */}
                      </div>

                      {/* Bottom border */}
                      <div className="h-px bg-border mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions & Capture Button */}
        <div className={capturedCards.length > 0 ? 'bg-black/90 backdrop-blur-sm pb-8' : 'pb-8'}>
          {/* Instructions */}
          <div className="text-center mb-4 px-6">
            <p className="text-white font-semibold text-lg mb-1">
              {currentSide === 'front' ? 'Front' : 'Back'}
            </p>
            <p className="text-white/70 text-sm">
              Position your card within the frame
            </p>
          </div>

          {/* Capture Button */}
          <div className="flex items-center justify-center gap-4">
            {/* Gallery Upload Button */}
            <button
              onClick={handleGalleryClick}
              disabled={isCompressing}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
              aria-label="Upload from gallery"
            >
              <ImagePlus className="w-6 h-6" />
            </button>

            {/* Camera Shutter Button */}
            <button
              onClick={capturePhoto}
              disabled={!isStreaming || isCompressing}
              className="relative flex items-center justify-center w-20 h-20 rounded-full bg-transparent border-4 border-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
              aria-label="Capture photo"
            >
              <div className="w-16 h-16 rounded-full bg-white" />
              {isCompressing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>

            {/* Spacer for symmetry */}
            <div className="w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

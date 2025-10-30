// 🤖 INTERNAL NOTE:
// Purpose: Full-screen dual-scan camera for capturing front and back of cards
// Exports: DualScanCamera component
// Feature: card-vision
// Dependencies: lucide-react, @/hooks/use-toast

import { useState, useRef, useEffect } from 'react';
import { X, Camera, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '../../services/card-vision';
import type { QueuedCard } from '../../types';

interface DualScanCameraProps {
  open: boolean;
  onClose: () => void;
  onCapture: (card: QueuedCard) => void; // Called when both sides captured
}

type ScanSide = 'front' | 'back';

export function DualScanCamera({ open, onClose, onCapture }: DualScanCameraProps) {
  const [currentSide, setCurrentSide] = useState<ScanSide>('front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
          status: 'processing',
          timestamp: Date.now(),
        };

        // Stop camera and trigger processing
        stopCamera();
        onCapture(queuedCard);

        toast({ title: 'Card captured!', description: 'Processing card...' });

        // Reset for next scan
        setFrontImage(null);
        setBackImage(null);
        setCurrentSide('front');
        
        // Restart camera for continuous scanning (with cleanup check)
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }
        restartTimeoutRef.current = setTimeout(() => {
          if (open) {
            startCamera();
          }
        }, 500);
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
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black">
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

        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Camera View */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Video Stream */}
        {isStreaming && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Frame Guide Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Dark overlay with transparent center */}
          <div className="absolute inset-0 bg-black/40" />
          
          {/* Card frame */}
          <div className="relative z-10 w-[280px] h-[390px] md:w-[320px] md:h-[440px]">
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
        <div className="flex items-center justify-center gap-4 pb-8">
          {currentSide === 'back' && frontImage && (
            <Button
              onClick={handleRetake}
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              Retake
            </Button>
          )}

          <button
            onClick={capturePhoto}
            disabled={!isStreaming || isCompressing}
            className="relative flex items-center justify-center w-20 h-20 rounded-full bg-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            aria-label="Capture photo"
          >
            {frontImage && currentSide === 'back' ? (
              <Check className="w-10 h-10 text-black" />
            ) : (
              <Camera className="w-10 h-10 text-black" />
            )}
            {isCompressing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-full">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>

          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>
    </div>
  );
}

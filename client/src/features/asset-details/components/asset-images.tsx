import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface AssetImagesProps {
  asset: any;
}

export const AssetImages: React.FC<AssetImagesProps> = ({ asset }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Build comprehensive image array: PSA images first, then user uploads, then fallback
  const allImages: string[] = [];
  
  // Add PSA images if available
  if (asset?.psaImageFrontUrl) allImages.push(asset.psaImageFrontUrl);
  if (asset?.psaImageBackUrl) allImages.push(asset.psaImageBackUrl);
  
  // Add user uploaded images
  if (asset?.assetImages && Array.isArray(asset.assetImages)) {
    allImages.push(...asset.assetImages);
  }
  
  // Add legacy imageUrl if available and not already included
  if (asset?.imageUrl && !allImages.includes(asset.imageUrl)) {
    allImages.push(asset.imageUrl);
  }
  
  // Check if we're using placeholder (no real images)
  const hasNoImages = allImages.length === 0;
  
  // Fallback to placeholder if no images
  if (hasNoImages) {
    allImages.push(PLACEHOLDER_IMAGE_URL);
  }
  
  const currentImage = allImages[currentImageIndex];
  const totalImages = allImages.length;
  
  const goToPrevious = () => {
    setCurrentImageIndex((prev) => prev === 0 ? totalImages - 1 : prev - 1);
  };
  
  const goToNext = () => {
    setCurrentImageIndex((prev) => prev === totalImages - 1 ? 0 : prev + 1);
  };
  
  return (
    <TooltipProvider delayDuration={0}>
      <div className="aspect-[1/0] flex items-center justify-center relative group">
        <img 
          src={currentImage} 
          alt={`Asset image ${currentImageIndex + 1} of ${totalImages}`} 
          className="object-contain max-h-full max-w-full rounded-lg"
        />
        
        {/* Placeholder indicator - only show when using placeholder */}
        {hasNoImages && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute bottom-2 right-2 h-6 w-6 bg-muted-foreground/80 rounded-full flex items-center justify-center cursor-help hover:bg-muted-foreground transition-colors">
                <span className="text-xs text-background font-bold">?</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-sm">No image available from PSA</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Navigation arrows - only show if multiple images */}
        {totalImages > 1 && (
          <div className="absolute inset-0 flex justify-between items-center pointer-events-none">
            <button 
              onClick={goToPrevious}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-background/70 text-foreground shadow-sm pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button 
              onClick={goToNext}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-background/70 text-foreground shadow-sm pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        )}
        
        {/* Image counter */}
        {totalImages > 1 && (
          <div className="absolute bottom-2 right-2 bg-background/80 text-foreground px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            {currentImageIndex + 1} / {totalImages}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
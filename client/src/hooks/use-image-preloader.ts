import { useEffect, useState } from 'react';

/**
 * Hook to preload an image and track its loading state
 * This prevents the visual "pop-in" effect when images load
 */
export const useImagePreloader = (src: string | undefined) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setIsLoaded(false);
      setHasError(true);
      return;
    }

    // Reset states
    setIsLoaded(false);
    setHasError(false);

    // Create image element for preloading
    const img = new Image();
    
    img.onload = () => {
      setIsLoaded(true);
      setHasError(false);
    };
    
    img.onerror = () => {
      setIsLoaded(false);
      setHasError(true);
    };

    // Start loading
    img.src = src;

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { isLoaded, hasError };
};

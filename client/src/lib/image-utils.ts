/**
 * Client-side image optimization utilities
 * Following industry best practices for avatar uploads
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'jpeg' | 'webp' | 'png';
}

/**
 * Compress and resize an image file for optimal upload
 * This is what 99% of apps do - resize on client before upload
 */
export async function compressImage(
  file: File, 
  options: ImageOptimizationOptions = {}
): Promise<File> {
  const {
    maxWidth = 512,
    maxHeight = 512, 
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw resized image
      ctx?.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // Create optimized file
          const optimizedFile = new File(
            [blob], 
            `avatar.${format}`, 
            { 
              type: `image/${format}`,
              lastModified: Date.now()
            }
          );

          console.log(`Image optimized: ${Math.round(file.size / 1024)}KB → ${Math.round(optimizedFile.size / 1024)}KB`);
          resolve(optimizedFile);
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create a preview URL for immediate display
 * Shows optimized image while upload happens in background
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Validate if file is a valid image
 */
export function isValidImageFile(file: File): boolean {
  return file.type.startsWith('image/') && file.size > 0;
}

/**
 * Get optimal format for image type
 * Photos → JPEG, Graphics/Transparency → PNG
 */
export function getOptimalFormat(file: File): 'jpeg' | 'png' | 'webp' {
  // Check for WebP support
  const canvas = document.createElement('canvas');
  const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  
  if (supportsWebP) return 'webp';
  if (file.type === 'image/png') return 'png';
  return 'jpeg';
}
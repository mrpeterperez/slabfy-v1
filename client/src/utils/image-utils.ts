/**
 * Image utility functions for handling base64 conversions and image processing
 */

/**
 * Converts a data URL (base64 image) to a Blob object
 * Used for converting canvas captures or base64 strings to uploadable file format
 * 
 * @param dataURL - Base64 encoded data URL (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
 * @returns Blob object ready for FormData upload
 */
export function dataURLToBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

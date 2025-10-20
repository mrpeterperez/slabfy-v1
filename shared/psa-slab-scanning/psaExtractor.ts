// PSA certificate number extractor and scan result processor

export interface ScanResult {
  certNumber: string | null;
  isPSA: boolean;
  originalValue: string;
}

function extractPSANumber(url: string): string {
    return url.split('/cert/')[1].split('/')[0];
}

export function processScanResult(scannedValue: string): ScanResult {
  const trimmed = scannedValue.trim();
  
  // Check if it's a PSA URL
  if (trimmed.includes('psacard.com/cert/')) {
    try {
      const certNumber = extractPSANumber(trimmed);
      return {
        certNumber,
        isPSA: true,
        originalValue: trimmed
      };
    } catch (error) {
      return {
        certNumber: null,
        isPSA: false,
        originalValue: trimmed
      };
    }
  }
  
  // If it's just a number (direct cert number entry)
  const numberMatch = trimmed.match(/^\d+$/);
  if (numberMatch) {
    return {
      certNumber: trimmed,
      isPSA: false,
      originalValue: trimmed
    };
  }
  
  // Return original value if not a PSA URL or pure number
  return {
    certNumber: trimmed,
    isPSA: false,
    originalValue: trimmed
  };
}
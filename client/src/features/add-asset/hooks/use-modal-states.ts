/**
 * Custom hook for managing Add Asset launcher modal states
 * Centralizes all modal open/close state and navigation logic
 */

import { useState } from 'react';
import type { AnalyzedCardFields } from '@/features/card-vision';

export function useModalStates() {
  const [scanOptionsOpen, setScanOptionsOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [dualScanOpen, setDualScanOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [scannedCertNumber, setScannedCertNumber] = useState<string | undefined>(undefined);
  const [prefilledData, setPrefilledData] = useState<AnalyzedCardFields | undefined>(undefined);
  const [shouldAnimate, setShouldAnimate] = useState(true);

  const openScanOptions = () => {
    setScanOptionsOpen(true);
    setShouldAnimate(true);
  };

  const closeAllModals = () => {
    setScanOptionsOpen(false);
    setScanModalOpen(false);
    setCameraOpen(false);
    setDualScanOpen(false);
    setManualModalOpen(false);
    setScannedCertNumber(undefined);
    setPrefilledData(undefined);
    setShouldAnimate(true);
  };

  const backToMainMenu = () => {
    setScanOptionsOpen(false);
    setShouldAnimate(false);
  };

  return {
    // State
    scanOptionsOpen,
    scanModalOpen,
    cameraOpen,
    dualScanOpen,
    manualModalOpen,
    scannedCertNumber,
    prefilledData,
    shouldAnimate,
    
    // Setters
    setScanOptionsOpen,
    setScanModalOpen,
    setCameraOpen,
    setDualScanOpen,
    setManualModalOpen,
    setScannedCertNumber,
    setPrefilledData,
    setShouldAnimate,
    
    // Actions
    openScanOptions,
    closeAllModals,
    backToMainMenu
  };
}

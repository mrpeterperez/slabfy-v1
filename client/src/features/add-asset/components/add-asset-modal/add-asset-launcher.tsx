// 🤖 INTERNAL NOTE:
// Purpose: Pre-dialog launcher for Add Asset flow with animated option cards
// Exports: AddAssetLauncher component
// Feature: add-asset
// Dependencies: framer-motion, lucide-react, shadcn button

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { AddAssetModalSimple } from './add-asset-modal-simple';
import { ManualAddAssetDialog } from '../manual-asset-entry';
import { CameraScanner } from '../camera-scanner';
import { analyzeCardImage } from '@/features/card-vision';
import { DualScanCamera } from '@/features/card-vision/components/dual-scan-camera';
import type { QueuedCard } from '@/features/card-vision/types';
import { useDualScanUpload } from '../../hooks/use-dual-scan-upload';
import { useCardProcessing } from '../../hooks/use-card-processing';
import { useModalStates } from '../../hooks/use-modal-states';
import { ModalHeader } from './modal-header';
import { MainMenuOptions } from './main-menu-options';
import { ScanOptionsMenu } from './scan-options-menu';

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
  const { toast } = useToast();
  const { user } = useAuth();
  const { uploadCardBatch } = useDualScanUpload();
  const { processCard } = useCardProcessing();
  const modalStates = useModalStates();

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const handleClose = () => {
    setOpen(false);
    modalStates.closeAllModals();
  };

  const handleOpen = () => {
    setOpen(true);
    modalStates.closeAllModals();
  };

  const handleDualScanAddCards = async (cards: QueuedCard[]) => {
    modalStates.setDualScanOpen(false);
    const result = await uploadCardBatch(cards);
    
    if (result?.lowConfidenceCards && result.lowConfidenceCards.length > 0 && result.highConfidenceCount === 0) {
      const firstLowConfidence = result.lowConfidenceCards[0];
      toast({
        title: "Low confidence detection",
        description: "Please review and confirm card details",
      });
      modalStates.setPrefilledData(firstLowConfidence.result!.fields);
      modalStates.setManualModalOpen(true);
    }
  };

  const handleProcessCardInCamera = async (card: QueuedCard): Promise<QueuedCard> => {
    return new Promise((resolve) => {
      processCard({
        frontImage: card.frontImage,
        backImage: card.backImage || '',
        card,
        onUpdate: (updates) => Object.assign(card, updates),
        onComplete: () => resolve(card)
      });
    });
  };

  return (
    <>
      {triggerButton && (
        <div onClick={handleOpen} className="inline-block">
          {triggerButton}
        </div>
      )}

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
          {!modalStates.scanOptionsOpen ? (
            <>
              <ModalHeader 
                title="Add Assets"
                shouldAnimate={modalStates.shouldAnimate}
                onClose={handleClose}
              />
              <MainMenuOptions
                shouldAnimate={modalStates.shouldAnimate}
                onScanPSAClick={() => modalStates.openScanOptions()}
                onPhotoClick={() => {
                  modalStates.setDualScanOpen(true);
                  setOpen(false);
                }}
                onManualClick={() => {
                  modalStates.setManualModalOpen(true);
                  setOpen(false);
                }}
              />
            </>
          ) : (
            <>
              <ModalHeader
                title="Scan PSA Slabs"
                shouldAnimate={modalStates.shouldAnimate}
                showBackButton
                onClose={handleClose}
                onBack={() => modalStates.backToMainMenu()}
              />
              <ScanOptionsMenu
                onScanGunClick={() => modalStates.setScanModalOpen(true)}
                onPhoneCameraClick={() => {
                  modalStates.setCameraOpen(true);
                  setOpen(false);
                }}
              />
            </>
          )}
        </motion.div>
      )}

      <AddAssetModalSimple 
        open={modalStates.scanModalOpen} 
        onOpenChange={(isOpen) => {
          modalStates.setScanModalOpen(isOpen);
          if (!isOpen) {
            modalStates.setScannedCertNumber(undefined);
            setOpen(false);
            modalStates.setScanOptionsOpen(false);
          }
        }}
        initialCertNumber={modalStates.scannedCertNumber}
        onBack={() => {
          modalStates.setScanModalOpen(false);
          modalStates.setScannedCertNumber(undefined);
        }}
      />

      <ManualAddAssetDialog
        open={modalStates.manualModalOpen}
        onOpenChange={modalStates.setManualModalOpen}
        initialData={modalStates.prefilledData}
      />

      <CameraScanner
        open={modalStates.cameraOpen}
        onClose={() => modalStates.setCameraOpen(false)}
        onScan={(scannedValue) => {
          modalStates.setCameraOpen(false);
          modalStates.setScannedCertNumber(scannedValue);
          modalStates.setScanModalOpen(true);
        }}
        mode="scan"
      />

      <DualScanCamera
        open={modalStates.dualScanOpen}
        onClose={() => modalStates.setDualScanOpen(false)}
        onAddCards={handleDualScanAddCards}
        onProcessCard={handleProcessCardInCamera}
      />
    </>
  );
}

// 🤖 INTERNAL NOTE:
// Purpose: Pre-dialog launcher for Add Asset flow with animated option cards
// Exports: AddAssetLauncher component
// Feature: add-asset
// Dependencies: framer-motion, lucide-react, shadcn button

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ScanLine, Camera, Barcode, Smartphone, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddAssetModalSimple } from './add-asset-modal-simple';
import { ManualAddAssetDialog } from '../manual-asset-entry';
import { CameraScanner } from '../camera-scanner';

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
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [scannedCertNumber, setScannedCertNumber] = useState<string | undefined>(undefined);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const { toast } = useToast();

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
    toast({
      title: "Photo Capture",
      description: "This feature will be available in an upcoming update.",
    });
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
      />

      {/* Camera Scanner */}
      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={handleCameraScan}
      />
    </>
  );
}

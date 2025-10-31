/**
 * Main menu options for the Add Asset launcher
 * Displays the primary action cards (Scan PSA, Take Photo, Enter Manually)
 */

import { motion } from 'framer-motion';
import { ScanLine, Camera, Pencil } from 'lucide-react';

interface MainMenuOptionsProps {
  shouldAnimate: boolean;
  onScanPSAClick: () => void;
  onPhotoClick: () => void;
  onManualClick: () => void;
}

export function MainMenuOptions({
  shouldAnimate,
  onScanPSAClick,
  onPhotoClick,
  onManualClick
}: MainMenuOptionsProps) {
  return (
    <div className="px-4 sm:px-6 py-6 lg:py-12 overflow-y-auto h-[calc(100vh-80px)] lg:h-[calc(100vh-88px)]">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="space-y-4">
          {/* Scan PSA Slabs Card */}
          <motion.button
            onClick={onScanPSAClick}
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
            onClick={onPhotoClick}
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
              <p className="text-sm text-muted-foreground">Scan raw or graded cards</p>
            </div>
          </motion.button>

          {/* Enter Manually Card */}
          <motion.button
            onClick={onManualClick}
            className="w-full h-24 bg-card hover:bg-card/80 rounded-2xl px-7 flex items-center gap-4 transition-all text-left shadow-elevated hover:shadow-elevated-hover"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
          >
            <div className="flex-shrink-0 w-[34px] h-[34px] flex items-center justify-center">
              <Pencil className="w-[34px] h-[34px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-heading font-semibold">Enter Manually</h3>
              <p className="text-sm text-muted-foreground">Add card details by hand</p>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

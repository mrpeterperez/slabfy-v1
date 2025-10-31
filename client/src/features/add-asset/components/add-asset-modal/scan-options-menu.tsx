/**
 * Scan options menu for PSA slab scanning
 * Displays options for different scan methods (barcode scanner, phone camera)
 */

import { motion } from 'framer-motion';
import { Barcode, Smartphone } from 'lucide-react';

interface ScanOptionsMenuProps {
  onScanGunClick: () => void;
  onPhoneCameraClick: () => void;
}

export function ScanOptionsMenu({
  onScanGunClick,
  onPhoneCameraClick
}: ScanOptionsMenuProps) {
  return (
    <div className="px-4 sm:px-6 py-6 lg:py-12 overflow-y-auto h-[calc(100vh-80px)] lg:h-[calc(100vh-88px)]">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="space-y-4">
          {/* Barcode Scanner */}
          <motion.button
            onClick={onScanGunClick}
            className="w-full h-24 bg-card hover:bg-card/80 rounded-2xl px-7 flex items-center gap-4 transition-all text-left shadow-elevated hover:shadow-elevated-hover"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
          >
            <div className="flex-shrink-0 w-[34px] h-[34px] flex items-center justify-center">
              <Barcode className="w-[34px] h-[34px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-heading font-semibold">Barcode Scanner</h3>
              <p className="text-sm text-muted-foreground">Use a physical barcode scanner</p>
            </div>
          </motion.button>

          {/* Phone Camera */}
          <motion.button
            onClick={onPhoneCameraClick}
            className="w-full h-24 bg-card hover:bg-card/80 rounded-2xl px-7 flex items-center gap-4 transition-all text-left shadow-elevated hover:shadow-elevated-hover"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
          >
            <div className="flex-shrink-0 w-[34px] h-[34px] flex items-center justify-center">
              <Smartphone className="w-[34px] h-[34px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-heading font-semibold">Phone Camera</h3>
              <p className="text-sm text-muted-foreground">Scan barcode with your phone</p>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

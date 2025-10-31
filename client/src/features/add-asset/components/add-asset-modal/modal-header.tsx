/**
 * Modal header component for the Add Asset launcher
 * Displays title and close button for both mobile and desktop views
 */

import { motion } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  shouldAnimate: boolean;
  showBackButton?: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export function ModalHeader({
  title,
  shouldAnimate,
  showBackButton = false,
  onClose,
  onBack
}: ModalHeaderProps) {
  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <div className="flex items-center p-4">
          {showBackButton && onBack ? (
            <button
              onClick={onBack}
              className="flex items-center justify-center min-w-[48px] min-h-[48px] -ml-3"
              aria-label="Back"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center justify-center min-w-[48px] min-h-[48px] -ml-3"
              aria-label="Close"
            >
              <X className="h-7 w-7" />
            </button>
          )}
        </div>
        <motion.div 
          className="px-4"
          initial={shouldAnimate ? { opacity: 0, y: -10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 id="launcher-title" className="text-[34px] font-heading font-bold leading-none">
            {title}
          </h1>
        </motion.div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex relative items-center justify-center p-4 sm:p-6 border-b border-border">
        {showBackButton && onBack ? (
          <button 
            onClick={onBack} 
            className="absolute left-4 sm:left-6 p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        ) : (
          <button 
            onClick={onClose} 
            className="absolute left-4 sm:left-6 p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
        <motion.h2 
          id="launcher-title"
          className="text-2xl font-heading font-semibold"
          initial={shouldAnimate ? { opacity: 0, y: -10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.05 }}
        >
          {title}
        </motion.h2>
      </div>
    </>
  );
}

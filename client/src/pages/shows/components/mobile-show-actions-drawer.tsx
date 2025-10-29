// Mobile bottom drawer for show actions
// Based on asset actions drawer

import { createPortal } from 'react-dom';
import { X, Archive, ArchiveRestore } from 'lucide-react';
import type { Event } from '@shared/schema';

interface MobileShowActionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onArchive: () => void;
}

export function MobileShowActionsDrawer({
  isOpen,
  onClose,
  event,
  onArchive,
}: MobileShowActionsDrawerProps) {
  if (!isOpen) return null;

  const handleAction = (action: () => void) => {
    onClose();
    // Small delay to let drawer close animation finish
    setTimeout(action, 150);
  };

  const isArchived = event.status === 'archived';

  // Render drawer using portal to break out of any container constraints
  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="lg:hidden fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-[9999] bg-background rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Handle bar */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pb-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Actions</h2>
            <button
              onClick={onClose}
              className="min-w-[48px] min-h-[48px] flex items-center justify-center -mr-3"
              aria-label="Close actions menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Actions List */}
        <div className="flex-shrink-0 py-4 space-y-2">
          {/* Archive/Restore Action */}
          <button
            onClick={() => handleAction(onArchive)}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors min-h-[56px]"
          >
            {isArchived ? (
              <>
                <ArchiveRestore className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span className="text-base font-medium text-left">Restore Event</span>
              </>
            ) : (
              <>
                <Archive className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span className="text-base font-medium text-left">Archive Event</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom safe area padding */}
        <div className="h-4 flex-shrink-0" />
      </div>
    </>,
    document.body
  );
}

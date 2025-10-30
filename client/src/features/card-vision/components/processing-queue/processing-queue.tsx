// 🤖 INTERNAL NOTE:
// Purpose: Bottom sheet showing cards being processed in the background
// Exports: ProcessingQueue component
// Feature: card-vision
// Dependencies: lucide-react, @/components/ui/sheet

import { Loader2, CheckCircle2, XCircle, ChevronUp } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { QueuedCard } from '../../types';

interface ProcessingQueueProps {
  cards: QueuedCard[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardClick: (card: QueuedCard) => void;
}

export function ProcessingQueue({ cards, open, onOpenChange, onCardClick }: ProcessingQueueProps) {
  const processingCount = cards.filter(c => c.status === 'processing').length;
  const completedCount = cards.filter(c => c.status === 'success').length;
  const failedCount = cards.filter(c => c.status === 'failed').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>
            Processing Cards
            {processingCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {processingCount} processing
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Summary Stats */}
        {cards.length > 0 && (
          <div className="flex gap-4 mt-4 mb-4 text-sm">
            {completedCount > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>{completedCount} completed</span>
              </div>
            )}
            {failedCount > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <XCircle className="h-4 w-4" />
                <span>{failedCount} failed</span>
              </div>
            )}
          </div>
        )}

        {/* Queue List */}
        <div className="space-y-3 overflow-y-auto max-h-[calc(70vh-120px)]">
          {cards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No cards being processed</p>
              <p className="text-sm mt-1">Scan a card to get started</p>
            </div>
          ) : (
            cards.map((card) => (
              <QueuedCardItem
                key={card.id}
                card={card}
                onClick={() => onCardClick(card)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface QueuedCardItemProps {
  card: QueuedCard;
  onClick: () => void;
}

function QueuedCardItem({ card, onClick }: QueuedCardItemProps) {
  const getStatusIcon = () => {
    switch (card.status) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusText = () => {
    switch (card.status) {
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Ready to review';
      case 'failed':
        return card.error || 'Failed to analyze';
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
    >
      {/* Thumbnail */}
      <div className="w-16 h-20 flex-shrink-0 rounded overflow-hidden bg-muted">
        {card.thumbnail ? (
          <img
            src={card.thumbnail}
            alt="Card thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {card.result?.fields ? (
              <>
                <p className="font-medium truncate">
                  {[
                    card.result.fields.playerName,
                    card.result.fields.year,
                    card.result.fields.brand,
                    card.result.fields.cardNumber,
                  ].filter(Boolean).join(' ') || 'Card detected'}
                </p>
                {card.result.confidence && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round(card.result.confidence * 100)}% confident
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {getStatusText()}
              </p>
            )}
          </div>
          {getStatusIcon()}
        </div>

        {/* PSA Badge */}
        {card.result?.isPSAFastPath && (
          <div className="mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              PSA #{card.result.certNumber}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

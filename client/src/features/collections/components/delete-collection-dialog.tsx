import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { type CollectionWithDetails } from '@shared/schema';

interface DeleteCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: CollectionWithDetails;
  onConfirm: () => void;
}

export function DeleteCollectionDialog({
  open,
  onOpenChange,
  collection,
  onConfirm
}: DeleteCollectionDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span>Delete Collection</span>
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the collection and remove all asset associations.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0" 
              style={{ backgroundColor: collection.color || '#3B82F6' }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{collection.name}</p>
              <p className="text-sm text-muted-foreground">
                {collection.totalAssets} asset{collection.totalAssets !== 1 ? 's' : ''}
                {collection.description && ` • ${collection.description}`}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">Warning:</p>
            <p className="text-sm text-destructive mt-1">
              Deleting this collection will remove all {collection.totalAssets} assets from it. 
              The assets themselves will remain in your portfolio.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete Collection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface RevertPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  selectedCount: number;
  purchasedCount: number;
}

export function RevertPurchaseDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  purchasedCount,
}: RevertPurchaseDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
    setConfirmed(false); // Reset for next time
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setConfirmed(false); // Reset when dialog closes
    }
  };

  if (purchasedCount === 0) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revert Purchase</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You have selected <strong>{selectedCount}</strong> items, including{" "}
              <strong>{purchasedCount}</strong> already purchased.
            </p>
            <p className="text-destructive font-medium">
              ⚠️ Warning: Moving purchased items back to evaluation or buy list will:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Remove the items from your collection</li>
              <li>Delete the purchase transaction records</li>
              <li>You will no longer own these cards</li>
              <li>This action cannot be undone</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to proceed? Consider if you really want to reverse 
              your purchase and lose ownership of these cards.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex items-center space-x-2 pb-4">
          <Checkbox 
            id="confirm-revert" 
            checked={confirmed} 
            onCheckedChange={(checked) => setConfirmed(checked === true)}
            data-testid="checkbox-confirm-revert"
          />
          <label 
            htmlFor="confirm-revert" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I understand and confirm this action
          </label>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!confirmed}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-confirm-revert"
          >
            Yes, Revert Purchase
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
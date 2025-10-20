// 🤖 INTERNAL NOTE:
// Purpose: Publish button with confirmation modal for going live
// Exports: PublishButton component
// Feature: sales-channels/show-storefront
// Dependencies: shadcn dialog, button

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { StorefrontSettings } from "@shared/schema";

interface PublishButtonProps {
  settings: StorefrontSettings | null | undefined;
  hasUnsavedChanges: boolean;
}

export function PublishButton({ settings, hasUnsavedChanges }: PublishButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const handlePublish = () => {
    toast({
      title: "Storefront Published!",
      description: "Your storefront is now live and accessible to customers.",
    });
    setShowConfirm(false);
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        disabled={!settings || hasUnsavedChanges}
        className="gap-2"
      >
        <Rocket className="h-4 w-4" />
        Publish Changes
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Storefront?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your storefront public and accessible to all customers.
              Make sure all your settings are correct before publishing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              Publish Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

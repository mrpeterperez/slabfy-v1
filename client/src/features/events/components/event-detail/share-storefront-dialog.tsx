// 🤖 INTERNAL NOTE:
// Purpose: Share storefront dialog with URL copy and QR code download
// Exports: ShareStorefrontDialog component
// Feature: events/storefront
// Dependencies: shadcn dialog, lucide-react icons, @tanstack/react-query

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, Share2, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Event } from "@shared/schema";
import { supabase } from "@/lib/supabase";

interface ShareStorefrontDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
}

export function ShareStorefrontDialog({ open, onOpenChange, event }: ShareStorefrontDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Generate storefront URL
  const storefrontUrl = `${window.location.origin}/storefront/${event.id}`;

  // Fetch or generate QR code
  const { data: qrData, isLoading: isLoadingQR } = useQuery({
    queryKey: ['/api/events', event.id, 'qr-code'],
    queryFn: async () => {
      // Check if QR code already exists
      if (event.storefrontQrCodeUrl) {
        return {
          qrCodeUrl: event.storefrontQrCodeUrl,
          storefrontUrl,
        };
      }

      // Get Supabase session token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      // Generate new QR code
      const response = await fetch(`/api/events/${event.id}/generate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      return await response.json();
    },
    enabled: open, // Only fetch when dialog is open
    staleTime: Infinity, // QR code doesn't change once generated
  });

  // Regenerate QR code mutation
  const regenerateQR = useMutation({
    mutationFn: async () => {
      // Get Supabase session token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(`/api/events/${event.id}/generate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate QR code');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "QR code regenerated",
        description: "Your storefront QR code has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to regenerate QR code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      setCopied(true);
      toast({
        title: "URL copied!",
        description: "Storefront URL copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  const handleDownloadQR = () => {
    if (!qrData?.qrCodeUrl) return;

    // Create download link
    const link = document.createElement('a');
    link.href = qrData.qrCodeUrl;
    link.download = `${event.name.replace(/\s+/g, '-')}-storefront-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "QR code downloaded",
      description: "Your storefront QR code has been saved",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Your Storefront
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Storefront URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Storefront URL
            </label>
            <div className="flex gap-2">
              <Input
                value={storefrontUrl}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                onClick={handleCopyUrl}
                variant="outline"
                size="icon"
                className="flex-shrink-0"
              >
                {copied ? (
                  <span className="text-xs font-medium">✓</span>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              QR Code
            </label>
            <div className="flex flex-col items-center gap-4 p-4 bg-muted rounded-lg">
              {isLoadingQR ? (
                <div className="flex items-center justify-center h-48 w-48">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : qrData?.qrCodeUrl ? (
                <img
                  src={qrData.qrCodeUrl}
                  alt="Storefront QR Code"
                  className="h-48 w-48 rounded-md border-2 border-border bg-white p-2"
                />
              ) : (
                <div className="flex items-center justify-center h-48 w-48 text-muted-foreground">
                  No QR code available
                </div>
              )}

              <Button
                onClick={handleDownloadQR}
                disabled={!qrData?.qrCodeUrl || isLoadingQR}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download QR Code
              </Button>
            </div>
          </div>

          {/* Info Note */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="font-medium mb-1">📦 About your storefront</p>
            <p>
              Your storefront displays inventory from the "Available" tab of this event. 
              Share this URL or QR code with customers at your card show.
            </p>
          </div>

          {/* Regenerate Option */}
          {qrData?.qrCodeUrl && (
            <Button
              onClick={() => regenerateQR.mutate()}
              variant="ghost"
              size="sm"
              disabled={regenerateQR.isPending}
              className="w-full"
            >
              {regenerateQR.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                'Regenerate QR Code'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

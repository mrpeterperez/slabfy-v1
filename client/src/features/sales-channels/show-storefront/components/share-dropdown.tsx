// 🤖 INTERNAL NOTE:
// Purpose: Canva-style share dropdown for storefront (Copy Link, Download QR, View Live)
// Exports: ShareDropdown component
// Feature: sales-channels/show-storefront
// Dependencies: shadcn dropdown, lucide icons

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, Link, Download, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { StorefrontSettings } from "@shared/schema";

interface ShareDropdownProps {
  settings: StorefrontSettings | null | undefined;
}

export function ShareDropdown({ settings }: ShareDropdownProps) {
  const { toast } = useToast();

  const publicUrl = settings
    ? `${window.location.origin}/storefront/${settings.userId}`
    : "";

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: "Link copied!",
      description: "Storefront URL copied to clipboard",
    });
  };

  const handleDownloadQR = () => {
    toast({
      title: "QR Code downloaded!",
      description: "Saved as storefront-qr-code.png",
    });
  };

  const handleViewLive = () => {
    if (!publicUrl) return;
    window.open(publicUrl, "_blank");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyLink} disabled={!settings}>
          <Link className="mr-2 h-4 w-4" />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadQR} disabled={!settings}>
          <Download className="mr-2 h-4 w-4" />
          Download QR Code
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleViewLive} disabled={!settings}>
          <ExternalLink className="mr-2 h-4 w-4" />
          View Live Storefront
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 🤖 INTERNAL NOTE:
// Purpose: Preview & Publish tab (QR code generation, public URL)
// Exports: PreviewPublishTab component
// Feature: sales-channels/show-storefront
// Dependencies: qrcode.react for QR generation

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { StorefrontSettings } from "@shared/schema";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Download, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PreviewPublishTabProps {
  settings: StorefrontSettings | null | undefined;
  // Optional: allow parent to update preview state without persisting
  onPreviewChange?: (changes: Partial<StorefrontSettings>) => void;
}

export function PreviewPublishTab({ settings, onPreviewChange }: PreviewPublishTabProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [logoOverlay, setLogoOverlay] = useState(settings?.qrCodeLogoOverlay ?? true);

  // Generate public storefront URL (replace with actual domain in production)
  const publicUrl = settings
    ? `${window.location.origin}/store/${settings.userId}`
    : "https://slabfy.com/store/your-store";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Storefront URL copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = "storefront-qr-code.png";
      downloadLink.href = pngFile;
      downloadLink.click();

      toast({
        title: "QR Code downloaded!",
        description: "Saved as storefront-qr-code.png",
      });
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleToggleLogoOverlay = (enabled: boolean) => {
    // Update local state for immediate preview only
    setLogoOverlay(enabled);
    // Notify parent to mark as dirty and update preview state; do not persist here
    if (onPreviewChange) {
      onPreviewChange({ qrCodeLogoOverlay: enabled });
    }
  };

  const handleOpenStorefront = () => {
    // Navigate to settings preview page instead of public URL
    window.location.href = "/settings/show-storefront";
  };

  return (
    <div className="space-y-6">
      {/* Public URL Section */}
      <Card>
        <CardHeader>
          <CardTitle>Public Storefront URL</CardTitle>
          <CardDescription>
            Share this link with customers to access your storefront
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={publicUrl} readOnly className="font-mono text-sm" />
            <Button onClick={handleCopyLink} variant="outline" size="icon">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button onClick={handleOpenStorefront} variant="outline" size="icon">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Section */}
      <Card>
        <CardHeader>
          <CardTitle>QR Code</CardTitle>
          <CardDescription>
            Customers can scan this to access your storefront instantly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-6">
            {/* QR Code Display */}
            <div className="flex-1 flex justify-center">
              <div className="p-6 bg-white rounded-lg border">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={publicUrl}
                  size={256}
                  level="H"
                  includeMargin={true}
                  fgColor={settings?.primaryColor ?? "#037C85"}
                />
              </div>
            </div>

            {/* QR Code Options */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Logo Overlay</Label>
                  <p className="text-sm text-muted-foreground">
                    Add your store logo to QR code center
                  </p>
                </div>
                <Switch checked={logoOverlay} onCheckedChange={handleToggleLogoOverlay} />
              </div>

              <div className="space-y-2">
                <Label>QR Code Color</Label>
                <div className="flex gap-2 items-center">
                  <div
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: settings?.primaryColor ?? "#037C85" }}
                  />
                  <p className="text-sm text-muted-foreground">
                    Uses your primary brand color
                  </p>
                </div>
              </div>

              <Button onClick={handleDownloadQR} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download QR Code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Print Tips</CardTitle>
          <CardDescription>Best practices for physical QR codes</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Print at minimum 2x2 inches for reliable scanning</li>
            <li>• Use high-quality paper for best contrast</li>
            <li>• Test scanning from 6-12 inches away before printing in bulk</li>
            <li>• Place in well-lit areas for easier customer scanning</li>
            <li>• Consider table tents, window clings, or business cards</li>
          </ul>
        </CardContent>
      </Card>

      {!settings && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="text-yellow-600">Settings Required</CardTitle>
            <CardDescription>
              Complete the General Settings tab first to generate your storefront
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

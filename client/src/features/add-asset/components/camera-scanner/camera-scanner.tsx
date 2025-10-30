// 🤖 INTERNAL NOTE:
// Purpose: Camera-based QR/barcode scanner for mobile devices
// Exports: CameraScanner component
// Feature: add-asset
// Dependencies: html5-qrcode, lucide-react

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CameraScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

export function CameraScanner({ open, onClose, onScan }: CameraScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(true); // Start with permission request
  const [notSupported, setNotSupported] = useState<string | null>(null);
  const [isScanningFile, setIsScanningFile] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      stopScanning();
      setNeedsPermission(true); // Reset permission state when closed
      setError(null);
      setNotSupported(null);
      return;
    }

    // Don't auto-start - wait for permission grant
  }, [open]);

  const startScanning = async () => {
    try {
      setError(null);
      setNeedsPermission(false);
      setNotSupported(null);
      
      // Validate browser support and context
      const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
      const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;

      if (!hasMediaDevices) {
        setNotSupported('Camera API is not available in this browser/context.');
        return;
      }

      if (!isSecure) {
        setNotSupported('This page is not served over HTTPS. Camera access requires HTTPS.');
        return;
      }

      // First, explicitly request camera permission
      // This triggers the browser's permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Request back camera on mobile
      });
      
      // Stop the test stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      // Now initialize scanner with permission granted
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // Get cameras
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        throw new Error('No cameras found on this device');
      }

      // Prefer back camera on mobile
      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      const cameraId = backCamera?.id || devices[0].id;

      // Start scanning
      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success! Got a scan
          stopScanning();
          onScan(decodedText);
          onClose();
        },
        (errorMessage) => {
          // Scanning but no match yet - this is normal, ignore
        }
      );

      setIsScanning(true);
      setNeedsPermission(false);
    } catch (err) {
      console.error('Camera scanner error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to start camera';
      
      // Check if it's a permission error
      if (errorMsg.includes('Permission') || errorMsg.includes('NotAllowed') || errorMsg.includes('denied')) {
        setNeedsPermission(true);
        setError('Camera permission was denied. Please allow camera access in your browser settings and try again.');
      } else {
        setError(errorMsg);
      }
    }
  };

  const handleFileScan = async (file: File) => {
    try {
      setIsScanningFile(true);
      setError(null);
      // Lazily create a scanner instance if not present (required for scanFile)
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }
      const anyScanner: any = scannerRef.current as unknown as any;
      if (typeof anyScanner.scanFile === 'function') {
        const result = await anyScanner.scanFile(file, true);
        // Stop scanner if active
        await stopScanning();
        onScan(typeof result === 'string' ? result : String(result));
        onClose();
      } else {
        throw new Error('Image scanning is not supported in this environment.');
      }
    } catch (e) {
      console.error('Image scan error:', e);
      const msg = e instanceof Error ? e.message : 'Failed to scan image';
      setError(msg);
    } finally {
      setIsScanningFile(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && (scannerRef.current as any).isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
    scannerRef.current = null;
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={handleClose}
          className="flex items-center justify-center min-w-[48px] min-h-[48px] -ml-3"
          aria-label="Close camera"
        >
          <X className="h-7 w-7" />
        </button>
        <h1 className="text-lg font-heading font-semibold">Camera Scanner</h1>
        <div className="w-12" />
      </div>

      {/* Camera View */}
      <div className="flex flex-col items-center justify-center p-4 h-[calc(100vh-80px)]">
        {notSupported ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
            <div className="p-4 bg-amber-100 rounded-full">
              <AlertCircle className="w-12 h-12 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Camera Not Available Here</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {notSupported}
              </p>
              <ul className="text-sm text-muted-foreground mb-6 list-disc text-left pl-6 space-y-1">
                <li>Open this page over HTTPS (required for camera access).</li>
                <li>On iPhone, try Safari or Chrome outside in-app browsers.</li>
                <li>Ensure Camera is allowed in Site Settings for this domain.</li>
                <li>For local dev, use a secure tunnel (e.g., ngrok) or run with HTTPS.</li>
              </ul>
              <div className="flex flex-col gap-3">
                <label className="w-full">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileScan(f);
                    }}
                  />
                  <span className="inline-flex items-center justify-center w-full h-10 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer gap-2">
                    <ImageIcon className="w-4 h-4" /> Upload photo to scan
                  </span>
                </label>
                <Button onClick={handleClose} variant="ghost" className="w-full">
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : needsPermission ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <ShieldCheck className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Camera Permission Required</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Slabfy needs access to your camera to scan QR codes and barcodes. 
                Your camera will only be used for scanning — no photos are saved.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={startScanning} className="w-full">
                  Grant Camera Access
                </Button>
                <Button onClick={handleClose} variant="ghost" className="w-full">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
            <div className="p-4 bg-destructive/10 rounded-full">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Camera Error</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <div className="flex flex-col gap-3">
                <Button onClick={startScanning} variant="outline">
                  Try Again
                </Button>
                <label className="w-full">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileScan(f);
                    }}
                  />
                  <span className="inline-flex items-center justify-center w-full h-10 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer gap-2">
                    <ImageIcon className="w-4 h-4" /> Upload photo to scan
                  </span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-4">
            {/* Scanner Container */}
            <div 
              id="qr-reader" 
              className="rounded-2xl overflow-hidden shadow-elevated"
            />
            
            {/* Instructions */}
            <div className="text-center space-y-2 pt-4">
              <div className="flex justify-center mb-2">
                <Camera className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Point camera at the code</p>
              <p className="text-xs text-muted-foreground">
                Scans PSA QR codes and barcodes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

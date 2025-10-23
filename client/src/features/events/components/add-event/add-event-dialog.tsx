// 🤖 INTERNAL NOTE:
// Purpose: Simplified full-screen dialog for creating new events
// Exports: AddEventDialog component
// Feature: events
// Dependencies: React state management, date formatting

import { useState, useEffect, useRef } from "react";
import { X, MapPin, Upload } from "lucide-react";
import { useCreateEvent } from "../../hooks/use-events";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEventDialog({ open, onOpenChange }: AddEventDialogProps) {
  // State for form data
  const [formData, setFormData] = useState({
    eventName: '',
    startDate: '',
    endDate: '',
    location: '',
    description: '',
  });

  // State for logo upload
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Refs for focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const createEvent = useCreateEvent();
  const { user } = useAuth();
  const { toast } = useToast();

  // Effect to manage focus when dialog opens
  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  // Handle changes for standard input fields
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle logo file selection
  const handleLogoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    // Client-side validation before storing file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({ 
        title: 'File too large', 
        description: 'Please select an image smaller than 5MB.', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ 
        title: 'Invalid file type', 
        description: 'Please select a JPEG, PNG, GIF, or WebP image.', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Store the file and create preview - upload happens on create
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  // Handle form save
  const handleSave = async () => {
    if (!user?.id) return;
    
    setUploading(true);
    const fileSizeThreshold = 1024 * 1024; // 1MB threshold
    
    try {
      // Hybrid approach based on file size
      if (logoFile && logoFile.size <= fileSizeThreshold) {
        // Small file: Upload synchronously (fast enough for good UX)
        const { data: { session } } = await (window as any).supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) {
          throw new Error('Authentication required');
        }

        const uploadFormData = new FormData();
        uploadFormData.append('image', logoFile);
        const res = await fetch(`/api/user/${user.id}/event-logo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: uploadFormData,
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errorData.error || 'Logo upload failed');
        }
        const json = await res.json();
        
        // Create event with uploaded logo
        const submitData = {
          name: formData.eventName,
          dateStart: formData.startDate,
          dateEnd: formData.endDate || null,
          location: formData.location || null,
          description: formData.description || null,
          logoUrl: json.imageUrl,
          isCustom: true,
          status: "upcoming" as const,
        };

        createEvent.mutate(submitData, {
          onSuccess: () => {
            handleClose();
            onOpenChange(false);
          },
          onError: (error) => {
            toast({ 
              title: 'Failed to create event', 
              description: error.message || 'Please try again.',
              variant: 'destructive' 
            });
          }
        });
      } else {
        // Large file or no file: Create event immediately, upload async
        const submitData = {
          name: formData.eventName,
          dateStart: formData.startDate,
          dateEnd: formData.endDate || null,
          location: formData.location || null,
          description: formData.description || null,
          logoUrl: null, // Will be updated after async upload
          isCustom: true,
          status: "upcoming" as const,
        };

        createEvent.mutate(submitData, {
          onSuccess: (newEvent) => {
            handleClose();
            onOpenChange(false);
            
            // If there's a large file, upload it in the background
            if (logoFile) {
              uploadLogoAsync(newEvent.id, logoFile);
            }
          },
          onError: (error) => {
            toast({ 
              title: 'Failed to create event', 
              description: error.message || 'Please try again.',
              variant: 'destructive' 
            });
          }
        });
      }
    } catch (e: any) {
      toast({ 
        title: 'Upload failed', 
        description: e.message || 'Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
    }
  };

  const uploadLogoAsync = async (eventId: string, file: File) => {
    try {
      const { data: { session } } = await (window as any).supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token || !user?.id) return;

      const uploadFormData = new FormData();
      uploadFormData.append('image', file);
      const res = await fetch(`/api/user/${user.id}/event-logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      });
      
      if (res.ok) {
        const json = await res.json();
        // Update the event with the logo URL
        await fetch(`/api/events/${eventId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logoUrl: json.imageUrl }),
        });
      }
    } catch (error) {
      console.warn('Background logo upload failed:', error);
      // Silent failure - event still exists without logo
    }
  };

  // Handle close
  const handleClose = () => {
    setFormData({
      eventName: '',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
    });
    setLogoPreview(null);
    setLogoFile(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      ref={dialogRef}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <Button
          onClick={() => onOpenChange(false)}
          variant="ghost"
          size="icon"
          aria-label="Close dialog"
          ref={closeButtonRef}
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </Button>

        <Button
          size="lg"
          onClick={handleSave}
          disabled={!formData.eventName || !formData.startDate || createEvent.isPending}
        >
          {createEvent.isPending ? "Saving..." : "Save & Continue"}
        </Button>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
        <div className="w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Title */}
          <h1 id="dialog-title" className="text-2xl font-semibold text-foreground mb-6 sm:mb-8">
            Add New Show
          </h1>

          {/* Event Details Section */}
          <section className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
            {/* Event Name */}
            <div>
              <label htmlFor="eventName" className="block text-sm font-medium text-foreground mb-2">
                Show Name
              </label>
              <Input
                id="eventName"
                type="text"
                placeholder="e.g., Front Row Sports Card Show"
                value={formData.eventName}
                onChange={(e) => handleInputChange('eventName', e.target.value)}
                size="lg"
              />
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-foreground mb-2">
                Start Date
              </label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  size="lg"
                  className=""
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-foreground mb-2">
                End Date (Optional)
              </label>
              <div className="relative">
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  size="lg"
                  className=""
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-foreground mb-2">
                Location
              </label>
              <div className="relative">
                <Input
                  id="location"
                  type="text"
                  placeholder="e.g., Los Angeles Convention Center"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  size="lg"
                  className="pr-10"
                />
                <MapPin
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                Description (optional)
              </label>
              <Textarea
                id="description"
                placeholder="Add any additional notes or details about the event..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Logo (optional)</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-lg border border-border bg-secondary/5 overflow-hidden flex items-center justify-center">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span
                      className="text-3xl font-semibold text-muted-foreground select-none"
                      aria-label={`Placeholder for ${formData.eventName || 'event'}`}
                    >
                      {(formData.eventName?.trim()?.charAt(0)?.toUpperCase() || 'E')}
                    </span>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoSelect(e.target.files)} />
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{uploading ? 'Uploading…' : 'Upload Logo'}</span>
                </label>
              </div>
            </div>
          </section>

          {/* Bottom spacing */}
          <div className="h-16"></div>
        </div>
      </div>
    </div>
  );
}

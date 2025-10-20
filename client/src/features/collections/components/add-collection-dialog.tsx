// Purpose: Full-screen dialog to create a new collection following add-consignment-dialog UI
// Feature: collections
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertCollectionSchema, type InsertCollection } from '@shared/schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateCollection } from '@/features/collections/hooks/use-collections';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface AddCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCollectionDialog({ open, onOpenChange }: AddCollectionDialogProps) {
  const createCollection = useCreateCollection();
  const { user } = useAuth();
  const { toast } = useToast();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const schema = insertCollectionSchema.extend({
    name: insertCollectionSchema.shape.name.min(1, 'Collection name is required'),
  });

  const form = useForm<InsertCollection & { thumbnailUrl?: string | null }>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', color: '#3B82F6', isPublic: false, tags: [], thumbnailUrl: null } as any,
  });

  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  // Prevent background scroll and ensure portal overlay isn't constrained
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const handleClose = () => {
    form.reset({ name: '', description: '', color: '#3B82F6', isPublic: false, tags: [], thumbnailUrl: null } as any);
    setThumbnailPreview(null);
    setThumbnailFile(null);
    onOpenChange(false);
  };

  const handleThumbnailSelect = async (files: FileList | null) => {
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
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const onCreate = async (data: InsertCollection & { thumbnailUrl?: string | null }) => {
    if (!user?.id) return;
    
    setUploading(true);
    const fileSizeThreshold = 1024 * 1024; // 1MB threshold
    
    try {
      // Hybrid approach based on file size
      if (thumbnailFile && thumbnailFile.size <= fileSizeThreshold) {
        // Small file: Upload synchronously (fast enough for good UX)
        const { data: { session } } = await (window as any).supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) {
          throw new Error('Authentication required');
        }

        const formData = new FormData();
        formData.append('image', thumbnailFile);
        const res = await fetch(`/api/user/${user.id}/collection-thumbnail`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errorData.error || 'Thumbnail upload failed');
        }
        const json = await res.json();
        
        // Create collection with uploaded thumbnail
        createCollection.mutate({ 
          ...(data as any), 
          userId: user.id,
          thumbnailUrl: json.imageUrl 
        }, {
          onSuccess: () => {
            handleClose();
          },
          onError: (error) => {
            toast({ 
              title: 'Failed to create collection', 
              description: error.message || 'Please try again.',
              variant: 'destructive' 
            });
          }
        });
      } else {
        // Large file or no file: Create collection immediately, upload async
        createCollection.mutate({ 
          ...(data as any), 
          userId: user.id,
          thumbnailUrl: null // Will be updated after async upload
        }, {
          onSuccess: (newCollection) => {
            handleClose();
            
            // If there's a large file, upload it in the background
            if (thumbnailFile) {
              uploadThumbnailAsync(newCollection.id, thumbnailFile);
            }
          },
          onError: (error) => {
            toast({ 
              title: 'Failed to create collection', 
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

  const uploadThumbnailAsync = async (collectionId: string, file: File) => {
    try {
      const { data: { session } } = await (window as any).supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token || !user?.id) return;

      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`/api/user/${user.id}/collection-thumbnail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (res.ok) {
        const json = await res.json();
        // Update the collection with the thumbnail URL
        await fetch(`/api/collections/${collectionId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ thumbnailUrl: json.imageUrl }),
        });
        
        // Refresh collections list to show the new thumbnail
        queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      }
    } catch (error) {
      console.warn('Background thumbnail upload failed:', error);
      // Silent failure - collection still exists without thumbnail
    }
  };

  if (!open) return null;

  return createPortal((
    <div className="fixed inset-0 z-[105] bg-background text-foreground" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <Button
          onClick={handleClose}
          variant="ghost"
          size="icon"
          aria-label="Close dialog"
          ref={closeButtonRef}
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </Button>

        <Button
          size="lg"
          onClick={form.handleSubmit(onCreate)}
          disabled={createCollection.isPending}
        >
          {createCollection.isPending ? 'Creating...' : 'Create Collection'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
        <div className="w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="text-2xl font-semibold font-heading text-foreground mb-6 sm:mb-8">New Collection</h1>

          {/* Name */}
          <section className="mb-6 sm:mb-8">
            <Form {...form}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter collection name" size="lg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} className="resize-none" placeholder="Describe your collection" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Thumbnail */}
                <div className="space-y-2">
                  <FormLabel>Thumbnail (optional)</FormLabel>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center">
                      {thumbnailPreview || form.getValues('thumbnailUrl' as any) ? (
                        <img src={(thumbnailPreview || (form.getValues('thumbnailUrl' as any) || '')) as string} alt="Thumbnail" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">No Image</span>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleThumbnailSelect(e.target.files)} />
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">{uploading ? 'Uploading…' : 'Upload Thumbnail'}</span>
                    </label>
                  </div>
                </div>

                {/* Color & Visibility */}
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Input type="color" className="w-16 h-10 p-1 rounded" {...field} value={field.value || '#3B82F6'} />
                          <Input placeholder="#3B82F6" className="flex-1" size="lg" {...field} value={field.value || ''} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Make Public</FormLabel>
                      <FormControl>
                        <input type="checkbox" className="w-4 h-4" checked={field.value || false} onChange={(e) => field.onChange(e.target.checked)} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </section>
        </div>
      </div>
    </div>
  ), document.body);
}

export default AddCollectionDialog;

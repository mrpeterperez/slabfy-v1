import React, { useState, useCallback } from 'react';
import { X, Plus, Upload, GripVertical } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { compressImage, createPreviewUrl, isValidImageFile, getOptimalFormat } from '@/lib/image-utils';

interface AssetImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

interface UploadingImage {
  id: string;
  file: File;
  previewUrl: string;
  uploading: boolean;
}

export const AssetImageUpload = ({ 
  images = [], 
  onChange, 
  maxImages = 10 
}: AssetImageUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || !user?.id) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxImages - images.length - uploadingImages.length;
    
    if (fileArray.length > remainingSlots) {
      toast({
        title: "Too many images",
        description: `You can only add ${remainingSlots} more image(s).`,
        variant: "destructive",
      });
      return;
    }

    for (const file of fileArray) {
      if (!isValidImageFile(file)) {
        toast({
          title: "Invalid file",
          description: `${file.name} is not a valid image file.`,
          variant: "destructive",
        });
        continue;
      }

      console.log(`Asset image selected: ${file.name}, size: ${Math.round(file.size / 1024)}KB`);

      try {
        // Optimize image
        const optimizedFile = await compressImage(file, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.85,
          format: getOptimalFormat(file)
        });

        console.log(`Image optimized: ${Math.round(file.size / 1024)}KB → ${Math.round(optimizedFile.size / 1024)}KB`);

        const uploadingImage: UploadingImage = {
          id: `temp-${Date.now()}-${Math.random()}`,
          file: optimizedFile,
          previewUrl: createPreviewUrl(optimizedFile),
          uploading: true
        };

        // Add to uploading state
        setUploadingImages(prev => [...prev, uploadingImage]);

        // Upload in background
        uploadImage(uploadingImage);

      } catch (error) {
        console.error('Image optimization failed:', error);
        toast({
          title: "Image processing failed",
          description: `Failed to process ${file.name}. Please try again.`,
          variant: "destructive",
        });
      }
    }
  }, [user?.id, images.length, uploadingImages.length, maxImages, toast]);

  // Helper to get auth headers
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!(window as any).supabase) {
      console.warn('Supabase client not available on window');
      return {};
    }
    
    try {
      const { data: { session }, error } = await (window as any).supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting auth session:', error);
        return {};
      }
      
      if (!session) {
        console.warn('No active auth session found');
        return {};
      }
      
      console.log('Auth session found, user:', session.user?.email);
      return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
    } catch (error) {
      console.error('Failed to get auth headers:', error);
      return {};
    }
  };

  // Upload individual image
  const uploadImage = async (uploadingImage: UploadingImage) => {
    try {
      console.log(`Starting asset image upload for user ${user?.id}, file size: ${Math.round(uploadingImage.file.size / 1024)}KB`);

      const formData = new FormData();
      formData.append('image', uploadingImage.file);

      console.log('Sending asset image upload request...');
      
      const authHeaders = await getAuthHeaders();
      console.log('Auth headers prepared:', Object.keys(authHeaders));
      
      const response = await fetch(`/api/user/${user?.id}/asset-images`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload response error text:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Asset image upload completed successfully, result:', result);

      // Verify the image URL is valid
      if (!result.imageUrl) {
        throw new Error('No image URL returned from server');
      }

      console.log('Verifying uploaded image URL:', result.imageUrl);
      
      // Test if the uploaded image is accessible
      try {
        const testResponse = await fetch(result.imageUrl, { method: 'HEAD' });
        if (!testResponse.ok) {
          console.warn(`Uploaded image not immediately accessible: ${testResponse.status}`);
        } else {
          console.log('✅ Uploaded image verified and accessible');
        }
      } catch (verifyError) {
        console.warn('Could not verify uploaded image accessibility:', verifyError);
        // Don't fail the upload for verification issues
      }

      // Add to final images array
      onChange([...images, result.imageUrl]);

      // Remove from uploading state
      setUploadingImages(prev => prev.filter(img => img.id !== uploadingImage.id));

      toast({
        title: "Image uploaded",
        description: `Image uploaded successfully (${Math.round(uploadingImage.file.size / 1024)}KB)`,
      });

    } catch (error) {
      console.error('Asset image upload failed:', error);
      
      // Remove from uploading state
      setUploadingImages(prev => prev.filter(img => img.id !== uploadingImage.id));
      
      toast({
        title: "Upload failed",
        description: `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Handle drag and drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    
    onChange(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Remove image
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  // Remove uploading image
  const removeUploadingImage = (id: string) => {
    setUploadingImages(prev => prev.filter(img => img.id !== id));
  };

  const totalImages = images.length + uploadingImages.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Asset Images</h4>
        <span className="text-xs text-muted-foreground">
          {totalImages}/{maxImages} images
        </span>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {/* Existing Images */}
        {images.map((imageUrl, index) => (
          <div
            key={`existing-${index}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className="relative group aspect-square border border-border rounded-lg overflow-hidden bg-muted cursor-move"
          >
            <img
              src={imageUrl}
              alt={`Asset ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 p-1 bg-black/50 rounded text-white">
              <GripVertical className="w-3 h-3" />
            </div>
            <button
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs">
              {index + 1}
            </div>
          </div>
        ))}

        {/* Uploading Images */}
        {uploadingImages.map((uploadingImage) => (
          <div
            key={uploadingImage.id}
            className="relative group aspect-square border border-border rounded-lg overflow-hidden bg-muted"
          >
            <img
              src={uploadingImage.previewUrl}
              alt="Uploading..."
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-foreground">Uploading...</span>
              </div>
            </div>
            <button
              onClick={() => removeUploadingImage(uploadingImage.id)}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Add New Image Button */}
        {totalImages < maxImages && (
          <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <Plus className="w-6 h-6 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground text-center px-2">
              Add Image
            </span>
          </label>
        )}
      </div>

      {/* Drop Zone for Drag & Drop */}
      <div
        onDrop={(e) => {
          e.preventDefault();
          handleFileSelect(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary hover:bg-muted/50 transition-colors"
      >
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-1">
          Drag and drop images here, or click "Add Image" above
        </p>
        <p className="text-xs text-muted-foreground">
          Supports JPG, PNG, WebP • Max {maxImages} images • Auto-optimized for web
        </p>
      </div>
    </div>
  );
};
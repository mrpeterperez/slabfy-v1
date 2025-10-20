// 🤖 INTERNAL NOTE:
// Purpose: Settings section for collection management page with inline editing
// Exports: SettingsSection component
// Feature: collections
// Dependencies: @/components/ui, ../../hooks/use-collections

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { useUpdateCollection } from '../../hooks/use-collections';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';

interface SettingsSectionProps {
  collection: any; // TODO: proper type from schema
}

export function SettingsSection({ collection }: SettingsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(collection.name || '');
  const [editedDescription, setEditedDescription] = useState(collection.description || '');
  const [editedColor, setEditedColor] = useState(collection.color || '#3B82F6');
  const updateCollection = useUpdateCollection();
  const { user } = useAuth();
  const { toast } = useToast();

  // thumbnail state
  const [thumbPreview, setThumbPreview] = useState<string | null>(collection.thumbnailUrl || collection.coverImageUrl || null);
  const [thumbUploading, setThumbUploading] = useState(false);
  const [isEditingThumb, setIsEditingThumb] = useState(false);
  const [thumbDirty, setThumbDirty] = useState(false);
  const [originalThumb, setOriginalThumb] = useState<string | null>(collection.thumbnailUrl || collection.coverImageUrl || null);

  const handleStartEditing = () => {
    setIsEditing(true);
    setEditedName(collection.name || '');
    setEditedDescription(collection.description || '');
    setEditedColor(collection.color || '#3B82F6');
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditedName(collection.name || '');
    setEditedDescription(collection.description || '');
    setEditedColor(collection.color || '#3B82F6');
  };

  const handleSaveChanges = () => {
    updateCollection.mutate({
      id: collection.id,
      data: {
        name: editedName,
        description: editedDescription,
        color: editedColor,
      }
    }, {
      onSuccess: () => {
        setIsEditing(false);
      }
    });
  };

  const handleTogglePublic = (checked: boolean) => {
    updateCollection.mutate({
      id: collection.id,
      data: { isPublic: checked }
    }, {
      onError: () => {
        toast({ 
          title: 'Failed to update privacy', 
          description: 'Please try again', 
          variant: 'destructive' 
        });
      }
    });
  };

  const handleSelectThumbnail = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }
    
    setThumbUploading(true);
    try {
      const { data: { session } } = await (window as any).supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !user?.id) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`/api/user/${user.id}/collection-thumbnail`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  const url = json.imageUrl as string;
  setThumbPreview(url);
  setThumbDirty(true); // mark unsaved; persist only when Save is clicked
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message || 'Please try again', variant: 'destructive' });
    } finally {
      setThumbUploading(false);
    }
  };

  const handleRemoveThumbnail = async () => {
    setThumbPreview(null);
    setThumbDirty(true); // defer persistence to explicit Save
  };

  const handleStartThumbEditing = () => {
    // Snapshot current image so we can restore on cancel
    setOriginalThumb(thumbPreview ?? collection.thumbnailUrl ?? collection.coverImageUrl ?? null);
    setThumbDirty(false);
    setIsEditingThumb(true);
  };

  const handleCancelThumbEditing = () => {
    // Restore to original without saving
    setThumbPreview(originalThumb ?? null);
    setThumbDirty(false);
    setIsEditingThumb(false);
  };

  const handleSaveThumbChanges = () => {
    if (!thumbDirty) {
      setIsEditingThumb(false);
      return;
    }
    updateCollection.mutate(
      { id: collection.id, data: { coverImageUrl: (thumbPreview as string) ?? null } as any },
      {
        onSuccess: () => {
          setOriginalThumb(thumbPreview ?? null);
          setThumbDirty(false);
          setIsEditingThumb(false);
        },
      }
    );
  };

  return (
    <div className="flex-1 min-w-0 w-full max-w-full">
      {/* Toolbar Header */}
      <div className="hidden lg:block border-b border-border px-8 py-4 min-h-[58px] flex items-center">
        <div className="flex items-center justify-between gap-4 w-full">
          <h2 className="font-heading text-lg font-semibold text-foreground">Settings</h2>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">

      {/* Thumbnail Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Cover Image</h3>
            <p className="text-sm text-muted-foreground">Upload a cover image for your collection</p>
          </div>
          {!isEditingThumb ? (
            <Button variant="outline" size="sm" onClick={handleStartThumbEditing}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelThumbEditing}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSaveThumbChanges}
                disabled={thumbUploading || !thumbDirty}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                {thumbPreview ? (
                  <img src={thumbPreview} alt="Collection cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground">No image</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 space-y-4">
                {isEditingThumb ? (
                  <div className="space-y-3">
                    {!thumbPreview && (
                      <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleSelectThumbnail(e.target.files)} 
                          disabled={thumbUploading}
                        />
                        <span className="text-sm font-medium">
                          {thumbUploading ? 'Uploading...' : 'Upload Image'}
                        </span>
                      </label>
                    )}
                    {thumbPreview && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                        onClick={handleRemoveThumbnail}
                      >
                        Remove Image
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      {thumbPreview ? 'Cover image uploaded' : 'No cover image set'}
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Recommended: 16:9 aspect ratio • JPG, PNG, or WebP • Max 5MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Clean Separator */}
      <div className="h-px bg-border w-full" />

      {/* Basic Information */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <p className="text-sm text-muted-foreground">Edit your collection name, description, and color</p>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={handleStartEditing}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelEditing}>Cancel</Button>
              <Button 
                size="sm" 
                onClick={handleSaveChanges}
                disabled={updateCollection.isPending}
              >
                {updateCollection.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Collection Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Collection Name</label>
              {isEditing ? (
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter collection name"
                  className="max-w-md"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{collection.name || 'Untitled Collection'}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              {isEditing ? (
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Enter collection description (optional)"
                  className="max-w-md"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {collection.description || 'No description added'}
                </p>
              )}
            </div>

            {/* Collection Color */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Collection Color</label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full border shadow-sm" 
                  style={{ backgroundColor: isEditing ? editedColor : (collection.color || '#3B82F6') }}
                />
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={editedColor}
                      onChange={(e) => setEditedColor(e.target.value)}
                      className="w-20 h-9 p-1 border rounded cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{editedColor}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {collection.color || '#3B82F6'}
                  </span>
                )}
              </div>
            </div>

            {/* Created Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Created</label>
              <p className="text-sm text-muted-foreground">
                {collection.createdAt ? new Date(collection.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Clean Separator */}
      <div className="h-px bg-border w-full" />

  {/* Privacy Settings */}
      <section>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Privacy</h3>
          <p className="text-sm text-muted-foreground">Control who can view your collection</p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
        <p className="font-medium">Public</p>
        <p className="text-sm text-muted-foreground">When on, anyone can view this collection</p>
              </div>
              <Switch
        checked={collection.isPublic}
        onCheckedChange={(checked) => handleTogglePublic(checked)}
                disabled={updateCollection.isPending}
              />
            </div>
          </CardContent>
        </Card>
      </section>
      </div>
    </div>
  );
}
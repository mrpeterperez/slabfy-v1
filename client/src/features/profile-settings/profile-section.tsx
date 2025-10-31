import { useState, useEffect } from "react";
import { api } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, X, Check, Trash2 } from "lucide-react";
import { compressImage, createPreviewUrl, isValidImageFile, getOptimalFormat } from "@/lib/image-utils";

import type { User } from "@/lib/supabase";

type ProfileSectionProps = {
  user: User;
};

export function ProfileSection({ user }: ProfileSectionProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [optimisticAvatarUrl, setOptimisticAvatarUrl] = useState<string | null>(null);
  const [pendingAvatarDeletion, setPendingAvatarDeletion] = useState(false);
  
  // Update local state when user prop changes
  useEffect(() => {
    setName(user?.name || "");
    setBio(user?.bio || "");
    // Reset preview when user data changes
    if (previewUrl && !avatarFile) {
      setPreviewUrl(null);
    }
    // Reset pending deletion flag when not editing
    if (!isEditing) {
      setPendingAvatarDeletion(false);
    }
  }, [user?.name, user?.bio, user?.avatarUrl, avatarFile, previewUrl, isEditing]);

  // Generate fallback initials for avatar
  const getInitials = () => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`Avatar selected: ${file.name}, size: ${Math.round(file.size / 1024)}KB`);

    // Validate file type
    if (!isValidImageFile(file)) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.).",
        variant: "destructive",
      });
      return;
    }

    try {
      // Optimize image first (industry standard)
      const optimizedFile = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        format: getOptimalFormat(file)
      });

      console.log(`Image optimized: ${Math.round(file.size / 1024)}KB → ${Math.round(optimizedFile.size / 1024)}KB`);
      
      // Show preview of optimized image
      setPreviewUrl(createPreviewUrl(optimizedFile));
      setAvatarFile(optimizedFile);
    } catch (error) {
      console.error('Image optimization failed:', error);
      // Fallback to original file if optimization fails
      setPreviewUrl(createPreviewUrl(file));
      setAvatarFile(file);
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Large file warning",
          description: "Upload may be slower due to file size. Consider using a smaller image.",
          variant: "destructive",
        });
      }
    }
  };

  const { refreshUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.id) return;

    setIsSubmitting(true);
    
    try {
      // Handle avatar deletion first (if marked for deletion)
      if (pendingAvatarDeletion) {
        try {
          await api.profile.deleteAvatar(user.id);
          setPendingAvatarDeletion(false);
          toast({
            title: "Avatar deleted",
            description: "Your avatar has been successfully removed.",
          });
        } catch (deleteError) {
          console.error("Avatar deletion failed:", deleteError);
          const message = deleteError instanceof Error ? deleteError.message : 'Deletion failed';
          toast({
            title: "Avatar deletion failed",
            description: `Avatar could not be deleted: ${message}`,
            variant: "destructive",
          });
          throw deleteError; // Stop the submission if deletion fails
        }
      }
      // Handle avatar upload with optimistic UI (modern UX pattern)
      else if (avatarFile) {
        // Show optimistic UI immediately
        setOptimisticAvatarUrl(previewUrl);
        setIsUploadingAvatar(true);
        
        try {
          // Upload avatar in background
          await api.profile.uploadAvatar(user.id, avatarFile);
          
          // Clear optimistic state on success
          setOptimisticAvatarUrl(null);
          setAvatarFile(null);
          setPreviewUrl(null);
          
          toast({
            title: "Avatar updated",
            description: `Profile picture updated (${Math.round(avatarFile.size / 1024)}KB uploaded).`,
          });
        } catch (avatarError) {
          // Revert optimistic UI on avatar upload failure
          setOptimisticAvatarUrl(null);
          console.error("Avatar upload failed:", avatarError);
          const message = avatarError instanceof Error ? avatarError.message : 'Upload failed';
          toast({
            title: "Avatar upload failed",
            description: `Avatar could not be uploaded: ${message}`,
            variant: "destructive",
          });
        } finally {
          setIsUploadingAvatar(false);
        }
      }
      
      // Update name and bio (separate from avatar for better UX)
      if (name !== user.name || bio !== user.bio) {
        await api.profile.updateProfile(user.id, { name, bio });
        toast({
          title: "Profile updated",
          description: "Your profile information has been updated.",
        });
      }

      // Refresh user data to sync everything
      await refreshUser(user.id);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form values
    setName(user?.name || "");
    setBio(user?.bio || "");
    setPreviewUrl(null);
    setAvatarFile(null);
    setOptimisticAvatarUrl(null);
    setPendingAvatarDeletion(false);
    setIsEditing(false);
  };

  const handleRemoveAvatar = () => {
    // Mark avatar for deletion (will be executed on save)
    setPendingAvatarDeletion(true);
    setPreviewUrl(null);
    setAvatarFile(null);
  };

  return (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </div>
        {!isEditing && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {isEditing ? (
          <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {(optimisticAvatarUrl || previewUrl || (user.avatarUrl && !pendingAvatarDeletion)) ? (
                    <AvatarImage src={optimisticAvatarUrl || previewUrl || user.avatarUrl} />
                  ) : null}
                  <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                </Avatar>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="avatar" className="cursor-pointer">
                  <div className="rounded-md bg-muted px-3 py-2 text-sm text-center hover:bg-muted/80">
                    {(previewUrl || (user.avatarUrl && !pendingAvatarDeletion)) ? 'Change Avatar' : 'Add Avatar'}
                  </div>
                  <Input 
                    id="avatar" 
                    type="file" 
                    accept="image/*" 
                    className="sr-only" 
                    onChange={handleAvatarChange}
                  />
                </Label>
                {(previewUrl || (user.avatarUrl && !pendingAvatarDeletion)) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleRemoveAvatar}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Avatar
                  </Button>
                )}
                {pendingAvatarDeletion && (
                  <p className="text-xs text-muted-foreground text-center">
                    Avatar will be deleted when you save changes
                  </p>
                )}

              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                rows={4}
              />
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Avatar className="h-24 w-24">
                {(optimisticAvatarUrl || user.avatarUrl) ? (
                  <AvatarImage src={optimisticAvatarUrl || user.avatarUrl} />
                ) : null}
                <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{user.name || "No display name set"}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Bio</h4>
              <p className="text-sm">{user.bio || "No bio provided yet."}</p>
            </div>
          </div>
        )}
      </CardContent>
      
      {isEditing && (
        <CardFooter className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            type="button" 
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            form="profile-form" 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              "Saving..."
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
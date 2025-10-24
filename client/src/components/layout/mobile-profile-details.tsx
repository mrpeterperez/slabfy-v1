// Mobile Profile Details Page
// Beautiful mobile layout reusing existing ProfileSection logic

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/supabase";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Trash2 } from "lucide-react";
import { compressImage, createPreviewUrl, isValidImageFile, getOptimalFormat } from "@/lib/image-utils";

interface MobileProfileDetailsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileProfileDetails({ isOpen, onClose }: MobileProfileDetailsProps) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [optimisticAvatarUrl, setOptimisticAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
    }
  }, [user]);

  const getInitials = () => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.).",
        variant: "destructive",
      });
      return;
    }

    try {
      const optimizedFile = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        format: getOptimalFormat(file)
      });

      setPreviewUrl(createPreviewUrl(optimizedFile));
      setAvatarFile(optimizedFile);
    } catch (error) {
      console.error('Image optimization failed:', error);
      setPreviewUrl(createPreviewUrl(file));
      setAvatarFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSubmitting(true);

    try {
      if (avatarFile) {
        setOptimisticAvatarUrl(previewUrl);
        setIsUploadingAvatar(true);

        try {
          await api.profile.uploadAvatar(user.id, avatarFile);
          setOptimisticAvatarUrl(null);
          setAvatarFile(null);
          setPreviewUrl(null);

          toast({
            title: "Avatar updated",
            description: "Profile picture updated successfully.",
          });
        } catch (avatarError) {
          setOptimisticAvatarUrl(null);
          console.error("Avatar upload failed:", avatarError);
          toast({
            title: "Avatar upload failed",
            description: "Could not upload avatar. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      if (name !== user.name || bio !== user.bio) {
        await api.profile.updateProfile(user.id, { name, bio });
        toast({
          title: "Profile updated",
          description: "Your profile has been updated.",
        });
      }

      await refreshUser(user.id);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setBio(user?.bio || "");
    setPreviewUrl(null);
    setAvatarFile(null);
    setOptimisticAvatarUrl(null);
    setIsEditing(false);
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;

    try {
      await api.profile.deleteAvatar(user.id);
      setPreviewUrl(null);
      setAvatarFile(null);
      setOptimisticAvatarUrl(null);
      await refreshUser(user.id);

      toast({
        title: "Avatar deleted",
        description: "Your avatar has been removed.",
      });
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast({
        title: "Error",
        description: "Failed to delete avatar. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-[60] bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 px-5">
        <div className="flex h-16 items-center">
          <button
            onClick={onClose}
            className="flex items-center justify-center min-w-[48px] min-h-[48px] -ml-3"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-3 pb-8">
        <h1 className="text-[34px] font-heading font-semibold mb-8">
          Profile Details
        </h1>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="pb-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium">Avatar</h2>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-sm text-foreground hover:text-foreground/80 transition-colors underline"
                >
                  Cancel
                </button>
              </div>
              <div className="flex items-start gap-4">
                <Avatar className="h-24 w-24 flex-shrink-0">
                  {(optimisticAvatarUrl || previewUrl || user.avatarUrl) ? (
                    <AvatarImage src={optimisticAvatarUrl || previewUrl || user.avatarUrl} />
                  ) : null}
                  <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <div className="rounded-md bg-muted px-4 py-3 text-sm text-center hover:bg-muted/80 transition-colors">
                      {(previewUrl || user.avatarUrl) ? 'Change Avatar' : 'Add Avatar'}
                    </div>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarChange}
                    />
                  </Label>

                  {(previewUrl || user.avatarUrl) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="w-full rounded-md px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Avatar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div className="pb-6 border-b">
              <Label htmlFor="name" className="text-base font-medium mb-4 block">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
                className="text-base"
              />
            </div>

            {/* Bio */}
            <div className="pb-6">
              <Label htmlFor="bio" className="text-base font-medium mb-4 block">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                rows={4}
                className="text-base resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Avatar Display */}
            <div className="pb-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium">Avatar</h2>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-foreground hover:text-foreground/80 transition-colors"
                >
                  Edit
                </button>
              </div>
              <Avatar className="h-24 w-24">
                {(optimisticAvatarUrl || user.avatarUrl) ? (
                  <AvatarImage src={optimisticAvatarUrl || user.avatarUrl} />
                ) : null}
                <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
            </div>

            {/* Display Name */}
            <div className="pb-6 border-b">
              <h2 className="text-base font-medium mb-4">Display Name</h2>
              <p className="text-base">{user.name || "No display name set"}</p>
            </div>

            {/* Bio */}
            <div className="pb-6">
              <h2 className="text-base font-medium mb-4">Bio</h2>
              <p className="text-base text-muted-foreground">
                {user.bio || "No bio yet"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

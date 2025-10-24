// Mobile Personalization Page
// Beautiful mobile layout reusing existing PersonalizationSection logic

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { collectionOptions } from "@shared/schema";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobilePersonalizationPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Device", icon: Monitor },
];

export function MobilePersonalizationPage({ isOpen, onClose }: MobilePersonalizationPageProps) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(user?.collections || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedCollections(user.collections || []);
    }
  }, [user?.collections]);

  const handleToggleCollection = (collection: string) => {
    if (!isEditing) return;
    
    setSelectedCollections(prev => {
      if (prev.includes(collection)) {
        return prev.filter(c => c !== collection);
      }
      return [...prev, collection];
    });
  };

  const hasCollectionChanges = () => {
    if (!user?.collections) return selectedCollections.length > 0;
    if (selectedCollections.length !== user.collections.length) return true;
    return !selectedCollections.every(c => user.collections?.includes(c));
  };

  const handleSaveCollections = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      await api.onboarding.saveCollections(user.id, selectedCollections);
      await refreshUser(user.id);
      
      toast({
        title: "Preferences saved",
        description: "Your collection preferences have been updated."
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving collections:", error);
      toast({
        title: "Error",
        description: "Could not save your collection preferences",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedCollections(user?.collections || []);
    setIsEditing(false);
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
          Personalization
        </h1>

        {/* Appearance Section */}
        <div className="pb-6 border-b">
          <h2 className="text-base font-medium mb-4">Appearance</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Choose how Slabfy looks to you.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Collection Preferences */}
        <div className="pt-6">
          {isEditing ? (
            <div className="space-y-6">
              <div className="pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium">Collection Preferences</h2>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-sm text-foreground hover:text-foreground/80 transition-colors underline"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Select the card types you collect
                </p>

                <div className="flex flex-wrap gap-2">
                  {collectionOptions.map((collection) => (
                    <button
                      key={collection}
                      type="button"
                      onClick={() => handleToggleCollection(collection)}
                      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                        selectedCollections.includes(collection)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {collection}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveCollections}
                  disabled={isSaving || !hasCollectionChanges()}
                  className="flex-1"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium">Collection Preferences</h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-foreground hover:text-foreground/80 transition-colors"
                  >
                    Edit
                  </button>
                </div>

                {user.collections && user.collections.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.collections.map(collection => (
                      <span 
                        key={collection}
                        className="px-3 py-1.5 rounded-md text-sm bg-secondary text-secondary-foreground"
                      >
                        {collection}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No collection preferences set</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

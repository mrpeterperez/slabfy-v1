import { useState, useEffect } from "react";
import { api } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { collectionOptions } from "@shared/schema";
import { Check, Pencil, X } from "lucide-react";

import type { User } from "@/lib/supabase";

type PersonalizationSectionProps = {
  user: User;
};

export function PersonalizationSection({ user }: PersonalizationSectionProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(user.collections || []);
  const [isSaving, setIsSaving] = useState(false);
  
  // Update selected collections when user data changes
  useEffect(() => {
    setSelectedCollections(user.collections || []);
  }, [user.collections]);
  
  // Handle toggle collection selection
  const handleToggleCollection = (collection: string) => {
    if (!isEditing) return;
    
    setSelectedCollections(prev => {
      // If already selected, remove it
      if (prev.includes(collection)) {
        return prev.filter(c => c !== collection);
      }
      
      // Otherwise add it (no limit)
      return [...prev, collection];
    });
  };
  
  // Check if collections have changed from user's current saved collections
  const hasCollectionChanges = () => {
    if (!user.collections) return selectedCollections.length > 0;
    
    if (selectedCollections.length !== user.collections.length) return true;
    
    // Check if the contents are the same (order doesn't matter)
    return !selectedCollections.every(c => user.collections?.includes(c));
  };
  
  const { refreshUser } = useAuth();

  // Save collection preferences
  const handleSaveCollections = async () => {
    if (!user.id) return;
    
    setIsSaving(true);
    try {
      // First, attempt to create the user in our database if they don't exist
      try {
        // Check if user exists in our database using a HEAD request
        const checkResponse = await fetch(`/api/user/${user.id}/exists`, { method: 'HEAD' });
        
        // If user doesn't exist, create them first
        if (checkResponse.status === 404) {
          await api.auth.createUserInDatabase(user.id, user.email || "");
        }
      } catch (error) {
        console.error("Error checking/creating user:", error);
        // Continue anyway, as the collections endpoint might still work
      }
      
      // Now save the collections
      await api.onboarding.saveCollections(user.id, selectedCollections);
      
      // Refresh user data to update UI
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
    // Reset form values
    setSelectedCollections(user.collections || []);
    setIsEditing(false);
  };

  return (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Personalization</CardTitle>
          <CardDescription>Customize your collection preferences</CardDescription>
        </div>
        {!isEditing && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Preferences
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Collection Preferences</h4>
            
            {user.collections?.length ? (
              <div className="flex flex-wrap gap-2">
                {isEditing ? (
                  collectionOptions.map((collection) => (
                    <button
                      key={collection}
                      type="button"
                      onClick={() => handleToggleCollection(collection)}
                      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${selectedCollections.includes(collection) 
                        ? 'bg-primary text-white' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >
                      {collection}
                    </button>
                  ))
                ) : (
                  user.collections.map(collection => (
                    <Badge key={collection} variant="secondary">
                      {collection}
                    </Badge>
                  ))
                )}
              </div>
            ) : (
              <div>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {collectionOptions.map((collection) => (
                      <button
                        key={collection}
                        type="button"
                        onClick={() => handleToggleCollection(collection)}
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${selectedCollections.includes(collection) 
                          ? 'bg-primary text-white' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                      >
                        {collection}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No collection preferences set</p>
                )}
              </div>
            )}
            

          </div>
        </div>
      </CardContent>
      
      {isEditing && (
        <CardFooter className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            type="button" 
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSaveCollections} 
            disabled={isSaving || !hasCollectionChanges()}
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@/lib/supabase";
import { Pencil, X, Check } from "lucide-react";

interface UsernameSectionProps {
  user: User;
}

export function UsernameSection({ user }: UsernameSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user.username || "");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();

  // Update local state when user prop changes
  useEffect(() => {
    setUsername(user.username || "");
  }, [user.username]);

  const updateUsernameMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      const response = await fetch(`/api/user/${user.id}/username`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: newUsername }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update username");
      }
      
      return response.json();
    },
    onSuccess: async (updatedUser) => {
      // Update the query cache immediately
      queryClient.setQueryData(['/api/user', user.id], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['/api/user', user.id] });
      
      // Refresh the auth context to update the global user state
      await refreshUser(user.id);
      
      setUsername(updatedUser.username || "");
      setIsEditing(false);
      setAvailabilityMessage("");
      toast({
        title: "Username updated",
        description: "Your username has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update username",
        description: error.message || "An error occurred while updating your username.",
        variant: "destructive",
      });
    },
  });

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck.trim() || usernameToCheck === user.username) {
      setAvailabilityMessage("");
      return;
    }

    setIsCheckingAvailability(true);
    try {
      const response = await fetch("/api/username/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: usernameToCheck }),
      });

      if (!response.ok) {
        throw new Error("Failed to check username availability");
      }

      const data = await response.json();
      if (data.available) {
        setAvailabilityMessage("✓ Username is available");
      } else {
        setAvailabilityMessage("✗ Username is already taken");
      }
    } catch (error) {
      setAvailabilityMessage("Error checking availability");
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    
    // Clear previous availability message
    setAvailabilityMessage("");
    
    // Debounce username availability check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSave = () => {
    if (username.trim() && username !== user.username) {
      updateUsernameMutation.mutate(username.trim());
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setUsername(user.username || "");
    setAvailabilityMessage("");
  };

  const isUsernameChanged = username.trim() !== (user.username || "");
  const canSave = isUsernameChanged && availabilityMessage.includes("✓") && !isCheckingAvailability;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Username</CardTitle>
            <CardDescription>
              Your unique username that others can use to find you.
            </CardDescription>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing ? (
          <div className="space-y-2">
            <Label>Current Username</Label>
            <p className="text-sm text-muted-foreground">
              {user.username || "No username set"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="Enter your username"
              className="max-w-md"
            />
            {isCheckingAvailability && (
              <p className="text-sm text-muted-foreground">Checking availability...</p>
            )}
            {availabilityMessage && (
              <p className={`text-sm ${
                availabilityMessage.includes("✓") 
                  ? "text-green-600" 
                  : "text-red-600"
              }`}>
                {availabilityMessage}
              </p>
            )}
          </div>
        )}

        {isEditing && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSave}
              disabled={!canSave || updateUsernameMutation.isPending}
              size="sm"
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              {updateUsernameMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={updateUsernameMutation.isPending}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
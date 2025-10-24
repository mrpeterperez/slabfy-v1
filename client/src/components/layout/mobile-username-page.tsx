// Mobile Username Page  
// Beautiful mobile layout reusing existing UsernameSection logic

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft } from "lucide-react";

interface MobileUsernamePageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileUsernamePage({ isOpen, onClose }: MobileUsernamePageProps) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
    }
  }, [user?.username]);

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck.trim() || usernameToCheck === user?.username) {
      setAvailabilityMessage("");
      return;
    }

    setIsCheckingAvailability(true);
    try {
      const response = await fetch("/api/username/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameToCheck }),
      });

      if (!response.ok) throw new Error("Failed to check username");

      const data = await response.json();
      setAvailabilityMessage(data.available ? "✓ Username is available" : "✗ Username is already taken");
    } catch (error) {
      setAvailabilityMessage("Error checking availability");
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setAvailabilityMessage("");
    
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSave = async () => {
    if (!user?.id || !username.trim() || username === user.username) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/user/${user.id}/username`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update username");
      }

      await refreshUser(user.id);
      setIsEditing(false);
      setAvailabilityMessage("");
      
      toast({
        title: "Username updated",
        description: "Your username has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to update username",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setUsername(user?.username || "");
    setAvailabilityMessage("");
    setIsEditing(false);
  };

  const isUsernameChanged = username.trim() !== (user?.username || "");
  const canSave = isUsernameChanged && availabilityMessage.includes("✓") && !isCheckingAvailability;

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
          Username
        </h1>

        {isEditing ? (
          <div className="space-y-6">
            {/* Username Section */}
            <div className="pb-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium">Username</h2>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-sm text-foreground hover:text-foreground/80 transition-colors underline"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="Enter your username"
                  className="text-base"
                />
                {isCheckingAvailability && (
                  <p className="text-sm text-muted-foreground">Checking availability...</p>
                )}
                {availabilityMessage && (
                  <p className={`text-sm ${
                    availabilityMessage.includes("✓") ? "text-green-600" : "text-red-600"
                  }`}>
                    {availabilityMessage}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Your unique username that others can use to find you.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={!canSave || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Username Display */}
            <div className="pb-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium">Username</h2>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-foreground hover:text-foreground/80 transition-colors"
                >
                  Edit
                </button>
              </div>
              <p className="text-base">{user.username || "No username set"}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

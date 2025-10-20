import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/supabase";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import { collectionOptions } from "@shared/schema";

type CollectionOption = {
  id: string;
  title: string;
  description: string;
};

const collectionData: CollectionOption[] = [
  {
    id: "Sports Cards",
    title: "Sports Cards",
    description: "Basketball, Baseball, Football, etc.",
  },
  {
    id: "TCG",
    title: "TCG",
    description: "Pokemon, Magic, Yu-Gi-Oh",
  },
  {
    id: "Comics",
    title: "Comics",
    description: "Vintage & Modern Comics",
  },
  {
    id: "Other",
    title: "Other",
    description: "Coins, Stamps, etc.",
  },
];

export default function OnboardingStep1() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(["Sports Cards"]);

  // Redirect if not logged in or if onboarding already completed
  useEffect(() => {
    if (!user) {
      setLocation("/signin");
      return;
    }
    // Skip this step if onboarding is already complete
    if (user.onboardingComplete === "true") {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const toggleCollection = (collectionId: string) => {
    setSelectedCollections((prev) => {
      // If already selected, remove it
      if (prev.includes(collectionId)) {
        return prev.filter((id) => id !== collectionId);
      }
      
      // Otherwise add it (no limit)
      return [...prev, collectionId];
    });
  };

  const handleContinue = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
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
      
      // Save selected collections
      await api.onboarding.saveCollections(user.id, selectedCollections);
      
      // Navigate to step 2
      setLocation("/onboarding/step2");
    } catch (error) {
      console.error("Error saving collections:", error);
      toast({
        title: "An error occurred",
        description: "Could not save your collection preferences",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    setLocation("/onboarding/step2");
  };

  return (
    <div className="flex min-h-screen flex-col justify-center items-center px-6 py-12 lg:px-8 bg-background text-foreground">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <Logo />
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-foreground">
          What do you collect?
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Select all that apply
        </p>
      </div>

      <div className="mt-10 w-[24rem]">
        <div className="grid grid-cols-2 gap-3">
          {collectionData.map((collection) => (
            <div
              key={collection.id}
              className={`relative flex flex-col p-4 border rounded-lg cursor-pointer transition-all ${
                selectedCollections.includes(collection.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => toggleCollection(collection.id)}
            >
              {selectedCollections.includes(collection.id) && (
                <div className="absolute top-2 right-2 text-primary">
                  <Check className="h-5 w-5" />
                </div>
              )}
              <h3 className="font-medium text-foreground">{collection.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {collection.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            Skip for now
          </Button>
          <Button
            onClick={handleContinue}
            disabled={selectedCollections.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

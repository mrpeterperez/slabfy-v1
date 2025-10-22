import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";

import type { User } from "@/lib/supabase";

type AccountSectionProps = {
  user: User;
};

export function AccountSection({ user }: AccountSectionProps) {
  const { updateEmail } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format the created date nicely
  const memberSince = user.createdAt 
    ? format(new Date(user.createdAt), "MMMM dd, yyyy")
    : "Unknown";

  const handleEmailChange = async () => {
    if (!newEmail.trim() || newEmail === user.email) {
      toast({
        title: "Invalid email",
        description: "Please enter a different email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateEmail(newEmail.trim());
      setIsDialogOpen(false);
      setNewEmail("");
    } catch (error) {
      // Error handling done in updateEmail
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and membership</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Email</h4>
              <p className="text-sm">{user.email}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Member Since</h4>
              <p className="text-sm">{memberSince}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>
              You'll receive a verification link at your new email address. Your email will only change after you confirm it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-email">Current Email</Label>
              <Input
                id="current-email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">New Email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="your.new.email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setNewEmail("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEmailChange} disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
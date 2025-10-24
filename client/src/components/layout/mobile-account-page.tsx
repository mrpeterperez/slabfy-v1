// Mobile Account Page
// Beautiful mobile layout reusing existing AccountSection logic

import { useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Mail, Shield, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MobileAccountPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileAccountPage({ isOpen, onClose }: MobileAccountPageProps) {
  const { user, updateEmail } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const memberSince = user?.createdAt 
    ? format(new Date(user.createdAt), "MMMM dd, yyyy")
    : "Unknown";

  const handleEmailChange = async () => {
    if (!newEmail.trim() || newEmail === user?.email) {
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

  if (!isOpen || !user) return null;

  return (
    <>
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
            Account
          </h1>

          {/* Email Section */}
          <div className="pb-6 border-b">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-medium">Email Address</h2>
                  <button
                    onClick={() => setIsDialogOpen(true)}
                    className="text-sm text-foreground hover:text-foreground/80 transition-colors"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  This is the email address associated with your account.
                </p>
              </div>
            </div>
          </div>

          {/* Member Since Section */}
          <div className="pb-6 border-b">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <h2 className="text-base font-medium mb-1">Member Since</h2>
                <p className="text-sm text-muted-foreground">{memberSince}</p>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <h2 className="text-base font-medium mb-1">Password & Security</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Manage your password and security settings.
                </p>
                <Button variant="outline" size="sm" disabled>
                  Change Password
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Password management coming soon.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Change Dialog */}
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
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
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
            <Button
              onClick={handleEmailChange}
              disabled={isSubmitting || !newEmail.trim()}
            >
              {isSubmitting ? "Sending..." : "Send Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

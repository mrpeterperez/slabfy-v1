import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil } from "lucide-react";

import type { User } from "@/lib/supabase";

type AccountSectionProps = {
  user: User;
};

export function AccountSection({ user }: AccountSectionProps) {
  // Format the created date nicely
  const memberSince = user.createdAt 
    ? format(new Date(user.createdAt), "MMMM dd, yyyy")
    : "Unknown";

  return (
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
            onClick={() => {
              // TODO: Add account editing functionality
              console.log("Account edit functionality coming soon");
            }}
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
  );
}
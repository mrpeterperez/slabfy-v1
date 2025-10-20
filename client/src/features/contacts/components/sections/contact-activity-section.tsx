// 🤖 INTERNAL NOTE:
// Purpose: Activity section for contact detail page matching collections style
// Exports: ContactActivitySection component
// Feature: contacts
// Dependencies: shadcn/ui, lucide-react

import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { type Contact } from "../../api/contacts-api";

interface ContactActivitySectionProps {
  contact: Contact;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ContactActivitySection({ contact }: ContactActivitySectionProps) {
  return (
    <div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">
      <section>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Activity History</h3>
          <p className="text-sm text-muted-foreground">Timeline and actions associated with this contact</p>
        </div>

        <Card>
          <CardContent className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Activity tracking coming soon</p>
          </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
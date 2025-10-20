// 🤖 INTERNAL NOTE:
// Purpose: Overview section for contact detail page matching the Consignment > Settings layout
// Exports: ContactOverviewSection component
// Feature: contacts
// Dependencies: shadcn/ui, lucide-react

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Mail, 
  Phone, 
  Building, 
  User, 
  Calendar,
  Edit2,
} from "lucide-react";
import { type Contact } from "../../api/contacts-api";

interface ContactOverviewSectionProps {
  contact: Contact;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ContactOverviewSection({ contact, onEdit }: ContactOverviewSectionProps) {
  return (
    <div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">
      {/* Contact Information */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              Contact Information
            </h3>
            <p className="text-sm text-muted-foreground">Full name, company, email, and phone</p>
          </div>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-base font-medium">{contact.name}</p>
              </div>
              
              {contact.companyName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <p className="text-base">{contact.companyName}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {contact.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-base text-primary hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                </div>
              )}
              
              {contact.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={`tel:${contact.phone}`}
                      className="text-base text-primary hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {contact.notes && (
            <>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <p className="text-base mt-1 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            </>
          )}
          </CardContent>
        </Card>
      </section>

      {/* Clean Separator */}
      <div className="h-px bg-border w-full" />

      {/* Metadata */}
      <section>
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Record Information
          </h3>
          <p className="text-sm text-muted-foreground">Created and last updated timestamps</p>
        </div>

        <Card>
          <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-base">
                {contact.createdAt 
                  ? new Date(contact.createdAt).toLocaleString()
                  : "—"
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-base">
                {contact.updatedAt 
                  ? new Date(contact.updatedAt).toLocaleString()
                  : "—"
                }
              </p>
            </div>
          </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
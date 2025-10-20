// 🤖 INTERNAL NOTE:
// Purpose: Header component for contact detail page with edit/delete actions matching collection header
// Exports: ContactHeader component
// Feature: contacts
// Dependencies: @/components/ui, @/components/breadcrumbs, wouter, lucide-react

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trash2, 
  MoreHorizontal,
  Mail,
  Phone,
  Building,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { StatusPill, normalizeSimpleStatus } from "@/components/status";
import { type Contact } from "../api/contacts-api";

interface ContactHeaderProps {
  contact?: Contact | null;
  onEdit?: () => void;
  onDelete?: () => void; // Delete Permanently when archived
  onArchive?: () => void;
  onUnarchive?: () => void;
  isArchiving?: boolean;
  isUnarchiving?: boolean;
  isDeleting?: boolean;
}

// Reusable contact info component
function ContactInfo({ contact, compact = false }: { contact?: Contact | null; compact?: boolean }) {
  const contactName = contact?.name || 'Untitled Contact';
  
  if (!contact) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-md" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 min-w-0 flex-1">
      {/* Contact Avatar */}
      <div
        className="w-10 h-10 rounded-md border border-border bg-secondary/5 flex-shrink-0 flex items-center justify-center"
        aria-label={`Avatar for ${contactName}`}
      >
        <span className="text-sm font-medium text-muted-foreground select-none">
          {(contactName?.trim()?.charAt(0)?.toUpperCase() || 'C')}
        </span>
      </div>
      
      {/* Contact Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className={`font-heading font-bold text-foreground leading-tight truncate ${compact ? 'text-xl' : 'text-2xl'}`}>
            {contactName}
          </h1>
          {contact && (
            <StatusPill status={normalizeSimpleStatus(contact.archived ? 'archived' : 'active')} size="sm" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {contact.companyName && (
            <Badge variant="outline" className="text-xs">
              <Building className="w-3 h-3 mr-1" />
              {contact.companyName}
            </Badge>
          )}
          {contact.email && (
            <Badge variant="outline" className="text-xs">
              <Mail className="w-3 h-3 mr-1" />
              Email
            </Badge>
          )}
          {contact.phone && (
            <Badge variant="outline" className="text-xs">
              <Phone className="w-3 h-3 mr-1" />
              Phone
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function ContactHeader({ contact, onEdit, onDelete, onArchive, onUnarchive, isArchiving, isUnarchiving, isDeleting }: ContactHeaderProps) {
  return (
    <header className="bg-background border-b border-border">
      <div className="mx-auto px-4 sm:px-6 lg:px-4">
        <div className="flex h-16 items-center w-full">
          {/* Left-aligned contact info */}
          <div className="flex w-full items-center">
            <ContactInfo contact={contact} />
          </div>

          {/* Actions (no high-level Edit button) */}
          {contact && (
            <div className="hidden md:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={!!(isArchiving || isUnarchiving || isDeleting)} aria-disabled={!!(isArchiving || isUnarchiving || isDeleting)}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {contact.archived ? (
                    <>
                      {onUnarchive && (
                        <DropdownMenuItem onClick={onUnarchive} disabled={!!isUnarchiving}>
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Restore
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive" disabled={!!isDeleting}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Permanently
                        </DropdownMenuItem>
                      )}
                    </>
                  ) : (
                    <>
                      {onArchive && (
                        <DropdownMenuItem onClick={onArchive} disabled={!!isArchiving}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
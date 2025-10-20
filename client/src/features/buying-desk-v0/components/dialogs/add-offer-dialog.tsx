// Purpose: Add offer (new buy session) dialog for v0 — routes to /buying-desk-v0
// Feature: buying-desk-v0

import React, { useEffect, useRef, useState } from "react";
import { X, Search, User, Building, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  useContacts,
  useCreateContact,
} from "../../../contacts/hooks/use-contacts";
import { useCreateSessionV0 } from "../../hooks/use-sessions";
import type { Contact } from "../../../contacts/api/contacts-api";
import { Button } from "@/components/ui/button";

interface NewOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string; // Optional event to associate with the session
}

const AddOfferDialog = ({ isOpen, onClose, eventId }: NewOfferModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCustomContact, setIsCustomContact] = useState(false);
  const [isContactSelectedOrCustom, setIsContactSelectedOrCustom] =
    useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    contactName: "",
    company: "",
    email: "",
    phone: "",
    description: "",
  });

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const { data: contacts = [], isLoading: contactsLoading } =
    useContacts(false); // false = only active contacts
  const createContact = useCreateContact();
  const createSession = useCreateSessionV0();

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  const filteredContacts =
    searchTerm.length > 0 && showSuggestions
      ? contacts.filter(
          (contact) =>
            contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact?.companyName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()),
        )
      : [];

  const canSave =
    isContactSelectedOrCustom &&
    Boolean(formData.contactName?.trim()) &&
    !createContact.isPending &&
    !createSession.isPending;

  const handleInputChange = (field: keyof typeof formData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const handleSelectContact = (contact: Contact) => {
    setFormData((prev) => ({
      ...prev,
      contactName: contact.name,
      company: contact.companyName || "",
      email: contact.email || "",
      phone: contact.phone || "",
    }));
    setSelectedContact(contact);
    setSearchTerm(contact.name);
    setShowSuggestions(false);
    setIsCustomContact(false);
    setIsContactSelectedOrCustom(true);
  };
  const handleAddCustomContact = () => {
    const trimmedName = searchTerm.trim();
    if (!trimmedName) {
      toast({
        title: "Select a seller",
        description: "Add a seller name before continuing",
        variant: "destructive",
      });
      return;
    }
    setFormData((prev) => ({ ...prev, contactName: trimmedName }));
    setIsCustomContact(true);
    setShowSuggestions(false);
    setIsContactSelectedOrCustom(true);
  };

  const handleSave = async () => {
    try {
      const trimmedName = formData.contactName.trim();
      if (!isContactSelectedOrCustom || !trimmedName) {
        toast({
          title: "Seller required",
          description:
            "Choose an existing seller or add a new one before creating a session.",
          variant: "destructive",
        });
        return;
      }

      let contactId = selectedContact?.id;

      if (!contactId) {
        const response = await createContact.mutateAsync({
          name: trimmedName,
          email: formData.email?.trim() || null,
          phone: formData.phone?.trim() || null,
          companyName: formData.company?.trim() || null,
          notes: formData.description?.trim() || null,
        });
        // Extract contact ID from nested response
        contactId = response.contact?.id;
      }

      if (!contactId) {
        toast({
          title: "Seller required",
          description:
            "Something went wrong while attaching the seller. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Create buy session with contact reference and event association
      console.log('🔵 Creating session with:', { contactId, eventId, notes: formData.description });
      const newSession = await createSession.mutateAsync({
        notes: formData.description || undefined,
        contactId, // Pass contactId instead of sellerId
        eventId, // Associate with event if provided
      });
      console.log('🟢 Session created:', newSession);
      toast({
        title: "Success",
        description: "Buy session created successfully",
      });
      setLocation(`/buying-desk/${newSession.id}`);
      handleClose();
    } catch (error: any) {
      console.error('🔴 Session creation error:', error);
      const message =
        typeof error?.message === "string"
          ? error.message
          : "Failed to create buy session";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleClose = () => {
    setFormData({
      contactName: "",
      company: "",
      email: "",
      phone: "",
      description: "",
    });
    setSearchTerm("");
    setShowSuggestions(false);
    setIsCustomContact(false);
    setIsContactSelectedOrCustom(false);
    setSelectedContact(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      ref={dialogRef}
    >
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <Button
          onClick={handleClose}
          variant="ghost"
          size="icon"
          aria-label="Close dialog"
          ref={closeButtonRef}
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </Button>
        <Button size="lg" onClick={handleSave} disabled={!canSave}>
          {createContact.isPending || createSession.isPending
            ? "Saving…"
            : "Save & Continue"}
        </Button>
      </div>
      <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
        <div className="w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <h1
            id="dialog-title"
            className="text-2xl font-semibold text-foreground mb-6 sm:mb-8 text-left"
          >
            New Buy Session
          </h1>
          <section className="mb-6 sm:mb-8">
            <h2 className="text-lg font-medium text-foreground mb-2 sm:mb-3 text-left">
              Seller
            </h2>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search for sellers or add new seller"
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchTerm(value);
                  setShowSuggestions(true);
                  if (selectedContact || isCustomContact) {
                    setSelectedContact(null);
                    setIsCustomContact(false);
                    setIsContactSelectedOrCustom(false);
                    setFormData({
                      contactName: "",
                      company: "",
                      email: "",
                      phone: "",
                      description: "",
                    });
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none pr-10 bg-card text-card-foreground"
                aria-label="Search or add seller name"
              />
              <Search
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              {showSuggestions &&
                (searchTerm.length > 0 || filteredContacts.length > 0) && (
                  <div className="absolute z-10 w-full bg-card border border-border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => handleSelectContact(contact)}
                          className="w-full text-left p-3 hover:bg-muted focus:bg-muted outline-none block"
                        >
                          <p className="font-medium text-foreground">
                            {contact.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {contact.companyName} • {contact.email}
                          </p>
                        </button>
                      ))
                    ) : searchTerm.length > 0 ? (
                      <div className="p-3 text-muted-foreground text-center">
                        No sellers found.
                        <button
                          onMouseDown={handleAddCustomContact}
                          onClick={handleAddCustomContact}
                          className="w-full mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                        >
                          Add new seller "{searchTerm}"
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
            </div>
          </section>
          {isContactSelectedOrCustom && (
            <section className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
              <h2 className="text-lg font-medium text-foreground text-left">
                Seller Details
              </h2>
              <div>
                <label
                  htmlFor="contactName"
                  className="block text-sm font-medium text-foreground mb-2 text-left"
                >
                  Seller Name
                </label>
                <input
                  id="contactName"
                  type="text"
                  placeholder="e.g., John Smith"
                  value={formData.contactName}
                  onChange={(e) =>
                    handleInputChange("contactName", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none bg-card text-card-foreground"
                  readOnly={
                    !isCustomContact &&
                    searchTerm === formData.contactName &&
                    formData.contactName !== ""
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-foreground mb-2 text-left"
                >
                  Company
                </label>
                <div className="relative">
                  <input
                    id="company"
                    type="text"
                    placeholder="e.g., Smith Sports Cards"
                    value={formData.company}
                    onChange={(e) =>
                      handleInputChange("company", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none pr-10 bg-card text-card-foreground"
                  />
                  <Building
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2 text-left"
                >
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    placeholder="e.g., john@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none pr-10 bg-card text-card-foreground"
                  />
                  <Mail
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-foreground mb-2 text-left"
                >
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="e.g., (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none bg-card text-card-foreground"
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-foreground mb-2 text-left"
                >
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  placeholder="Add any additional notes or details about the contact..."
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none resize-none bg-card text-card-foreground"
                />
              </div>
              {selectedContact && (
                <div className="bg-brand/subtle border border-brand rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-left font-medium text-brand mb-1">
                        Seller Information
                      </div>
                      <div className="text-sm text-brand">
                        Existing seller in system
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
          <div className="h-16"></div>
        </div>
      </div>
    </div>
  );
};

export default AddOfferDialog;

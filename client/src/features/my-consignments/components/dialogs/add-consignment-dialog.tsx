// 🤖 INTERNAL NOTE:
// Purpose: Dialog for creating new consignments with contact management
// Exports: AddConsignmentDialog component
// Feature: my-consignments  
// Dependencies: @/hooks/use-toast, @/components/ui, ../hooks, ../utils

import React, { useState, useEffect, useRef } from "react";
import { X, Search, User, Building, Mail, Percent, Edit2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateConsignment, useNextConsignmentTitle } from "../../hooks/use-consignments";
import { useContacts, useCreateContact, useUpdateContact } from "../../hooks/use-contacts";
import { useToast } from "@/hooks/use-toast";
import { validateFormData } from "../../utils/validation";
import { ConsignmentErrorBoundary } from "../error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AddConsignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddConsignmentDialog = ({ isOpen, onClose }: AddConsignmentDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCustomContact, setIsCustomContact] = useState(false);
  const [isContactSelectedOrCustom, setIsContactSelectedOrCustom] = useState(false);
  const [isCustomTitle, setIsCustomTitle] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Validation errors state
  const [errors, setErrors] = useState<{
    title?: string;
    contactName?: string;
  }>({});

  // State for form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contactName: '',
    company: '',
    email: '',
    phone: '',
    splitPercentage: '95.00',
  });

  // Refs for focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // API hooks
  const createConsignment = useCreateConsignment();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: nextTitle, isLoading: titleLoading } = useNextConsignmentTitle();

  const generatedTitle = nextTitle?.trim() ?? "";

  // Helper for default split percentage
  const getDefaultSplitPercentage = () => {
    const savedSettings = localStorage.getItem('consignmentSettings') || localStorage.getItem('consignment-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return ((parsed.defaultSplitPercentage ?? 95)).toString() + '.00';
      } catch (error) {
        console.error('Error loading consignment settings:', error);
      }
    }
    return '95.00';
  };

  // Effect to manage focus and load default settings when dialog opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      
      // Load default split from settings
      setFormData(prev => ({ 
        ...prev, 
        splitPercentage: getDefaultSplitPercentage(),
      }));
    }
  }, [isOpen]);

  // Listen for settings changes and update default split
  useEffect(() => {
    const handleSettingsChange = () => {
      if (isOpen) {
        setFormData(prev => ({ 
          ...prev, 
          splitPercentage: getDefaultSplitPercentage(),
        }));
      }
    };

    window.addEventListener('consignmentSettingsChanged', handleSettingsChange);
    return () => window.removeEventListener('consignmentSettingsChanged', handleSettingsChange);
  }, [isOpen]);

  // Compute filtered contacts directly instead of using state
  const filteredContacts = searchTerm.length > 0 && showSuggestions ? 
    contacts.filter(contact =>
      contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

  // Debug logging
  console.log("Contact search debug:", {
    searchTerm,
    showSuggestions,
    contactsCount: contacts.length,
    filteredContactsCount: filteredContacts.length,
    contactsLoading,
    contacts: contacts.slice(0, 3) // Show first 3 contacts for debugging
  });

  // Handle changes for standard input fields
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear validation errors when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Clamp helper for percentage inputs (0..100)
  const clampPercentInput = (value: string) => {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return '';
    if (num > 100) return '100';
    if (num < 0) return '0';
    return value;
  };

  // Derived: seller gets vs house share based on splitPercentage
  const parsedSplit = Math.min(100, Math.max(0, parseFloat(formData.splitPercentage || '95')));
  const houseSharePct = isNaN(parsedSplit) ? 5 : Math.round((100 - parsedSplit) * 100) / 100;

  // Validate form fields using validation utility
  const validateForm = (titleValue: string) => {
    const dataToValidate = {
      title: titleValue,
      description: formData.description,
      contactName: formData.contactName,
      company: formData.company,
      email: formData.email,
      phone: formData.phone,
      // commission removed
    };

    const validation = validateFormData(dataToValidate);
    
    if (!validation.success) {
      const newErrors: typeof errors = {};
      
      if (typeof validation.error === 'object' && validation.error) {
        // Extract field-specific errors from Zod validation
        if ('title' in validation.error && isCustomTitle) {
          newErrors.title = "Title is required";
        }
        if ('contactName' in validation.error) {
          newErrors.contactName = "Contact name is required";
        }
      }
      
      setErrors(newErrors);
      return false;
    }
    
    // Clear any existing errors
    setErrors({});
    return true;
  };

  // Handle contact selection from suggestions
  const handleSelectContact = (contact: any) => {
    setFormData((prev) => ({
      ...prev,
      contactName: contact.name,
      company: contact.companyName || '',
      email: contact.email || '',
      phone: contact.phone || '',
    }));
    setSelectedContact(contact);
    setSearchTerm(contact.name);
    setShowSuggestions(false);
    setIsCustomContact(false);
    setIsContactSelectedOrCustom(true);
  };

  // Handle adding a custom contact
  const handleAddCustomContact = () => {
    setFormData((prev) => ({ ...prev, contactName: searchTerm }));
    setIsCustomContact(true);
    setShowSuggestions(false);
    setIsContactSelectedOrCustom(true);
  };

  // Handle form save
  const handleSave = async () => {
    try {
      const titleToUse = isCustomTitle ? formData.title.trim() : generatedTitle;

      if (!titleToUse) {
        if (isCustomTitle) {
          setErrors((prev) => ({ ...prev, title: "Title is required" }));
        } else {
          toast({
            title: "Title unavailable",
            description: "Please wait for the consignment title to generate before saving.",
            variant: "destructive",
          });
        }
        return;
      }

      // Validate form before submitting
      if (!validateForm(titleToUse)) {
        return;
      }

      // Enforce 0..100 for split when saving
      const splitNum = Math.min(100, Math.max(0, parseFloat(formData.splitPercentage || '0')));
      const finalSplitString = Number.isNaN(splitNum) ? '0.00' : splitNum.toFixed(2);

      // 🎯 If we have a selected contact and the form data differs, update the contact first
      if (selectedContact && !isCustomContact) {
        const hasChanges = 
          selectedContact.name !== formData.contactName ||
          (selectedContact.email || '') !== (formData.email || '') ||
          (selectedContact.phone || '') !== (formData.phone || '') ||
          (selectedContact.companyName || '') !== (formData.company || '');

        if (hasChanges) {
          await updateContact.mutateAsync({
            contactId: selectedContact.id,
            data: {
              name: formData.contactName,
              email: formData.email || undefined,
              phone: formData.phone || undefined,
              companyName: formData.company || undefined,
            }
          });
        }
      }

      // Prepare the payload to match backend API structure
      const payload = {
        title: titleToUse,
        description: formData.description || undefined,
        status: "active",
        defaultSplitPercentage: finalSplitString,
        // Consignor contact data (will be used to create contact + consignor relationship)
        consignor: {
          name: formData.contactName,
          email: formData.email || null,
          phone: formData.phone || null,
          companyName: formData.company || null,
        }
      };

      console.log("Creating consignment with payload:", payload);

      // Create the consignment with consignor (matching backend API structure)
      const newConsignment = await createConsignment.mutateAsync(payload);

      // If we created a new contact, invalidate the contacts cache so it appears in the list
      if (isCustomContact) {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
      }

      toast({
        title: "Success", 
        description: "Consignment created successfully",
      });

      // Navigate to the specific consignment details page
      setLocation(`/consignments/${newConsignment.id}`);
      handleClose();
    } catch (error) {
      console.error("Error creating consignment:", error);
      toast({
        title: "Error",
        description: "Failed to create consignment",
        variant: "destructive",
      });
    }
  };

  // Handle close
  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      contactName: '',
      company: '',
      email: '',
      phone: '',
      splitPercentage: getDefaultSplitPercentage(),
    });
    setSearchTerm('');
    setShowSuggestions(false);
    setIsCustomContact(false);
    setIsContactSelectedOrCustom(false);
    setIsCustomTitle(false);
    setSelectedContact(null);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ConsignmentErrorBoundary>
      <div
        className="fixed inset-0 z-50 bg-background text-foreground"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        ref={dialogRef}
      >
        {/* Header */}
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

          <Button
            size="lg"
            onClick={handleSave}
            disabled={
              createConsignment.isPending ||
              (!isCustomTitle && (titleLoading || !generatedTitle)) ||
              (isCustomTitle && !formData.title.trim())
            }
          >
            {createConsignment.isPending ? "Saving..." : "Save & Continue"}
          </Button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
          <div className="w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
            {/* Title */}
            <h1 id="dialog-title" className="text-2xl font-semibold font-heading text-foreground mb-6 sm:mb-8">
              New Consignment
            </h1>

            {/* Consignment Title Section */}
            <section className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h2 className="text-lg font-medium text-foreground">Consignment Title</h2>
                {!isCustomTitle && (
                  <button
                    type="button"
                    onClick={() => setIsCustomTitle(true)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Customize
                  </button>
                )}
              </div>
              
              {isCustomTitle ? (
                <input
                  type="text"
                  placeholder="e.g., John's Baseball Card Collection"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none bg-card text-card-foreground ${
                    errors.title ? 'border-destructive' : 'border-border'
                  }`}
                  aria-label="Consignment title"
                />
              ) : (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <span className="text-foreground font-medium">
                    {titleLoading ? "Generating..." : generatedTitle || "Auto title unavailable"}
                  </span>
                  <span className="text-xs text-muted-foreground">Auto-generated</span>
                </div>
              )}

              {errors.title && (
                <p className="text-destructive text-sm mt-1">{errors.title}</p>
              )}

              {!isCustomTitle && !titleLoading && !generatedTitle && (
                <p className="text-sm text-muted-foreground mt-2">
                  Auto-generated titles are temporarily unavailable. Please wait a moment or set a custom title.
                </p>
              )}

              {isCustomTitle && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomTitle(false);
                    setFormData(prev => ({ ...prev, title: '' }));
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground mt-2 transition-colors"
                >
                  Use auto-generated title
                </button>
              )}
            </section>

            {/* Consignor Name Search/Input Section */}
            <section className="mb-6 sm:mb-8">
              <h2 className="text-lg font-medium text-foreground mb-2 sm:mb-3">Consignor</h2>
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search for contacts or add new consignor"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleInputChange('contactName', e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  size="lg"
                  className={`pr-10 ${errors.contactName ? 'border-destructive' : ''}`}
                  aria-label="Search or add consignor name"
                />
                <Search
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
                  aria-hidden="true"
                />
                {errors.contactName && (
                  <p className="text-destructive text-sm mt-1">{errors.contactName}</p>
                )}

                {showSuggestions && (searchTerm.length > 0 || filteredContacts.length > 0) && (
                  <div className="absolute z-10 w-full bg-card border border-border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => handleSelectContact(contact)}
                          className="w-full text-left p-3 hover:bg-muted focus:bg-muted outline-none block"
                        >
                          <p className="font-medium text-foreground">{contact.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {contact.companyName} • {contact.email}
                          </p>
                        </button>
                      ))
                    ) : searchTerm.length > 0 ? (
                      <div className="p-3 text-muted-foreground text-center">
                        No contacts found.
                        <Button
                          onMouseDown={handleAddCustomContact}
                          onClick={handleAddCustomContact}
                          className="w-full mt-2"
                        >
                          Add new consignor "{searchTerm}"
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>

            {/* Business Terms (Defaults) */}
            {isContactSelectedOrCustom && (
              <section className="mb-6 sm:mb-8">
                <h2 className="text-lg font-medium text-foreground mb-3 sm:mb-4">Business Terms</h2>
                
                <div className="bg-muted/30 border border-border rounded-lg p-4 sm:p-5">
                  <label className="block text-sm font-medium text-foreground mb-3">Default Split Percentage</label>
                  
                  {/* Input Section */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={formData.splitPercentage}
                        onChange={(e) => handleInputChange('splitPercentage', clampPercentInput(e.target.value))}
                        className="w-24 px-3 py-2 border rounded-lg bg-card text-card-foreground border-border focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-center font-medium"
                      />
                      <span className="text-sm font-medium text-muted-foreground">%</span>
                    </div>
                    <span className="text-sm text-muted-foreground">goes to consignor</span>
                  </div>

                  {/* Split Breakdown */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        {parsedSplit}%
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                        Seller Gets
                      </div>
                    </div>
                    
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                        {houseSharePct}%
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                        You Get
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    This percentage will be used as the default for all items in this consignment.
                  </p>
                </div>
              </section>
            )}

            {/* Consignor Details Section */}
            {isContactSelectedOrCustom && (
              <section className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
                <h2 className="text-lg font-medium text-foreground">Consignor Details</h2>

                {/* Consignor Name */}
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-foreground mb-2">
                    Consignor Name
                  </label>
                  <Input
                    id="contactName"
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    size="lg"
                    readOnly={!isCustomContact && searchTerm === formData.contactName && formData.contactName !== ''}
                  />
                </div>

                {/* Company */}
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
                    Company
                  </label>
                  <div className="relative">
                    <Input
                      id="company"
                      type="text"
                      placeholder="e.g., Smith Sports Cards"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      size="lg"
                      className="pr-10"
                    />
                    <Building
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g., john@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      size="lg"
                      className="pr-10"
                    />
                    <Mail
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                    Phone
                  </label>
                  <div className="relative">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g., (555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      size="lg"
                      className="pr-10"
                    />
                    <User
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Commission removed */}
              </section>
            )}

            {/* Description Section */}
            <section className="space-y-4 sm:space-y-6">
              <h2 className="text-lg font-medium text-foreground">Description</h2>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                  Notes (Optional)
                </label>
                <Textarea
                  id="description"
                  placeholder="Add any additional notes about this consignment..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </ConsignmentErrorBoundary>
  );
};

// Remove default export in favor of named export pattern
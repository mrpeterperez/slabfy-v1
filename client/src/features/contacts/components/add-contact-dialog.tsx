// 🤖 INTERNAL NOTE:
// Purpose: Full-screen dialog to create a new contact following same pattern as add-collection-dialog
// Exports: AddContactDialog component
// Feature: contacts
// Dependencies: shadcn/ui, react-hook-form, zod

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertContactSchema, type InsertContact } from '@shared/schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateContact } from '@/features/contacts/hooks/use-contacts';
import { useToast } from '@/hooks/use-toast';

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddContactDialog({ open, onOpenChange }: AddContactDialogProps) {
  const createContact = useCreateContact();
  const { toast } = useToast();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const schema = insertContactSchema.extend({
    name: insertContactSchema.shape.name.min(1, 'Contact name is required'),
  });

  const form = useForm<InsertContact>({
    resolver: zodResolver(schema),
    defaultValues: { 
      name: '', 
      email: '', 
      phone: '', 
      companyName: '', 
      notes: '' 
    },
  });

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  // Prevent background scroll
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const handleClose = () => {
    form.reset({ 
      name: '', 
      email: '', 
      phone: '', 
      companyName: '', 
      notes: '' 
    });
    onOpenChange(false);
  };

  const onSubmit = (data: InsertContact) => {
    createContact.mutate(data, {
      onSuccess: () => {
        handleClose();
        toast({
          title: "Success",
          description: "Contact created successfully",
        });
      }
    });
  };

  if (!open) return null;

  return createPortal((
    <div className="fixed inset-0 z-[105] bg-background text-foreground" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <Button
          onClick={handleClose}
          variant="ghost"
          size="icon"
          aria-label="Close dialog"
          ref={closeButtonRef}
          disabled={createContact.isPending}
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </Button>

        <Button
          size="lg"
          onClick={form.handleSubmit(onSubmit)}
          disabled={createContact.isPending}
        >
          {createContact.isPending ? 'Creating...' : 'Create Contact'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
        <div className="w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="text-2xl font-semibold font-heading text-foreground mb-6 sm:mb-8">New Contact</h1>

          <section>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter contact name"
                                size="lg"
                                {...field}
                                disabled={createContact.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Company name"
                                size="lg"
                                {...field}
                                value={field.value || ''}
                                disabled={createContact.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-base font-medium mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="contact@example.com"
                                size="lg"
                                {...field}
                                value={field.value || ''}
                                disabled={createContact.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel"
                                placeholder="(555) 123-4567"
                                size="lg"
                                {...field}
                                value={field.value || ''}
                                disabled={createContact.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h3 className="text-base font-medium mb-4">Additional Information</h3>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add any additional notes about this contact..."
                              className="min-h-[100px]"
                              {...field}
                              value={field.value || ''}
                              disabled={createContact.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </form>
            </Form>
          </section>
        </div>
      </div>
    </div>
  ), document.body);
}

export default AddContactDialog;
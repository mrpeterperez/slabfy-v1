// 🤖 INTERNAL NOTE:
// Purpose: Dialog to edit existing contact details
// Exports: EditContactDialog component
// Feature: contacts
// Dependencies: shadcn/ui, react-hook-form, zod

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { updateContactSchema, type UpdateContact } from '@shared/schema';
import { useUpdateContact } from '../hooks/use-contacts';
import { type Contact } from '../api/contacts-api';

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

const editContactFormSchema = updateContactSchema;

export function EditContactDialog({
  open,
  onOpenChange,
  contact
}: EditContactDialogProps) {
  const updateContact = useUpdateContact();

  const form = useForm<UpdateContact>({
    resolver: zodResolver(editContactFormSchema),
    defaultValues: {
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      companyName: contact.companyName || '',
      notes: contact.notes || '',
    },
  });

  // Reset form when contact changes
  React.useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name,
        email: contact.email || '',
        phone: contact.phone || '',
        companyName: contact.companyName || '',
        notes: contact.notes || '',
      });
    }
  }, [contact, form]);

  const onSubmit = (data: UpdateContact) => {
    updateContact.mutate({
      id: contact.id,
      data
    }, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update contact information and details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter contact name"
                        {...field}
                        disabled={updateContact.isPending}
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
                        {...field}
                        value={field.value || ''}
                        disabled={updateContact.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
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
                        {...field}
                        value={field.value || ''}
                        disabled={updateContact.isPending}
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
                        {...field}
                        value={field.value || ''}
                        disabled={updateContact.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ''}
                      disabled={updateContact.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateContact.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateContact.isPending}
              >
                {updateContact.isPending ? "Updating..." : "Update Contact"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
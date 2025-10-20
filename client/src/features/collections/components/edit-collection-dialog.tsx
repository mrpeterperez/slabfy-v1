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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { updateCollectionSchema, type UpdateCollection, type CollectionWithDetails } from '@shared/schema';
import { useUpdateCollection } from '../hooks/use-collections';

interface EditCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: CollectionWithDetails;
}

const editCollectionFormSchema = updateCollectionSchema;

export function EditCollectionDialog({
  open,
  onOpenChange,
  collection
}: EditCollectionDialogProps) {
  const updateCollection = useUpdateCollection();

  const form = useForm<UpdateCollection>({
    resolver: zodResolver(editCollectionFormSchema),
    defaultValues: {
      name: collection.name,
      description: collection.description || '',
      color: collection.color || '#3B82F6',
      isPublic: collection.isPublic,
      isFavorite: collection.isFavorite,
      tags: collection.tags || [],
    },
  });

  // Reset form when collection changes
  React.useEffect(() => {
    if (collection) {
      form.reset({
        name: collection.name,
        description: collection.description || '',
        color: collection.color || '#3B82F6',
        isPublic: collection.isPublic,
        isFavorite: collection.isFavorite,
        tags: collection.tags || [],
      });
    }
  }, [collection, form]);

  const onSubmit = (data: UpdateCollection) => {
    updateCollection.mutate({
      id: collection.id,
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Collection</DialogTitle>
          <DialogDescription>
            Update your collection details and settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Collection Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Collection Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter collection name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your collection" 
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-3">
                      <Input 
                        type="color" 
                        className="w-16 h-10 p-1 rounded cursor-pointer"
                        {...field}
                        value={field.value || '#3B82F6'}
                      />
                      <Input 
                        placeholder="#3B82F6" 
                        className="flex-1"
                        {...field}
                        value={field.value || ''}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Settings */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="isFavorite"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel>Mark as Favorite</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel>Make Public</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateCollection.isPending}
              >
                {updateCollection.isPending ? 'Updating...' : 'Update Collection'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
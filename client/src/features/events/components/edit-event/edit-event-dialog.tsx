// 🤖 INTERNAL NOTE:
// Purpose: Dialog for editing existing events
// Exports: EditEventDialog component
// Feature: events
// Dependencies: shadcn components, events hooks

import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateEvent } from "../../hooks/use-events";
import { Event, UpdateEventData } from "../../types/event-types";

interface EditEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
}

interface FormData {
  eventName: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
}

export function EditEventDialog({ open, onOpenChange, event }: EditEventDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    eventName: '',
    startDate: '',
    endDate: '',
    location: '',
    description: '',
  });

  const updateEvent = useUpdateEvent();

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        eventName: event.name,
        startDate: event.dateStart,
        endDate: event.dateEnd || '',
        location: event.location || '',
        description: event.description || '',
      });
    }
  }, [event]);

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validate form
  const isValid = formData.eventName.trim() && formData.startDate;

  // Handle form save
  const handleSave = () => {
    if (!event || !isValid) return;

    // Normalize to YYYY-MM-DD to avoid timezone shifts server-side
    const normalize = (s: string) => (s ? s.slice(0, 10) : "");

    const submitData: UpdateEventData = {
      name: formData.eventName,
      dateStart: normalize(formData.startDate),
      dateEnd: normalize(formData.endDate) || null,
      location: formData.location || null,
      description: formData.description || null,
    };

    updateEvent.mutate({ id: event.id, data: submitData }, {
      onSuccess: () => {
        handleClose();
        onOpenChange(false);
      },
    });
  };

  // Handle close
  const handleClose = () => {
    setFormData({
      eventName: '',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Show</span>
            <Button
              onClick={handleSave}
              disabled={!isValid || updateEvent.isPending}
              size="sm"
            >
              {updateEvent.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
            {/* Event Name */}
            <div>
              <label htmlFor="eventName" className="block text-sm font-medium text-foreground mb-2">
                Show Name
              </label>
              <input
                id="eventName"
                type="text"
                placeholder="e.g., Front Row Sports Card Show"
                value={formData.eventName}
                onChange={(e) => handleInputChange('eventName', e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none bg-card text-card-foreground"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-foreground mb-2">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none bg-card text-card-foreground"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-foreground mb-2">
                  End Date (Optional)
                </label>
                <div className="relative">
                  <input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none bg-card text-card-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-foreground mb-2">
                Location
              </label>
              <div className="relative">
                <input
                  id="location"
                  type="text"
                  placeholder="e.g., Los Angeles Convention Center"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none pr-10 bg-card text-card-foreground"
                />
                <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                Description (optional)
              </label>
              <textarea
                id="description"
                placeholder="Add any additional notes or details about the event..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none resize-none bg-card text-card-foreground"
              />
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
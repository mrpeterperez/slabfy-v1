import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUpdateConsignment } from "../../hooks/use-consignments";
import type { Consignment, ConsignorWithContact } from "@shared/schema";

interface EditConsignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  consignment: Consignment;
  consignor: ConsignorWithContact;
}

export const EditConsignmentDialog = ({ isOpen, onClose, consignment, consignor }: EditConsignmentDialogProps) => {
  const { toast } = useToast();
  const updateConsignment = useUpdateConsignment();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "active",
    paymentTerms: "",
    notes: "",
  });

  const [errors, setErrors] = useState<{
    title?: string;
  }>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen && consignment) {
      setFormData({
        title: consignment.title || "",
        description: consignment.description || "",
        status: consignment.status || "active",
        paymentTerms: consignment.paymentTerms || "",
        notes: consignment.notes || "",
      });
      setErrors({});
    }
  }, [isOpen, consignment]);

  // Handle input changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear validation errors when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate form fields
  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Consignment title is required";
    }
    
  // no commission validation
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form save
  const handleSave = async () => {
    try {
      // Validate form before submitting
      if (!validateForm()) {
        return;
      }

      // Prepare the payload
      const updateData = {
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status as "active" | "paused" | "completed" | "cancelled",
        paymentTerms: formData.paymentTerms || undefined,
        notes: formData.notes || undefined,
      };

      console.log("Updating consignment with data:", updateData);

      // Update the consignment
      await updateConsignment.mutateAsync({
        id: consignment.id,
        data: updateData,
      });

      toast({
        title: "Success", 
        description: "Consignment updated successfully",
      });

      handleClose();
    } catch (error) {
      console.error("Error updating consignment:", error);
      toast({
        title: "Error",
        description: "Failed to update consignment",
        variant: "destructive",
      });
    }
  };

  // Handle close
  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      status: "active",
      paymentTerms: "",
      notes: "",
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h1 className="text-2xl font-semibold font-heading text-foreground">
            Edit Consignment
          </h1>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Consignor Info (Read-only) */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-medium text-sm text-muted-foreground mb-2">Consignor</h3>
            <p className="font-medium">{consignor.name}</p>
            {consignor.email && <p className="text-sm text-muted-foreground">{consignor.email}</p>}
            {consignor.companyName && <p className="text-sm text-muted-foreground">{consignor.companyName}</p>}
          </div>

          {/* Consignment Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Consignment Title *</Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., John's Baseball Card Collection"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-destructive text-sm">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description of the consignment..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

            {/* Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input
              id="paymentTerms"
              type="text"
              placeholder="e.g., Net 30 days after sale"
              value={formData.paymentTerms}
              onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Internal notes about this consignment..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/30">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={updateConsignment.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {updateConsignment.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};
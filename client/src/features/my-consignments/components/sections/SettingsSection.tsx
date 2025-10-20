// 🤖 INTERNAL NOTE:
// Purpose: Settings section for editing consignment details
// Exports: SettingsSection component
// Feature: my-consignments

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Edit2, 
  Save, 
  X,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { useUpdateConsignment } from '../../hooks/use-consignments';
import type { ConsignmentWithDetails, ConsignorWithContact } from '@shared/schema';
import { getConsignmentStatusBadgeClass, getConsignmentStatusLabel } from "../../utils/status";
import { ConsignmentStatusPill, type ConsignmentStatus } from "@/components/status/consignment-status-pill";

interface SettingsSectionProps {
  consignment: ConsignmentWithDetails;
  consignor: ConsignorWithContact;
}

export function SettingsSection({ consignment, consignor }: SettingsSectionProps) {
  const { toast } = useToast();
  const updateConsignment = useUpdateConsignment();

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingTerms, setIsEditingTerms] = useState(false);

  const [formData, setFormData] = useState({
    title: consignment.title || "",
    description: consignment.description || "",
    status: consignment.status || "active",
    defaultSplitPercentage: consignment.defaultSplitPercentage || "95.00",
    paymentTerms: consignment.paymentTerms || "",
    notes: consignment.notes || "",
  });

  // Sync form data when consignment prop changes (after successful updates)
  useEffect(() => {
    setFormData({
      title: consignment.title || "",
      description: consignment.description || "",
      status: consignment.status || "active",
      defaultSplitPercentage: consignment.defaultSplitPercentage || "95.00",
      paymentTerms: consignment.paymentTerms || "",
      notes: consignment.notes || "",
    });
  }, [consignment]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const clampPercentInput = (value: string) => {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return '';
    if (num > 100) return '100';
    if (num < 0) return '0';
    return value;
  };

  const handleSaveDetails = async () => {
    try {
      await updateConsignment.mutateAsync({
        id: consignment.id,
        data: {
          title: formData.title,
          description: formData.description || undefined,
          status: formData.status as "active" | "paused" | "completed" | "cancelled",
          notes: formData.notes || undefined,
        },
      });

      toast({
        title: "Success",
        description: "Consignment details updated successfully",
      });

      setIsEditingDetails(false);
    } catch (error) {
      console.error("Error updating consignment:", error);
      toast({
        title: "Error",
        description: "Failed to update consignment details",
        variant: "destructive",
      });
    }
  };

  const handleSaveTerms = async () => {
    try {
  // Enforce 0..100 for split when saving
  const splitNum = Math.min(100, Math.max(0, parseFloat(formData.defaultSplitPercentage || '0')));
  const finalSplitString = Number.isNaN(splitNum) ? '0.00' : splitNum.toFixed(2);
  // capture previous split to enable smart-apply downstream
  const prevSplitString = consignment.defaultSplitPercentage || '95.00';

      await updateConsignment.mutateAsync({
        id: consignment.id,
        data: {
          // Ensure decimal string format
      defaultSplitPercentage: finalSplitString,
          paymentTerms: formData.paymentTerms || undefined,
        },
      });

      toast({
        title: "Success",
        description: "Business terms updated successfully",
      });

      // Broadcast an event so AssetsSection can offer to apply the new split to existing assets
      try {
        window.dispatchEvent(
          new CustomEvent('consignmentSplitUpdated', {
            detail: {
              consignmentId: consignment.id,
              newSplit: finalSplitString,
              oldSplit: prevSplitString,
            },
          })
        );
      } catch (e) {
        // no-op in non-browser environments
      }

      setIsEditingTerms(false);
    } catch (error) {
      console.error("Error updating consignment:", error);
      toast({
        title: "Error",
        description: "Failed to update business terms",
        variant: "destructive",
      });
    }
  };

  const handleCancelDetails = () => {
    setFormData(prev => ({
      ...prev,
      title: consignment.title || "",
      description: consignment.description || "",
      status: consignment.status || "active",
      notes: consignment.notes || "",
    }));
    setIsEditingDetails(false);
  };

  const handleCancelTerms = () => {
    setFormData(prev => ({
      ...prev,
      defaultSplitPercentage: consignment.defaultSplitPercentage || "95.00",
      paymentTerms: consignment.paymentTerms || "",
    }));
    setIsEditingTerms(false);
  };

  // Derived percentages for simple, read-only display
  const getCurrentSplitValue = () => {
    if (isEditingTerms) {
      return formData.defaultSplitPercentage;
    }
    return consignment.defaultSplitPercentage || '95.00';
  };

  const splitForDisplay = (() => {
    const rawValue = getCurrentSplitValue();
    const raw = parseFloat(rawValue || '95');
    const clamped = isNaN(raw) ? 95 : Math.max(0, Math.min(100, raw));
    return Math.round(clamped * 100) / 100;
  })();
  const houseSharePct = Math.round((100 - splitForDisplay) * 100) / 100;

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // use shared helper for status badge classes

  return (
    <div className="flex-1 min-w-0 w-full max-w-full">
      {/* Toolbar header - matches EventOrdersPage structure */}
      <div className="hidden lg:block border-b border-border px-8 py-4 min-h-[58px]">
        <div className="flex items-center justify-between gap-4 w-full">
          <h2 className="font-heading text-lg font-semibold text-foreground">Settings</h2>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pt-6 space-y-8 max-w-7xl mx-auto">
        {/* Consignment Details */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
            <h3 className="text-lg font-semibold">Consignment Details</h3>
            <p className="text-sm text-muted-foreground">Edit title, description, status, and notes</p>
          </div>
          {!isEditingDetails ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditingDetails(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelDetails}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveDetails}
                disabled={updateConsignment.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateConsignment.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Consignment Title</label>
              {isEditingDetails ? (
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter consignment title"
                  className="max-w-md"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{consignment.title || 'Untitled Consignment'}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              {isEditingDetails ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter consignment description (optional)"
                  className="max-w-md"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {consignment.description || 'No description added'}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex items-center gap-3">
                <ConsignmentStatusPill status={(isEditingDetails ? formData.status : consignment.status) as ConsignmentStatus} />
                {isEditingDetails && (
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Internal Notes</label>
              {isEditingDetails ? (
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Internal notes about this consignment"
                  className="max-w-md"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {consignment.notes || 'No notes added'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Clean Separator */}
      <div className="h-px bg-border w-full" />

      {/* Business Terms */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Business Terms</h3>
            <p className="text-sm text-muted-foreground">Configure Split % defaults and payment terms</p>
          </div>
          {!isEditingTerms ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditingTerms(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelTerms}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveTerms}
                disabled={updateConsignment.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateConsignment.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Commission fields removed */}

            {/* Split Percentage */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Default Split Percentage</label>
              
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                {isEditingTerms ? (
                  <>
                    {/* Input Section */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.defaultSplitPercentage}
                          onChange={(e) => handleInputChange('defaultSplitPercentage', clampPercentInput(e.target.value))}
                          className="w-24 text-center font-medium"
                        />
                        <span className="text-sm font-medium text-muted-foreground">%</span>
                      </div>
                      <span className="text-sm text-muted-foreground">goes to consignor</span>
                    </div>

                    {/* Split Breakdown - Editing */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                        <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                          {splitForDisplay}%
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
                  </>
                ) : (
                  <>
                    {/* Split Breakdown - Read Only */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                        <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                          {splitForDisplay}%
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
                  </>
                )}

                <p className="text-xs text-muted-foreground">
                  Default consignor share for new items added to this consignment. You can override per item.
                </p>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Terms</label>
              {isEditingTerms ? (
                <Input
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                  placeholder="e.g., Net 30 days"
                  className="max-w-md"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {consignment.paymentTerms || 'No payment terms specified'}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Payment terms for remitting payouts to the consignor
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Clean Separator */}
      <div className="h-px bg-border w-full" />

      {/* Consignor Information */}
      <section>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Consignor Information</h3>
          <p className="text-sm text-muted-foreground">Contact details for this consignment</p>
        </div>
        
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <p className="text-sm text-muted-foreground">{consignor?.contact?.name || 'Unknown'}</p>
              </div>

              {consignor?.contact?.email && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{consignor.contact.email}</p>
                </div>
              )}

              {consignor?.contact?.companyName && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company</label>
                  <p className="text-sm text-muted-foreground">{consignor.contact.companyName}</p>
                </div>
              )}

              {consignor?.contact?.phone && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-sm text-muted-foreground">{consignor.contact.phone}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              {consignor?.contact?.id && (
                <a
                  href={`/contacts/${consignor.contact.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View full contact profile
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Clean Separator */}
      <div className="h-px bg-border w-full" />

      {/* System Information */}
      <section>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">System Information</h3>
          <p className="text-sm text-muted-foreground">Consignment metadata and timestamps</p>
        </div>
        
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Created</label>
                <p className="text-sm text-muted-foreground">
                  {formatDate(consignment.createdAt)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Last Updated</label>
                <p className="text-sm text-muted-foreground">
                  {formatDate(consignment.updatedAt)}
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Consignment ID</label>
                <p className="text-sm text-muted-foreground font-mono">
                  {consignment.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      </div>
    </div>
  );
}
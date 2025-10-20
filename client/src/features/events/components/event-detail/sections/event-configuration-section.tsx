// 🤖 INTERNAL NOTE:
// Purpose: Settings section for editing event details including logo
// Exports: EventConfigurationSection component
// Feature: events

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { 
  Edit2, 
  Save, 
  X,
  Upload,
  MapPin,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { useUpdateEvent } from '../../../hooks/use-events';
import type { Event } from '@shared/schema';

interface EventConfigurationSectionProps {
  event: Event;
}

export function EventConfigurationSection({ event }: EventConfigurationSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const updateEvent = useUpdateEvent();

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Logo states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: event.name || "",
    dateStart: event.dateStart || "",
    dateEnd: event.dateEnd || "",
    location: event.location || "",
    description: event.description || "",
    status: event.status || "upcoming",
  });

  // Sync form data when event prop changes (after successful updates)
  useEffect(() => {
    setFormData({
      name: event.name || "",
      dateStart: event.dateStart || "",
      dateEnd: event.dateEnd || "",
      location: event.location || "",
      description: event.description || "",
      status: event.status || "upcoming",
    });
  }, [event]);

  // Initialize logo preview with current logo
  useEffect(() => {
    setLogoPreview(event.logoUrl ?? null);
  }, [event.logoUrl]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoSelect = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, GIF, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSaveDetails = async () => {
    try {
      // Normalize dates to YYYY-MM-DD to avoid timezone shifts
      const normalize = (s: string) => (s ? s.slice(0, 10) : "");

      await updateEvent.mutateAsync({
        id: event.id,
        data: {
          name: formData.name,
          dateStart: normalize(formData.dateStart),
          dateEnd: normalize(formData.dateEnd) || null,
          location: formData.location || null,
          description: formData.description || null,
          status: formData.status as "upcoming" | "active" | "completed" | "cancelled",
        },
      });

      toast({
        title: "Success",
        description: "Event details updated successfully",
      });

      setIsEditingDetails(false);
    } catch (error) {
      console.error("Error updating event:", error);
      toast({
        title: "Error",
        description: "Failed to update event details",
        variant: "destructive",
      });
    }
  };

  const handleSaveLogo = async () => {
    if (!user?.id || !logoFile) return;
    
    setUploading(true);
    
    try {
      // Upload logo
      const { data: { session } } = await (window as any).supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const uploadFormData = new FormData();
      uploadFormData.append('image', logoFile);
      const res = await fetch(`/api/user/${user.id}/event-logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Logo upload failed');
      }
      const json = await res.json();
      
      // Update event with new logo URL
      await updateEvent.mutateAsync({
        id: event.id,
        data: {
          logoUrl: json.imageUrl,
        },
      });

      toast({
        title: "Success",
        description: "Event logo updated successfully",
      });

      setIsEditingLogo(false);
      setLogoFile(null);
    } catch (error: any) {
      console.error("Error updating logo:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update event logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancelDetails = () => {
    // Reset form data to current event values
    setFormData({
      name: event.name || "",
      dateStart: event.dateStart || "",
      dateEnd: event.dateEnd || "",
      location: event.location || "",
      description: event.description || "",
      status: event.status || "upcoming",
    });
    setIsEditingDetails(false);
  };

  const handleCancelLogo = () => {
    // Reset logo to current event logo
    setLogoPreview(event.logoUrl || null);
    setLogoFile(null);
    setIsEditingLogo(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'live': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex-1 min-w-0 w-full max-w-full">
      {/* Toolbar Header */}
      <div className="hidden lg:block border-b border-border px-8 py-4 min-h-[58px] flex items-center">
        <div className="flex items-center justify-between gap-4 w-full">
          <h2 className="font-heading text-lg font-semibold text-foreground">Settings</h2>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">

      {/* Event Details */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Event Details</h3>
            <p className="text-sm text-muted-foreground">Edit name, dates, location, description, and status</p>
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
                disabled={updateEvent.isPending || !formData.name.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateEvent.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Event Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Name</label>
              {isEditingDetails ? (
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Front Row Sports Card Show"
                  className="max-w-md"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{event.name || 'Untitled Event'}</p>
              )}
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </label>
                {isEditingDetails ? (
                  <Input
                    type="date"
                    value={formData.dateStart}
                    onChange={(e) => handleInputChange('dateStart', e.target.value)}
                    className="max-w-md"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{formatDate(event.dateStart)}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date (Optional)
                </label>
                {isEditingDetails ? (
                  <Input
                    type="date"
                    value={formData.dateEnd}
                    onChange={(e) => handleInputChange('dateEnd', e.target.value)}
                    className="max-w-md"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{formatDate(event.dateEnd)}</p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </label>
              {isEditingDetails ? (
                <Input
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Los Angeles Convention Center"
                  className="max-w-md"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {event.location || 'No location specified'}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              {isEditingDetails ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Add any additional notes or details about the event..."
                  className="max-w-md"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {event.description || 'No description added'}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex items-center gap-3">
                {(() => {
                  const rawStatus = (isEditingDetails ? formData.status : event.status) || 'upcoming';
                  const label = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
                  return (
                    <div className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(rawStatus)}`}>
                      {label}
                    </div>
                  );
                })()}
                
                {isEditingDetails && (
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Clean Separator */}
      <div className="h-px bg-border w-full" />

      {/* Event Logo */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Event Logo</h3>
            <p className="text-sm text-muted-foreground">Upload and manage your event's logo image</p>
          </div>
          {!isEditingLogo ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditingLogo(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Logo
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelLogo}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveLogo}
                disabled={uploading || updateEvent.isPending || !logoFile}
              >
                <Save className="h-4 w-4 mr-2" />
                {uploading || updateEvent.isPending ? "Saving..." : "Save Logo"}
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Logo Image
              </label>
              
              <div className="flex items-center gap-6">
                {/* Logo Preview */}
                <div className="w-24 h-24 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Event Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground text-center">No Logo</span>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="space-y-3">
                  {isEditingLogo ? (
                    <div className="space-y-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleLogoSelect(e.target.files)} 
                        />
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">{uploading ? 'Uploading…' : 'Choose Image'}</span>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        JPEG, PNG, GIF, or WebP. Max 5MB.
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {event.logoUrl ? 'Logo uploaded' : 'No logo uploaded'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      </div>
    </div>
  );
}
// 🤖 INTERNAL NOTE:
// Purpose: Main Show Storefront settings page with split-screen live preview
// Exports: ShowStorefrontSettings component
// Feature: sales-channels/show-storefront
// Dependencies: shadcn components, settings panels, live preview

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Monitor, Smartphone, Home, Package, FileText, ShoppingCart } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import {
  GeneralSettingsTab,
  CustomerActionsTab,
  DesignSettingsTab,
} from "./components/settings";
import {
  useStorefrontSettings,
  useUpdateStorefrontSettings,
  useCreateStorefrontSettings,
} from "./hooks/use-storefront-settings";
import { PublicStorefrontPage } from "./components/public/public-storefront-page";
import { CartProvider } from "./hooks/use-cart";
import { PublishButton } from "./components/publish-button";
import { ThemeModeToggle, type ThemeMode } from "./components/settings/theme-mode-toggle";
import { useToast } from "@/hooks/use-toast";
import type { StorefrontSettings } from "@shared/schema";

type SettingsSection = "general" | "actions" | "design";

export function ShowStorefrontSettings() {
  const { user, loading: authLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { data: savedSettings, isLoading } = useStorefrontSettings();
  const updateSettings = useUpdateStorefrontSettings();
  const createSettings = useCreateStorefrontSettings();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [previewTab, setPreviewTab] = useState<"home" | "inventory" | "asset" | "checkout">("home");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewThemeMode, setPreviewThemeMode] = useState<ThemeMode>("light");
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const [previewSettings, setPreviewSettings] = useState<Partial<StorefrontSettings>>({
    primaryColor: "#037C85",
    accentColor: "#037C85",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    primaryColorDark: "#0aa5b0",
    accentColorDark: "#0aa5b0",
    backgroundColorDark: "#0a0a0a",
    textColorDark: "#ffffff",
    themeMode: "light",
    buttonRadius: 16,
  });

  // Interactive preview state
  const [selectedAssetId, setSelectedAssetId] = useState<string>('preview-1');
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);

  const [isDirty, setIsDirty] = useState(false);
  const [stagedLogoFile, setStagedLogoFile] = useState<File | null>(null);
  const [stagedLogoPreviewUrl, setStagedLogoPreviewUrl] = useState<string | null>(null);

  // Dummy preview assets for empty storefront
  const dummyPreviewAssets = [
    {
      id: 'preview-1',
      title: '2024 Bowman Chrome Prospect Card',
      playerName: 'Sample Player',
      year: 2024,
      setName: 'Bowman Chrome',
      cardNumber: '101',
      grade: 'GEM MT 10',
      certNumber: 'PREVIEW-001',
      psaImageFrontUrl: null,
      category: 'Baseball',
    },
    {
      id: 'preview-2',
      title: '2023 Prizm Basketball Rookie',
      playerName: 'Sample Rookie',
      year: 2023,
      setName: 'Prizm',
      cardNumber: '250',
      grade: 'MINT 9',
      certNumber: 'PREVIEW-002',
      psaImageFrontUrl: null,
      category: 'Basketball',
    },
    {
      id: 'preview-3',
      title: '2022 Topps Chrome Football',
      playerName: 'Sample Athlete',
      year: 2022,
      setName: 'Topps Chrome',
      cardNumber: '45',
      grade: 'GEM MT 10',
      certNumber: 'PREVIEW-003',
      psaImageFrontUrl: null,
      category: 'Football',
    },
    {
      id: 'preview-4',
      title: '2024 Panini Select Soccer',
      playerName: 'Sample Star',
      year: 2024,
      setName: 'Panini Select',
      cardNumber: '88',
      grade: 'MINT 9',
      certNumber: 'PREVIEW-004',
      psaImageFrontUrl: null,
      category: 'Soccer',
    },
    {
      id: 'preview-5',
      title: '2023 Stadium Club Baseball',
      playerName: 'Sample Legend',
      year: 2023,
      setName: 'Stadium Club',
      cardNumber: '200',
      grade: 'GEM MT 10',
      certNumber: 'PREVIEW-005',
      psaImageFrontUrl: null,
      category: 'Baseball',
    },
    {
      id: 'preview-6',
      title: '2024 Donruss Optic Basketball',
      playerName: 'Sample All-Star',
      year: 2024,
      setName: 'Donruss Optic',
      cardNumber: '75',
      grade: 'MINT 9',
      certNumber: 'PREVIEW-006',
      psaImageFrontUrl: null,
      category: 'Basketball',
    },
  ];

  // Fetch portfolio assets for preview
  const { data: portfolioAssets, isLoading: assetsLoading } = useQuery({
    queryKey: ["preview-portfolio", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user ID");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");
      const res = await fetch(`/api/user/${user.id}/assets`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch assets");
      return res.json();
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 0, // Always fetch fresh
    gcTime: 0, // Don't cache
  });

  // ALWAYS use dummy preview assets for storefront preview (not real inventory)
  const availableAssets = dummyPreviewAssets;

  // Initialize preview settings
  useEffect(() => {
    if (savedSettings) {
      setPreviewSettings((prev) => ({
        ...prev,
        ...savedSettings,
      }));
      // Also save to sessionStorage for iframe
      sessionStorage.setItem('storefront-preview-settings', JSON.stringify(savedSettings));
      sessionStorage.setItem('storefront-preview-timestamp', Date.now().toString());
    }
  }, [savedSettings]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handlePreviewChange = (updated: Partial<StorefrontSettings>) => {
    const updatedSettings = { 
      ...previewSettings, 
      ...updated,
      // Always preserve the current theme mode when updating other settings
      themeMode: updated.themeMode !== undefined ? updated.themeMode : previewThemeMode
    };
    setPreviewSettings(updatedSettings);
    // Save to sessionStorage for iframe
    sessionStorage.setItem('storefront-preview-settings', JSON.stringify(updatedSettings));
    sessionStorage.setItem('storefront-preview-timestamp', Date.now().toString());
    setIsDirty(true);
  };  const handleStageLogo = (file: File | null, previewUrl: string | null) => {
    if (stagedLogoPreviewUrl) URL.revokeObjectURL(stagedLogoPreviewUrl);
    setStagedLogoFile(file);
    setStagedLogoPreviewUrl(previewUrl);
    setPreviewSettings((prev) => ({ ...prev, storeLogo: previewUrl || "" }));
    setIsDirty(true);
  };

  const handleSaveChanges = async (silent = false) => {
    if (!user || !previewSettings) return;

    const payload: Partial<StorefrontSettings> & { userId: string } = {
      ...previewSettings,
      userId: user.id,
      storeName: previewSettings.storeName || "My Store",
    };

    // Upload logo if staged
    if (stagedLogoFile) {
      try {
        const ext = stagedLogoFile.name.split(".").pop() || "png";
        const path = `store-logos/${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("public-assets")
          .upload(path, stagedLogoFile, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
        payload.storeLogo = data.publicUrl;
      } catch (err) {
        toast({
          title: "Logo upload failed",
          description: "Could not upload the selected logo.",
          variant: "destructive",
        });
        return;
      }
    }

    if (savedSettings) await updateSettings.mutateAsync(payload as any);
    else await createSettings.mutateAsync(payload as any);

    setIsDirty(false);
    if (stagedLogoPreviewUrl) URL.revokeObjectURL(stagedLogoPreviewUrl);
    setStagedLogoFile(null);
    setStagedLogoPreviewUrl(null);

    if (!silent)
      toast({ title: "Settings saved!", description: "Your storefront has been updated." });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Please sign in to manage your storefront.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const menuItems = [
    { id: "general" as const, label: "General" },
    { id: "actions" as const, label: "Actions" },
    { id: "design" as const, label: "Design" },
  ];

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Left Panel */}
      <div className="w-96 flex flex-col border-r bg-background">
        <div className="p-4 border-b space-y-2">
          <h1 className="text-2xl font-bold">Show Storefront</h1>
          <p className="text-sm text-muted-foreground">Configure your public storefront</p>
        </div>

        <div className="flex gap-2 px-4 border-b">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSection === item.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {activeSection === "general" && (
            <GeneralSettingsTab
              settings={previewSettings as StorefrontSettings}
              onPreviewChange={handlePreviewChange}
              onStageLogo={handleStageLogo}
            />
          )}
          {activeSection === "actions" && (
            <CustomerActionsTab
              settings={previewSettings as StorefrontSettings}
              onPreviewChange={handlePreviewChange}
            />
          )}
          {activeSection === "design" && (
            <DesignSettingsTab
              settings={previewSettings as StorefrontSettings}
              onPreviewChange={handlePreviewChange}
            />
          )}
        </div>
      </div>

      {/* Right Panel - Live Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-background flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Preview:</span>
            
            {/* Tab Navigation */}
            <nav className="flex items-center">
              {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'inventory', label: 'Inventory', icon: Package },
                { id: 'checkout', label: 'Checkout', icon: ShoppingCart }
              ].map((tab) => {
                const isActive = previewTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setPreviewTab(tab.id as any);
                    }}
                    className={`
                      whitespace-nowrap py-2 px-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2
                      ${
                        isActive
                          ? "text-primary border-primary"
                          : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                      }
                    `}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Mode Toggle */}
            <ThemeModeToggle 
              mode={previewThemeMode}
              onModeChange={(mode) => {
                const updatedSettings = { ...previewSettings, themeMode: mode };
                // Save to sessionStorage FIRST before state updates
                sessionStorage.setItem('storefront-preview-settings', JSON.stringify(updatedSettings));
                sessionStorage.setItem('storefront-preview-timestamp', Date.now().toString());
                // Then update state to trigger iframe reload
                setPreviewThemeMode(mode);
                setPreviewSettings(updatedSettings);
                setIframeReloadKey(prev => prev + 1); // Force iframe reload
                setIsDirty(true);
              }}
            />
            
            {/* Device Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <button
                onClick={() => setPreviewDevice("desktop")}
                className={`p-2 rounded transition-colors ${
                  previewDevice === "desktop"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                aria-label="Desktop view"
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPreviewDevice("mobile")}
                className={`p-2 rounded transition-colors ${
                  previewDevice === "mobile"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                aria-label="Mobile view"
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="icon"
                onClick={() => {
                  // Save current preview settings to sessionStorage so fullscreen can use them
                  sessionStorage.setItem('storefront-preview-settings', JSON.stringify(previewSettings));
                  sessionStorage.setItem('storefront-preview-timestamp', Date.now().toString());
                  window.open('/storefront/preview', '_blank');
                }}
                aria-label="Preview storefront in fullscreen"
              >
                <Eye className="h-4 w-4" />
              </Button>
              
              {isDirty ? (
                <Button onClick={() => handleSaveChanges()} disabled={updateSettings.isPending}>
                  {updateSettings.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Changes
                </Button>
              ) : (
                <PublishButton
                  settings={previewSettings as StorefrontSettings}
                  hasUnsavedChanges={isDirty}
                />
              )}
            </div>
          </div>
        </div>

        {/* Border line for tabs */}
        <div className="border-b flex-shrink-0"></div>

        <div className="flex-1 overflow-y-auto bg-background flex items-start justify-center p-4">
          {/* Preview Content with device frame */}
          {previewDevice === "mobile" ? (
            <div className="w-[375px] border-8 border-gray-800 rounded-[2.5rem] shadow-2xl h-[812px] overflow-hidden bg-white">
              <iframe
                key={`mobile-preview-${iframeReloadKey}`}
                src={`/storefront/preview?t=${iframeReloadKey}`}
                className="w-full h-full border-0"
                title="Mobile Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : (
            <div className="w-full max-w-[1200px] border border-border rounded-lg shadow-lg min-h-[600px] overflow-hidden bg-white">
              <PublicStorefrontPage 
                previewSettings={previewSettings}
                initialTab={
                  previewTab === 'asset' ? 'inventory' : // Show inventory for asset tab
                  previewTab === 'checkout' ? 'checkout' : // Checkout should work
                  previewTab as "home" | "inventory" | "checkout"
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

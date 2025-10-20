// 🤖 INTERNAL NOTE:
// Purpose: Design settings tab (colors, fonts, styling)
// Exports: DesignSettingsTab component
// Feature: sales-channels/show-storefront
// Dependencies: react-hook-form, shadcn form components

import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { Form } from "@/components/ui/form";
import type { StorefrontSettings } from "@shared/schema";
import { ThemeSelector } from "./theme-selector";
import { PRE_MADE_THEMES } from "./themes";
import { CustomizationFields } from "./design/customization-fields";

interface DesignSettingsFormData {
  // Light mode colors
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor?: string;
  
  // Dark mode colors
  primaryColorDark?: string;
  accentColorDark?: string;
  backgroundColorDark?: string;
  textColorDark?: string;
  themeMode?: string;
  
  // Fonts and styling
  fontStyle: string;
  headingFont: string;
  buttonRadius: number;
  qrCodeColor: string;
  qrCodeLogoOverlay: boolean;
}

interface DesignSettingsTabProps {
  settings: StorefrontSettings | null | undefined;
  onPreviewChange?: (changes: Partial<StorefrontSettings>) => void;
}

export function DesignSettingsTab({ settings, onPreviewChange }: DesignSettingsTabProps) {
  const { user } = useAuth();
  const isInitialMount = useRef(true);

  if (!user) {
    return <div className="p-4 text-center text-muted-foreground">Please sign in to continue.</div>;
  }

  const form = useForm<DesignSettingsFormData>({
    defaultValues: {
      // Light mode
      primaryColor: settings?.primaryColor ?? "#037C85",
      accentColor: settings?.accentColor ?? "#037C85",
      backgroundColor: settings?.backgroundColor ?? "#ffffff",
      textColor: settings?.textColor ?? "#000000",
      
      // Dark mode
      primaryColorDark: settings?.primaryColorDark ?? "#0aa5b0",
      accentColorDark: settings?.accentColorDark ?? "#0aa5b0",
      backgroundColorDark: settings?.backgroundColorDark ?? "#0a0a0a",
      textColorDark: settings?.textColorDark ?? "#ffffff",
      themeMode: settings?.themeMode ?? "light",
      
      // Fonts and styling
      fontStyle: settings?.fontStyle ?? "Inter",
      headingFont: settings?.headingFont ?? "Bebas Neue",
      buttonRadius: settings?.buttonRadius ?? 16,
      qrCodeColor: settings?.qrCodeColor ?? "#000000",
      qrCodeLogoOverlay: settings?.qrCodeLogoOverlay ?? true,
    },
  });

  // Rehydrate when settings change from server
  useEffect(() => {
    if (!settings) return;
    form.reset({
      // Light mode
      primaryColor: settings.primaryColor ?? "#037C85",
      accentColor: settings.accentColor ?? "#037C85",
      backgroundColor: settings.backgroundColor ?? "#ffffff",
      textColor: settings.textColor ?? "#000000",
      
      // Dark mode
      primaryColorDark: settings.primaryColorDark ?? "#0aa5b0",
      accentColorDark: settings.accentColorDark ?? "#0aa5b0",
      backgroundColorDark: settings.backgroundColorDark ?? "#0a0a0a",
      textColorDark: settings.textColorDark ?? "#ffffff",
      themeMode: settings.themeMode ?? "light",
      
      // Fonts and styling
      fontStyle: settings.fontStyle ?? "Inter",
      headingFont: settings.headingFont ?? "Bebas Neue",
      buttonRadius: settings.buttonRadius ?? 16,
      qrCodeColor: settings.qrCodeColor ?? "#000000",
      qrCodeLogoOverlay: settings.qrCodeLogoOverlay ?? true,
    });
  }, [settings?.primaryColor, settings?.accentColor, settings?.backgroundColor, settings?.fontStyle, settings?.headingFont, settings?.buttonRadius, settings?.qrCodeColor, settings?.qrCodeLogoOverlay, settings?.headingFontColor, settings?.bodyFontColor]);

  // Watch form changes and update preview
  const watchedValues = form.watch();
  
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (onPreviewChange) {
      onPreviewChange(watchedValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchedValues.primaryColor, 
    watchedValues.accentColor, 
    watchedValues.backgroundColor, 
    watchedValues.textColor,
    watchedValues.primaryColorDark,
    watchedValues.accentColorDark,
    watchedValues.backgroundColorDark,
    watchedValues.textColorDark,
    watchedValues.themeMode,
    watchedValues.fontStyle, 
    watchedValues.headingFont, 
    watchedValues.buttonRadius, 
    watchedValues.qrCodeColor, 
    watchedValues.qrCodeLogoOverlay
  ]);

  // Handle theme selection - includes dark mode colors
  const handleThemeSelect = (theme: typeof PRE_MADE_THEMES[0]) => {
    // Light mode colors
    form.setValue("primaryColor", theme.primaryColor);
    form.setValue("accentColor", theme.accentColor);
    form.setValue("backgroundColor", theme.backgroundColor);
    
    // Light mode font colors (text color only - heading/body auto-calculated)
    if (theme.textColor) form.setValue("textColor", theme.textColor);
    
    // Dark mode colors
    if (theme.primaryColorDark) form.setValue("primaryColorDark", theme.primaryColorDark);
    if (theme.accentColorDark) form.setValue("accentColorDark", theme.accentColorDark);
    if (theme.backgroundColorDark) form.setValue("backgroundColorDark", theme.backgroundColorDark);
    if (theme.textColorDark) form.setValue("textColorDark", theme.textColorDark);
    
    // Fonts and styling
    form.setValue("headingFont", theme.headingFont);
    form.setValue("fontStyle", theme.bodyFont);
    form.setValue("buttonRadius", theme.buttonRadius);
  };

  return (
    <Form {...form}>
      <div className="space-y-0">
        {/* THEME SELECTOR */}
        <ThemeSelector 
          onThemeSelect={handleThemeSelect}
          currentPrimaryColor={form.watch("primaryColor")}
        />

        
        <CustomizationFields control={form.control} />
      </div>
    </Form>
  );
}

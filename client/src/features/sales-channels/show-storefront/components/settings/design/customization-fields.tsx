// 🤖 INTERNAL NOTE:
// Purpose: Manual color and font customization fields
// Exports: CustomizationFields component
// Feature: sales-channels/show-storefront
// Dependencies: react-hook-form, design field components

import { useState } from "react";
import { FormField } from "@/components/ui/form";
import { ColorPickerField } from "./color-picker-field";
import { FontSelectorField } from "./font-selector-field";
import { ButtonRadiusField } from "./button-radius-field";
import { QRCodeLogoField } from "./qr-code-logo-field";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Control } from "react-hook-form";

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

interface CustomizationFieldsProps {
  control: Control<DesignSettingsFormData>;
}

export function CustomizationFields({ control }: CustomizationFieldsProps) {
  const [lightModeOpen, setLightModeOpen] = useState(false);
  const [darkModeOpen, setDarkModeOpen] = useState(false);
  const [fontStyleOpen, setFontStyleOpen] = useState(false);
  const [generalStylingOpen, setGeneralStylingOpen] = useState(false);

  return (
    <>
      {/* Light Mode Colors - Collapsible */}
      <Collapsible open={lightModeOpen} onOpenChange={setLightModeOpen} className="pt-6">
        <CollapsibleTrigger className="flex items-center justify-between w-full pb-3 hover:opacity-70 transition-opacity">
          <div>
            <h3 className="text-sm font-semibold text-left">Light Mode Colors</h3>
            <p className="text-xs text-muted-foreground text-left">Colors used in light mode</p>
          </div>
          {lightModeOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 pb-3 pt-1">
          <FormField
            control={control}
            name="primaryColor"
            render={({ field }) => (
              <ColorPickerField
                label="Primary Color (Light)"
                description="Main brand color for buttons and accents"
                value={field.value}
                onChange={field.onChange}
                placeholder="#037C85"
              />
            )}
          />

          <FormField
            control={control}
            name="accentColor"
            render={({ field }) => (
              <ColorPickerField
                label="Accent Color (Light)"
                description="Secondary color for highlights"
                value={field.value}
                onChange={field.onChange}
                placeholder="#037C85"
              />
            )}
          />

          <FormField
            control={control}
            name="backgroundColor"
            render={({ field }) => (
              <ColorPickerField
                label="Background Color (Light)"
                description="Main background color (text colors auto-adjust for contrast)"
                value={field.value}
                onChange={field.onChange}
                placeholder="#ffffff"
              />
            )}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Dark Mode Colors - Collapsible */}
      <Collapsible open={darkModeOpen} onOpenChange={setDarkModeOpen} className="border-t pt-4">
        <CollapsibleTrigger className="flex items-center justify-between w-full pb-3 hover:opacity-70 transition-opacity">
          <div>
            <h3 className="text-sm font-semibold text-left">Dark Mode Colors</h3>
            <p className="text-xs text-muted-foreground text-left">Colors used in dark mode</p>
          </div>
          {darkModeOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pb-3 pt-1">
          <FormField
            control={control}
            name="primaryColorDark"
            render={({ field }) => (
              <ColorPickerField
                label="Primary Color (Dark)"
                description="Main brand color for dark mode"
                value={field.value || "#0aa5b0"}
                onChange={field.onChange}
                placeholder="#0aa5b0"
              />
            )}
          />

          <FormField
            control={control}
            name="accentColorDark"
            render={({ field }) => (
              <ColorPickerField
                label="Accent Color (Dark)"
                description="Secondary color for dark mode"
                value={field.value || "#0aa5b0"}
                onChange={field.onChange}
                placeholder="#0aa5b0"
              />
            )}
          />

          <FormField
            control={control}
            name="backgroundColorDark"
            render={({ field }) => (
              <ColorPickerField
                label="Background Color (Dark)"
                description="Main background for dark mode (text colors auto-adjust for contrast)"
                value={field.value || "#0a0a0a"}
                onChange={field.onChange}
                placeholder="#0a0a0a"
              />
            )}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Font Style - Collapsible */}
      <Collapsible open={fontStyleOpen} onOpenChange={setFontStyleOpen} className="border-t pt-4">
        <CollapsibleTrigger className="flex items-center justify-between w-full pb-3 hover:opacity-70 transition-opacity">
          <div>
            <h3 className="text-sm font-semibold text-left">Font Style</h3>
            <p className="text-xs text-muted-foreground text-left">Typography and font settings</p>
          </div>
          {fontStyleOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pb-3 pt-1">
          <FormField
            control={control}
            name="headingFont"
            render={({ field }) => (
              <FontSelectorField
                label="Heading Font (Store Name & Titles)"
                description={field.value ? `Selected: ${field.value}` : "Choose a font for headings"}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <FormField
            control={control}
            name="fontStyle"
            render={({ field }) => (
              <FontSelectorField
                label="Body Font (Descriptions & Regular Text)"
                description={field.value ? `Selected: ${field.value}` : "Choose a font for body text"}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* General Styling - Collapsible */}
      <Collapsible open={generalStylingOpen} onOpenChange={setGeneralStylingOpen} className="border-t pt-4">
        <CollapsibleTrigger className="flex items-center justify-between w-full pb-3 hover:opacity-70 transition-opacity">
          <div>
            <h3 className="text-sm font-semibold text-left">General Styling</h3>
            <p className="text-xs text-muted-foreground text-left">Additional design settings</p>
          </div>
          {generalStylingOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pb-3 pt-1">
          <FormField
            control={control}
            name="qrCodeColor"
            render={({ field }) => (
              <ColorPickerField
                label="QR Code Color"
                description="Color for QR code (default: black)"
                value={field.value}
                onChange={field.onChange}
                placeholder="#000000"
              />
            )}
          />

          <FormField
            control={control}
            name="qrCodeLogoOverlay"
            render={({ field }) => (
              <QRCodeLogoField value={field.value} onChange={field.onChange} />
            )}
          />

          <FormField
            control={control}
            name="buttonRadius"
            render={({ field }) => (
              <ButtonRadiusField value={field.value} onChange={field.onChange} />
            )}
          />
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
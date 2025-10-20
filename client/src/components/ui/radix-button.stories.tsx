// 🤖 INTERNAL NOTE:
// Purpose: Demo/test page for RadixButton component showing all variants and sizes
// Exports: RadixButtonShowcase component
// Feature: ui-components

import { RadixButton } from "./radix-button";
import { Plus, Settings, Archive, Trash2, Check, Download, Upload, ExternalLink } from "lucide-react";

export function RadixButtonShowcase() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">RadixButton Component</h1>
          <p className="text-muted-foreground text-lg">
            Modern, accessible button component with smooth animations and multiple variants
          </p>
        </div>

        {/* Variants Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Variants</h2>
          <div className="flex flex-wrap gap-4">
            <RadixButton variant="solid">Solid Button</RadixButton>
            <RadixButton variant="soft">Soft Button</RadixButton>
            <RadixButton variant="outline">Outline Button</RadixButton>
            <RadixButton variant="ghost">Ghost Button</RadixButton>
            <RadixButton variant="surface">Surface Button</RadixButton>
            <RadixButton variant="destructive">Destructive</RadixButton>
            <RadixButton variant="success">Success</RadixButton>
          </div>
        </div>

        {/* Sizes Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Sizes</h2>
          <div className="flex flex-wrap items-center gap-4">
            <RadixButton size="xs">Extra Small</RadixButton>
            <RadixButton size="sm">Small</RadixButton>
            <RadixButton size="md">Medium</RadixButton>
            <RadixButton size="lg">Large</RadixButton>
            <RadixButton size="xl">Extra Large</RadixButton>
          </div>
        </div>

        {/* Radius Options */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Radius Options</h2>
          <div className="flex flex-wrap gap-4">
            <RadixButton radius="none">No Radius</RadixButton>
            <RadixButton radius="sm">Small</RadixButton>
            <RadixButton radius="md">Medium</RadixButton>
            <RadixButton radius="lg">Large</RadixButton>
            <RadixButton radius="full">Full</RadixButton>
          </div>
        </div>

        {/* With Icons */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">With Icons</h2>
          <div className="flex flex-wrap gap-4">
            <RadixButton>
              <Plus className="h-4 w-4" />
              Add Item
            </RadixButton>
            <RadixButton variant="soft">
              <Settings className="h-4 w-4" />
              Settings
            </RadixButton>
            <RadixButton variant="outline">
              <Archive className="h-4 w-4" />
              Archive
            </RadixButton>
            <RadixButton variant="destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </RadixButton>
          </div>
        </div>

        {/* Icon Only */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Icon Only</h2>
          <div className="flex flex-wrap gap-4">
            <RadixButton size="icon">
              <Plus className="h-4 w-4" />
            </RadixButton>
            <RadixButton size="icon" variant="soft">
              <Settings className="h-4 w-4" />
            </RadixButton>
            <RadixButton size="icon" variant="outline">
              <Archive className="h-4 w-4" />
            </RadixButton>
            <RadixButton size="icon-sm" variant="ghost">
              <Check className="h-4 w-4" />
            </RadixButton>
            <RadixButton size="icon-lg" variant="surface">
              <Download className="h-4 w-4" />
            </RadixButton>
          </div>
        </div>

        {/* Loading States */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Loading States</h2>
          <div className="flex flex-wrap gap-4">
            <RadixButton loading>Loading...</RadixButton>
            <RadixButton variant="soft" loading>
              Processing
            </RadixButton>
            <RadixButton variant="outline" loading>
              Saving
            </RadixButton>
          </div>
        </div>

        {/* Disabled States */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Disabled States</h2>
          <div className="flex flex-wrap gap-4">
            <RadixButton disabled>Disabled</RadixButton>
            <RadixButton variant="soft" disabled>
              Disabled Soft
            </RadixButton>
            <RadixButton variant="outline" disabled>
              Disabled Outline
            </RadixButton>
          </div>
        </div>

        {/* Real-world Examples */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Real-world Examples</h2>
          
          {/* Action Group */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-muted-foreground">Action Group</h3>
            <div className="flex gap-3">
              <RadixButton>
                <Plus className="h-4 w-4" />
                Create Event
              </RadixButton>
              <RadixButton variant="soft">
                <Upload className="h-4 w-4" />
                Import
              </RadixButton>
              <RadixButton variant="outline">
                <ExternalLink className="h-4 w-4" />
                Export
              </RadixButton>
            </div>
          </div>

          {/* Form Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-muted-foreground">Form Actions</h3>
            <div className="flex gap-3">
              <RadixButton variant="ghost">Cancel</RadixButton>
              <RadixButton variant="outline">Save Draft</RadixButton>
              <RadixButton>Submit</RadixButton>
            </div>
          </div>

          {/* Dangerous Action */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-muted-foreground">Dangerous Action</h3>
            <div className="flex gap-3">
              <RadixButton variant="outline">Keep Items</RadixButton>
              <RadixButton variant="destructive">
                <Trash2 className="h-4 w-4" />
                Delete Forever
              </RadixButton>
            </div>
          </div>
        </div>

        {/* Color Combinations */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">On Different Backgrounds</h2>
          
          {/* Light background */}
          <div className="p-6 bg-card rounded-xl border space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">On Card Background</h3>
            <div className="flex flex-wrap gap-3">
              <RadixButton>Primary</RadixButton>
              <RadixButton variant="soft">Soft</RadixButton>
              <RadixButton variant="outline">Outline</RadixButton>
              <RadixButton variant="ghost">Ghost</RadixButton>
            </div>
          </div>

          {/* Dark background */}
          <div className="p-6 bg-primary/5 rounded-xl space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">On Tinted Background</h3>
            <div className="flex flex-wrap gap-3">
              <RadixButton>Primary</RadixButton>
              <RadixButton variant="soft">Soft</RadixButton>
              <RadixButton variant="outline">Outline</RadixButton>
              <RadixButton variant="ghost">Ghost</RadixButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

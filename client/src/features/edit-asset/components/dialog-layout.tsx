// 🤖 INTERNAL NOTE (LLM):
// This file defines the DialogLayout component.
// It provides the structure for the Edit Asset dialog with tabs and buttons.
// Part of the `edit-asset` feature.
// Serves as the layout wrapper for all tab content components.

import { ReactNode } from "react";
import { UseFormReturn } from "react-hook-form";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

// Types
import { DialogLayoutProps, TabItem } from "../types";

/**
 * Layout component for the edit asset dialog
 * Handles the dialog structure, tabs navigation, and buttons
 */
export const DialogLayout = ({
  asset,
  open,
  onOpenChange,
  tabs,
  activeTab,
  setActiveTab,
  onSubmit,
  form,
  isSubmitting,
}: DialogLayoutProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-screen p-0 flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <DialogHeader className="px-6 py-4">
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the details of your asset below.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col h-full"
        >
          {/* Tabs Navigation and Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Use a single Tabs component for both navigation and content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="basic-info" className="flex flex-col h-full">
              <div className="px-6 pt-4 bg-muted/10 border-b border-border">
                <TabsList
                  className="w-full grid"
                  style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
                >
                  {tabs.map((tab: TabItem) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      disabled={tab.disabled}
                      className={
                        tab.disabled ? "opacity-50 cursor-not-allowed" : ""
                      }
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            
              {/* Tab content area */}
              <div className="flex-1 overflow-y-auto p-6">
                {tabs.map((tab: TabItem) => (
                  <TabsContent
                    key={tab.id}
                    value={tab.id}
                    className="h-full data-[state=active]:flex-1 data-[state=active]:flex data-[state=active]:flex-col"
                  >
                    {tab.content}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>

          {/* Sticky Footer */}
          <div className="fixed bottom-0 bg-background border-t border-border mt-auto w-full">
            <DialogFooter className="px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="shrink-0 whitespace-nowrap"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[140px] shrink-0 whitespace-nowrap inline-flex items-center justify-center">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

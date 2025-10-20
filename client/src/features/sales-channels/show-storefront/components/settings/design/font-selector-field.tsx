// 🤖 INTERNAL NOTE:
// Purpose: Reusable font selector with searchable dropdown
// Exports: FontSelectorField component
// Feature: sales-channels/show-storefront
// Dependencies: react, react-hook-form, shadcn components

import { useState } from "react";
import { FormControl, FormDescription, FormItem, FormLabel } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { GOOGLE_FONTS } from "../../../constants/google-fonts";

interface FontSelectorFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

export function FontSelectorField({
  label,
  description,
  value,
  onChange,
}: FontSelectorFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormItem className="flex flex-col">
      <FormLabel className="text-foreground text-sm">{label}</FormLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "w-full justify-between",
                !value && "text-muted-foreground"
              )}
            >
              {value || "Select font..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search fonts..." />
            <CommandEmpty>No font found.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {GOOGLE_FONTS.map((font) => (
                  <CommandItem
                    value={font.name}
                    key={font.name}
                    onSelect={() => {
                      onChange(font.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        font.name === value
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span style={{ fontFamily: font.name }}>{font.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {font.category} • {font.vibe}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FormDescription className="text-xs">{description}</FormDescription>
    </FormItem>
  );
}

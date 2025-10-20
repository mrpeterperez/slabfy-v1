// 🤖 INTERNAL NOTE:
// Purpose: Lightweight Buyer selector (search existing contacts or add new) for checkout
// Exports: BuyerSelector component
// Feature: events/checkout

import React from "react";
import { Search, User, Building, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useContacts } from "@/features/contacts/hooks/use-contacts";

export interface BuyerSelectorValue {
  id?: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export function BuyerSelector({
  label = "Buyer",
  value,
  onChange,
  required,
  showValidation,
  hideSearch = false, // Hide search when buyer is pre-filled from order
}: {
  label?: string;
  value: BuyerSelectorValue | null;
  onChange: (buyer: BuyerSelectorValue) => void;
  required?: boolean;
  showValidation?: boolean;
  hideSearch?: boolean;
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const { data: contacts = [] } = useContacts(false); // Only fetch active (non-archived) contacts
  // Local editable details once a buyer is chosen/added
  const [details, setDetails] = React.useState<BuyerSelectorValue | null>(value);

  // Keep local details in sync when parent value changes (e.g., selecting a contact)
  React.useEffect(() => {
    setDetails(value);
  }, [value]);

  const filtered = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [] as any[];
    return contacts.filter((c: any) =>
      (c?.name || "").toLowerCase().includes(q) ||
      (c?.companyName || "").toLowerCase().includes(q)
    );
  }, [contacts, searchTerm]);

  const handlePick = (c: any) => {
    const picked: BuyerSelectorValue = {
      id: c.id,
      name: c.name,
      companyName: c.companyName || null,
      email: c.email || null,
      phone: c.phone || null,
    };
    onChange(picked);
    setDetails(picked);
    setSearchTerm(c.name || "");
    setShowSuggestions(false);
  };

  const handleAddNew = () => {
    if (!searchTerm.trim()) return;
    const created: BuyerSelectorValue = { name: searchTerm.trim() };
    onChange(created);
    setDetails(created);
    setShowSuggestions(false);
  };

  const hasError = required && showValidation && !value;

  const updateField = (field: keyof BuyerSelectorValue, v: string) => {
    setDetails((prev) => {
      const next = { ...(prev || { name: "" }), [field]: v } as BuyerSelectorValue;
      onChange(next);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}{required ? " *" : ""}</label>
      
      {/* Hide search when buyer is pre-filled from order */}
      {!hideSearch && (
        <div className="relative">
          <Input
            type="text"
            placeholder="Search contacts or add new buyer"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            size="lg"
            className={hasError ? "border-destructive" : undefined}
            aria-label="Search or add buyer"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />

          {showSuggestions && (searchTerm.length > 0) && (
            <div className="absolute z-10 w-full bg-card border border-border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => handlePick(c)}
                    className="w-full text-left p-3 hover:bg-muted focus:bg-muted outline-none block"
                  >
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" /> {c.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      {c.companyName && (<><Building className="w-3 h-3" /> {c.companyName}</>)}
                      {c.email && (<><span className="mx-1">•</span><Mail className="w-3 h-3" /> {c.email}</>)}
                    </p>
                  </button>
                ))
              ) : (
                <div className="p-3 text-muted-foreground text-center">
                  No contacts found.
                  <Button onMouseDown={handleAddNew} onClick={handleAddNew} className="w-full mt-2">
                    Add buyer "{searchTerm}"
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Editable buyer details (like consignor) shown once a buyer is selected or added */}
      {details && (
        <div className="space-y-4 mt-3">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Buyer Name{required ? " *" : ""}
            </label>
            <Input
              type="text"
              value={details.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              size="lg"
              className={(showValidation && required && !details.name?.trim()) ? "border-destructive" : undefined}
            />
            {(showValidation && required && !details.name?.trim()) && (
              <p className="text-xs text-destructive mt-1">Buyer name is required.</p>
            )}
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Company</label>
            <div className="relative">
              <Input
                type="text"
                placeholder="e.g., Smith Sports Cards"
                value={details.companyName ?? ""}
                onChange={(e) => updateField("companyName", e.target.value)}
                size="lg"
                className="pr-10"
              />
              <Building className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <div className="relative">
              <Input
                type="email"
                placeholder="e.g., john@example.com"
                value={details.email ?? ""}
                onChange={(e) => updateField("email", e.target.value)}
                size="lg"
                className="pr-10"
              />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
            <div className="relative">
              <Input
                type="tel"
                placeholder="e.g., (555) 123-4567"
                value={details.phone ?? ""}
                onChange={(e) => updateField("phone", e.target.value)}
                size="lg"
                className="pr-10"
              />
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      )}
      {hasError && (
        <p className="text-xs text-destructive">Buyer is required.</p>
      )}
    </div>
  );
}

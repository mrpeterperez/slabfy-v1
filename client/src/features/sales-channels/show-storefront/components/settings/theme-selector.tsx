// 🤖 INTERNAL NOTE:
// Purpose: Pre-made theme selector for quick storefront setup
// Exports: ThemeSelector component
// Feature: sales-channels/show-storefront
// Dependencies: shadcn components, theme data

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Palette } from "lucide-react";
import { PRE_MADE_THEMES, type ThemeData } from "./themes";

interface ThemeSelectorProps {
  onThemeSelect: (theme: ThemeData) => void;
  currentPrimaryColor?: string;
}

export function ThemeSelector({ onThemeSelect, currentPrimaryColor }: ThemeSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["modern"]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const categories = [
    { id: "modern", label: "Modern & Professional", icon: Palette },
    { id: "sophisticated", label: "Sophisticated & Neutral", icon: Palette },
    { id: "bold", label: "Bold & Wild", icon: Palette },
  ];

  const themesByCategory = {
    bold: PRE_MADE_THEMES.filter(t => t.category === "bold"),
    sophisticated: PRE_MADE_THEMES.filter(t => t.category === "sophisticated"),
    modern: PRE_MADE_THEMES.filter(t => t.category === "modern"),
    elegant: PRE_MADE_THEMES.filter(t => t.category === "elegant"),
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-1 text-foreground">Quick Themes</h3>
        <p className="text-xs text-muted-foreground">Professional color palettes inspired by Squarespace</p>
      </div>
      
      <div className="space-y-3">
        {categories.map((category) => {
          const isExpanded = expandedCategories.includes(category.id);
          const themes = themesByCategory[category.id as keyof typeof themesByCategory];
          
          return (
            <div key={category.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium text-foreground">{category.label}</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              
              {isExpanded && (
                <div className="p-3 grid grid-cols-4 gap-2">
                  {themes.map((theme) => {
                    const isActive = currentPrimaryColor === theme.primaryColor;
                    
                    return (
                      <button
                        key={theme.name}
                        onClick={() => onThemeSelect(theme)}
                        className={`relative flex flex-col items-center gap-2 p-2 rounded-lg border transition-all hover:scale-105 ${
                          isActive 
                            ? "border-primary bg-accent" 
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          </div>
                        )}
                        
                        <div 
                          className="w-10 h-10 rounded-md shadow-sm"
                          style={{
                            background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.accentColor} 100%)`,
                          }}
                        />
                        
                        <div className="text-center w-full">
                          <p className="text-xs font-medium text-foreground truncate">{theme.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Re-export for backward compatibility
export { PRE_MADE_THEMES } from "./themes";

// 🤖 INTERNAL NOTE:
// Purpose: New user prompt component for empty portfolio v0 state
// Exports: NewUserPromptV0 component
// Feature: my-portfolio-v0
// Dependencies: react, lucide-react, @/components/ui

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewUserPromptV0Props {
  onAddAsset?: () => void;
}

export function NewUserPromptV0({ onAddAsset }: NewUserPromptV0Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <p className="text-muted-foreground mb-3">No assets found</p>
      <p className="text-sm text-muted-foreground mb-6">Your portfolio assets will appear here</p>
      <Button onClick={onAddAsset} size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Asset
      </Button>
    </div>
  );
}
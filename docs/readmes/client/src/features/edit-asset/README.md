# Edit Asset Feature

## Purpose
This feature provides functionality for editing existing assets in the collection through a tabbed modal dialog interface. It allows users to modify all attributes of an asset including basic information, grading details, serial numbering, purchase information, and additional notes.

## Components
- `EditAssetModal`: Main component orchestrating the edit asset workflow, renamed to `EditAssetDialog` in the index exports for backward compatibility
- `DialogLayout`: Reusable dialog layout component that handles the modal structure and tab selection
- `BasicInfoTab`: Tab component for editing basic asset information
- `GradingInfoTab`: Tab component for editing grading details (only shown for graded assets)
- `PurchaseInfoTab`: Tab component for editing purchase information
- `AdditionalInfoTab`: Tab component for editing additional asset information and notes

## Types
- `EditAssetModalProps`: Props for the main modal component
- `DialogLayoutProps`: Props for the layout component
- `TabItem`: Interface for tab configuration

## Utilities
- `form-utils.ts`: Contains helper functions for handling form fields

## API
- `asset-api.ts`: Contains the `updateAsset` function for sending asset updates to the backend and type definitions

## Dependencies
### Shared libraries: 
- `@/components/ui/*`: UI components from ShadCN
- `@/hooks/use-toast`: Toast notification hook
- `@/components/auth-provider`: Authentication context
- `@tanstack/react-query`: Data fetching and mutation
- `@hookform/resolvers/zod`: Form validation
- `react-hook-form`: Form handling

### Shared code:
- `@shared/schema`: Asset schema definitions and types

## Usage
This feature is used within any component that needs to provide asset editing functionality, including:
- Asset detail view
- Asset collection (list view)

## Example
```tsx
import { EditAssetDialog } from '@/features/edit-asset';
import { useState } from 'react';
import { Asset } from '@shared/schema';

const MyComponent = () => {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Edit Asset</button>
      <EditAssetDialog 
        asset={asset}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </div>
  );
};
```

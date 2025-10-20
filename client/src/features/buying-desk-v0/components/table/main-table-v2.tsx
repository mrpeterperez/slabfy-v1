// 🤖 INTERNAL NOTE:
// Purpose: Main entry point for buying desk table with error boundary
// Exports: BuyingDeskTable component
// Feature: buying-desk-v0
// Dependencies: error boundary, table container

import { BuyingDeskErrorBoundary } from "../error-boundary";
import { TableContainer } from "./table-container";

interface Props { 
  sessionId: string; 
  onOpenCart?: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function BuyingDeskTable({ sessionId, onOpenCart, search, onSearchChange }: Props) {
  return (
    <BuyingDeskErrorBoundary>
      <TableContainer 
        sessionId={sessionId} 
        onOpenCart={onOpenCart}
        search={search}
        onSearchChange={onSearchChange}
      />
    </BuyingDeskErrorBoundary>
  );
}
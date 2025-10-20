import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Handshake, User as UserIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as React from 'react';

export type OwnershipType = 'portfolio' | 'consignment';

interface OwnershipBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  type: OwnershipType;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline';
  showLabel?: boolean; // optional escape hatch to render text label inline
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  // When provided, makes the badge interactive (cursor + hover styles). Prefer passing onClick directly.
  interactive?: boolean;
}

/**
 * Unified ownership badge component with consistent labels and colors
 * - Personal (Portfolio): Blue
 * - Consignment: Purple/Outline
 */
export function OwnershipBadge({ type, className, variant, showLabel = false, tooltipSide = 'top', interactive, onClick, ...rest }: OwnershipBadgeProps) {
  const isConsignment = type === 'consignment';
  const baseLabel = isConsignment ? 'Consignment' : 'Personal';
  // For interactive consignment pills, adjust tooltip to say "Open Consignment" and show immediately
  const tooltipLabel = isConsignment && (interactive || !!onClick) ? 'Open Consignment' : baseLabel;

  // Colors stay the same as before
  const colorClasses = isConsignment
    ? 'bg-purple-background text-purple-primary border-purple-primary'
    : 'bg-blue-background text-blue-primary border-blue-primary';

  const Icon = isConsignment ? Handshake : UserIcon;
  const badgeVariant = variant || 'outline';

  // Interactive/hover styles (requested: solid purple on hover with white icon/text)
  const interactiveClasses = (interactive || !!onClick)
    ? (isConsignment
        ? 'cursor-pointer hover:bg-purple-primary hover:text-white hover:border-purple-primary focus-visible:ring-2 focus-visible:ring-ring'
        : 'cursor-default')
    : '';

  const content = (
    <Badge
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          (onClick as any)?.(e);
        }
      } : undefined}
      onClick={onClick}
      variant={badgeVariant}
      className={cn('text-xs font-medium inline-flex items-center justify-center gap-1 transition-colors', colorClasses, interactiveClasses, className)}
      {...rest}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {showLabel && <span>{baseLabel}</span>}
      {!showLabel && <span className="sr-only">{baseLabel}</span>}
    </Badge>
  );

  // Default behavior: icon-only badge with tooltip showing the label
  if (!showLabel) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side={tooltipSide}>{tooltipLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

/**
 * Utility function to get ownership type from various asset objects
 */
export function getOwnershipType(asset: any): OwnershipType {
  // Handle different property names across the codebase
  if (asset?.ownershipType) return asset.ownershipType === 'consignment' ? 'consignment' : 'portfolio';
  // IMPORTANT: Do NOT look at asset.type (graded/raw/etc.) for ownership; that caused false "Personal" labels
  if (asset?.ownershipStatus === 'consignment') return 'consignment';
  if (asset?.ownershipStatus === 'Cons') return 'consignment';
  
  // Default to portfolio/personal
  return 'portfolio';
}

/**
 * Utility function for consistent ownership colors in other components
 */
export function getOwnershipColor(type: OwnershipType): string {
  return type === 'consignment'
    ? 'bg-purple-background text-purple-primary border-purple-primary'
    : 'bg-blue-background text-blue-primary border-blue-primary';
}

// Convenience components if we ever want to reference directly
export const PersonalBadge = (props: Omit<OwnershipBadgeProps, 'type'>) => (
  <OwnershipBadge type="portfolio" {...props} />
);
export const ConsignmentBadge = (props: Omit<OwnershipBadgeProps, 'type'>) => (
  <OwnershipBadge type="consignment" {...props} />
);
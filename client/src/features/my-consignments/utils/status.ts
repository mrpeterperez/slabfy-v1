// Shared helpers for Consignment status display
// Keeps labels and badge class variants consistent across the feature

export type ConsignmentStatus = "active" | "paused" | "completed" | "cancelled" | string;

export function normalizeStatusToken(status?: string): ConsignmentStatus {
  return (status || "").toLowerCase().replace(/\s+|-/g, (m) => (m === "-" ? "-" : "")) as ConsignmentStatus;
}

export function getConsignmentStatusLabel(status?: string): string {
  switch (normalizeStatusToken(status)) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Unknown";
  }
}

// Tailwind utility classes aligned with slabfyrules tokens
export function getConsignmentStatusBadgeClass(status?: string): string {
  switch (normalizeStatusToken(status)) {
    case "active":
      return "bg-success-subtle text-success border-success/30";
    case "completed":
      return "bg-brand/subtle text-brand border-brand/30";
    case "paused":
      return "bg-warning-subtle text-warning border-warning/30";
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/30";
    default:
      return "bg-muted text-foreground border-border";
  }
}

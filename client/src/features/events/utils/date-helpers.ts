// 🤖 INTERNAL NOTE:
// Purpose: Date formatting and manipulation utilities for events
// Exports: formatEventDate, isEventActive, getEventDuration
// Feature: events
// Dependencies: date-fns

import { format, isToday, isTomorrow, isYesterday, differenceInDays } from "date-fns";

// Format event date for display
export function formatEventDate(date: string | Date): string {
  const eventDate = typeof date === "string" ? new Date(date) : date;
  
  if (isToday(eventDate)) {
    return "Today";
  }
  
  if (isTomorrow(eventDate)) {
    return "Tomorrow";
  }
  
  if (isYesterday(eventDate)) {
    return "Yesterday";
  }
  
  return format(eventDate, "MMM dd, yyyy");
}

// Format date range for events
export function formatEventDateRange(startDate: string | Date, endDate?: string | Date | null): string {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  
  if (!endDate) {
    return formatEventDate(start);
  }
  
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  const daysDiff = differenceInDays(end, start);
  
  if (daysDiff === 0) {
    return formatEventDate(start);
  }
  
  // Same month
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, "MMM dd")}-${format(end, "dd, yyyy")}`;
  }
  
  // Different months
  return `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}`;
}

// Check if event is currently active
export function isEventActive(startDate: string | Date, endDate?: string | Date | null): boolean {
  const now = new Date();
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = endDate ? (typeof endDate === "string" ? new Date(endDate) : endDate) : start;
  
  // Set times for proper comparison
  const startOfDay = new Date(start);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);
  
  return now >= startOfDay && now <= endOfDay;
}

// Get event duration in days
export function getEventDuration(startDate: string | Date, endDate?: string | Date | null): number {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  
  if (!endDate) {
    return 1; // Single day event
  }
  
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  return differenceInDays(end, start) + 1; // Include both start and end days
}
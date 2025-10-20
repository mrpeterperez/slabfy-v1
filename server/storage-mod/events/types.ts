import type { Event, InsertEvent, UpdateEvent, CardShow } from "@shared/schema";

export interface IEventsStorage {
  createEvent(event: InsertEvent & { id: string, userId: string }): Promise<Event>;
  getEventsByUserId(userId: string, archived?: boolean): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  updateEvent(id: string, event: UpdateEvent): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  getEventsSummary(userId: string): Promise<{ totalEvents: number; totalBuyOffers: number; totalSold: number; totalRevenue: number; totalProfit: number; }>;

  searchCardShows(query: string, limit?: number): Promise<CardShow[]>;
  getUpcomingCardShows(limit?: number): Promise<CardShow[]>;
  bulkInsertCardShows?(shows: any[]): Promise<any[]>;
}

import type { UUID } from "../base/types";
import type { User, InsertUser } from "@shared/schema";

export interface IUserStorage {
  getUser(id: UUID): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { id: UUID }): Promise<User>;
  updateUserCollections(userId: UUID, collections: string[]): Promise<User>;
  updateOnboardingStatus(userId: UUID, completed: boolean): Promise<User>;
  updateUserProfile(userId: UUID, profile: { name?: string; bio?: string; avatarUrl?: string | null }): Promise<User>;
  updateUsername(userId: UUID, username: string): Promise<User>;
  getUserPreferences(userId: UUID): Promise<any>;
  updateUserPreferences(userId: UUID, prefs: any): Promise<any>;
}

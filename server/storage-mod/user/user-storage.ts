import { BaseStorage } from "../base/base-storage";
import type { IUserStorage } from "./types";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export class UserStorage extends BaseStorage implements IUserStorage {
  async getUser(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user || undefined;
  }

  async createUser(insertUser: any) {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserCollections(userId: string, collections: string[]) {
    const [updatedUser] = await this.db
      .update(users)
      .set({ collections })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateOnboardingStatus(userId: string, completed: boolean) {
    const [updatedUser] = await this.db
      .update(users)
      .set({ onboardingComplete: completed ? "true" : "false" })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserProfile(userId: string, profile: { name?: string; bio?: string; avatarUrl?: string | null }) {
    const [updatedUser] = await this.db
      .update(users)
      .set(profile)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUsername(userId: string, username: string) {
    const lowerUsername = username.toLowerCase();
    const existingUser = await this.getUserByUsername(lowerUsername);
    if (existingUser && existingUser.id !== userId) {
      throw new Error("Username already taken");
    }
    const [updatedUser] = await this.db
      .update(users)
      .set({ username: lowerUsername })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getUserPreferences(userId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    return (user as any)?.preferences || {};
  }

  async updateUserPreferences(userId: string, prefs: any) {
    await this.db.update(users).set({ preferences: prefs as any }).where(eq(users.id, userId));
    return prefs;
  }
}

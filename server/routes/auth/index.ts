import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { storage } from "../../storage-mod/registry";
import { db } from "../../db";
import { insertUserSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Schemas (mirror existing logic, but auth is handled by Supabase)
const signUpSchema = insertUserSchema.extend({
  email: z.string().email("Invalid email address"),
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const validatedData = signUpSchema.parse(req.body);

    if (!validatedData.email || validatedData.email.length > 255) {
      return res.status(400).json({ error: "Invalid email format or length" });
    }
    const { id, inviteCode } = req.body as { id?: string; inviteCode?: string };
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const existingUser = await storage.getUserByEmail(validatedData.email);
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    if (!inviteCode || typeof inviteCode !== "string" || inviteCode.trim().length !== 8) {
      return res.status(403).json({ error: "Invite code required", code: "INVITE_REQUIRED" });
    }

    const { inviteCodes } = await import("@shared/schema");
    const [codeRow] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, inviteCode.toUpperCase())).limit(1);

    if (!codeRow) return res.status(403).json({ error: "Invalid invite code", code: "INVITE_INVALID" });
    if (!codeRow.isActive) return res.status(403).json({ error: "This invite code has been deactivated", code: "INVITE_INACTIVE" });
    if (codeRow.expiresAt && new Date() > codeRow.expiresAt) {
      return res.status(403).json({ error: "This invite code has expired", code: "INVITE_EXPIRED" });
    }
    if ((codeRow.currentUses ?? 0) >= (codeRow.maxUses ?? 1)) {
      return res.status(403).json({ error: "This invite code has reached its usage limit", code: "INVITE_EXHAUSTED" });
    }

  // Only persist fields that exist in our users table (email, optional username)
  const user = await storage.createUser({ id, email: validatedData.email, username: (validatedData as any).username });

    const { inviteCodes: inviteCodesTable } = await import("@shared/schema");
    await db
      .update(inviteCodesTable)
      .set({
        currentUses: (codeRow.currentUses ?? 0) + 1,
        usedBy: id,
        usedAt: new Date(),
      })
      .where(eq(inviteCodesTable.id, codeRow.id));

  return res.status(201).json(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error("Error creating user:", error);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

// POST /api/auth/sync
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const { id, email, inviteCode } = req.body as { id?: string; email?: string; inviteCode?: string };

    if (!id || !email) {
      return res.status(400).json({ error: "User ID and email are required" });
    }

    let user = await storage.getUser(id);

    if (!user) {
      if (!inviteCode || typeof inviteCode !== "string" || inviteCode.trim().length !== 8) {
        return res.status(403).json({ error: "Invite code required", code: "INVITE_REQUIRED" });
      }

      const { inviteCodes } = await import("@shared/schema");
      const [codeRow] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, inviteCode.toUpperCase())).limit(1);

      if (!codeRow) return res.status(403).json({ error: "Invalid invite code", code: "INVITE_INVALID" });
      if (!codeRow.isActive) return res.status(403).json({ error: "This invite code has been deactivated", code: "INVITE_INACTIVE" });
      if (codeRow.expiresAt && new Date() > codeRow.expiresAt) {
        return res.status(403).json({ error: "This invite code has expired", code: "INVITE_EXPIRED" });
      }
      if ((codeRow.currentUses ?? 0) >= (codeRow.maxUses ?? 1)) {
        return res.status(403).json({ error: "This invite code has reached its usage limit", code: "INVITE_EXHAUSTED" });
      }

      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({
          error: "User with this email already exists",
          details: "Please sign in instead of signing up",
        });
      }

      // Use a transaction to ensure both user creation and invite code update succeed or rollback together
      await db.transaction(async (tx) => {
        // Create the user first
        const { users } = await import("@shared/schema");
        const [createdUser] = await tx.insert(users).values({ id, email }).returning();
        user = createdUser;

        // Then mark the invite code as used
        const { inviteCodes: inviteCodesTable } = await import("@shared/schema");
        await tx
          .update(inviteCodesTable)
          .set({
            currentUses: (codeRow.currentUses ?? 0) + 1,
            usedBy: id,
            usedAt: new Date(),
          })
          .where(eq(inviteCodesTable.id, codeRow.id));
      });

      console.log(`Successfully created new user with invite: ${id}`);
    }

    if (!user) return res.status(500).json({ error: "Failed to get or create user" });

  return res.json(user);
  } catch (error: any) {
    console.error("Error synchronizing user:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Failed to synchronize user", details: errorMessage });
  }
});

// POST /api/auth/login
router.post("/login", async (_req: Request, res: Response) => {
  // Supabase handles authentication; this endpoint is intentionally not implemented
  return res.status(501).json({ error: "Not implemented. Use Supabase Auth on the client." });
});

// GET /api/auth/user
router.get("/user", async (_req: Request, res: Response) => {
  try {
    return res.json({ message: "Authentication handled by Supabase client" });
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;

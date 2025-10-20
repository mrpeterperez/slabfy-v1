// 🤖 INTERNAL NOTE:
// Purpose: Express router exposing buying desk session CRUD endpoints
// Exports: router (default)
// Feature: buying-desk
// Dependencies: express, ../../../supabase, ./schemas, ./service

import { Router, type Response } from "express";

import type { AuthenticatedRequest } from "../../../supabase";
import { createSessionSchema, updateSessionSchema } from "./schemas";
import {
  createSession,
  deleteSession,
  getSessionById,
  listSessions,
  updateSession,
  SessionNumberGenerationError,
} from "./service";

const router = Router();

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Add support for filtering by eventId (show association) and archived status
    const eventId = req.query.eventId as string | undefined;
    const archived = req.query.archived === 'true';
    const sessions = await listSessions(userId, eventId, archived);
    return res.json(sessions);
  } catch (error) {
    console.error("Error fetching buy sessions:", error);
    return res.status(500).json({ error: "Failed to fetch buy sessions" });
  }
});

router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionById(userId, req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json(session);
  } catch (error) {
    console.error("Error fetching buy session:", error);
    return res.status(500).json({ error: "Failed to fetch buy session" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log('🔵 [CREATE SESSION] Request body:', JSON.stringify(req.body, null, 2));

  const parseResult = createSessionSchema.safeParse(req.body ?? {});
  if (!parseResult.success) {
    console.log('🔴 [CREATE SESSION] Validation failed:', parseResult.error.flatten());
    return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
  }

  console.log('🟢 [CREATE SESSION] Validation passed:', parseResult.data);

  try {
    const session = await createSession(userId, parseResult.data);
    console.log('🟢 [CREATE SESSION] Success:', session.id);
    return res.status(201).json(session);
  } catch (error) {
    if (error instanceof SessionNumberGenerationError) {
      console.error("🔴 [CREATE SESSION] Error generating session number:", error);
      return res
        .status(500)
        .json({ error: "Failed to create buy session", reason: "Unable to assign session number" });
    }

    console.error("🔴 [CREATE SESSION] Error creating buy session:", error);
    return res.status(500).json({ error: "Failed to create buy session" });
  }
});

router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = updateSessionSchema.safeParse(req.body ?? {});
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
  }

  try {
    const session = await updateSession(userId, req.params.id, parseResult.data);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json(session);
  } catch (error) {
    console.error("Error updating buy session:", error);
    return res.status(500).json({ error: "Failed to update buy session" });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await deleteSession(userId, req.params.id);
    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting buy session:", error);
    return res.status(500).json({ error: "Failed to delete buy session" });
  }
});

export default router;

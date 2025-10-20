import { Router } from 'express';
import { storage } from '../../storage';
import { authenticateUser } from '../../supabase';

// In a real app, get userId from auth middleware/session. For now, pull from header or default.
function getUserId(req: any): string {
  // In production, this should get the user ID from proper authentication
  const userId = req.user?.id || (req.headers['x-user-id'] as string) || req.query.userId || req.body?.userId;
  if (!userId) {
    throw new Error('User authentication required');
  }
  return userId;
}

export const preferencesRouter = Router();

// Add authentication to preferences routes
preferencesRouter.use(authenticateUser);

preferencesRouter.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const prefs = await storage.getUserPreferences(userId);
    res.json(prefs || {});
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load preferences', detail: err?.message });
  }
});

preferencesRouter.put('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const prefs = req.body ?? {};
    const saved = await storage.updateUserPreferences(userId, prefs);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save preferences', detail: err?.message });
  }
});

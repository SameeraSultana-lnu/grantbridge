import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { getTopMatches } from '../services/matchingService.js';
import { getMatches } from '../services/mockAppStore.js';
import { ingestFoundationRfps } from '../services/grantsIngestionService.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../utils/apiError.js';

export const grantsRouter = Router();

grantsRouter.use(requireAuth);

grantsRouter.get('/matches', async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = z.coerce.number().int().min(1).max(50).safeParse(req.query.limit ?? 12);
  const limit = parsed.success ? parsed.data : 12;
  const matches = env.useDatabase ? await getTopMatches(userId, limit) : getMatches(userId, limit);
  res.json({ matches });
});

grantsRouter.post('/ingest', async (_req, res) => {
  await ingestFoundationRfps();
  res.json({ ok: true });
});

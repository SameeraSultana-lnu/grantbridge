import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { confirmDraftSelection, generateDraftSection } from '../services/ragService.js';
import { requireAuth } from '../middleware/auth.js';
import { confirmDraft, generateDraftOptions } from '../services/mockAppStore.js';
import { ApiError } from '../utils/apiError.js';

const schema = z.object({
  grantId: z.number().int().positive(),
  sectionName: z.enum([
    'need_statement',
    'program_design',
    'outcomes_and_evaluation',
    'sustainability',
  ]),
});

const confirmSchema = z.object({
  grantId: z.number().int().positive(),
  sectionName: z.enum([
    'need_statement',
    'program_design',
    'outcomes_and_evaluation',
    'sustainability',
  ]),
  content: z.string().min(20).max(10000),
  confidence: z.number().min(0).max(100),
  citations: z.array(
    z.object({
      documentId: z.string().min(1).max(128),
      title: z.string().min(1).max(512),
    }),
  ).max(20),
});

export const draftsRouter = Router();

draftsRouter.use(requireAuth);

draftsRouter.post('/generate', async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.message });
  }

  const draftOptions = env.useDatabase
    ? await generateDraftSection({ ...parsed.data, userId })
    : generateDraftOptions(userId, parsed.data.grantId, parsed.data.sectionName);
  return res.json(draftOptions);
});

draftsRouter.post('/confirm', async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.message });
  }

  const confirmed = env.useDatabase
    ? await confirmDraftSelection({ ...parsed.data, userId })
    : confirmDraft(userId, parsed.data);

  return res.status(201).json(confirmed);
});

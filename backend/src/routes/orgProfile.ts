import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { getOrCreateDemoProfile, upsertProfile } from '../services/mockAppStore.js';
import { ApiError } from '../utils/apiError.js';

const updateSchema = z.object({
  legalName: z.string().min(2).max(200),
  mission: z.string().min(10).max(2000),
  geography: z.array(z.string().max(100)).max(20).default([]),
  focusAreas: z.array(z.string().max(100)).max(20).default([]),
  annualBudget: z.number().nonnegative().max(1_000_000_000),
  pastFunders: z.array(z.string().max(200)).max(50).default([]),
});

export const orgProfileRouter = Router();

orgProfileRouter.use(requireAuth);

orgProfileRouter.get('/', async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!env.useDatabase) {
    const profile = getOrCreateDemoProfile(userId);
    return res.json(profile);
  }

  const result = await pool.query('SELECT * FROM org_profiles WHERE user_id = $1 LIMIT 1', [userId]);
  if (!result.rows[0]) {
    return res.status(404).json({ message: 'No profile found' });
  }

  const row = result.rows[0];
  return res.json({
    id: row.id,
    legalName: row.legal_name,
    mission: row.mission,
    geography: row.geography,
    focusAreas: row.focus_areas,
    annualBudget: Number(row.annual_budget),
    pastFunders: row.past_funders,
  });
});

orgProfileRouter.put('/', async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.message });
  }

  const data = parsed.data;

  if (!env.useDatabase) {
    const profile = upsertProfile(userId, data);
    return res.json({ id: profile.id, ok: true });
  }

  const existing = await pool.query('SELECT id FROM org_profiles WHERE user_id = $1 LIMIT 1', [userId]);

  if (!existing.rows[0]) {
    const inserted = await pool.query(
      `INSERT INTO org_profiles (user_id, legal_name, mission, geography, focus_areas, annual_budget, past_funders)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        data.legalName,
        data.mission,
        data.geography,
        data.focusAreas,
        data.annualBudget,
        data.pastFunders,
      ],
    );
    return res.status(201).json({ id: inserted.rows[0].id });
  }

  await pool.query(
    `UPDATE org_profiles
     SET legal_name = $1,
         mission = $2,
         geography = $3,
         focus_areas = $4,
         annual_budget = $5,
         past_funders = $6,
         updated_at = NOW()
     WHERE id = $7`,
    [
      data.legalName,
      data.mission,
      data.geography,
      data.focusAreas,
      data.annualBudget,
      data.pastFunders,
      existing.rows[0].id,
    ],
  );

  return res.json({ ok: true });
});

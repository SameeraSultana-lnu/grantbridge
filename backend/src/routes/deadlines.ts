import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { addReminder, getDeadlines } from '../services/mockAppStore.js';
import { ApiError } from '../utils/apiError.js';

const reminderSchema = z.object({
  applicationId: z.number().int().positive(),
  remindAt: z
    .string()
    .datetime()
    .refine((value) => new Date(value).getTime() > Date.now(), 'Reminder must be in the future'),
  channel: z.enum(['email', 'sms']).default('email'),
});

export const deadlinesRouter = Router();

deadlinesRouter.use(requireAuth);

deadlinesRouter.get('/', async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!env.useDatabase) {
    const items = getDeadlines(userId).map((item) => ({
      applicationId: item.applicationId,
      grantTitle: item.grantTitle,
      dueDate: item.dueDate,
      status: item.status,
    }));
    return res.json({ items });
  }

  const result = await pool.query(
    `SELECT a.id AS application_id,
            go.title AS grant_title,
            a.due_date,
            a.status
     FROM applications a
     JOIN org_profiles op ON op.id = a.org_profile_id
     JOIN grant_opportunities go ON go.id = a.grant_id
     WHERE op.user_id = $1
     ORDER BY a.due_date ASC`,
    [userId],
  );

  res.json({
    items: result.rows.map((row: any) => ({
      applicationId: row.application_id,
      grantTitle: row.grant_title,
      dueDate: row.due_date,
      status: row.status,
    })),
  });
});

deadlinesRouter.post('/reminders', async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsed = reminderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.message });
  }

  if (!env.useDatabase) {
    addReminder(userId, parsed.data);
    return res.status(201).json({ ok: true });
  }

  const ownsApplication = await pool.query(
    `SELECT 1
     FROM applications a
     JOIN org_profiles op ON op.id = a.org_profile_id
     WHERE a.id = $1 AND op.user_id = $2
     LIMIT 1`,
    [parsed.data.applicationId, userId],
  );

  if (!ownsApplication.rows[0]) {
    throw new ApiError(404, 'Application not found');
  }

  await pool.query(
    `INSERT INTO deadline_reminders (application_id, remind_at, channel)
     VALUES ($1, $2, $3)`,
    [parsed.data.applicationId, parsed.data.remindAt, parsed.data.channel],
  );

  res.status(201).json({ ok: true });
});

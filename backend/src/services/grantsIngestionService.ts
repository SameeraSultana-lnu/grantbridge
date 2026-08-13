import axios from 'axios';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

export async function ingestFoundationRfps() {
  if (env.mockMode || !env.useDatabase) {
    return;
  }

  // Placeholder for real source connectors.
  // This is intentionally simple for MVP and can be expanded per foundation feed.
  const response = await axios.get('https://example.org/mock-rfps.json');
  const records = Array.isArray(response.data) ? response.data : [];

  for (const item of records) {
    await pool.query(
      `INSERT INTO grant_opportunities
       (external_id, source, title, summary, eligibility, geography, focus_areas, min_budget, max_budget, funder_name, deadline, url, metadata)
       VALUES ($1, 'foundation', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (external_id)
       DO UPDATE SET
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         deadline = EXCLUDED.deadline,
         metadata = EXCLUDED.metadata`,
      [
        item.id,
        item.title,
        item.summary,
        item.eligibility ?? null,
        item.geography ?? [],
        item.focusAreas ?? [],
        item.minBudget ?? null,
        item.maxBudget ?? null,
        item.funder ?? null,
        item.deadline,
        item.url ?? null,
        item,
      ],
    );
  }
}

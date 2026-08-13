import { pool } from '../db/pool.js';
import type { GrantMatch, OrgProfile } from '../types.js';
import { ApiError } from '../utils/apiError.js';

function overlapScore(a: string[], b: string[]) {
  const left = new Set(a.map((item) => item.toLowerCase()));
  const right = new Set(b.map((item) => item.toLowerCase()));
  const overlap = [...left].filter((item) => right.has(item)).length;
  return overlap;
}

function computeScore(org: OrgProfile, grant: any) {
  const geo = overlapScore(org.geography, grant.geography ?? []);
  const focus = overlapScore(org.focusAreas, grant.focus_areas ?? []);

  let budgetScore = 0;
  if (!grant.min_budget || !grant.max_budget) {
    budgetScore = 8;
  } else if (
    Number(org.annualBudget) >= Number(grant.min_budget) &&
    Number(org.annualBudget) <= Number(grant.max_budget) * 2
  ) {
    budgetScore = 15;
  }

  const total = Math.min(100, geo * 12 + focus * 18 + budgetScore + 40);
  const reasons = [
    geo > 0 ? `Geography overlap in ${geo} target area(s)` : 'Limited geography overlap',
    focus > 0
      ? `Mission alignment across ${focus} focus area(s)`
      : 'Weak focus-area alignment',
    budgetScore > 10 ? 'Budget profile aligns with grant range' : 'Budget fit is moderate',
  ];

  return { total, reasons };
}

export async function getTopMatches(userId: number, limit: number): Promise<GrantMatch[]> {
  const orgRes = await pool.query('SELECT * FROM org_profiles WHERE user_id = $1 LIMIT 1', [userId]);
  if (!orgRes.rows[0]) {
    throw new ApiError(404, 'Organization profile not found for this user');
  }

  const orgRow = orgRes.rows[0];
  const org: OrgProfile = {
    id: orgRow.id,
    legalName: orgRow.legal_name,
    mission: orgRow.mission,
    geography: orgRow.geography,
    focusAreas: orgRow.focus_areas,
    annualBudget: Number(orgRow.annual_budget),
    pastFunders: orgRow.past_funders,
  };

  const grantsRes = await pool.query(
    `SELECT * FROM grant_opportunities
     WHERE deadline >= CURRENT_DATE
     ORDER BY deadline ASC
     LIMIT 100`,
  );

  const scored = grantsRes.rows
    .map((grant: any) => {
      const result = computeScore(org, grant);
      return {
        id: grant.id,
        title: grant.title,
        summary: grant.summary,
        deadline: grant.deadline,
        source: grant.source,
        score: result.total,
        reasons: result.reasons,
        funderName: grant.funder_name,
        url: grant.url,
      } satisfies GrantMatch;
    })
    .sort((a: GrantMatch, b: GrantMatch) => b.score - a.score)
    .slice(0, limit);

  for (const match of scored) {
    await pool.query(
      `INSERT INTO grant_matches (org_profile_id, grant_id, score, reasons)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (org_profile_id, grant_id)
       DO UPDATE SET score = EXCLUDED.score, reasons = EXCLUDED.reasons, created_at = NOW()`,
      [org.id, match.id, match.score, match.reasons],
    );
  }

  return scored;
}

import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

export async function initDb() {
  const sqlPath = path.resolve(process.cwd(), 'sql', '001_init.sql');
  const sql = await fs.readFile(sqlPath, 'utf-8');
  await pool.query(sql);

  const demoEmail = 'demo@grantbridge.org';
  const userExisting = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [demoEmail]);

  let userId: number;
  if (!userExisting.rows[0]) {
    const passwordHash = await bcrypt.hash('GrantBridge123!', 12);
    const userInserted = await pool.query(
      `INSERT INTO users (email, full_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [demoEmail, 'GrantBridge Demo User', passwordHash],
    );
    userId = userInserted.rows[0].id as number;
  } else {
    userId = userExisting.rows[0].id as number;
  }

  const existingOrg = await pool.query('SELECT id FROM org_profiles WHERE user_id = $1 LIMIT 1', [userId]);
  let orgId: number;

  if (!existingOrg.rows[0]) {
    const orgResult = await pool.query(
      `INSERT INTO org_profiles (user_id, legal_name, mission, geography, focus_areas, annual_budget, past_funders)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        'Community Bridges Initiative',
        'We improve educational and workforce outcomes for underserved young adults.',
        ['Illinois', 'Indiana'],
        ['education', 'workforce development', 'youth mentorship'],
        780000,
        ['Chicago Community Trust', 'Midwest Equity Fund'],
      ],
    );
    orgId = orgResult.rows[0].id as number;
  } else {
    orgId = existingOrg.rows[0].id as number;
  }

  const docCount = await pool.query('SELECT COUNT(*)::int AS count FROM source_documents WHERE org_profile_id = $1', [orgId]);
  if (docCount.rows[0]?.count === 0) {
    await pool.query(
      `INSERT INTO source_documents (org_profile_id, title, document_type, body)
       VALUES
        ($1, '2025 Program Impact Report', 'impact_report', 'In 2025, 312 participants completed our job readiness curriculum. 68% secured employment within 6 months. Program retention increased from 72% to 81% after adding peer coaching sessions.'),
        ($1, 'Mission and Strategic Plan', 'strategy', 'Our mission is to close opportunity gaps through mentorship, practical job training, and partnerships with local employers. We prioritize neighborhoods with high youth unemployment.'),
        ($1, 'Previous Grant Narrative - Workforce Access', 'proposal', 'Our evidence-based model combines weekly coaching, employer-led workshops, and transportation stipends. In the last grant cycle, 87 participants completed internships and 54 transitioned into full-time roles.')`,
      [orgId],
    );
  }

  const grantsCount = await pool.query('SELECT COUNT(*)::int AS count FROM grant_opportunities');
  if (grantsCount.rows[0]?.count > 0) {
    return;
  }

  await pool.query(
    `INSERT INTO grant_opportunities (external_id, source, title, summary, eligibility, geography, focus_areas, min_budget, max_budget, funder_name, deadline, url)
     VALUES
      ('GOV-2026-001', 'grants.gov', 'Youth Workforce Readiness Grant', 'Funds community organizations delivering workforce readiness programs for young adults.', '501(c)(3) nonprofits with demonstrated impact data', ARRAY['Illinois', 'Indiana'], ARRAY['workforce development', 'education'], 100000, 350000, 'US Department of Labor', CURRENT_DATE + INTERVAL '45 day', 'https://www.grants.gov/'),
      ('FDN-2026-119', 'foundation', 'Neighborhood Opportunity Fund', 'Supports local mentorship and post-secondary transition programs.', 'Community-based nonprofits serving low-income populations', ARRAY['Illinois'], ARRAY['youth mentorship', 'education'], 50000, 120000, 'Regional Opportunity Foundation', CURRENT_DATE + INTERVAL '30 day', 'https://example.org/rfp'),
      ('FDN-2026-227', 'foundation', 'Data-Driven Impact Capacity Grant', 'Invests in nonprofits improving outcome measurement and reporting.', 'Organizations with outcome tracking systems', ARRAY['Indiana', 'Illinois'], ARRAY['capacity building', 'data systems'], 40000, 90000, 'Civic Futures Fund', CURRENT_DATE + INTERVAL '60 day', 'https://example.org/capacity')`,
  );
}

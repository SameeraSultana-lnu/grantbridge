import type { DraftOptionsResponse, DraftResponse, GrantMatch, OrgProfile } from '../types.js';

type ProfileInput = Omit<OrgProfile, 'id'>;

type AppRecord = {
  applicationId: number;
  grantId: number;
  grantTitle: string;
  dueDate: string;
  status: string;
};

type ReminderRecord = {
  applicationId: number;
  remindAt: string;
  channel: 'email' | 'sms';
};

const profileByUserId = new Map<number, OrgProfile>();
const applicationsByUserId = new Map<number, AppRecord[]>();
const remindersByUserId = new Map<number, ReminderRecord[]>();

const grants: Array<
  Omit<GrantMatch, 'score' | 'reasons'> & {
    focusAreas: string[];
    geography: string[];
  }
> = [
  {
    id: 1,
    title: 'Youth Workforce Readiness Grant',
    summary: 'Funds workforce readiness programs for young adults.',
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'grants.gov',
    funderName: 'US Department of Labor',
    url: 'https://www.grants.gov/',
    focusAreas: ['workforce development', 'education'],
    geography: ['illinois', 'indiana'],
  },
  {
    id: 2,
    title: 'Neighborhood Opportunity Fund',
    summary: 'Supports mentorship and post-secondary transition programs.',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'foundation',
    funderName: 'Regional Opportunity Foundation',
    url: 'https://example.org/rfp',
    focusAreas: ['youth mentorship', 'education'],
    geography: ['illinois'],
  },
];

let nextProfileId = 1;
let nextApplicationId = 1;

function overlapScore(left: string[], right: string[]) {
  const leftSet = new Set(left.map((item) => item.toLowerCase()));
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return [...leftSet].filter((item) => rightSet.has(item)).length;
}

export function getProfile(userId: number) {
  return profileByUserId.get(userId) ?? null;
}

export function getOrCreateDemoProfile(userId: number): OrgProfile {
  const existing = getProfile(userId);
  if (existing) {
    return existing;
  }

  const demo = upsertProfile(userId, {
    legalName: `Demo Impact Collective ${userId}`,
    mission:
      'We expand workforce access for underserved young adults through mentorship, job readiness training, and employer partnerships.',
    geography: ['Illinois', 'Indiana'],
    focusAreas: ['workforce development', 'education', 'youth mentorship'],
    annualBudget: 780000,
    pastFunders: ['Chicago Community Trust', 'Midwest Equity Fund'],
  });

  return demo;
}

export function upsertProfile(userId: number, data: ProfileInput): OrgProfile {
  const existing = profileByUserId.get(userId);
  const updated: OrgProfile = {
    id: existing?.id ?? nextProfileId++,
    legalName: data.legalName,
    mission: data.mission,
    geography: data.geography,
    focusAreas: data.focusAreas,
    annualBudget: data.annualBudget,
    pastFunders: data.pastFunders,
  };
  profileByUserId.set(userId, updated);
  return updated;
}

export function getMatches(userId: number, limit: number): GrantMatch[] {
  const profile = getProfile(userId);

  return grants
    .map((grant) => {
      const geo = profile ? overlapScore(profile.geography, grant.geography) : 0;
      const focus = profile ? overlapScore(profile.focusAreas, grant.focusAreas) : 0;
      const score = Math.min(100, 50 + geo * 15 + focus * 20);
      const reasons = [
        geo > 0 ? `Geography overlap in ${geo} target area(s)` : 'Geography overlap not detected',
        focus > 0 ? `Focus-area overlap in ${focus} area(s)` : 'Focus-area overlap not detected',
      ];

      return {
        id: grant.id,
        title: grant.title,
        summary: grant.summary,
        deadline: grant.deadline,
        source: grant.source,
        score,
        reasons,
        funderName: grant.funderName,
        url: grant.url,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function generateDraftOptions(userId: number, grantId: number, sectionName: string): DraftOptionsResponse {
  const grant = grants.find((item) => item.id === grantId);
  if (!grant) {
    throw new Error('Grant opportunity not found');
  }

  const profile = getOrCreateDemoProfile(userId);

  const base = `Draft (${sectionName}) for ${grant.title}.\n\n${profile.legalName} addresses this opportunity through programs aligned with ${grant.summary} [1]. The organization has documented outcomes that support readiness for implementation and measurable impact [2].`;

  return {
    grantId,
    sectionName,
    options: [
      {
        optionId: 'balanced',
        label: 'Balanced narrative',
        confidence: 93,
        content: base,
        citations: [
          { documentId: 'mock-doc-1', title: 'Mission and Strategic Plan' },
          { documentId: 'mock-doc-2', title: 'Program Impact Report' },
        ],
      },
      {
        optionId: 'impact-led',
        label: 'Impact-led narrative',
        confidence: 90,
        content: `${base}\n\nThis option leads with measurable outcomes before describing the delivery plan [1][2].`,
        citations: [
          { documentId: 'mock-doc-1', title: 'Mission and Strategic Plan' },
          { documentId: 'mock-doc-2', title: 'Program Impact Report' },
        ],
      },
      {
        optionId: 'implementation-led',
        label: 'Implementation-led narrative',
        confidence: 86,
        content: `${base}\n\nThis option prioritizes implementation readiness, staffing, and operational details [1][2].`,
        citations: [
          { documentId: 'mock-doc-1', title: 'Mission and Strategic Plan' },
          { documentId: 'mock-doc-2', title: 'Program Impact Report' },
        ],
      },
    ],
  };
}

export function confirmDraft(userId: number, payload: {
  grantId: number;
  sectionName: string;
  content: string;
  citations: Array<{ documentId: string; title: string }>;
  confidence: number;
}): DraftResponse {
  const grant = grants.find((item) => item.id === payload.grantId);
  if (!grant) {
    throw new Error('Grant opportunity not found');
  }

  const userApps = applicationsByUserId.get(userId) ?? [];
  let app = userApps.find((item) => item.grantId === grant.id);
  if (!app) {
    app = {
      applicationId: nextApplicationId++,
      grantId: grant.id,
      grantTitle: grant.title,
      dueDate: grant.deadline,
      status: 'draft',
    };
    userApps.push(app);
    applicationsByUserId.set(userId, userApps);
  }

  return {
    applicationId: app.applicationId,
    sectionName: payload.sectionName,
    content: payload.content,
    citations: payload.citations,
    confidence: payload.confidence,
  };
}

export function getDeadlines(userId: number) {
  return applicationsByUserId.get(userId) ?? [];
}

export function addReminder(userId: number, payload: { applicationId: number; remindAt: string; channel: 'email' | 'sms' }) {
  const apps = applicationsByUserId.get(userId) ?? [];
  const exists = apps.some((item) => item.applicationId === payload.applicationId);
  if (!exists) {
    throw new Error('Application not found');
  }

  const reminders = remindersByUserId.get(userId) ?? [];
  reminders.push({
    applicationId: payload.applicationId,
    remindAt: payload.remindAt,
    channel: payload.channel,
  });
  remindersByUserId.set(userId, reminders);
}

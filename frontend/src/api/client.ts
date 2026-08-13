import type {
  AuthResponse,
  AuthUser,
  DeadlineItem,
  DraftOptionsResponse,
  DraftResponse,
  GrantMatch,
  OrgProfile,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const AUTH_TOKEN_KEY = 'grantbridge_auth_token';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function getAuthToken() {
  if (authToken) {
    return authToken;
  }

  if (typeof window !== 'undefined') {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch {
    const target = API_BASE || window.location.origin;
    throw new Error(
      `Cannot connect to API at ${target}. Start backend server and verify VITE_API_BASE_URL.`,
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    const message = payload?.message ?? `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  register: (payload: { fullName: string; email: string; password: string }) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: () => request<{ user: AuthUser }>('/api/auth/me'),
  getOrgProfile: () => request<OrgProfile>('/api/org-profile'),
  updateOrgProfile: (profile: Omit<OrgProfile, 'id'>) =>
    request<{ ok: true }>('/api/org-profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),
  getMatches: () => request<{ matches: GrantMatch[] }>('/api/grants/matches?limit=8'),
  generateDraft: (payload: { grantId: number; sectionName: string }) =>
    request<DraftOptionsResponse>('/api/drafts/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  confirmDraft: (payload: {
    grantId: number;
    sectionName: string;
    content: string;
    confidence: number;
    citations: Array<{ documentId: string; title: string }>;
  }) =>
    request<DraftResponse>('/api/drafts/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getDeadlines: () => request<{ items: DeadlineItem[] }>('/api/deadlines'),
  addReminder: (payload: { applicationId: number; remindAt: string; channel: 'email' | 'sms' }) =>
    request<{ ok: true }>('/api/deadlines/reminders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

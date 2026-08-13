export type OrgProfile = {
  id: number;
  legalName: string;
  mission: string;
  geography: string[];
  focusAreas: string[];
  annualBudget: number;
  pastFunders: string[];
};

export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type GrantMatch = {
  id: number;
  title: string;
  summary: string;
  deadline: string;
  source: string;
  score: number;
  reasons: string[];
  funderName: string | null;
  url: string | null;
};

export type DraftResponse = {
  applicationId: number;
  sectionName: string;
  content: string;
  citations: Array<{ documentId: string; title: string }>;
  confidence: number;
};

export type DraftOption = {
  optionId: string;
  label: string;
  confidence: number;
  content: string;
  citations: Array<{ documentId: string; title: string }>;
};

export type DraftOptionsResponse = {
  grantId: number;
  sectionName: string;
  options: DraftOption[];
};

export type DeadlineItem = {
  applicationId: number;
  grantTitle: string;
  dueDate: string;
  status: string;
};

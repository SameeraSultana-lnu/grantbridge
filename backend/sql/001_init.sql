CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  mission TEXT NOT NULL,
  geography TEXT[] NOT NULL DEFAULT '{}',
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  annual_budget NUMERIC(12, 2) NOT NULL DEFAULT 0,
  past_funders TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE org_profiles
ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_profiles_user_id
ON org_profiles(user_id)
WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_profile_id INT NOT NULL REFERENCES org_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id BIGSERIAL PRIMARY KEY,
  source_document_id UUID NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grant_opportunities (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  eligibility TEXT,
  geography TEXT[] NOT NULL DEFAULT '{}',
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  min_budget NUMERIC(12, 2),
  max_budget NUMERIC(12, 2),
  funder_name TEXT,
  deadline DATE NOT NULL,
  url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grant_matches (
  id BIGSERIAL PRIMARY KEY,
  org_profile_id INT NOT NULL REFERENCES org_profiles(id) ON DELETE CASCADE,
  grant_id BIGINT NOT NULL REFERENCES grant_opportunities(id) ON DELETE CASCADE,
  score NUMERIC(5, 2) NOT NULL,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_profile_id, grant_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  org_profile_id INT NOT NULL REFERENCES org_profiles(id) ON DELETE CASCADE,
  grant_id BIGINT NOT NULL REFERENCES grant_opportunities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_profile_id, grant_id)
);

CREATE TABLE IF NOT EXISTS draft_sections (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  content TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deadline_reminders (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_grant_opportunities_deadline
ON grant_opportunities(deadline);

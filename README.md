# GrantBridge

GrantBridge is a full-stack AI product for small nonprofits to find relevant grants and generate faster, evidence-grounded proposal drafts.

## Business problem

Small nonprofits lose funding opportunities because grant discovery and narrative drafting are too time-consuming for lean teams.

## AI solution

GrantBridge combines profile-based matching and retrieval-augmented generation (RAG):

1. Organization profile drives relevance scoring.
2. Matched grant feed ranks opportunities by fit.
3. AI drafting produces proposal sections with citation traces to internal source docs.
4. Deadline tracking and reminders reduce submission risk.

## Technology stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL + pgvector
- AI: OpenAI GPT-4o-mini via LangChain.js
- Scheduler: node-cron
- Deployment: Cloud Run via Cloud Build

## Clean project structure

```text
grantbridge/
  backend/
    src/
      @types/
      config/
      db/
      jobs/
      middleware/
      routes/
      services/
      utils/
    sql/
      001_init.sql
    .env.example
    package.json
    tsconfig.json
  frontend/
    src/
      api/
      components/
      App.tsx
      main.tsx
      index.css
    .env.example
    package.json
  Dockerfile
  cloudbuild.yaml
  README.md
```

## Implemented features

1. Error handling and loading states
- Backend centralized error middleware and API status codes.
- Frontend loading and error states for auth, profile save, reminder save, data refresh, and AI draft generation.

2. Input validation for forms
- Backend route validation with Zod.
- Frontend form validation for login/register, profile editing, and reminders.

3. Mobile responsiveness
- Mobile-first layout and controls for auth, profile, deadline tracker, feed, and draft panel.

4. AI integration
- LangChain + OpenAI chat/embedding pipeline in backend drafting service.
- Safe fallback mode if API key is not configured.

5. User authentication
- JWT auth with register, login, and me endpoints.
- Protected business routes scoped to the authenticated user.

6. Database and data models
- Users, org profiles, source docs, vector chunks, grants, matches, applications, drafts, reminders.
- Auto-bootstrap with seed data and demo account.

## Environment variables

### Backend: [backend/.env.example](backend/.env.example)

- PORT
- NODE_ENV
- FRONTEND_ORIGIN
- USE_DATABASE
- DATABASE_URL
- JWT_SECRET
- OPENAI_API_KEY
- OPENAI_MODEL
- EMBEDDING_MODEL
- MOCK_MODE

### Frontend: [frontend/.env.example](frontend/.env.example)

- VITE_API_BASE_URL

## Local setup and run

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ running locally
- pgvector extension available in your PostgreSQL instance

### 1) Create database

Create a database named grantbridge and ensure this connection works:

postgres://postgres:postgres@localhost:5432/grantbridge

If you do not want database storage, keep `USE_DATABASE=false` in backend `.env`.
In that mode, auth accounts are stored in a local JSON file at [backend/data/auth-users.json](backend/data/auth-users.json) and app feature data is stored in-memory.

### 2) Configure backend

PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

### 3) Configure frontend

PowerShell:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev -- --host
```

Frontend URL: http://localhost:5173

## Demo login

- Email: demo@grantbridge.org
- Password: GrantBridge123!

The demo user is created by backend bootstrap when the database is reachable.

## Local run status from this session

- Frontend started successfully at http://localhost:5173
- Backend starts successfully with `USE_DATABASE=false`
- Health endpoint verified: GET http://localhost:8080/api/health
- Register/login endpoints verified in no-database mode

## API overview

- GET /api/health
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/org-profile
- PUT /api/org-profile
- GET /api/grants/matches?limit=8
- POST /api/grants/ingest
- POST /api/drafts/generate
- GET /api/deadlines
- POST /api/deadlines/reminders

## Deployment

From repository root:

```bash
gcloud builds submit --config cloudbuild.yaml
```

Cloud Run required variables:

- DATABASE_URL
- JWT_SECRET
- OPENAI_API_KEY
- FRONTEND_ORIGIN

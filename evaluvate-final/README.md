# Evaluvate AI

> AI-assisted exam grading platform for Indian schools.
> Gemini 2.5 Flash reads handwritten answer sheets and scores them against rubrics.
> Teachers review and override. Full audit trail. Data stays in India.

---

## Quick Start (Local Development)

```bash
# 1. Clone and install frontend
git clone https://github.com/your-org/evaluvate-ai.git
cd evaluvate-ai
npm install

# 2. Install backend
cd backend && npm install && cd ..

# 3. Set up environment files
cp .env.example .env.local
cp backend/.env.example backend/.env
cp backend/local.settings.json.example backend/local.settings.json
# Edit backend/local.settings.json — add your GEMINI_API_KEY at minimum

# 4. Start both servers (two terminals)
# Terminal 1 — Backend:
cd backend && npm run start
# Terminal 2 — Frontend:
npm run dev

# 5. Open http://localhost:8080
```

The frontend proxies `/api/*` to `http://localhost:7071` automatically via `vite.config.ts`.

---

## Feature Flags

All features default to **demo mode** (mock data, no real API calls).
Enable one at a time in `.env.local` as the backend is ready:

| Flag | Default | What it enables |
|------|---------|-----------------|
| `VITE_FEATURE_REAL_UPLOAD` | `false` | Real PDF upload → Azure Blob → AI scoring |
| `VITE_FEATURE_REAL_SCORING` | `false` | GradingPage shows Cosmos DB AI scores |
| `VITE_FEATURE_REAL_AUTH` | `false` | Login required, JWT on all API calls |

---

## Repository Structure

```
evaluvate-ai/
├── src/                        Frontend (React + TypeScript + Vite)
│   ├── pages/                  One file per route
│   ├── components/             Reusable UI components
│   ├── hooks/                  React Query data hooks
│   │   └── mutations/          Write operations (upload, override, finalize)
│   ├── services/api.ts         Base API client with feature flags
│   ├── types/index.ts          TypeScript interfaces (mirrors backend)
│   └── data/                   Mock data for demo/dev mode
│
├── backend/                    Azure Functions API (Node.js + TypeScript)
│   ├── src/
│   │   ├── functions/          One file per HTTP endpoint
│   │   ├── services/           Business logic (Gemini, Cosmos, Blob, Audit)
│   │   ├── prompts/            AI scoring prompt builder
│   │   ├── schemas/            Zod validation for AI responses
│   │   └── types/              Shared TypeScript types
│   ├── host.json               Azure Functions runtime config
│   └── local.settings.json.example  Dev secrets template
│
├── infrastructure/
│   └── scripts/
│       ├── provision-shared.sh Run once to create shared Azure resources
│       └── provision-school.sh Run per school to onboard them
│
├── .github/workflows/
│   ├── ci.yml                  Lint + typecheck + test on every PR
│   └── deploy.yml              Deploy to Azure on merge to main
│
├── docs/
│   └── GITHUB_SECRETS_SETUP.md Step-by-step secrets configuration guide
│
├── .env.example                Frontend env template
├── backend/.env.example        Backend env template
└── staticwebapp.config.json    Azure SPA routing config
```

---

## The AI Pipeline

```
Teacher uploads PDF
        │
        ▼
Azure Blob Storage (direct upload via SAS token)
        │
        ▼  [HTTP trigger — called by frontend after upload]
Azure Function: triggerScoring
        │
        ├──▶ Gemini 2.5 Flash (PRIMARY — free tier)
        │         │ Returns: per-criterion scores + confidence
        │         │
        │    [confidence < 0.70 or Gemini fails]
        │         │
        │         ▼
        └──▶ Azure OpenAI GPT-4o (FALLBACK — pay per use)
                  │
                  ▼
        Cosmos DB: AiScore records saved
        AnswerSheet status → "ai_scored"
        Audit event written
                  │
                  ▼
        Teacher reviews in GradingPage
        Overrides → audit log
        Finalise → FinalMarks record
```

---

## GitHub Actions CI/CD

Every pull request runs:
- ESLint (frontend + backend)
- TypeScript typecheck (both)
- Vitest unit tests (both)
- Vite build (confirms no import errors)

Every merge to `main` deploys:
- Backend → Azure Functions
- Frontend → Azure Static Web Apps

See `docs/GITHUB_SECRETS_SETUP.md` for the 4 secrets and 1 variable to add.

---

## Adding a New School

```bash
cd infrastructure/scripts
chmod +x provision-school.sh

./provision-school.sh \
  --school-id "school_don_bosco" \
  --school-name "Don Bosco Higher Secondary" \
  --city "Chennai" \
  --state "Tamil Nadu" \
  --contact-email "admin@donbosco.edu.in"
```

This creates an isolated Cosmos DB database and Blob containers for the school.
All data is scoped by `schoolId` — cross-school access is architecturally impossible.

---

## Data Privacy

- Student names and IDs are **never sent to Gemini** — only the answer image and rubric
- All Azure resources are in `centralindia` region (DPDP Act compliance)
- For production with real student data: sign a Google DPA before using Gemini API
- See `docs/DATA_PRIVACY.md` in the master plan for full compliance details

---

## Key Commands

```bash
# Frontend
npm run dev           # Start dev server (port 8080)
npm run build         # Production build
npm run test          # Run Vitest
npm run lint          # ESLint check
npx tsc --noEmit      # TypeScript check

# Backend
cd backend
npm run start         # Build + start Azure Functions (port 7071)
npm run test          # Run backend Vitest
npm run build         # Compile TypeScript
npx tsc --noEmit      # TypeScript check only
```

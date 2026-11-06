# QualiScope – AI Requirement Analyzer

Turns a Requirement, User Story, CR or acceptance criteria into a traceable, reviewable SIT/UAT **AI Test Pack**
(8 coverage categories, risks, open questions, traceability matrix, Excel/CSV/PDF/JSON export).

```
frontend/   React + Vite + Recharts + Axios (existing QualiScope dark/gold design, now 8 pages)
backend/    FastAPI + Pydantic + SQLAlchemy + Claude (Anthropic)
```

## Quick start

### 1. Backend (Python 3.12+)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then set ANTHROPIC_API_KEY (and DATABASE_URL)
uvicorn app.main:app --reload --port 8000
```
Swagger docs: http://localhost:8000/docs

**Database:** `DATABASE_URL` defaults to PostgreSQL in `.env.example`
(`postgresql+psycopg://qualiscope:qualiscope@localhost:5432/qualiscope`; create the database first).
For a zero-setup run use `DATABASE_URL=sqlite:///./qualiscope.db`. Tables are created on startup.

### 2. Frontend (Node 18+)
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```
`VITE_API_URL` (default `http://localhost:8000`) points the UI at the API.

## How generation works (backend/app/services)
1. `requirement_analyzer` – stages 1-4: actors, entities, rules (stated vs inferred), validations, dependencies,
   integrations, regression impacts, ambiguities, open questions. IDs (FR/AC/BR/RI) are normalised server-side.
2. `test_generator` – stage 5: one structured call per category (functional, positive, negative, boundary, role,
   integration, data, regression). Stage 8: validation, dedup, unique IDs (`TC-FUN-001`, `TC-NEG-002`, …), `covers`
   references restricted to real item IDs. Unconfirmed expectations are flagged `ASSUMPTION`.
3. `risk_analyzer` – stage 6: risks with severity/likelihood/impact/mitigation, deduplicated and sorted.
4. `traceability` – stage 7: requirement items ↔ test cases. *Mapped* coverage = items with ≥1 case;
   *Validated* coverage = items whose mapped cases all **Pass**.

All LLM calls use Claude forced tool-use (JSON schema) against Pydantic schemas, with timeout + retry; uploaded text is wrapped
as untrusted data and the model is instructed never to follow instructions inside it.

## Main API
`POST /api/requirements/analyze` · `POST /api/requirements/extract` (PDF/DOCX/TXT) · `POST /api/test-pack/generate` ·
`GET|PUT|DELETE /api/test-pack/{id}` · `POST /api/test-pack/{id}/regenerate` · `GET /api/test-pack/{id}/traceability` ·
`POST /api/test-pack/{id}/export` (`xlsx|csv|pdf|json`) · `GET /api/dashboard/summary` · `GET /api/health`
plus test-case CRUD, `/approve`, `/versions`, `/compare`, `/audit`, `/execution`.

## Security
- Secrets only via environment (`.env` is git-ignored).
- Optional RBAC: `API_KEYS="key:role:user,..."` (roles `viewer` < `editor` < `admin`), sent as `X-API-Key`
  (set it on the UI Settings page). Empty = auth disabled (dev only). Viewers read; editors generate/edit; admins delete/approve.
- Upload limits (type + `MAX_UPLOAD_MB`), input sanitisation, masked 500s, spreadsheet-formula neutralisation in exports,
  audit log for generate/edit/delete/approve.
- Approved packs are locked; regeneration never overwrites edited/manual/approved cases without explicit confirmation.

## Tests
```bash
cd backend  && python -m pytest                 # API, validation, schema, export, RBAC (25 tests)
cd frontend && npm test                         # Vitest + React Testing Library (14 tests)
cd frontend && npx playwright install chromium && npm run test:e2e
```
Backend/e2e tests use a deterministic `FakeLLM` (`backend/tests/fake_llm.py`); it is **test-only** and never used by the app.
The real Claude (Anthropic) path needs a valid `ANTHROPIC_API_KEY`.

## Known limits
- Test cases/risks are stored as JSON on the pack row (simple versioning/snapshots); fine for packs of hundreds of cases.
- Auth is API-key based, not user accounts/SSO.
- Styling keeps the existing hand-written CSS (Tailwind was not added, to preserve the current design).

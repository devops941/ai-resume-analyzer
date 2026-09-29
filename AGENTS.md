# Repository notes for AI agents

## Project
AI Resume Analyzer & ATS Checker. Exactly two app folders: `backend` (FastAPI +
Prisma/MongoDB + Groq) and `frontend` (Next.js 15 App Router). See `README.md`.

## Commands
- Backend install: `cd backend && pip install -r requirements.txt`
- Prisma client: `prisma generate --schema prisma/schema.prisma`
- Seed admin + settings: `python seed.py`
- Run API: `uvicorn app.main:app --reload --port 8000`
- Backend tests: `cd backend && python -m pytest tests -q` (17 tests, no network needed)
- Frontend: `cd frontend && npm install && npm run dev` (port 3000)
- Frontend prod build: `npm run build` (must pass clean)

## Conventions and gotchas
- `DATABASE_URL` may contain whitespace before the db name (e.g. `.../ resume`).
  `app/config.py` trims it and re-publishes the cleaned value into
  `os.environ` because the Prisma query engine reads the raw env var directly.
  Do not remove that write-back.
- Prisma `Json` columns are written via `app/core/jsonutil.to_json()`. Admin
  settings are stored as JSON *strings* in `AdminSetting.value` (type `String`).
- `AdminSetting.value` is a String, not Json — keep it that way unless the
  schema and seed are changed together.
- Keyword extraction must keep `/`, `.`, `+`, `#` inside tokens so `ci/cd`,
  `node.js`, `c++` survive, and strip trailing punctuation. Fragments like
  `ci cd` / `cd datadog` are guarded by stopwords and final cleanup in
  `app/services/keyword_match.py`.
- The Groq key stays server-side only; never expose it to the frontend.
- `.env` / `.env.local` are git-ignored; only `.env.example` files are committed.
- ATS score = 0.6*rule + 0.4*AI quality, then blended 0.8/0.2 with keyword
  coverage when a job description is provided.

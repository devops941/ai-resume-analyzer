# AI Resume Analyzer & ATS Checker

Upload a resume (and optionally a job description) and get back:

- a **deterministic ATS compatibility score** out of 100, with a transparent check-by-check breakdown,
- an **AI-written report** (Groq) covering clarity, impact, structure, strengths and weaknesses,
- a **keyword gap list** comparing the resume against the job description,
- **actionable, section-by-section suggestions** for improving the resume.

The project contains exactly two application folders, `backend` and `frontend`.

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, custom UI components |
| Backend | FastAPI, Pydantic v2, JWT auth (python-jose + bcrypt) |
| Database | MongoDB (Atlas) via Prisma (`prisma-client-py`) |
| AI | Groq API, model `openai/gpt-oss-120b` (JSON mode) |
| Parsing | pdfplumber / PyPDF2 (PDF), python-docx (DOCX), UTF-8 (TXT) |
| Scoring | scikit-learn TF-IDF keyword matching + weighted rule engine |

---

## Repository layout

```
.
├── backend
│   ├── app
│   │   ├── config.py            # env loading + DATABASE_URL normalization
│   │   ├── database.py          # Prisma lifecycle, auth dependency
│   │   ├── main.py              # FastAPI app, CORS, routers
│   │   ├── core
│   │   │   ├── jsonutil.py      # wraps values for Prisma Json columns
│   │   │   └── security.py      # password hashing + JWT helpers
│   │   ├── routers            # auth, resumes, analyses, admin
│   │   ├── schemas            # Pydantic request/response models
│   │   └── services
│   │       ├── parsing.py       # file → text → structured resume
│   │       ├── ats_rules.py     # weighted ATS checks
│   │       ├── keyword_match.py # TF-IDF keyword gaps
│   │       ├── groq_service.py  # LLM analysis (defensive JSON parsing)
│   │       └── analysis_service.py # orchestrator + final scoring
│   ├── prisma/schema.prisma     # MongoDB models
│   ├── seed.py                  # creates admin user + default settings
│   ├── samples/sample_resume.txt
│   ├── tests/                   # 17 pytest unit tests
│   └── requirements.txt
└── frontend
    ├── app                      # landing, login, register, dashboard routes
    ├── components               # UI primitives + report widgets
    ├── lib                      # API client, auth context, helpers
    └── package.json
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A MongoDB connection string (Atlas or local)
- A Groq API key — https://console.groq.com/keys

---

## 1. Backend setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then edit .env
```

`.env` values:

```ini
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/resume"
JWT_SECRET="a-long-random-string"
GROQ_API_KEY="gsk_..."
GROQ_MODEL="openai/gpt-oss-120b"
CORS_ORIGINS="http://localhost:3000"
ADMIN_EMAIL="admin@resume.ai"
ADMIN_PASSWORD="Admin@123"
```

> **Note on `DATABASE_URL`:** if the value contains accidental whitespace before
> the database name (for example `.../ resume`), `app/config.py` trims it and
> re-publishes the cleaned URL to the process environment so the Prisma query
> engine also receives it. No manual editing of the connection string is needed.

Generate the Prisma client, create the admin user and default settings:

```bash
prisma generate --schema prisma/schema.prisma
python seed.py
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Interactive docs are at http://localhost:8000/docs.

### Seed credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@resume.ai` | `Admin@123` |

### Run the tests

```bash
python -m pytest tests -q
```

The suite covers parsing, ATS weighting, keyword extraction and JWT/password
helpers, and does not require network access.

---

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at the backend
npm run dev                        # http://localhost:3000
```

The frontend talks to the backend through `NEXT_PUBLIC_API_URL`
(default `http://localhost:8000`) and stores the JWT in `localStorage`.

---

## 3. End-to-end flow

1. **Register / log in** — `/register`, `/login`. Passwords are bcrypt-hashed
   and a JWT is issued.
2. **Analyze** — `/dashboard/analyze`. Upload a PDF/DOCX/TXT resume and paste a
   job description (title, company optional).
3. Backend pipeline:
   - extract text and parse contact details, sections and skills,
   - run the weighted ATS checks,
   - compute TF-IDF keyword gaps against the job description,
   - call Groq for the qualitative report,
   - blend the rule-based score, the AI quality score and keyword coverage
     into the final headline number.
4. **Review** — `/dashboard/analyze/{id}` shows the score gauge, check list,
   keyword gaps, AI report and parsed-resume preview. Reports can be exported as
   JSON.
5. **History** — `/dashboard/history` lists every resume and analysis.
6. **Admin** — `/dashboard/admin` (admin role only) shows platform stats, the
   most common missing keywords and a CSV export of all analyses.

---

## API reference

All routes are prefixed with `/api`. Protected routes expect
`Authorization: Bearer <token>`.

### Auth

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account, returns a token |
| POST | `/api/auth/login` | Authenticate, returns a token |
| GET | `/api/auth/me` | Current user profile |

### Resumes

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/resumes/upload` | Upload and parse a resume (multipart `file`) |
| GET | `/api/resumes` | List the caller's resumes |
| GET | `/api/resumes/{id}` | Fetch one resume with parsed data |
| DELETE | `/api/resumes/{id}` | Delete a resume and its analyses |

### Analyses

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/analyses` | Run an analysis (`resumeId`, optional `jobDescription`, `jobTitle`, `company`) |
| GET | `/api/analyses` | Analysis history for the caller |
| GET | `/api/analyses/{id}` | Full analysis report |
| DELETE | `/api/analyses/{id}` | Delete an analysis |

### Admin (admin role required)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/admin/stats` | Platform totals, average score, common keyword gaps |
| GET | `/api/admin/users` | All users |
| GET | `/api/admin/report` | CSV export of all analyses |

### Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Service, database and Groq configuration status |

---

## Scoring model

The headline ATS score combines three signals so a single weak area cannot
dominate:

```
final = 0.6 * rule_score + 0.4 * ai_quality_score
final = 0.8 * final + 0.2 * keyword_coverage      # only when a JD is supplied
```

- **rule_score** — weighted pass rate of 14 deterministic checks (formatting,
  sections, contact info, bullets, action verbs, quantified results, length,
  filler phrases). 85+ Excellent, 70+ Good, 50+ Needs Work, below 50 Poor.
- **ai_quality_score** — average of the model's clarity, impact and structure
  scores.
- **keyword_coverage** — share of job-description keywords found in the resume.

If Groq is unreachable or misconfigured, the analysis still completes: the AI
card shows an explanatory notice and the rule-based results are returned.

---

## Notes and limitations

- Uploads are limited to 5 MB (`MAX_UPLOAD_MB`). Scanned/image-only PDFs will
  not yield text.
- The Groq key is used exclusively on the backend and is never sent to the
  browser.
- `.env` files contain secrets and are git-ignored; only `.env.example` is
  committed.

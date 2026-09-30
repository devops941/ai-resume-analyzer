from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import connect_db, disconnect_db
from app.routers import admin, analyses, auth, resumes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title="AI Resume Analyzer & ATS Checker API",
    description=(
        "Backend for resume upload, ATS scoring, keyword matching and Groq-powered "
        "AI resume analysis. Auth is JWT-based; the Groq key never leaves this service."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(resumes.router)
app.include_router(resumes.job_router)
app.include_router(analyses.router)
app.include_router(admin.router)


@app.get("/", tags=["root"])
async def root():
    return {
        "status": "ok",
        "message": "AI Resume Analyzer & ATS Checker API is running",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["health"])
async def health():
    return {
        "status": "ok",
        "groqConfigured": bool(settings.GROQ_API_KEY),
        "database": "configured" if settings.DATABASE_URL else "missing",
    }

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _clean_mongo_url(url: str) -> str:
    """Trim accidental whitespace around the database name.

    The MongoDB SRV URL ends with ``/<db>``; copy/pasted values often contain a
    stray space after the slash which Prisma rejects as an illegal character.
    """
    if "://" not in url:
        return url.strip()
    scheme, rest = url.split("://", 1)
    if "/" not in rest:
        return url.strip()
    host, db = rest.split("/", 1)
    db = db.strip()
    # Preserve query parameters while trimming the database segment.
    if "?" in db:
        name, query = db.split("?", 1)
        db = f"{name.strip()}?{query}"
    return f"{scheme}://{host}/{db}"


class Settings:
    DATABASE_URL: str = _clean_mongo_url(os.getenv("DATABASE_URL", ""))
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "5"))
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@resume.ai")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "Admin@123")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")


settings = Settings()

# Prisma reads DATABASE_URL directly from the process environment, bypassing the
# normalization above, so publish the cleaned value for it to pick up.
if settings.DATABASE_URL:
    os.environ["DATABASE_URL"] = settings.DATABASE_URL

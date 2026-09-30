from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

import bcrypt
import passlib.handlers.bcrypt

# Fix passlib 1.7.4 bug with bcrypt >= 4.0 missing __about__ attribute
if not hasattr(bcrypt, "__about__"):
    class _About:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")
    bcrypt.__about__ = _About()

# Fix passlib 1.7.4 bug with bcrypt >= 4.0 where passlib tests wrapping bug using >72-byte passwords
_orig_calc_checksum = passlib.handlers.bcrypt._BcryptBackend._calc_checksum

def _fixed_calc_checksum(self, secret):
    if isinstance(secret, bytes) and len(secret) > 72:
        secret = secret[:72]
    return _orig_calc_checksum(self, secret)

passlib.handlers.bcrypt._BcryptBackend._calc_checksum = _fixed_calc_checksum

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except ValueError:
        return False


def create_access_token(subject: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None

from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma

from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_current_user, get_db
from app.schemas.models import LoginRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _to_user_out(user) -> UserOut:
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        createdAt=user.createdAt,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: Prisma = Depends(get_db)):
    existing = await db.user.find_unique(where={"email": payload.email.lower()})
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = await db.user.create(
        data={
            "name": payload.name.strip(),
            "email": payload.email.lower(),
            "passwordHash": hash_password(payload.password),
            "role": "user",
        }
    )
    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token, user=_to_user_out(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: Prisma = Depends(get_db)):
    user = await db.user.find_unique(where={"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.passwordHash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token, user=_to_user_out(user))


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return _to_user_out(user)

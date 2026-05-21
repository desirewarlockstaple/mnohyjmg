"""Auth endpoints — `/me`, `/auth/dev_token`."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tideguard_api.db import get_db
from tideguard_api.deps import get_current_user
from tideguard_api.models.user import User
from tideguard_api.settings import get_settings

router = APIRouter(tags=["auth"])


class DevTokenRequest(BaseModel):
    email: EmailStr
    name: str | None = None


class DevTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    expires_in: int


@router.get("/me")
async def me(user: User = Depends(get_current_user)) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "xp": user.xp,
        "school_id": str(user.school_id) if user.school_id else None,
    }


@router.post("/auth/dev_token", response_model=DevTokenResponse)
async def issue_dev_token(payload: DevTokenRequest, db: AsyncSession = Depends(get_db)) -> DevTokenResponse:
    """Issue a short-lived JWT for the given email (creating the user if needed).

    This endpoint is intended for development and end-to-end testing. In
    production it should be disabled (set ``ALLOW_ANONYMOUS_DEV_USER=false``
    and gate this endpoint behind an admin check or remove the route).
    """
    settings = get_settings()
    if not settings.allow_anonymous_dev_user:
        raise HTTPException(403, "Dev token endpoint disabled in this environment")

    existing = await db.execute(select(User).where(User.email == payload.email))
    user = existing.scalar_one_or_none()
    if user is None:
        user = User(
            id=uuid.uuid4(),
            email=str(payload.email),
            name=payload.name or str(payload.email).split("@")[0],
            role="user",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    now = datetime.now(UTC)
    exp = now + timedelta(seconds=settings.jwt_ttl_seconds)
    claims = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return DevTokenResponse(
        access_token=token,
        user_id=str(user.id),
        expires_in=settings.jwt_ttl_seconds,
    )

"""Cleanups endpoints — events with collected mass + photos."""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from tideguard_api.db import get_db
from tideguard_api.deps import get_current_user
from tideguard_api.models.cleanup import Cleanup
from tideguard_api.models.user import User
from tideguard_api.services.badges import maybe_award_badges

router = APIRouter(prefix="/cleanups", tags=["cleanups"])

CLEANUP_XP = 100
_WKT_POLYGON = re.compile(r"^POLYGON\s*\(\(.+\)\)$", re.IGNORECASE | re.DOTALL)


class CleanupCreate(BaseModel):
    geom_wkt: str = Field(..., description="POLYGON WKT, EPSG:4326")
    kg_collected: float = Field(..., ge=0)
    participants: int = Field(..., ge=1)
    before_photo: str | None = None
    after_photo: str | None = None


@router.post("")
async def create_cleanup(
    payload: CleanupCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not _WKT_POLYGON.match(payload.geom_wkt.strip()):
        raise HTTPException(400, "geom_wkt must be a POLYGON WKT")
    cleanup = Cleanup(
        id=uuid.uuid4(),
        user_id=user.id,
        geom_wkt=payload.geom_wkt,
        kg_collected=payload.kg_collected,
        participants=payload.participants,
        before_photo=payload.before_photo,
        after_photo=payload.after_photo,
    )
    db.add(cleanup)
    user.xp = (user.xp or 0) + CLEANUP_XP
    await db.commit()
    await db.refresh(cleanup)
    await maybe_award_badges(db, user)
    return {"id": str(cleanup.id), "xp": user.xp}


@router.get("/stats")
async def cleanup_stats(db: AsyncSession = Depends(get_db)) -> dict:
    """Aggregate cleanup KPIs for the landing page.

    Exposes both ``events`` and ``cleanups`` (alias) for backwards compatibility
    with earlier clients.
    """
    total_kg = (await db.execute(select(func.coalesce(func.sum(Cleanup.kg_collected), 0.0)))).scalar() or 0.0
    total_participants = (await db.execute(select(func.coalesce(func.sum(Cleanup.participants), 0)))).scalar() or 0
    total_events = (await db.execute(select(func.count(Cleanup.id)))).scalar() or 0
    return {
        "kg_collected": float(total_kg),
        "participants": int(total_participants),
        "events": int(total_events),
        "cleanups": int(total_events),
    }


@router.get("")
async def list_cleanups(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(Cleanup).order_by(Cleanup.created_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": str(c.id),
            "user_id": str(c.user_id),
            "geom_wkt": c.geom_wkt,
            "kg_collected": c.kg_collected,
            "participants": c.participants,
            "before_photo": c.before_photo,
            "after_photo": c.after_photo,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in rows
    ]

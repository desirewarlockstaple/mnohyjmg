"""Citizen reports endpoints (create, list, moderate, GDPR erasure)."""

from __future__ import annotations

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from tideguard_api.db import get_db
from tideguard_api.deps import get_current_user, require_moderator
from tideguard_api.models.report import Report
from tideguard_api.models.user import User
from tideguard_api.services.badges import maybe_award_badges
from tideguard_api.services.storage import upload_photo

router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_XP = 10
ReportStatus = Literal["pending", "approved", "rejected"]


class ReportStatusUpdate(BaseModel):
    status: ReportStatus = Field(..., description="pending | approved | rejected")
    moderator_note: str | None = None


def _serialize(r: Report) -> dict:
    return {
        "id": str(r.id),
        "user_id": str(r.user_id),
        "lat": r.lat,
        "lng": r.lng,
        "photo_url": r.photo_url,
        "severity": r.severity,
        "debris_type": r.debris_type,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.post("")
async def create_report(
    photo: UploadFile = File(...),
    lat: float = Form(...),
    lng: float = Form(...),
    severity: int = Form(...),
    debris_type: str = Form("plastic_bottle"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(400, "Invalid coordinates")
    if not (1 <= severity <= 5):
        raise HTTPException(400, "severity must be 1..5")

    photo_url = await upload_photo(photo, user.id)
    report = Report(
        id=uuid.uuid4(),
        user_id=user.id,
        lat=lat,
        lng=lng,
        photo_url=photo_url,
        severity=severity,
        debris_type=debris_type,
    )
    db.add(report)
    user.xp = (user.xp or 0) + REPORT_XP
    await db.commit()
    await db.refresh(report)
    await maybe_award_badges(db, user)
    return {"id": str(report.id), "photo_url": photo_url, "xp": user.xp}


@router.get("")
async def list_reports(
    bbox: str = Query(..., description="lon_min,lat_min,lon_max,lat_max"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    try:
        lon_min, lat_min, lon_max, lat_max = map(float, bbox.split(","))
    except Exception as exc:
        raise HTTPException(400, f"Invalid bbox: {exc}") from exc

    stmt = (
        select(Report)
        .where(
            Report.status == "approved",
            Report.lng >= lon_min,
            Report.lng <= lon_max,
            Report.lat >= lat_min,
            Report.lat <= lat_max,
        )
        .limit(1000)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [_serialize(r) for r in rows]


@router.get("/queue")
async def moderator_queue(
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _mod: User = Depends(require_moderator),
) -> list[dict]:
    """Return pending reports for moderator review (admin or moderator role)."""
    stmt = select(Report).where(Report.status == "pending").order_by(Report.created_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [_serialize(r) for r in rows]


@router.get("/mine")
async def my_reports(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    stmt = select(Report).where(Report.user_id == user.id).order_by(Report.created_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [_serialize(r) for r in rows]


@router.delete("/mine")
async def delete_my_reports(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """GDPR Art. 17 — right to erasure. Deletes ALL of the caller's reports."""
    result = await db.execute(delete(Report).where(Report.user_id == user.id))
    await db.commit()
    return {"deleted": result.rowcount or 0}


@router.patch("/{report_id}")
async def update_report(
    report_id: uuid.UUID,
    payload: ReportStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _mod: User = Depends(require_moderator),
) -> dict:
    """Moderator update of a report's status. Body: ``{status, moderator_note}``."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    report.status = payload.status
    await db.commit()
    return {"id": str(report.id), "status": report.status, "moderator_note": payload.moderator_note}

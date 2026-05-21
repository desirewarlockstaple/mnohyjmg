"""Education module endpoints — lessons, progress, certificate."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tideguard_api.db import get_db
from tideguard_api.deps import get_current_user
from tideguard_api.models.lesson import Lesson, LessonProgress
from tideguard_api.models.user import User
from tideguard_api.services.certificates import render_certificate_pdf

router = APIRouter(prefix="/education", tags=["education"])


class ProgressPayload(BaseModel):
    lesson_slug: str
    score: float = Field(..., ge=0, le=1)


@router.get("/lessons")
async def list_lessons(
    lang: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(Lesson).order_by(Lesson.order_index)
    if lang:
        stmt = stmt.where(Lesson.lang == lang)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": str(le.id),
            "slug": le.slug,
            "title": le.title,
            "xp_reward": le.xp_reward,
            "order": le.order_index,
            "lang": le.lang,
            "grade_band": le.grade_band,
            "sdgs": le.sdgs,
        }
        for le in rows
    ]


@router.get("/lessons/{slug}")
async def get_lesson(slug: str, db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(select(Lesson).where(Lesson.slug == slug))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return {
        "id": str(lesson.id),
        "slug": lesson.slug,
        "title": lesson.title,
        "content_md": lesson.content_md,
        "quiz": lesson.quiz_json,
        "xp_reward": lesson.xp_reward,
        "order": lesson.order_index,
        "lang": lesson.lang,
        "grade_band": lesson.grade_band,
        "sdgs": lesson.sdgs,
        "practical_task_md": lesson.practical_task_md,
    }


@router.post("/progress")
async def record_progress(
    payload: ProgressPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(select(Lesson).where(Lesson.slug == payload.lesson_slug))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    existing = await db.execute(
        select(LessonProgress).where(
            LessonProgress.user_id == user.id,
            LessonProgress.lesson_id == lesson.id,
        )
    )
    progress = existing.scalar_one_or_none()
    awarded_xp = 0
    if progress is None:
        progress = LessonProgress(
            user_id=user.id,
            lesson_id=lesson.id,
            completed_at=datetime.now(UTC),
            score=payload.score,
        )
        db.add(progress)
        awarded_xp = lesson.xp_reward
        user.xp = (user.xp or 0) + awarded_xp
    else:
        progress.score = max(progress.score or 0, payload.score)

    await db.commit()
    return {"lesson_slug": lesson.slug, "score": payload.score, "xp_awarded": awarded_xp, "xp_total": user.xp}


@router.get("/certificate")
async def get_certificate(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    completed = (
        (
            await db.execute(
                select(LessonProgress).where(
                    LessonProgress.user_id == user.id,
                    LessonProgress.completed_at.isnot(None),
                )
            )
        )
        .scalars()
        .all()
    )
    n_completed = len(completed)
    if n_completed < 5:
        raise HTTPException(403, f"Complete at least 5 lessons (you have {n_completed})")

    school_name: str | None = None
    if user.school_id:
        from tideguard_api.models.school import School

        s = (await db.execute(select(School).where(School.id == user.school_id))).scalar_one_or_none()
        if s:
            school_name = s.name

    pdf = render_certificate_pdf(
        user_name=user.name or user.email,
        school_name=school_name,
        completed_lessons=n_completed,
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="tideguard-certificate.pdf"'},
    )


@router.post("/_seed")
async def seed_lessons(db: AsyncSession = Depends(get_db)) -> dict:
    """Seed the 10 EE lessons from content/lessons/ into the DB (idempotent)."""
    from pathlib import Path

    # routers -> tideguard_api -> src -> api -> apps -> repo root
    content_dir = Path(__file__).resolve().parents[5] / "content" / "lessons"
    if not content_dir.exists():
        # Fall back to repo cwd + content/lessons (works under custom workdirs)
        alt = Path.cwd() / "content" / "lessons"
        if alt.exists():
            content_dir = alt
        else:
            return {"seeded": 0, "note": f"content dir not found: {content_dir}"}

    import json
    import re

    inserted = 0
    md_files = list(content_dir.glob("*.md"))
    md_files += list(content_dir.glob("*/*.md"))  # zh-TW + other language subdirs
    for md_path in sorted(md_files):
        text = md_path.read_text(encoding="utf-8")
        fm_match = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
        if not fm_match:
            continue
        fm, body = fm_match.groups()
        meta: dict[str, str] = {}
        for line in fm.strip().splitlines():
            if ":" in line:
                key, val = line.split(":", 1)
                meta[key.strip()] = val.strip().strip('"')
        slug = meta.get("slug")
        if not slug:
            continue

        quiz_match = re.search(r"```json\n(\[.*?\])\n```", body, re.S)
        quiz = json.loads(quiz_match.group(1)) if quiz_match else []
        content_md = body
        if quiz_match:
            content_md = body[: quiz_match.start()].rstrip()

        existing = await db.execute(select(Lesson).where(Lesson.slug == slug))
        if existing.scalar_one_or_none():
            continue
        sdgs_field = meta.get("sdgs", "")
        sdgs_list = [int(x) for x in re.findall(r"\d+", sdgs_field)]
        # Practical task block — anything fenced as ```task ...``` lives there.
        task_match = re.search(r"```task\n(.*?)\n```", body, re.S)
        practical_task = task_match.group(1).strip() if task_match else None
        if task_match:
            content_md = content_md.replace(task_match.group(0), "").rstrip()
        lesson = Lesson(
            id=uuid.uuid4(),
            slug=slug,
            title=meta.get("title", slug),
            content_md=content_md,
            quiz_json={"questions": quiz},
            xp_reward=int(meta.get("xp", 50)),
            order_index=int(meta.get("order", 0)),
            lang=meta.get("lang", "en"),
            grade_band=meta.get("grade") or meta.get("grade_band"),
            sdgs={"goals": sdgs_list},
            practical_task_md=practical_task,
        )
        db.add(lesson)
        inserted += 1
    await db.commit()
    return {"seeded": inserted}

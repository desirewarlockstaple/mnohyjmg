"""Lightweight schema migrations for the SQLite store.

We don't need full Alembic for a single-file SQLite DB. Each migration is
a Python coroutine that takes an ``aiosqlite.Connection`` and a sequence
number; the framework records what's been applied in a ``schema_version``
table and runs anything new in order. New migrations should APPEND to
``MIGRATIONS`` and never edit existing ones.

Idempotent on every boot: if all migrations are applied, this is a no-op.
"""

from __future__ import annotations

import datetime as _dt
import logging
from collections.abc import Awaitable, Callable

import aiosqlite

log = logging.getLogger("spas.migrations")

Migration = Callable[[aiosqlite.Connection], Awaitable[None]]


async def _ensure_schema_version(conn: aiosqlite.Connection) -> None:
    await conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );
        """
    )
    await conn.commit()


async def _current_version(conn: aiosqlite.Connection) -> int:
    cur = await conn.execute("SELECT COALESCE(MAX(version), 0) FROM schema_version")
    row = await cur.fetchone()
    return int(row[0] if row else 0)


async def _record_version(conn: aiosqlite.Connection, version: int) -> None:
    await conn.execute(
        "INSERT INTO schema_version(version, applied_at) VALUES(?, ?)",
        (version, _dt.datetime.now(_dt.UTC).isoformat()),
    )
    await conn.commit()


# --- migrations -------------------------------------------------------


async def _m001_user_settings(conn: aiosqlite.Connection) -> None:
    await conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY,
            language TEXT NOT NULL DEFAULT 'ru',
            accessibility INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
        );
        """
    )
    await conn.commit()


async def _m002_xp(conn: aiosqlite.Connection) -> None:
    await conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS user_xp (
            user_id INTEGER PRIMARY KEY,
            xp INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 1,
            achievements TEXT NOT NULL DEFAULT '[]',
            streak_days INTEGER NOT NULL DEFAULT 0,
            last_active TEXT
        );
        """
    )
    await conn.commit()


async def _m003_classes(conn: aiosqlite.Connection) -> None:
    await conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            invite_code TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

        CREATE TABLE IF NOT EXISTS class_members (
            class_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at TEXT NOT NULL,
            nickname TEXT,
            PRIMARY KEY (class_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_members_user ON class_members(user_id);
        """
    )
    await conn.commit()


async def _m004_sos_contacts(conn: aiosqlite.Connection) -> None:
    await conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS sos_contacts (
            user_id INTEGER PRIMARY KEY,
            contact_chat_id INTEGER,
            contact_username TEXT,
            display_name TEXT,
            created_at TEXT NOT NULL
        );
        """
    )
    await conn.commit()


async def _m005_ab_assignments(conn: aiosqlite.Connection) -> None:
    await conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS ab_assignments (
            user_id INTEGER NOT NULL,
            experiment TEXT NOT NULL,
            variant TEXT NOT NULL,
            assigned_at TEXT NOT NULL,
            PRIMARY KEY (user_id, experiment)
        );
        """
    )
    await conn.commit()


MIGRATIONS: list[tuple[int, Migration]] = [
    (1, _m001_user_settings),
    (2, _m002_xp),
    (3, _m003_classes),
    (4, _m004_sos_contacts),
    (5, _m005_ab_assignments),
]


async def run_migrations(conn: aiosqlite.Connection) -> int:
    """Apply any pending migrations. Returns the new schema version."""
    await _ensure_schema_version(conn)
    current = await _current_version(conn)
    applied = 0
    for version, migrate in MIGRATIONS:
        if version <= current:
            continue
        log.info("applying migration %d", version)
        await migrate(conn)
        await _record_version(conn, version)
        applied += 1
    if applied:
        log.info("applied %d migration(s); now at version %d", applied, current + applied)
    return current + applied

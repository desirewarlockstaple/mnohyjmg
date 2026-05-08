"""SQLite-хранилище для аналитики и состояний."""

from __future__ import annotations

import datetime as dt
import logging
from typing import Any

import aiosqlite

log = logging.getLogger("spas.storage")


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    username TEXT,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    region TEXT,
    age INTEGER
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ts TEXT NOT NULL,
    name TEXT NOT NULL,
    payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name, ts);

CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ts TEXT NOT NULL,
    nps INTEGER,
    comment TEXT
);

CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ts TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    phase TEXT NOT NULL,
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS aed_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ts TEXT NOT NULL,
    city TEXT,
    name TEXT,
    note TEXT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    photo_file_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_aed_status ON aed_submissions(status, ts);

CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ts TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    scenarios_completed INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
"""


def _now() -> str:
    return dt.datetime.now(dt.UTC).isoformat()


class Storage:
    def __init__(self, path: str) -> None:
        self.path = path
        self._db: aiosqlite.Connection | None = None

    async def init(self) -> None:
        self._db = await aiosqlite.connect(self.path)
        await self._db.executescript(SCHEMA)
        await self._db.commit()
        log.info("Storage ready: %s", self.path)

    async def close(self) -> None:
        if self._db:
            await self._db.close()

    @property
    def db(self) -> aiosqlite.Connection:
        if self._db is None:
            raise RuntimeError("Storage not initialised")
        return self._db

    async def upsert_user(self, user_id: int, username: str | None) -> None:
        now = _now()
        await self.db.execute(
            """
            INSERT INTO users(user_id, username, first_seen, last_seen)
            VALUES(?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              last_seen = excluded.last_seen,
              username  = excluded.username
            """,
            (user_id, username, now, now),
        )
        await self.db.commit()

    async def log_event(self, user_id: int, name: str, payload: str | None = None) -> None:
        await self.db.execute(
            "INSERT INTO events(user_id, ts, name, payload) VALUES(?,?,?,?)",
            (user_id, _now(), name, payload),
        )
        await self.db.commit()

    async def save_feedback(self, user_id: int, nps: int | None, comment: str | None) -> None:
        await self.db.execute(
            "INSERT INTO feedback(user_id, ts, nps, comment) VALUES(?,?,?,?)",
            (user_id, _now(), nps, comment),
        )
        await self.db.commit()

    async def save_test(self, user_id: int, scenario_id: str, phase: str, correct: int, total: int) -> None:
        await self.db.execute(
            "INSERT INTO test_results(user_id, ts, scenario_id, phase, correct, total) VALUES(?,?,?,?,?,?)",
            (user_id, _now(), scenario_id, phase, correct, total),
        )
        await self.db.commit()

    async def count_distinct_completed_scenarios(self, user_id: int) -> int:
        cur = await self.db.execute(
            """
            SELECT COUNT(DISTINCT payload) FROM events
            WHERE user_id = ? AND name = 'scenario_complete' AND payload IS NOT NULL
            """,
            (user_id,),
        )
        row = await cur.fetchone()
        return int(row[0] if row else 0)

    async def save_certificate(
        self, user_id: int, code: str, full_name: str, scenarios_completed: int
    ) -> None:
        await self.db.execute(
            """
            INSERT OR REPLACE INTO certificates(user_id, ts, code, full_name, scenarios_completed)
            VALUES(?, ?, ?, ?, ?)
            """,
            (user_id, _now(), code, full_name, scenarios_completed),
        )
        await self.db.commit()

    async def insert_aed_submission(
        self,
        *,
        user_id: int,
        city: str | None,
        name: str | None,
        note: str | None,
        lat: float,
        lon: float,
        photo_file_id: str | None,
    ) -> int:
        cur = await self.db.execute(
            """
            INSERT INTO aed_submissions(user_id, ts, city, name, note, lat, lon, photo_file_id, status)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            """,
            (user_id, _now(), city, name, note, lat, lon, photo_file_id),
        )
        await self.db.commit()
        return int(cur.lastrowid or 0)

    async def list_pending_aed(self, limit: int = 20) -> list[dict[str, Any]]:
        cur = await self.db.execute(
            """
            SELECT id, user_id, ts, city, name, note, lat, lon, photo_file_id
            FROM aed_submissions WHERE status='pending' ORDER BY ts ASC LIMIT ?
            """,
            (limit,),
        )
        rows = await cur.fetchall()
        keys = ("id", "user_id", "ts", "city", "name", "note", "lat", "lon", "photo_file_id")
        return [dict(zip(keys, row, strict=False)) for row in rows]

    async def update_aed_status(self, submission_id: int, status: str) -> bool:
        if status not in ("pending", "approved", "rejected"):
            raise ValueError(f"invalid status: {status}")
        cur = await self.db.execute(
            "UPDATE aed_submissions SET status=? WHERE id=?",
            (status, submission_id),
        )
        await self.db.commit()
        return (cur.rowcount or 0) > 0

    async def metrics(self) -> dict[str, Any]:
        cur = await self.db.execute("SELECT COUNT(*) FROM users")
        users = (await cur.fetchone())[0]

        cur = await self.db.execute(
            "SELECT COUNT(DISTINCT user_id) FROM events WHERE ts > datetime('now','-1 day')"
        )
        dau = (await cur.fetchone())[0]

        cur = await self.db.execute("SELECT COUNT(*) FROM events WHERE name='scenario_complete'")
        completions = (await cur.fetchone())[0]

        cur = await self.db.execute("SELECT AVG(nps) FROM feedback WHERE nps IS NOT NULL")
        avg_nps = (await cur.fetchone())[0] or 0

        cur = await self.db.execute(
            """
            SELECT phase, AVG(1.0 * correct / total) FROM test_results
            GROUP BY phase
            """
        )
        rows = await cur.fetchall()
        phase_scores = {row[0]: float(row[1]) for row in rows}

        return {
            "users_total": users,
            "dau": dau,
            "scenarios_completed": completions,
            "avg_nps": float(avg_nps),
            "pre_score_avg": phase_scores.get("pre"),
            "post_score_avg": phase_scores.get("post"),
        }

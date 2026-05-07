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
"""


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


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

    async def save_test(
        self, user_id: int, scenario_id: str, phase: str, correct: int, total: int
    ) -> None:
        await self.db.execute(
            "INSERT INTO test_results(user_id, ts, scenario_id, phase, correct, total) VALUES(?,?,?,?,?,?)",
            (user_id, _now(), scenario_id, phase, correct, total),
        )
        await self.db.commit()

    async def metrics(self) -> dict[str, Any]:
        cur = await self.db.execute("SELECT COUNT(*) FROM users")
        users = (await cur.fetchone())[0]

        cur = await self.db.execute(
            "SELECT COUNT(DISTINCT user_id) FROM events WHERE ts > datetime('now','-1 day')"
        )
        dau = (await cur.fetchone())[0]

        cur = await self.db.execute(
            "SELECT COUNT(*) FROM events WHERE name='scenario_complete'"
        )
        completions = (await cur.fetchone())[0]

        cur = await self.db.execute(
            "SELECT AVG(nps) FROM feedback WHERE nps IS NOT NULL"
        )
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

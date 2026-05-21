"""FastAPI application entry point."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from tideguard_api.db import Base, engine
from tideguard_api.routers import (
    admin,
    auth,
    badges,
    cleanups,
    education,
    forecast,
    leaderboard,
    reports,
    tiles,
)
from tideguard_api.settings import get_settings


def _setup_logging(settings) -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    handler = logging.StreamHandler()
    if settings.log_json:
        # Plain key=value JSON-ish; full structlog opt-in is in CHANGELOG.
        fmt = '{"ts":"%(asctime)s","level":"%(levelname)s","name":"%(name)s","msg":"%(message)s"}'
    else:
        fmt = "%(asctime)s %(levelname)s %(name)s — %(message)s"
    handler.setFormatter(logging.Formatter(fmt))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)


def _maybe_init_sentry(settings) -> None:
    if not settings.sentry_dsn:
        return
    try:  # pragma: no cover — optional dep, only ships when configured
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            integrations=[StarletteIntegration(), FastApiIntegration()],
            traces_sample_rate=0.1,
            send_default_pii=False,
        )
    except Exception as exc:  # noqa: BLE001
        logging.getLogger(__name__).warning("Sentry init failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    _setup_logging(settings)
    _maybe_init_sentry(settings)
    # In dev (sqlite), auto-create schema. In prod, use Alembic migrations.
    if settings.database_url.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield


# Slowapi limiter — uses client IP. We expose the instance so we can decorate
# specific routes when they want a tighter limit than the default middleware.
limiter = Limiter(key_func=get_remote_address)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="TideGuard API",
        description="Backend API for TideGuard AI — marine debris forecasting + community cleanup.",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS — concrete origins only. We never combine "*" with credentials=True.
    allow_credentials = bool(settings.cors_origins) and "*" not in settings.cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=allow_credentials,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    )

    # Rate limiting middleware. Default 60 req/min/IP across the app; route
    # decorators can override per-route.
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    @app.exception_handler(RateLimitExceeded)
    async def _rate_limit_handler(_request: Request, _exc: RateLimitExceeded):
        return JSONResponse(status_code=429, content={"detail": "rate limit exceeded"})

    @app.get("/healthz", tags=["health"])
    def healthz() -> dict:
        return {"status": "ok", "service": "tideguard-api", "version": "0.1.0"}

    @app.get("/", tags=["health"])
    def root() -> dict:
        return {"name": "TideGuard API", "docs": "/docs", "health": "/healthz"}

    app.include_router(auth.router)
    app.include_router(forecast.router)
    app.include_router(reports.router)
    app.include_router(cleanups.router)
    app.include_router(education.router)
    app.include_router(leaderboard.router)
    app.include_router(tiles.router)
    app.include_router(badges.router)
    app.include_router(admin.router)

    @app.exception_handler(ValueError)
    async def value_error_handler(_request, exc: ValueError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    return app


app = create_app()

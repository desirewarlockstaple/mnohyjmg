"""Application settings loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised configuration for the API service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite+aiosqlite:///./tideguard_dev.db"
    redis_url: str = "redis://localhost:6379/0"
    # Concrete origins. NOTE: never combine ["*"] with allow_credentials=True.
    cors_origins: list[str] = [
        "http://localhost:3000",
        "https://tideguard.app",
        "https://www.tideguard.app",
    ]

    # Auth — HS256 JWT
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "tideguard"
    jwt_audience: str = "tideguard-app"
    jwt_ttl_seconds: int = 60 * 60 * 24 * 7  # one week
    # Setting to true enables the "dev user" fallback when no Authorization header
    # is present. Always false in production.
    allow_anonymous_dev_user: bool = True

    # Supabase (optional, for federated identity in production)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Object storage
    s3_endpoint: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket_data: str = "tideguard-data"
    s3_bucket_photos: str = "tideguard-photos"

    # ML
    pinn_checkpoint_path: str = "checkpoints/pinn_demo.pt"

    # Photo upload guardrails
    photo_max_bytes: int = 10 * 1024 * 1024
    photo_allowed_mime: tuple[str, ...] = (
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
    )

    # Rate limiting (slowapi)
    rate_limit_per_minute: int = 60
    # Observability
    sentry_dsn: str = ""
    log_level: str = "INFO"
    log_json: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()

"""Top-level entry point for `uvicorn main:app`.

Re-exports the FastAPI app from the `app` package so that
deploy targets that expect `main:app` (such as the Devin backend
deployer) can find it without further configuration.
"""

from app.main import app

__all__ = ["app"]

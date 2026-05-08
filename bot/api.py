"""REST API для встраивания контента СПАС в школьные сайты.

Запускается отдельной командой ``python -m bot.api`` либо в составе
docker-compose. Выдаёт read-only JSON по сценариям и точкам АНД,
плюс health.

Эндпоинты:
  GET /api/health
  GET /api/scenarios
  GET /api/scenarios/{id}
  GET /api/aed
  GET /api/dispatcher
  GET /api/panic

Отдельный сервис от бота, чтобы можно было хостить статику без BOT_TOKEN.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from aiohttp import web

log = logging.getLogger("spas.api")

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"


def _load_json(name: str) -> dict[str, Any]:
    return json.loads((CONTENT_DIR / name).read_text(encoding="utf-8"))


async def _health(_request: web.Request) -> web.Response:
    return web.json_response({"ok": True, "version": os.getenv("APP_VERSION", "dev")})


def _add_cors(resp: web.Response) -> web.Response:
    resp.headers["Access-Control-Allow-Origin"] = os.getenv("API_CORS_ORIGIN", "*")
    resp.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    resp.headers["Cache-Control"] = "public, max-age=300"
    return resp


@web.middleware
async def cors_middleware(request: web.Request, handler):
    if request.method == "OPTIONS":
        return _add_cors(web.Response(status=204))
    response = await handler(request)
    if isinstance(response, web.Response):
        _add_cors(response)
    return response


async def _scenarios(_request: web.Request) -> web.Response:
    blob = _load_json("scenarios.json")
    summary = [
        {
            "id": s["id"],
            "title": s["title"],
            "icon": s.get("icon", "•"),
            "category": s.get("category", "minor"),
            "summary": s.get("summary", ""),
            "phone": s.get("phone", "112"),
        }
        for s in blob["scenarios"]
    ]
    return web.json_response({"scenarios": summary, "total": len(summary)})


async def _scenario_one(request: web.Request) -> web.Response:
    sid = request.match_info["scenario_id"]
    blob = _load_json("scenarios.json")
    for s in blob["scenarios"]:
        if s["id"] == sid:
            return web.json_response(s)
    return web.json_response({"error": "not_found", "id": sid}, status=404)


async def _aed(_request: web.Request) -> web.Response:
    blob = _load_json("aed_locations.json")
    return web.json_response(blob)


async def _dispatcher(_request: web.Request) -> web.Response:
    return web.json_response(_load_json("dispatcher_checklist.json"))


async def _panic(_request: web.Request) -> web.Response:
    return web.json_response(_load_json("panic_protocol.json"))


def build_api() -> web.Application:
    app = web.Application(middlewares=[cors_middleware])
    app.router.add_get("/api/health", _health)
    app.router.add_get("/api/scenarios", _scenarios)
    app.router.add_get("/api/scenarios/{scenario_id}", _scenario_one)
    app.router.add_get("/api/aed", _aed)
    app.router.add_get("/api/dispatcher", _dispatcher)
    app.router.add_get("/api/panic", _panic)
    return app


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8090"))
    web.run_app(build_api(), host=host, port=port)


if __name__ == "__main__":
    main()

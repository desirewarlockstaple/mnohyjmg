"""
СПАС: AI-помощник первой помощи — Telegram bot.
Точка входа.
"""
from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from dotenv import load_dotenv

from bot.handlers import register_handlers
from bot.storage import Storage

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("spas")


async def main() -> None:
    token = os.getenv("BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN missing in .env")

    bot = Bot(token=token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()

    storage = Storage(os.getenv("DB_PATH", "spas.db"))
    await storage.init()

    register_handlers(dp, storage=storage, content_dir=ROOT / "content")

    me = await bot.get_me()
    log.info("СПАС-бот запущен: @%s", me.username)

    try:
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        await bot.session.close()
        await storage.close()


if __name__ == "__main__":
    asyncio.run(main())

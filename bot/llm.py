"""
Опциональный LLM-слой для свободных вопросов пользователя.

Поддерживается:
- GigaChat (Сбер) — эндпоинт https://gigachat.devices.sberbank.ru/api/v1/chat/completions
- YandexGPT — эндпоинт https://llm.api.cloud.yandex.net/foundationModels/v1/completion

Если ключи не заданы — бот сам отвечает «свободные вопросы пока не доступны,
выберите сценарий из меню».
"""

from __future__ import annotations

import logging
import os
from typing import Any

import aiohttp

log = logging.getLogger("spas.llm")

SYSTEM_PROMPT = """\
Ты — справочный AI-помощник «СПАС» для подростков 14-17 лет в России.
Ты помогаешь сориентироваться в ситуации первой помощи и подсказываешь,
какой сценарий из меню бота открыть. Ты НЕ ставишь диагнозов и НЕ
заменяешь скорую помощь.

Правила:
1. ВСЕГДА в первую очередь рекомендуй позвонить 112 или 103 при любой
   опасной ситуации.
2. Отвечай коротко: 4-6 предложений, простым языком.
3. Если ситуация критическая — говори в начале: "ПОЗВОНИ 112 СЕЙЧАС".
4. Опирайся на стандарты Российского Национального Совета по реанимации
   и ERC Guidelines.
5. Не давай дозировок лекарств, кроме общеизвестных безрецептурных
   (парацетамол, ибупрофен, аспирин при инфаркте 250-500 мг).
6. Если вопрос НЕ про первую помощь — мягко верни в тему.
7. Заканчивай ответ кнопкой действия: какой сценарий открыть в боте."""


async def ask_llm(question: str) -> str | None:
    """Вернёт ответ LLM или None, если ни один провайдер не настроен/доступен."""
    if os.getenv("GIGACHAT_API_KEY"):
        try:
            return await _ask_gigachat(question)
        except Exception as exc:
            log.warning("GigaChat failed: %s", exc)

    if os.getenv("YANDEX_API_KEY") and os.getenv("YANDEX_FOLDER_ID"):
        try:
            return await _ask_yandex(question)
        except Exception as exc:
            log.warning("YandexGPT failed: %s", exc)

    return None


async def _ask_gigachat(question: str) -> str:
    api_key = os.environ["GIGACHAT_API_KEY"]
    url = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload: dict[str, Any] = {
        "model": "GigaChat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
        "temperature": 0.2,
        "max_tokens": 400,
    }
    async with (
        aiohttp.ClientSession() as s,
        s.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=20)) as r,
    ):
        r.raise_for_status()
        data = await r.json()
        return data["choices"][0]["message"]["content"]


async def _ask_yandex(question: str) -> str:
    api_key = os.environ["YANDEX_API_KEY"]
    folder = os.environ["YANDEX_FOLDER_ID"]
    url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
    headers = {"Authorization": f"Api-Key {api_key}", "Content-Type": "application/json"}
    payload: dict[str, Any] = {
        "modelUri": f"gpt://{folder}/yandexgpt-lite",
        "completionOptions": {"temperature": 0.2, "maxTokens": 400},
        "messages": [
            {"role": "system", "text": SYSTEM_PROMPT},
            {"role": "user", "text": question},
        ],
    }
    async with (
        aiohttp.ClientSession() as s,
        s.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=20)) as r,
    ):
        r.raise_for_status()
        data = await r.json()
        return data["result"]["alternatives"][0]["message"]["text"]

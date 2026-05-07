"""Telegram-обработчики СПАС-бота."""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from aiogram import Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Location,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)

from bot.aed import nearest
from bot.catalogue import Catalogue, Scenario
from bot.llm import ask_llm
from bot.metronome import send_audio_metronome, send_text_metronome
from bot.storage import Storage

log = logging.getLogger("spas.handlers")


class ScenarioState(StatesGroup):
    pre_test = State()
    in_steps = State()
    post_test = State()
    nps = State()


WELCOME = (
    "🚑 <b>СПАС</b> — карманный AI-помощник первой помощи\n\n"
    "Я провожу тебя через действия в неотложной ситуации шаг за шагом.\n"
    "30 сценариев — от СЛР до приступа астмы.\n\n"
    "<b>Если случилось ПРЯМО СЕЙЧАС</b> — нажми /sos.\n"
    "Иначе — выбери, чему хочешь научиться.\n\n"
    "<i>Дисклеймер: справочный сервис, не заменяет 112/103. "
    "При любой опасности первое действие — звонок 112.</i>"
)

SOS_TEXT = (
    "🆘 <b>SOS</b>\n\n"
    "1. Позвони <b>112</b> — единый номер спасения.\n"
    "2. Назови адрес, что случилось, сколько пострадавших.\n"
    "3. Не клади трубку — диспетчер подскажет.\n\n"
    "Что произошло? Выбери ситуацию ниже."
)


def main_menu_kb(catalogue: Catalogue) -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text="🆘 SOS — нужна помощь СЕЙЧАС", callback_data="menu:sos")],
        [InlineKeyboardButton(text="🚨 Критические ситуации", callback_data="menu:critical")],
        [InlineKeyboardButton(text="⚠️ Срочные ситуации", callback_data="menu:urgent")],
        [InlineKeyboardButton(text="🩹 Лёгкие случаи", callback_data="menu:minor")],
        [InlineKeyboardButton(text="📍 Найти ближайший АНД", callback_data="menu:aed")],
        [InlineKeyboardButton(text="❓ Свободный вопрос (AI)", callback_data="menu:ask")],
        [InlineKeyboardButton(text="📊 Поделиться обратной связью", callback_data="menu:nps")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


def category_kb(scenarios: list[Scenario], category: str) -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text=f"{s.icon} {s.title}", callback_data=f"scn:{s.id}")]
        for s in scenarios
    ]
    rows.append([InlineKeyboardButton(text="« назад", callback_data="menu:home")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def location_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📍 Отправить геолокацию", request_location=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def step_kb(scenario_id: str, idx: int, total: int, phone: str) -> InlineKeyboardMarkup:
    rows = []
    nav: list[InlineKeyboardButton] = []
    if idx > 0:
        nav.append(InlineKeyboardButton(text="« шаг назад", callback_data=f"step:{scenario_id}:{idx-1}"))
    if idx < total - 1:
        nav.append(InlineKeyboardButton(text="шаг вперёд »", callback_data=f"step:{scenario_id}:{idx+1}"))
    if nav:
        rows.append(nav)
    rows.append([InlineKeyboardButton(text=f"📞 Позвонить {phone}", url=f"tel:{phone}")])
    if idx == total - 1:
        rows.append([InlineKeyboardButton(text="✅ Завершить и пройти тест", callback_data=f"end:{scenario_id}")])
    rows.append([InlineKeyboardButton(text="🥁 Включить метроном", callback_data=f"metro:{scenario_id}")])
    rows.append([InlineKeyboardButton(text="« в меню", callback_data="menu:home")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def test_kb(scenario_id: str, phase: str, q_idx: int, options: list[str]) -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text=opt, callback_data=f"ans:{scenario_id}:{phase}:{q_idx}:{i}")]
        for i, opt in enumerate(options)
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


def nps_kb() -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text=str(i), callback_data=f"nps:{i}") for i in range(0, 6)],
        [InlineKeyboardButton(text=str(i), callback_data=f"nps:{i}") for i in range(6, 11)],
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


# ---------- handlers ----------

def register_handlers(dp: Dispatcher, *, storage: Storage, content_dir: Path) -> None:
    catalogue = Catalogue(content_dir)

    async def _start(message: Message, state: FSMContext) -> None:
        await state.clear()
        u = message.from_user
        if u:
            await storage.upsert_user(u.id, u.username)
            await storage.log_event(u.id, "start")
        await message.answer(WELCOME, reply_markup=main_menu_kb(catalogue))

    dp.message.register(_start, CommandStart())

    async def _sos(message: Message, state: FSMContext) -> None:
        await state.clear()
        if message.from_user:
            await storage.log_event(message.from_user.id, "sos")
        await message.answer(SOS_TEXT, reply_markup=main_menu_kb(catalogue))

    dp.message.register(_sos, Command("sos"))

    async def _help(message: Message) -> None:
        text = (
            "Команды:\n"
            "/start — главное меню\n"
            "/sos — экстренная помощь\n"
            "/aed — найти АНД рядом\n"
            "/ask — свободный вопрос AI-помощнику\n"
            "/feedback — оценить бот\n"
            "Если в опасной ситуации — звони 112."
        )
        await message.answer(text)

    dp.message.register(_help, Command("help"))

    async def _ask_cmd(message: Message, state: FSMContext) -> None:
        await state.set_state(ScenarioState.in_steps)
        await message.answer(
            "Напиши свой вопрос одним сообщением. Я отвечу коротко и подскажу нужный сценарий из меню.",
            reply_markup=ReplyKeyboardRemove(),
        )

    dp.message.register(_ask_cmd, Command("ask"))

    async def _feedback_cmd(message: Message, state: FSMContext) -> None:
        await state.set_state(ScenarioState.nps)
        await message.answer(
            "Насколько вероятно, что ты порекомендуешь СПАС друзьям? (0–10)",
            reply_markup=nps_kb(),
        )

    dp.message.register(_feedback_cmd, Command("feedback"))

    async def _aed_cmd(message: Message) -> None:
        await message.answer(
            "Отправь геолокацию — я найду ближайший АНД.",
            reply_markup=location_kb(),
        )

    dp.message.register(_aed_cmd, Command("aed"))

    async def _location(message: Message) -> None:
        loc: Location | None = message.location
        if not loc or not message.from_user:
            return
        hits = nearest(loc.latitude, loc.longitude, catalogue.aed, k=3)
        if not hits:
            await message.answer("База АНД пока пустая. Спасибо, что попробовал — мы её скоро дополним.", reply_markup=ReplyKeyboardRemove())
            return
        lines = ["📍 <b>Ближайшие АНД:</b>"]
        for h in hits:
            lines.append(
                f"\n• <b>{h.location.name}</b>\n  {h.location.city}, {h.distance_km:.1f} км\n  {h.location.note}"
            )
        await message.answer("\n".join(lines), reply_markup=ReplyKeyboardRemove())
        await storage.log_event(message.from_user.id, "aed_lookup")

    dp.message.register(_location, F.location)

    async def _free_text(message: Message, state: FSMContext) -> None:
        if not message.text or not message.from_user:
            return
        await storage.log_event(message.from_user.id, "ask", message.text[:200])
        await message.answer("Думаю…")
        answer = await ask_llm(message.text)
        if not answer:
            answer = (
                "Свободные вопросы пока не подключены (нужен ключ GigaChat / YandexGPT).\n"
                "Попробуй выбрать сценарий из меню — там пошаговый алгоритм."
            )
        await message.answer(answer, reply_markup=main_menu_kb(catalogue))
        await state.clear()

    dp.message.register(_free_text, ScenarioState.in_steps, F.text)

    async def _menu_cb(cb: CallbackQuery) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        action = cb.data.split(":", 1)[1]
        if action == "home":
            await cb.message.edit_text(WELCOME, reply_markup=main_menu_kb(catalogue))
        elif action == "sos":
            await cb.message.edit_text(SOS_TEXT, reply_markup=category_kb(catalogue.list_critical(), "critical"))
        elif action == "critical":
            await cb.message.edit_text("🚨 Критические:", reply_markup=category_kb(catalogue.list_critical(), "critical"))
        elif action == "urgent":
            await cb.message.edit_text("⚠️ Срочные:", reply_markup=category_kb(catalogue.list_urgent(), "urgent"))
        elif action == "minor":
            await cb.message.edit_text("🩹 Лёгкие:", reply_markup=category_kb(catalogue.list_minor(), "minor"))
        elif action == "aed":
            await cb.message.answer("Отправь геолокацию ниже:", reply_markup=location_kb())
        elif action == "ask":
            await cb.message.answer(
                "Напиши свой вопрос одним сообщением, я отвечу коротко.",
                reply_markup=ReplyKeyboardRemove(),
            )
        elif action == "nps":
            await cb.message.answer("Оцени от 0 до 10:", reply_markup=nps_kb())
        await cb.answer()

    dp.callback_query.register(_menu_cb, F.data.startswith("menu:"))

    async def _scenario_cb(cb: CallbackQuery, state: FSMContext) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        scenario_id = cb.data.split(":", 1)[1]
        scenario = catalogue.scenarios.get(scenario_id)
        if not scenario:
            await cb.answer("Не найдено")
            return
        await storage.log_event(cb.from_user.id, "scenario_open", scenario_id)
        # Pre-test if available
        if scenario.post_test:
            await state.set_state(ScenarioState.pre_test)
            await state.update_data(scenario_id=scenario_id, phase="pre", correct=0, total=0, q_idx=0)
            q = scenario.post_test[0]
            await cb.message.edit_text(
                f"<b>Перед стартом — короткий тест.</b>\n\n{q.q}",
                reply_markup=test_kb(scenario_id, "pre", 0, q.options),
            )
        else:
            await _start_steps(cb, scenario, 0)
        await cb.answer()

    dp.callback_query.register(_scenario_cb, F.data.startswith("scn:"))

    async def _start_steps(cb: CallbackQuery, scenario: Scenario, idx: int) -> None:
        if not cb.message or not cb.from_user:
            return
        text = (
            f"{scenario.icon} <b>{scenario.title}</b>\n"
            f"<i>{scenario.summary}</i>\n\n"
            f"<b>Шаг {idx + 1}/{len(scenario.steps)}</b>\n\n"
            f"{scenario.steps[idx]}"
        )
        await cb.message.edit_text(
            text, reply_markup=step_kb(scenario.id, idx, len(scenario.steps), scenario.phone)
        )

    async def _step_cb(cb: CallbackQuery) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        _, scenario_id, idx_s = cb.data.split(":")
        idx = int(idx_s)
        scenario = catalogue.scenarios.get(scenario_id)
        if not scenario:
            return
        await storage.log_event(cb.from_user.id, "step_open", f"{scenario_id}:{idx}")
        await _start_steps(cb, scenario, idx)
        await cb.answer()

    dp.callback_query.register(_step_cb, F.data.startswith("step:"))

    async def _metro_cb(cb: CallbackQuery) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        scenario_id = cb.data.split(":", 1)[1]
        await storage.log_event(cb.from_user.id, "metronome_play", scenario_id)
        await cb.answer("Запускаю метроном 110 BPM…")
        sent = await send_audio_metronome(cb.bot, cb.message.chat.id, bpm=110)  # type: ignore[arg-type]
        if not sent:
            await send_text_metronome(cb.bot, cb.message.chat.id, bpm=110, seconds=15)  # type: ignore[arg-type]

    dp.callback_query.register(_metro_cb, F.data.startswith("metro:"))

    async def _end_cb(cb: CallbackQuery, state: FSMContext) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        scenario_id = cb.data.split(":", 1)[1]
        await storage.log_event(cb.from_user.id, "scenario_complete", scenario_id)
        scenario = catalogue.scenarios.get(scenario_id)
        if not scenario or not scenario.post_test:
            await cb.message.answer("Готово! Вернись в меню: /start")
            return
        await state.set_state(ScenarioState.post_test)
        await state.update_data(scenario_id=scenario_id, phase="post", correct=0, total=0, q_idx=0)
        q = scenario.post_test[0]
        await cb.message.answer(
            f"<b>Финальный тест.</b>\n\n{q.q}",
            reply_markup=test_kb(scenario_id, "post", 0, q.options),
        )
        await cb.answer()

    dp.callback_query.register(_end_cb, F.data.startswith("end:"))

    async def _ans_cb(cb: CallbackQuery, state: FSMContext) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        _, scenario_id, phase, q_idx_s, choice_s = cb.data.split(":")
        scenario = catalogue.scenarios.get(scenario_id)
        if not scenario:
            return
        q_idx = int(q_idx_s)
        choice = int(choice_s)
        question = scenario.post_test[q_idx]
        is_correct = choice == question.correct

        data = await state.get_data()
        correct_total = data.get("correct", 0) + (1 if is_correct else 0)
        total = data.get("total", 0) + 1
        await state.update_data(correct=correct_total, total=total)

        feedback = "✅ Верно!" if is_correct else f"❌ Правильный ответ: <b>{question.options[question.correct]}</b>"
        await cb.message.edit_text(
            f"{scenario.icon} <b>{scenario.title}</b>\n\nВопрос {q_idx + 1}: {question.q}\n\n{feedback}"
        )

        next_idx = q_idx + 1
        if next_idx < len(scenario.post_test):
            next_q = scenario.post_test[next_idx]
            await state.update_data(q_idx=next_idx)
            await cb.message.answer(
                f"<b>Вопрос {next_idx + 1}/{len(scenario.post_test)}.</b>\n\n{next_q.q}",
                reply_markup=test_kb(scenario_id, phase, next_idx, next_q.options),
            )
            await cb.answer()
            return

        # phase finished
        await storage.save_test(cb.from_user.id, scenario_id, phase, correct_total, total)
        if phase == "pre":
            await state.set_state(ScenarioState.in_steps)
            await cb.message.answer(
                f"📊 Результат до обучения: {correct_total}/{total}.\nТеперь — пошаговый алгоритм.",
            )
            await _start_steps(cb, scenario, 0)
        else:
            await state.clear()
            await cb.message.answer(
                f"📊 Результат после обучения: {correct_total}/{total}.\n\n"
                f"Спасибо! Если хочешь — оцени бот: /feedback\n"
                f"Или открой ещё сценарий: /start"
            )
        await cb.answer()

    dp.callback_query.register(_ans_cb, F.data.startswith("ans:"))

    async def _nps_cb(cb: CallbackQuery, state: FSMContext) -> None:
        if not cb.data or not cb.from_user or not cb.message:
            return
        score = int(cb.data.split(":", 1)[1])
        await storage.save_feedback(cb.from_user.id, score, None)
        await storage.log_event(cb.from_user.id, "nps", str(score))
        await cb.message.edit_text(
            f"Спасибо! Твоя оценка: <b>{score}/10</b>.\n"
            f"Если хочешь оставить комментарий — просто напиши его сообщением."
        )
        await state.clear()
        await cb.answer()

    dp.callback_query.register(_nps_cb, F.data.startswith("nps:"))

    # Admin metrics
    admin_id_str = os.getenv("ADMIN_ID", "")
    admin_id = int(admin_id_str) if admin_id_str.isdigit() else None

    async def _stats(message: Message) -> None:
        if not message.from_user or message.from_user.id != admin_id:
            return
        m = await storage.metrics()
        await message.answer(
            "<b>📊 Метрики СПАС</b>\n\n"
            f"Пользователей всего: <b>{m['users_total']}</b>\n"
            f"DAU: <b>{m['dau']}</b>\n"
            f"Завершено сценариев: <b>{m['scenarios_completed']}</b>\n"
            f"Средний NPS: <b>{m['avg_nps']:.1f}</b>\n"
            f"Pre-test средний: <b>{(m['pre_score_avg'] or 0):.0%}</b>\n"
            f"Post-test средний: <b>{(m['post_score_avg'] or 0):.0%}</b>\n"
        )

    dp.message.register(_stats, Command("stats"))

    async def _fallback_text(message: Message, state: FSMContext) -> None:
        if not message.from_user:
            return
        # Free-form text outside of any state - treat as ask
        await storage.log_event(message.from_user.id, "free_text", (message.text or "")[:200])
        await message.answer("Думаю…")
        answer = await ask_llm(message.text or "")
        if not answer:
            answer = (
                "Свободные вопросы пока не подключены (нужен ключ GigaChat / YandexGPT).\n"
                "Попробуй выбрать сценарий из меню — там пошаговый алгоритм."
            )
        await message.answer(answer, reply_markup=main_menu_kb(catalogue))

    dp.message.register(_fallback_text, F.text)

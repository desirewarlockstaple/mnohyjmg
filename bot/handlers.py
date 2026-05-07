"""Telegram-обработчики СПАС-бота."""

from __future__ import annotations

import datetime as _dt
import logging
import os
from pathlib import Path

from aiogram import Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    BufferedInputFile,
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
from bot.certificate import (
    CertificatePayload,
    build_certificate_code,
    save_certificate_png,
)
from bot.dispatcher import (
    DispatcherChecklist,
    load_dispatcher_checklist,
    render_summary,
)
from bot.llm import ask_llm
from bot.metronome import send_audio_metronome, send_text_metronome
from bot.panic import (
    back_to_panic_kb,
    find_triage,
    load_panic_protocol,
    panic_intro_kb,
    run_breathing,
    triage_kb,
)
from bot.storage import Storage

log = logging.getLogger("spas.handlers")


CERTIFICATE_THRESHOLD = 3


class ScenarioState(StatesGroup):
    pre_test = State()
    in_steps = State()
    post_test = State()
    nps = State()


class DispatcherState(StatesGroup):
    answering = State()


class AedSubmitState(StatesGroup):
    waiting_location = State()
    waiting_name = State()
    waiting_photo = State()


class CertificateState(StatesGroup):
    waiting_name = State()


WELCOME = (
    "🚑 <b>СПАС</b> — карманный AI-помощник первой помощи\n\n"
    "Я провожу тебя через действия в неотложной ситуации шаг за шагом.\n"
    "30 сценариев — от СЛР до приступа астмы.\n\n"
    "<b>Если случилось ПРЯМО СЕЙЧАС</b> — нажми /sos.\n"
    "<b>Если страшно</b> — /panic, я подышу с тобой.\n\n"
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


def main_menu_kb() -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text="🆘 SOS — нужна помощь СЕЙЧАС", callback_data="menu:sos")],
        [InlineKeyboardButton(text="😰 Мне страшно (panic-режим)", callback_data="menu:panic")],
        [InlineKeyboardButton(text="🚨 Критические ситуации", callback_data="menu:critical")],
        [InlineKeyboardButton(text="⚠️ Срочные ситуации", callback_data="menu:urgent")],
        [InlineKeyboardButton(text="🩹 Лёгкие случаи", callback_data="menu:minor")],
        [InlineKeyboardButton(text="📍 Найти ближайший АНД", callback_data="menu:aed")],
        [InlineKeyboardButton(text="➕ Добавить АНД на карту", callback_data="menu:add_aed")],
        [InlineKeyboardButton(text="📞 Что сказать диспетчеру 112", callback_data="menu:dispatcher")],
        [InlineKeyboardButton(text="🎓 Мой сертификат", callback_data="menu:certificate")],
        [InlineKeyboardButton(text="❓ Свободный вопрос (AI)", callback_data="menu:ask")],
        [InlineKeyboardButton(text="📊 Поделиться обратной связью", callback_data="menu:nps")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


def category_kb(scenarios: list[Scenario], _category: str) -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text=f"{s.icon} {s.title}", callback_data=f"scn:{s.id}")] for s in scenarios
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
        rows.append(
            [InlineKeyboardButton(text="✅ Завершить и пройти тест", callback_data=f"end:{scenario_id}")]
        )
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


def dispatcher_question_kb(checklist: DispatcherChecklist, q_idx: int) -> InlineKeyboardMarkup:
    q = checklist.questions[q_idx]
    rows = [
        [InlineKeyboardButton(text=ex[:60], callback_data=f"disp_e:{q_idx}:{i}")]
        for i, ex in enumerate(q.examples)
    ]
    rows.append([InlineKeyboardButton(text="❌ Прервать", callback_data="disp:cancel")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def aed_skip_photo_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Пропустить фото", callback_data="aed_sub:skip")],
            [InlineKeyboardButton(text="❌ Отменить", callback_data="aed_sub:cancel")],
        ]
    )


def register_handlers(dp: Dispatcher, *, storage: Storage, content_dir: Path) -> None:
    catalogue = Catalogue(content_dir)
    panic_protocol = load_panic_protocol(content_dir)
    dispatcher_checklist = load_dispatcher_checklist(content_dir)

    async def _start(message: Message, state: FSMContext) -> None:
        await state.clear()
        u = message.from_user
        if u:
            await storage.upsert_user(u.id, u.username)
            await storage.log_event(u.id, "start")
        await message.answer(WELCOME, reply_markup=main_menu_kb())

    dp.message.register(_start, CommandStart())

    async def _sos(message: Message, state: FSMContext) -> None:
        await state.clear()
        if message.from_user:
            await storage.log_event(message.from_user.id, "sos")
        await message.answer(SOS_TEXT, reply_markup=category_kb(catalogue.list_critical(), "critical"))

    dp.message.register(_sos, Command("sos"))

    async def _help(message: Message) -> None:
        text = (
            "Команды:\n"
            "/start — главное меню\n"
            "/sos — экстренная помощь\n"
            "/panic — мне страшно, подышим вместе\n"
            "/aed — найти АНД рядом\n"
            "/add_aed — добавить АНД на карту\n"
            "/dispatcher — что сказать диспетчеру 112\n"
            "/certificate — мой сертификат участника\n"
            "/ask — свободный вопрос AI\n"
            "/feedback — оценить бот\n\n"
            "Если в опасной ситуации — звони 112."
        )
        await message.answer(text)

    dp.message.register(_help, Command("help"))

    async def _panic_cmd(message: Message, state: FSMContext) -> None:
        await state.clear()
        if message.from_user:
            await storage.log_event(message.from_user.id, "panic_open")
        await message.answer(
            f"😌 <b>Я рядом.</b>\n\n{panic_protocol.intro}",
            reply_markup=panic_intro_kb(),
        )

    dp.message.register(_panic_cmd, Command("panic"))

    async def _panic_cb(cb: CallbackQuery, state: FSMContext) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        if not isinstance(cb.message, Message):
            await cb.answer()
            return
        target = cb.message
        action = cb.data.split(":", 1)[1]
        if action == "home":
            await target.edit_text(
                f"😌 <b>Panic-режим.</b>\n\n{panic_protocol.intro}",
                reply_markup=panic_intro_kb(),
            )
        elif action == "breathe":
            await storage.log_event(cb.from_user.id, "panic_breathe")
            await target.edit_text(
                "Запускаю дыхание 6/мин. Считай со мной.",
                reply_markup=back_to_panic_kb(),
            )
            if cb.bot is not None:
                await run_breathing(cb.bot, target.chat.id, panic_protocol)
        elif action == "ground":
            await storage.log_event(cb.from_user.id, "panic_ground")
            lines = [panic_protocol.grounding_title]
            for i, line in enumerate(panic_protocol.grounding_lines, start=1):
                lines.append(f"{i}. {line}")
            lines.append("")
            lines.append(panic_protocol.grounding_outro)
            await target.edit_text("\n".join(lines), reply_markup=back_to_panic_kb())
        elif action == "triage":
            await storage.log_event(cb.from_user.id, "panic_triage")
            await target.edit_text(
                "Что случилось? Выбери ближе по описанию.",
                reply_markup=triage_kb(panic_protocol),
            )
        await cb.answer()
        _ = state

    dp.callback_query.register(_panic_cb, F.data.startswith("panic:"))

    async def _panic_triage_cb(cb: CallbackQuery) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        if not isinstance(cb.message, Message):
            await cb.answer()
            return
        option_id = cb.data.split(":", 1)[1]
        opt = find_triage(panic_protocol, option_id)
        if not opt:
            await cb.answer("Не найдено")
            return
        await storage.log_event(cb.from_user.id, "panic_triage_pick", option_id)
        rows: list[list[InlineKeyboardButton]] = []
        if opt.scenario:
            rows.append([InlineKeyboardButton(text="Открыть сценарий", callback_data=f"scn:{opt.scenario}")])
        rows.append([InlineKeyboardButton(text="« в panic-меню", callback_data="panic:home")])
        rows.append([InlineKeyboardButton(text="« в меню", callback_data="menu:home")])
        await cb.message.edit_text(opt.message, reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
        await cb.answer()

    dp.callback_query.register(_panic_triage_cb, F.data.startswith("panic_t:"))

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
        await message.answer("Отправь геолокацию — я найду ближайший АНД.", reply_markup=location_kb())

    dp.message.register(_aed_cmd, Command("aed"))

    async def _add_aed_cmd(message: Message, state: FSMContext) -> None:
        await state.set_state(AedSubmitState.waiting_location)
        await message.answer(
            "Спасибо, что хочешь дополнить базу АНД!\n\n"
            "1. Пришли геолокацию точки (можно «отправить выбранное место»).",
            reply_markup=location_kb(),
        )

    dp.message.register(_add_aed_cmd, Command("add_aed"))

    async def _dispatcher_cmd(message: Message, state: FSMContext) -> None:
        await state.set_state(DispatcherState.answering)
        await state.update_data(answers={}, q_idx=0)
        if message.from_user:
            await storage.log_event(message.from_user.id, "dispatcher_open")
        first = dispatcher_checklist.questions[0]
        await message.answer(
            f"{dispatcher_checklist.intro}\n\n<b>{first.label}</b>\n<i>{first.hint}</i>",
            reply_markup=dispatcher_question_kb(dispatcher_checklist, 0),
        )

    dp.message.register(_dispatcher_cmd, Command("dispatcher"))

    async def _certificate_cmd(message: Message, state: FSMContext) -> None:
        if not message.from_user:
            return
        completed = await storage.count_distinct_completed_scenarios(message.from_user.id)
        if completed < CERTIFICATE_THRESHOLD:
            await message.answer(
                f"🎓 Сертификат выдаётся после {CERTIFICATE_THRESHOLD} завершённых сценариев.\n"
                f"Ты прошёл(ла) {completed}. Открой ещё немного: /start",
            )
            return
        await state.set_state(CertificateState.waiting_name)
        await state.update_data(scenarios_completed=completed)
        await message.answer(
            "🎓 <b>Сертификат участника пилота СПАС</b>\n\n"
            f"Ты прошёл(ла) <b>{completed}</b> сценариев. Это внутренний знак "
            "участия, не медицинский документ.\n\n"
            "Напиши, как тебя зовут (Имя Фамилия) — впишу в сертификат.",
            reply_markup=ReplyKeyboardRemove(),
        )

    dp.message.register(_certificate_cmd, Command("certificate"))

    async def _location(message: Message, state: FSMContext) -> None:
        loc: Location | None = message.location
        if not loc or not message.from_user:
            return
        cur_state = await state.get_state()
        if cur_state == AedSubmitState.waiting_location.state:
            await state.update_data(lat=loc.latitude, lon=loc.longitude)
            await state.set_state(AedSubmitState.waiting_name)
            await message.answer(
                "Геолокация получена. 2. Где это? Напиши коротко: <b>город — название места</b>.\n"
                "Пример: <i>Москва — ТРЦ Авиапарк, 1 этаж у входа</i>.",
                reply_markup=ReplyKeyboardRemove(),
            )
            return
        hits = nearest(loc.latitude, loc.longitude, catalogue.aed, k=3)
        if not hits:
            await message.answer(
                "База АНД пока пустая. Спасибо, что попробовал — мы её скоро дополним.",
                reply_markup=ReplyKeyboardRemove(),
            )
            return
        lines = ["📍 <b>Ближайшие АНД:</b>"]
        for h in hits:
            lines.append(
                f"\n• <b>{h.location.name}</b>\n  {h.location.city}, {h.distance_km:.1f} км\n  {h.location.note}"
            )
        await message.answer("\n".join(lines), reply_markup=ReplyKeyboardRemove())
        await storage.log_event(message.from_user.id, "aed_lookup")

    dp.message.register(_location, F.location)

    async def _aed_name(message: Message, state: FSMContext) -> None:
        if not message.text or not message.from_user:
            return
        await state.update_data(name=message.text.strip()[:200])
        await state.set_state(AedSubmitState.waiting_photo)
        await message.answer(
            "3. Прикрепи фото устройства (или нажми «Пропустить фото» — модератор сможет проверить точку по карте).",
            reply_markup=aed_skip_photo_kb(),
        )

    dp.message.register(_aed_name, AedSubmitState.waiting_name, F.text)

    async def _save_aed_submission(
        sender: Message | CallbackQuery,
        state: FSMContext,
        photo_file_id: str | None,
    ) -> None:
        data = await state.get_data()
        from_user = sender.from_user
        if not from_user:
            return
        name_value = data.get("name", "")
        if isinstance(name_value, str) and "—" in name_value:
            city_part, _, rest = name_value.partition("—")
            city = city_part.strip()[:60]
            name = rest.strip()[:200]
        else:
            city = None
            name = (name_value if isinstance(name_value, str) else "")[:200]
        sub_id = await storage.insert_aed_submission(
            user_id=from_user.id,
            city=city,
            name=name,
            note=None,
            lat=float(data.get("lat", 0.0)),
            lon=float(data.get("lon", 0.0)),
            photo_file_id=photo_file_id,
        )
        await storage.log_event(from_user.id, "aed_submission", str(sub_id))
        await state.clear()
        text = (
            "🙏 Спасибо! Заявка отправлена на модерацию (обычно — до 48 часов).\n"
            "Когда точку подтвердят, она появится в /aed для всех."
        )
        if isinstance(sender, CallbackQuery) and isinstance(sender.message, Message):
            await sender.message.answer(text, reply_markup=main_menu_kb())
        elif isinstance(sender, Message):
            await sender.answer(text, reply_markup=main_menu_kb())

    async def _aed_photo(message: Message, state: FSMContext) -> None:
        if not message.photo or not message.from_user:
            return
        await _save_aed_submission(message, state, message.photo[-1].file_id)

    dp.message.register(_aed_photo, AedSubmitState.waiting_photo, F.photo)

    async def _aed_sub_cb(cb: CallbackQuery, state: FSMContext) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        action = cb.data.split(":", 1)[1]
        if action == "cancel":
            await state.clear()
            if isinstance(cb.message, Message):
                await cb.message.answer("Отменено.", reply_markup=main_menu_kb())
        elif action == "skip":
            await _save_aed_submission(cb, state, None)
        await cb.answer()

    dp.callback_query.register(_aed_sub_cb, F.data.startswith("aed_sub:"))

    async def _certificate_name_received(message: Message, state: FSMContext) -> None:
        if not message.text or not message.from_user:
            return
        full_name = message.text.strip()[:80]
        if not full_name:
            await message.answer("Имя не должно быть пустым. Попробуй ещё раз.")
            return
        data = await state.get_data()
        scenarios_completed = int(data.get("scenarios_completed", CERTIFICATE_THRESHOLD))
        issued_at = _dt.datetime.now(_dt.UTC)
        code = build_certificate_code(message.from_user.id, scenarios_completed, issued_at)
        payload = CertificatePayload(
            user_id=message.from_user.id,
            full_name=full_name,
            scenarios_completed=scenarios_completed,
            issued_at=issued_at,
            code=code,
        )
        png = save_certificate_png(payload)
        await storage.save_certificate(message.from_user.id, code, full_name, scenarios_completed)
        await storage.log_event(message.from_user.id, "certificate_issued", code)
        await message.answer_document(
            BufferedInputFile(png, filename=f"spas_certificate_{code}.png"),
            caption=(
                f"🎓 Готово, <b>{full_name}</b>!\n"
                f"Код сертификата: <code>{code}</code>\n\n"
                "Это внутренний знак участия в пилоте СПАС, не официальный мед.документ."
            ),
        )
        await state.clear()
        await message.answer("Что дальше?", reply_markup=main_menu_kb())

    dp.message.register(_certificate_name_received, CertificateState.waiting_name, F.text)

    async def _dispatcher_advance(
        sender: Message | CallbackQuery,
        state: FSMContext,
        answers: dict[str, str],
        next_idx: int,
    ) -> None:
        if next_idx >= len(dispatcher_checklist.questions):
            text = render_summary(dispatcher_checklist, answers)
            if isinstance(sender, CallbackQuery) and isinstance(sender.message, Message):
                await sender.message.answer(text, reply_markup=main_menu_kb())
            elif isinstance(sender, Message):
                await sender.answer(text, reply_markup=main_menu_kb())
            if sender.from_user:
                await storage.log_event(sender.from_user.id, "dispatcher_done")
            await state.clear()
            return
        await state.update_data(answers=answers, q_idx=next_idx)
        q = dispatcher_checklist.questions[next_idx]
        text = f"<b>{q.label}</b>\n<i>{q.hint}</i>"
        kb = dispatcher_question_kb(dispatcher_checklist, next_idx)
        if isinstance(sender, CallbackQuery) and isinstance(sender.message, Message):
            await sender.message.answer(text, reply_markup=kb)
        elif isinstance(sender, Message):
            await sender.answer(text, reply_markup=kb)

    async def _dispatcher_text(message: Message, state: FSMContext) -> None:
        if not message.text or not message.from_user:
            return
        data = await state.get_data()
        q_idx = int(data.get("q_idx", 0))
        answers = dict(data.get("answers", {}))
        q = dispatcher_checklist.questions[q_idx]
        answers[q.id] = message.text.strip()[:300]
        await _dispatcher_advance(message, state, answers, q_idx + 1)

    dp.message.register(_dispatcher_text, DispatcherState.answering, F.text)

    async def _dispatcher_example_cb(cb: CallbackQuery, state: FSMContext) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        _, q_idx_s, ex_idx_s = cb.data.split(":")
        q_idx = int(q_idx_s)
        data = await state.get_data()
        answers = dict(data.get("answers", {}))
        q = dispatcher_checklist.questions[q_idx]
        answers[q.id] = q.examples[int(ex_idx_s)]
        await _dispatcher_advance(cb, state, answers, q_idx + 1)
        await cb.answer()

    dp.callback_query.register(_dispatcher_example_cb, F.data.startswith("disp_e:"))

    async def _dispatcher_cancel_cb(cb: CallbackQuery, state: FSMContext) -> None:
        await state.clear()
        if isinstance(cb.message, Message):
            await cb.message.answer("Прервал. /start — главное меню.", reply_markup=main_menu_kb())
        await cb.answer()

    dp.callback_query.register(_dispatcher_cancel_cb, F.data == "disp:cancel")

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
        await message.answer(answer, reply_markup=main_menu_kb())
        await state.clear()

    dp.message.register(_free_text, ScenarioState.in_steps, F.text)

    async def _menu_cb(cb: CallbackQuery, state: FSMContext) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        if not isinstance(cb.message, Message):
            await cb.answer()
            return
        action = cb.data.split(":", 1)[1]
        target = cb.message
        if action == "home":
            await target.edit_text(WELCOME, reply_markup=main_menu_kb())
        elif action == "sos":
            await target.edit_text(SOS_TEXT, reply_markup=category_kb(catalogue.list_critical(), "critical"))
        elif action == "panic":
            await storage.log_event(cb.from_user.id, "panic_open")
            await target.edit_text(
                f"😌 <b>Я рядом.</b>\n\n{panic_protocol.intro}",
                reply_markup=panic_intro_kb(),
            )
        elif action == "critical":
            await target.edit_text(
                "🚨 Критические:", reply_markup=category_kb(catalogue.list_critical(), "critical")
            )
        elif action == "urgent":
            await target.edit_text("⚠️ Срочные:", reply_markup=category_kb(catalogue.list_urgent(), "urgent"))
        elif action == "minor":
            await target.edit_text("🩹 Лёгкие:", reply_markup=category_kb(catalogue.list_minor(), "minor"))
        elif action == "aed":
            await target.answer("Отправь геолокацию ниже:", reply_markup=location_kb())
        elif action == "add_aed":
            await state.set_state(AedSubmitState.waiting_location)
            await target.answer(
                "1. Пришли геолокацию точки (можно «отправить выбранное место»).",
                reply_markup=location_kb(),
            )
        elif action == "dispatcher":
            await state.set_state(DispatcherState.answering)
            await state.update_data(answers={}, q_idx=0)
            await storage.log_event(cb.from_user.id, "dispatcher_open")
            first = dispatcher_checklist.questions[0]
            await target.answer(
                f"{dispatcher_checklist.intro}\n\n<b>{first.label}</b>\n<i>{first.hint}</i>",
                reply_markup=dispatcher_question_kb(dispatcher_checklist, 0),
            )
        elif action == "certificate":
            completed = await storage.count_distinct_completed_scenarios(cb.from_user.id)
            if completed < CERTIFICATE_THRESHOLD:
                await target.answer(
                    f"🎓 Сертификат — после {CERTIFICATE_THRESHOLD} завершённых сценариев. "
                    f"Ты прошёл(ла) {completed}.",
                )
            else:
                await state.set_state(CertificateState.waiting_name)
                await state.update_data(scenarios_completed=completed)
                await target.answer(
                    "🎓 Напиши, как тебя зовут (Имя Фамилия) — впишу в сертификат.",
                    reply_markup=ReplyKeyboardRemove(),
                )
        elif action == "ask":
            await target.answer(
                "Напиши свой вопрос одним сообщением, я отвечу коротко.",
                reply_markup=ReplyKeyboardRemove(),
            )
        elif action == "nps":
            await target.answer("Оцени от 0 до 10:", reply_markup=nps_kb())
        await cb.answer()

    dp.callback_query.register(_menu_cb, F.data.startswith("menu:"))

    async def _start_steps(cb: CallbackQuery, scenario: Scenario, idx: int) -> None:
        if not cb.message or not cb.from_user or not isinstance(cb.message, Message):
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

    async def _scenario_cb(cb: CallbackQuery, state: FSMContext) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        if not isinstance(cb.message, Message):
            await cb.answer()
            return
        scenario_id = cb.data.split(":", 1)[1]
        scenario = catalogue.scenarios.get(scenario_id)
        if not scenario:
            await cb.answer("Не найдено")
            return
        await storage.log_event(cb.from_user.id, "scenario_open", scenario_id)
        if scenario.pre_test:
            await state.set_state(ScenarioState.pre_test)
            await state.update_data(scenario_id=scenario_id, phase="pre", correct=0, total=0, q_idx=0)
            q = scenario.pre_test[0]
            await cb.message.edit_text(
                f"<b>Перед стартом — короткий тест.</b>\n\n{q.q}",
                reply_markup=test_kb(scenario_id, "pre", 0, q.options),
            )
        else:
            await _start_steps(cb, scenario, 0)
        await cb.answer()

    dp.callback_query.register(_scenario_cb, F.data.startswith("scn:"))

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
        if not isinstance(cb.message, Message) or cb.bot is None:
            await cb.answer()
            return
        scenario_id = cb.data.split(":", 1)[1]
        await storage.log_event(cb.from_user.id, "metronome_play", scenario_id)
        await cb.answer("Запускаю метроном 110 BPM…")
        sent = await send_audio_metronome(cb.bot, cb.message.chat.id, bpm=110)
        if not sent:
            await send_text_metronome(cb.bot, cb.message.chat.id, bpm=110, seconds=15)

    dp.callback_query.register(_metro_cb, F.data.startswith("metro:"))

    async def _end_cb(cb: CallbackQuery, state: FSMContext) -> None:
        if not cb.data or not cb.message or not cb.from_user:
            return
        if not isinstance(cb.message, Message):
            await cb.answer()
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
        if not isinstance(cb.message, Message):
            await cb.answer()
            return
        _, scenario_id, phase, q_idx_s, choice_s = cb.data.split(":")
        scenario = catalogue.scenarios.get(scenario_id)
        if not scenario:
            return
        q_idx = int(q_idx_s)
        choice = int(choice_s)
        bank = scenario.pre_test if phase == "pre" else scenario.post_test
        if not bank:
            return
        question = bank[q_idx]
        is_correct = choice == question.correct

        data = await state.get_data()
        correct_total = int(data.get("correct", 0)) + (1 if is_correct else 0)
        total = int(data.get("total", 0)) + 1
        await state.update_data(correct=correct_total, total=total)

        feedback = (
            "✅ Верно!" if is_correct else f"❌ Правильный ответ: <b>{question.options[question.correct]}</b>"
        )
        await cb.message.edit_text(
            f"{scenario.icon} <b>{scenario.title}</b>\n\nВопрос {q_idx + 1}: {question.q}\n\n{feedback}"
        )

        next_idx = q_idx + 1
        if next_idx < len(bank):
            next_q = bank[next_idx]
            await state.update_data(q_idx=next_idx)
            await cb.message.answer(
                f"<b>Вопрос {next_idx + 1}/{len(bank)}.</b>\n\n{next_q.q}",
                reply_markup=test_kb(scenario_id, phase, next_idx, next_q.options),
            )
            await cb.answer()
            return

        await storage.save_test(cb.from_user.id, scenario_id, phase, correct_total, total)
        if phase == "pre":
            await state.set_state(ScenarioState.in_steps)
            await cb.message.answer(
                f"📊 Результат до обучения: {correct_total}/{total}.\nТеперь — пошаговый алгоритм.",
            )
            await _start_steps(cb, scenario, 0)
        else:
            completed = await storage.count_distinct_completed_scenarios(cb.from_user.id)
            extra = ""
            if completed >= CERTIFICATE_THRESHOLD:
                extra = (
                    f"\n\n🎓 Ты прошёл(ла) <b>{completed}</b> сценариев — "
                    "можно забрать сертификат: /certificate"
                )
            await state.clear()
            await cb.message.answer(
                f"📊 Результат после обучения: {correct_total}/{total}.\n\n"
                f"Спасибо! Если хочешь — оцени бот: /feedback\n"
                f"Или открой ещё сценарий: /start" + extra
            )
        await cb.answer()

    dp.callback_query.register(_ans_cb, F.data.startswith("ans:"))

    async def _nps_cb(cb: CallbackQuery, state: FSMContext) -> None:
        if not cb.data or not cb.from_user or not cb.message:
            return
        if not isinstance(cb.message, Message):
            await cb.answer()
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

    async def _aed_review(message: Message) -> None:
        if not message.from_user or message.from_user.id != admin_id:
            return
        pending = await storage.list_pending_aed()
        if not pending:
            await message.answer("Нет заявок на модерации.")
            return
        for p in pending[:10]:
            text = (
                f"#{p['id']} @{p['user_id']} | {p['ts']}\n"
                f"<b>{p['city'] or '-'}</b> — {p['name'] or '-'}\n"
                f"{p['lat']:.5f}, {p['lon']:.5f}\n"
                f"<a href=\"https://www.openstreetmap.org/?mlat={p['lat']}&mlon={p['lon']}"
                f"#map=18/{p['lat']}/{p['lon']}\">OpenStreetMap</a>"
            )
            kb = InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(text="✅ Принять", callback_data=f"aed_mod:{p['id']}:approve"),
                        InlineKeyboardButton(text="❌ Отклонить", callback_data=f"aed_mod:{p['id']}:reject"),
                    ]
                ]
            )
            if p["photo_file_id"]:
                await message.answer_photo(p["photo_file_id"], caption=text, reply_markup=kb)
            else:
                await message.answer(text, reply_markup=kb)

    dp.message.register(_aed_review, Command("aed_review"))

    async def _aed_mod_cb(cb: CallbackQuery) -> None:
        if not cb.data or not cb.from_user or cb.from_user.id != admin_id:
            await cb.answer("Только для админа")
            return
        _, sub_id_s, action = cb.data.split(":")
        sub_id = int(sub_id_s)
        new_status = "approved" if action == "approve" else "rejected"
        await storage.update_aed_status(sub_id, new_status)
        await cb.answer(f"#{sub_id} → {new_status}")

    dp.callback_query.register(_aed_mod_cb, F.data.startswith("aed_mod:"))

    async def _fallback_text(message: Message, state: FSMContext) -> None:
        if not message.from_user:
            return
        await storage.log_event(message.from_user.id, "free_text", (message.text or "")[:200])
        await message.answer("Думаю…")
        answer = await ask_llm(message.text or "")
        if not answer:
            answer = (
                "Свободные вопросы пока не подключены (нужен ключ GigaChat / YandexGPT).\n"
                "Попробуй выбрать сценарий из меню — там пошаговый алгоритм."
            )
        await message.answer(answer, reply_markup=main_menu_kb())
        _ = state

    dp.message.register(_fallback_text, F.text)

"""Минимальный i18n: словарь строк по локали.

Поддерживаются ``ru`` и ``en``. Сейчас покрыто только то, что трогает
новый функционал — основной интерфейс пока остаётся на русском.
В следующей итерации можно перевести WELCOME / SOS_TEXT / меню.
"""

from __future__ import annotations

SUPPORTED = ("ru", "en")
DEFAULT = "ru"

_STRINGS: dict[str, dict[str, str]] = {
    "ru": {
        "profile.title": "🎓 Твой профиль СПАС",
        "profile.level": "Уровень",
        "profile.xp": "XP",
        "profile.streak": "Серия дней",
        "profile.empty": "Ачивки появятся, как только пройдёшь сценарии.",
        "share.title": "📣 Поделиться прогрессом",
        "sos.no_contact": (
            "Доверенный контакт не задан. Сначала пришли /setup_sos — это можно "
            "сделать один раз, и потом /sos_share будет отправлять им твою "
            "геолокацию автоматически."
        ),
        "sos.set_ok": "Готово! Доверенный контакт сохранён: {name}",
        "sos.cleared": "Доверенный контакт удалён.",
        "sos.share_intro": ("Жми «отправить геолокацию» — я перешлю её доверенному контакту."),
        "a11y.on": (
            "♿ Режим доступности включён: бот будет писать без эмодзи и "
            "форматирования. /accessibility — выключить."
        ),
        "a11y.off": "♿ Режим доступности выключен.",
        "lang.changed": "Язык интерфейса: русский.",
        "teacher.intro": (
            "👩‍🏫 <b>Режим учителя.</b>\n\n"
            "Создай класс — получишь invite-код, раздашь его ученикам, "
            "и в /teacher_dashboard увидишь, кто что прошёл "
            "(анонимно по никам)."
        ),
        "teacher.ask_name": "Как назовём класс? Пришли одно сообщение, например <i>9-А Лицей №1</i>.",
        "teacher.created": (
            "📋 Класс создан: <b>{name}</b>\n"
            "Код: <code>{code}</code>\n\n"
            "Раздай код ученикам — они откроют бота и пришлют:\n"
            "<code>/join {code}</code>"
        ),
        "teacher.no_classes": "У тебя пока нет классов. Создай первый — /teacher.",
        "join.ask_nickname": (
            "Как тебя записать в классе (ник)? Пришли одно сообщение, "
            "до 40 символов. Учитель увидит только этот ник."
        ),
        "join.bad_code": "Не нашёл такой код. Уточни у учителя.",
        "join.ok": (
            "✅ Готово, ты в классе <b>{class_name}</b> как «<b>{nickname}</b>».\n"
            "Учитель будет видеть твой прогресс по этому нику."
        ),
        "join.already": "Ты уже в этом классе.",
    },
    "en": {
        "profile.title": "🎓 Your СПАС profile",
        "profile.level": "Level",
        "profile.xp": "XP",
        "profile.streak": "Day streak",
        "profile.empty": "Earn achievements by completing scenarios.",
        "share.title": "📣 Share your progress",
        "sos.no_contact": (
            "Trusted contact is not set. Run /setup_sos first — it's a one-time setup, "
            "and after that /sos_share will forward your geolocation automatically."
        ),
        "sos.set_ok": "Done! Trusted contact saved: {name}",
        "sos.cleared": "Trusted contact removed.",
        "sos.share_intro": "Tap 'Send location' — I'll forward it to your trusted contact.",
        "a11y.on": (
            "♿ Accessibility mode on: the bot will write without emoji or "
            "formatting. /accessibility — turn off."
        ),
        "a11y.off": "♿ Accessibility mode off.",
        "lang.changed": "Interface language: English.",
        "teacher.intro": (
            "👩‍🏫 <b>Teacher mode.</b>\n\n"
            "Create a class — get an invite code, share it with students, "
            "and /teacher_dashboard will show their anonymized progress."
        ),
        "teacher.ask_name": "What's the class name? Send a single message, e.g. <i>Year 9 Lyceum 1</i>.",
        "teacher.created": (
            "📋 Class created: <b>{name}</b>\n"
            "Code: <code>{code}</code>\n\n"
            "Share the code with students — they open the bot and send:\n"
            "<code>/join {code}</code>"
        ),
        "teacher.no_classes": "No classes yet. Create one — /teacher.",
        "join.ask_nickname": ("Pick a nickname (max 40 chars). The teacher sees only this nickname."),
        "join.bad_code": "Code not found. Ask your teacher.",
        "join.ok": (
            "✅ You joined <b>{class_name}</b> as «<b>{nickname}</b>».\n"
            "The teacher will see your progress under this nickname."
        ),
        "join.already": "You're already in this class.",
    },
}


def t(key: str, lang: str = DEFAULT, **fmt: object) -> str:
    """Lookup ``key`` in language ``lang``; falls back to default and to key itself."""
    table = _STRINGS.get(lang) or _STRINGS[DEFAULT]
    raw = table.get(key) or _STRINGS[DEFAULT].get(key) or key
    if fmt:
        try:
            return raw.format(**fmt)
        except (KeyError, IndexError):
            return raw
    return raw


def normalize_lang(lang: str | None) -> str:
    if not lang:
        return DEFAULT
    code = lang[:2].lower()
    return code if code in SUPPORTED else DEFAULT

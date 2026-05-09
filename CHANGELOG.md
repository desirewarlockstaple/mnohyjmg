# Changelog

Все заметные изменения проекта документируются в этом файле.
Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
версионирование — [SemVer](https://semver.org/lang/ru/).

## [Unreleased]

### Added — block C/D/E/G (ноябрь 2025)
* **Геймификация (C4):** XP, 8 уровней («Новичок» → «Легенда»), 10 ачивок,
  серия «дни подряд», команда `/profile`. Модуль `bot/gamification.py`.
* **Учительский режим (C5):** `/teacher` — завести класс, `/join CODE` —
  присоединиться, `/teacher_dashboard` — прогресс класса по XP. Таблицы
  `classes`, `class_members` (см. `bot/migrations.py` m003). Модуль
  `bot/teacher.py`.
* **SOS-режим (C3):** `/sos_contact` — добавить доверенный контакт,
  `/sos_share` — разовая отправка геолокации + текста, `/sos_clear` —
  удалить контакт. Таблица `sos_contacts`. Модуль `bot/sos.py`.
* **Семейный share (C6):** `/share_progress`, `/share_certificate` —
  готовые тексты для `t.me/share/url`. Модуль `bot/sharing.py`.
* **Доступность (C9):** `/accessibility` — переключение plain-text режима
  (без эмодзи и HTML), хранится в `user_settings`. Модуль
  `bot/accessibility.py`.
* **Голосовой ввод (C1):** распознавание `voice` через Yandex SpeechKit —
  опционально, gracefully degrade при отсутствии `YANDEX_STT_API_KEY`.
  Модуль `bot/stt.py`.
* **REST API (C10):** aiohttp-сервер на `API_PORT=8090` с CORS-разрешением.
  Эндпойнты: `/api/health`, `/api/scenarios`, `/api/scenarios/{id}`,
  `/api/aed`, `/api/dispatcher`, `/api/panic`. Модуль `bot/api.py`.
* **PWA (E6):** `landing/manifest.webmanifest` + `service-worker.js` +
  install-prompt в `landing/index.html`. Виджет `landing/widget.js` для
  встраивания в школьные сайты.
* **i18n (RU/EN):** минимальный словарь в `bot/i18n.py` для новых команд.
* **Дашборд (D1–D6):** когортный retention по неделям, NPS-хитмэп,
  поведенческая воронка `/start → завершение → сертификат`, A/B-варианты
  по эксперименту, лидерборд XP. См. `dashboard.py`.
* **Throttle (G4):** middleware `bot/middleware/throttle.py` — sliding
  window per-user, по умолчанию 5 событий/сек. Конфиг через `THROTTLE_RATE`,
  `THROTTLE_PER`.
* **JSON-логирование (G5):** `bot/log_setup.py` — переключение через
  `LOG_FORMAT=json|human`, опциональная интеграция Sentry (`SENTRY_DSN`).
* **Liveness-эндпойнт (G6):** `bot/health.py` на `HEALTH_PORT=8080` для
  Fly.io / Railway healthchecks. JSON-ответ со счётчиком пользователей,
  событий, размером БД.
* **Миграции (G7):** легковесный механизм без Alembic — `bot/migrations.py`,
  таблица `_migrations`, идемпотентные шаги `m001…m005`.
* **Pre-commit (G2):** `.pre-commit-config.yaml` — ruff-check + ruff-format
  + standard hooks (trailing-whitespace, end-of-file-fixer, json/yaml/toml
  валидация).
* **Покрытие тестами:** добавлены `tests/test_gamification.py`,
  `test_sos_module.py`, `test_accessibility.py`, `test_i18n.py`,
  `test_sharing.py`, `test_throttle.py` — 70 unit-тестов.
* **Презентация (E2):** `docs/jury_deck.md` переписан под Marp — рендерится
  в PDF/PPTX через `npx @marp-team/marp-cli`.
* **Финансовая модель (E3):** `docs/finance_model.md` — расходы по годам,
  источники грантов, P&L, чувствительность.
* **Дорожная карта (E4):** `docs/roadmap.md` — Mermaid Gantt 2026–2028 +
  ключевые ворота + риски.
* **Governance + 152-ФЗ (E5):** `docs/governance_152fz.md` — модель данных,
  согласия для несовершеннолетних, удаление, безопасность, план АНО.
* **Docker Compose (G):** `docker-compose.yml` для одной команды
  `docker compose up` — бот + healthcheck + опц. дашборд.

### Added
* Panic-режим (`/panic`): дыхательное упражнение 6 вдохов/мин,
  triage по симптомам, упражнение 5-4-3-2-1 grounding.
* Краудсорс АНД (`/add_aed`): пользователь шлёт геолокацию, описание
  и (опц.) фото — заявка попадает в очередь модерации.
* Команда модерации `/aed_admin` для администратора.
* Чек-лист «Что сказать диспетчеру 112» (`/dispatcher`): 5 вопросов,
  бот собирает готовое сообщение для оператора.
* Цифровой сертификат (`/certificate`): генерация PNG для
  пользователей, завершивших ≥3 сценариев. PIL/Pillow + QR-код.
* Раздельные `pre_test` и `post_test` в сценариях
  (с обратной совместимостью).
* Анимированный «успокаивающий» текстовый метроном 6 дыханий/мин для
  panic-режима.
* JSON-конфиги: `content/dispatcher_checklist.json`,
  `content/panic_protocol.json`.
* Юнит-тесты pytest (`tests/`): 50+ кейсов на storage, catalogue,
  aed, certificate, panic, dispatcher.
* GitHub Actions CI: ruff lint + format check + pytest на 3.11/3.12 +
  валидация JSON-контента.
* Apache 2.0 LICENSE и CC BY-NC-SA 4.0 LICENSE-CONTENT.
* CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md.
* Английская версия лендинга (`landing/en.html`).
* Генераторы PDF: одностраничная инфографика для жюри,
  10-страничная методичка (`tools/generate_*_pdf.py`).
* Генератор аудио-метронома `tools/generate_metronome.py` через
  ffmpeg (100/110/120 BPM + 6 BPM calm).
* Скрипт валидации контента `python -m tools.validate_content`.
* `Makefile`, `pyproject.toml` (ruff + pytest config),
  `requirements-dev.txt`.
* Документы: шаблоны писем поддержки, пресс-релиз, банк опроса для
  пилота, методичка, риски, методологические заметки, шаблоны для
  SMM (VK/TG), брифинг волонтёров, презентация для жюри.

### Changed
* `requirements.txt`: добавлены `Pillow`, `qrcode[pil]`
  (для сертификата).
* `bot/handlers.py`: подключены новые команды и кнопка panic
  в главном меню.
* `bot/storage.py`: новые таблицы `aed_submissions`, `certificates`,
  индексы и расширенные `metrics()`.
* `bot/catalogue.py`: поле `pre_test` опционально, fallback на
  `post_test`.
* `landing/index.html`: добавлены ссылки на EN-версию и методичку.

## [0.1.0] — 2026-05-04

### Added
* Базовый Telegram-бот на aiogram 3.x с 30 сценариями.
* Голосовой/текстовый метроном 110 BPM.
* SQLite-аналитика (users, events, feedback, test_results).
* Streamlit-дашборд для жюри.
* Лендинг (RU).
* Деплой-конфиги: Dockerfile, fly.toml, Procfile.
* Опциональная LLM-интеграция (GigaChat / YandexGPT).
* Документация: концепция, текст заявки, банк вопросов жюри.

# Changelog

Все заметные изменения проекта документируются в этом файле.
Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
версионирование — [SemVer](https://semver.org/lang/ru/).

## [Unreleased]

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

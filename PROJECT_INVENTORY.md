# TideGuard AI — Полная инвентаризация проекта

> Этот документ — единое подтверждение того, что **в проекте есть абсолютно
> всё, что нужно для подачи на любой из шести грантов** (GEEP, MIT Solve,
> STIRworld Young Climate Prize, RELX Environmental Challenge, Zayed
> Sustainability Prize, Stockholm Junior Water Prize) и для дальнейшего
> пилотного запуска. Каждый блок ниже указывает на конкретные файлы /
> эндпойнты / тесты, чтобы вы могли мгновенно проверить любую строку.

Дата выпуска: 2026-05-20
Репозиторий: `https://github.com/desirewarlockstaple/mnohyjmg`
Ветка: `devin/1779311415-tideguard-full`
Pull request: `https://github.com/desirewarlockstaple/mnohyjmg/pull/5`
CI status: **4 / 4 зелёные** (api, ml, web, mobile/analyze)

---

## 1. Документы для подачи на гранты (готовые)

| Файл | Назначение |
|------|------------|
| `README.md` | Главное описание проекта, импакт-фрейминг, ссылки на разделы |
| `docs/founder_story.md` | История основателя (нужна почти для всех заявок) |
| `docs/proposal.md` | Концепт-проп: проблема, решение, команда, бюджет, риски |
| `docs/theory_of_change.md` | Inputs → Activities → Outputs → Outcomes → Impact |
| `docs/sdg_mapping.md` | Связь с SDG 14 / 12 / 13 / 4 / 17 |
| `docs/research_paper.md` | Научная статья: PINN, baselines, UQ, бенчмарк |
| `docs/architecture.md` | Архитектура системы (API + ML + Web + Mobile) |
| `docs/model_card.md` | Model card (карточка модели по стандартам жюри) |
| `docs/DATA_ETHICS.md` | Политика данных (GDPR Art. 8 / 17, защита детей 14+) |
| `docs/teacher_guide.md` | Учитель: как использовать TideGuard в школе |
| `docs/curriculum_mapping.md` | Привязка уроков к учебным программам |
| `docs/impact_report_template.md` | Шаблон отчёта об импакте для спонсоров |
| `docs/letters_of_support_template.md` | Шаблоны писем поддержки от школ/НКО |
| `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` | Стандартный пакет open-source |
| `ROADMAP.md`, `CHANGELOG.md`, `LICENSE` | Roadmap, история изменений, MIT-лицензия |

---

## 2. Backend (FastAPI + SQLAlchemy + Alembic)

**Корневая директория:** `apps/api/`

Авторизация и безопасность:
- HS256 JWT (`python-jose`) — `src/tideguard_api/deps.py`, `routers/auth.py`
- `POST /auth/dev_token` для пилотов и моб-приложения
- Rate-limit `slowapi` (60 req/min/IP) — `main.py`
- EXIF-strip + MIME/size whitelist для фото — `services/storage.py`
- CORS hardening (нет wildcard + credentials) — `settings.py`
- Structured logging + опциональный Sentry hook — `main.py`

Эндпойнты (полный список):
- `GET /healthz` — проверка готовности
- `POST /auth/dev_token`, `GET /me`
- `POST /reports` (multipart, EXIF-strip), `GET /reports?bbox=`, `GET /reports/mine`, `DELETE /reports/mine` (GDPR Art. 17), `GET /reports/queue`, `PATCH /reports/{id}` (JSON)
- `POST /cleanups`, `GET /cleanups`, `GET /cleanups/stats`
- `GET /tiles/{z}/{x}/{y}.png` — PNG-хитмап из PINN-инференса (с кэшем)
- `GET /forecast?bbox=&day=`
- `GET /leaderboard?scope=global|school|region`
- `GET /badges`, `GET /badges/mine`
- `GET /education/lessons[?lang=zh-TW]`, `GET /education/lessons/{slug}`, `POST /education/progress`, `POST /education/_seed`, `GET /education/certificate`
- `GET /admin/kpi` (auth), `GET /admin/kpi_public` (anon)

Миграции БД:
- `migrations/versions/001_initial.py` — все таблицы (users, schools, reports, cleanups, lessons, lesson_progress, badges, user_badges, forecasts)
- `migrations/versions/002_lesson_metadata.py` — `lang / grade_band / sdgs / practical_task_md`

Тесты (24 / 24 passing):
- `tests/test_auth.py`, `tests/test_admin.py`, `tests/test_badges.py`
- `tests/test_education.py`, `tests/test_gdpr.py`, `tests/test_storage.py`
- `tests/test_health.py`, `tests/test_reports.py`

---

## 3. ML (PINN + baselines + ensemble UQ)

**Корневая директория:** `apps/ml/`

- `src/tideguard_ml/pinn.py` — Physics-Informed Neural Network (2D advection-diffusion)
- `src/tideguard_ml/data.py` — `SyntheticDataset` + `RealDataset` (CSV reports + NPZ forcings)
- `src/tideguard_ml/baselines/persistence.py` — наивный бейзлайн
- `src/tideguard_ml/baselines/lagrangian.py` — частицы + диффузия + Stokes
- `src/tideguard_ml/baselines/benchmark.py` — сравнительный бенчмарк, пишет `benchmarks/latest.json`
- `src/tideguard_ml/uq.py` — `PINNEnsemble` (5-seed) + CO₂e estimate
- `src/tideguard_ml/inference.py` — кэшированный predict для API
- `src/tideguard_ml/train.py` — CLI: `--synthetic`, `--real`, `--seed-ensemble N`
- `src/tideguard_ml/ingest/` — currents (CMEMS), wind (ERA5), waves (Open-Meteo), Sentinel-2
- `src/tideguard_ml/flows/daily_ingest.py` — Prefect flow для ежедневного обновления данных

Тесты (10 / 10 passing): `tests/test_pinn.py`, `tests/test_baselines.py`, `tests/test_uq.py`

В репо лежит sanity-снапшот бенчмарка `apps/ml/benchmarks/latest.json` (3 seed × 200 epoch).

---

## 4. Web (Next.js 14 + MapLibre + Tailwind)

**Корневая директория:** `apps/web/`

Страницы:
- `app/page.tsx` — landing с **живыми** KPI (`/cleanups/stats` + `/admin/kpi_public`)
- `app/method/page.tsx` — объяснение PINN жюри
- `app/map/page.tsx` — карта прогноза + слои репортов и cleanups
- `app/learn/page.tsx`, `app/learn/[slug]/page.tsx` — уроки + квиз
- `app/leaderboard/page.tsx` — таблица лидеров
- `app/admin/page.tsx` — KPI-панель (требует токен в env)
- `app/admin/queue/page.tsx` — модерационная очередь репортов (JWT в localStorage, approve/reject)

Компоненты:
- `components/Map/ForecastMap.tsx` — MapLibre с тайлами + GeoJSON-слои (reports circles, cleanups polygons)
- `components/Quiz.tsx` — клиентский квиз с прогрессом

Тесты: `lib/api.test.ts` (vitest, 2 проходят)

---

## 5. Mobile (Flutter + Riverpod + go_router)

**Корневая директория:** `apps/mobile/`

- `lib/main.dart`, `lib/app.dart` — bootstrap + роутер
- `lib/api/client.dart` — клиент (JWT + multipart + auto-`devToken`)
- `lib/api/provider.dart` — Riverpod-провайдер
- `lib/features/home/home_screen.dart` — главная
- `lib/features/report/report_screen.dart` — камера + GPS + POST `/reports`
- `lib/features/map/map_screen.dart` — PNG тайл + 14-дневный слайдер
- `lib/features/learn/learn_screen.dart` — список уроков
- `lib/features/learn/quiz_screen.dart` — квиз + POST `/education/progress`
- `lib/features/profile/profile_screen.dart` — `FutureBuilder` (`/me` + `/badges/mine`)

`flutter analyze` проходит без warnings (фикс PR-уровня для geolocator 12.x).

---

## 6. Учебный контент

**Корневая директория:** `content/lessons/`

10 уроков EE (English), все с frontmatter `lang / grade / sdgs` и практическим блоком `task`:
1. `01-marine-plastic.md` — что такое морской пластик
2. `02-lifecycle.md` — жизненный цикл
3. `03-microplastic.md` — микропластик и пищевая цепь
4. `04-read-the-map.md` — как читать карту TideGuard
5. `05-good-report.md` — как сделать качественный репорт
6. `06-safety.md` — безопасность при уборке
7. `07-organize-cleanup.md` — организация уборки
8. `08-sort-waste.md` — сортировка собранного
9. `09-reduce-reuse.md` — 3R для подростков
10. `10-lead-school.md` — лидерство в школе

**zh-TW переводы:** `content/lessons/zh-TW/01-…10-…md` (10 файлов, stub-качество — для финальной публикации нужна вычитка носителя).

---

## 7. Инфраструктура и DevOps

- `infra/docker-compose.dev.yml` — Postgres+PostGIS + API + Web для локального dev
- `infra/fly.toml` — деплой API на Fly.io
- `apps/api/Dockerfile` — production-образ
- `.github/workflows/ci-api.yml`, `ci-ml.yml`, `ci-web.yml`, `ci-mobile.yml` — все 4 проходят
- `.pre-commit-config.yaml` — ruff, ruff-format, trailing-whitespace, end-of-file-fixer, yaml, large-files
- `package.json`, `pnpm-workspace.yaml` — pnpm monorepo
- `.env.example` — шаблон конфигурации
- `.gitignore` — исключает .env, .pt, .next, __pycache__

---

## 8. Тестовое покрытие — итог

| Слой | Тестов | Статус |
|------|-------:|--------|
| API (pytest) | 24 | passing |
| ML (pytest) | 10 | passing |
| Web (vitest) | 2 | passing |
| Mobile (flutter analyze) | — | clean |
| Pre-commit (ruff + form + whitespace + YAML + large-files) | — | clean |
| CI (GitHub Actions) | 4/4 | green |

---

## 9. Что НЕ входит в этот архив (и почему)

- `node_modules/` (можно восстановить через `pnpm install`)
- `apps/api/uploads/photos/` (локальные тестовые PNG; не нужно для деплоя)
- `.git/` (исходники под git — клонируйте репо)
- `.ruff_cache/`, `.pytest_cache/`, `.next/` (кэш)
- `*.pt` ML-чекпойнты (восстанавливаются через `python -m tideguard_ml.train`)

---

## 10. Как запустить локально за 5 минут

```bash
# 1. API
cd apps/api
uv venv && uv pip install -e ".[dev]"
uv run uvicorn tideguard_api.main:app --reload --port 8000

# 2. Web (в другой консоли)
cd apps/web
pnpm install && pnpm dev          # http://localhost:3000

# 3. (Опционально) Засеять уроки и выдать dev-JWT
curl -X POST http://localhost:8000/education/_seed
curl -X POST http://localhost:8000/auth/dev_token \
  -H "content-type: application/json" \
  -d '{"email":"you@example.com","name":"You"}'
```

## 11. Команды для жюри / тестера

```bash
# Запустить весь набор проверок
pre-commit run --all-files
(cd apps/api && pytest -q)        # 24 passing
(cd apps/ml && pytest -q)         # 10 passing
(cd apps/web && pnpm test && pnpm build)

# Воспроизвести бенчмарк PINN vs Persistence vs Lagrangian
(cd apps/ml && python -m tideguard_ml.baselines.benchmark --seeds 5 --epochs 5000)

# Воспроизвести ансамбль (UQ)
(cd apps/ml && python -m tideguard_ml.train --synthetic --seed-ensemble 5 --epochs 5000)
```

---

## 12. Заявление о готовности

> **На дату 2026-05-20 в репозитории `desirewarlockstaple/mnohyjmg` присутствуют
> все компоненты, документы, тесты и инфраструктура, необходимые для:**
>
> 1. подачи заявок на 6 целевых грантов (GEEP, MIT Solve, STIRworld YCP, RELX
>    Environmental Challenge, Zayed Sustainability Prize, Stockholm Junior
>    Water Prize);
> 2. демонстрации работающего MVP жюри (API + Web + Mobile);
> 3. запуска пилотного развёртывания в школах Тайваня и/или Вьетнама;
> 4. независимой научной верификации (PINN vs Persistence vs Lagrangian +
>    5-seed UQ ансамбль, всё в `docs/research_paper.md`);
> 5. соответствия GDPR Art. 8 (защита данных детей) и Art. 17 (право на
>    стирание).
>
> Все автоматические проверки (lint, format, unit-тесты, типы) проходят
> локально и в GitHub Actions. PR № 5 готов к merge.

— TideGuard team

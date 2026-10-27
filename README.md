# Буряад хэлэн — Telegram Mini App для изучения бурятского языка

[![CI](https://github.com/tarbaevbb/buryat_app/actions/workflows/ci.yml/badge.svg)](https://github.com/tarbaevbb/buryat_app/actions/workflows/ci.yml)
[![Deploy](https://github.com/tarbaevbb/buryat_app/actions/workflows/deploy.yml/badge.svg)](https://github.com/tarbaevbb/buryat_app/actions/workflows/deploy.yml)
[![Демо](https://img.shields.io/badge/демо-GitHub%20Pages-58cc02)](https://tarbaevbb.github.io/buryat_app/)

Мини-приложение в стиле Duolingo: карта разделов, уроки с упражнениями,
сердца, серия дней, XP, гемы и недельный рейтинг. Работает внутри Telegram
и в обычном браузере.

**Демо:** https://tarbaevbb.github.io/buryat_app/

## Возможности

- **5 разделов × 5 уроков** (25 уроков, ~155 слов и фраз, ~250 заданий):
  алфавит и звуки (ө, ү, һ, дифтонги), приветствия, числа и время,
  семья, еда и быт.
- **Три типа упражнений**: выбор перевода/чтения, сборка предложения
  из плиток, сопоставление пар.
- **Геймификация**: 5 сердец с восстановлением за 30 минут, серия дней,
  XP и уровни, гемы, «золотые» уроки за идеальное прохождение.
- **Повторение**: тренажёр по словам, где было больше всего ошибок.
- **Лидерборд**: недельный рейтинг (Supabase) или локальный результат.
- **Telegram-нативность**: тема оформления, safe-area, MainButton,
  BackButton, haptic feedback, deep links.
- **Offline-first**: без ключей Supabase приложение полностью играбельно,
  прогресс хранится в `localStorage`.

## Быстрый старт

```bash
npm run dev     # http://localhost:5173 — работает в браузере (mock-режим)
npm run verify  # всё, что проверяет CI: линтер, типы, тесты, сборка, размер
```

В браузере Telegram SDK подменяется заглушкой (`src/telegram/mock.ts`),
поэтому можно спокойно верстать и тестировать без открытия Telegram.

Отдельные команды:

```bash
npm run lint             # ESLint: react-hooks и доступность (a11y)
npm run typecheck        # проверка типов без сборки
npm test                 # 172 теста: логика, курс, синхронизация, рендеринг
npm run build            # сборка в dist/
npm run size             # контроль размера бандла
npm run check:migrations # миграции на локальном Postgres (нужен Docker)
npm run preview          # локальный просмотр сборки
```

## Проверки (GitHub Actions)

| Workflow | Когда запускается | Что проверяет |
|---|---|---|
| `ci.yml` | push в `main`, PR, вручную | линтер, типы, 172 теста, сборка, размер бандла, Deno-проверка функции, миграции на Postgres |
| `secrets.yml` | push, PR | утечки секретов (gitleaks + проверки токенов Telegram и ключей Supabase) |
| `codeql.yml` | push в `main`, PR, по расписанию | статический анализ безопасности |
| `deploy.yml` | push в `main` | публикация на GitHub Pages |
| `deploy-supabase.yml` | push в `main` (при изменении `supabase/**`) | миграции и Edge Function в облако |

`ci.yml` разбит на независимые job'ы (`lint`, `test`, `build`, `deno`,
`migrations`) — они идут параллельно, а `ci-ok` собирает единый статус для
branch protection.

## Деплой

### GitHub Pages (настроен автоматически)

Приложение уже опубликовано: **https://tarbaevbb.github.io/buryat_app/**

Сборка использует `base: './'` в `vite.config.ts`, поэтому корректно
работает на подпути `/buryat_app/`, а `HashRouter` избавляет от нужды
в SPA-фолбэке.

Чтобы включить облако на опубликованном сайте, добавьте секреты
в **Settings → Secrets and variables → Actions**:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Без них workflow соберёт приложение в локальном режиме — это рабочий
сценарий, а не ошибка.

### Другой хостинг

1. `npm run build`
2. Опубликуйте содержимое `dist/` на Vercel, Netlify или Cloudflare Pages.
3. В BotFather:
   - `/newapp` → выберите бота → название, описание, иконка и **URL деплоя**;
   - либо `/setmenubutton` для кнопки меню.
4. Откройте бота → кнопка Mini App.

### Deep links

`https://t.me/<bot>/<app>?startapp=lesson_u1l2` открывает нужный урок сразу.

## Подключение Supabase (облако)

Приложение работает и без сервера. Чтобы включить аккаунты, синхронизацию
и общий рейтинг:

1. Создайте проект на [supabase.com](https://supabase.com).
2. Примените миграции и задеплойте функцию (одна команда после `link`):

   ```bash
   supabase login
   supabase link --project-ref <your-ref>
   supabase db push --linked
   supabase secrets set TELEGRAM_BOT_TOKEN=123456:AA...
   supabase functions deploy telegram-auth --no-verify-jwt
   ```

   (`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` подставляются автоматически.)

   Альтернатива без CLI: вставьте содержимое
   `supabase/migrations/*.sql` в **SQL Editor** и выполните.

3. Создайте `.env` из `.env.example`:

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

4. Перезапустите dev-сервер / пересоберите фронтенд.

Как это работает:

- клиент отправляет `Telegram.WebApp.initData` в Edge Function `telegram-auth`;
- функция проверяет подпись по HMAC-SHA256 и срок `auth_date` (≤ 24 ч),
  создаёт/находит пользователя и возвращает сессию Supabase;
- синхронизация идёт через `fn_fetch_progress` / `fn_push_progress`: полный
  снимок прогресса с устройства сливается с облачным по правилам «максимума»
  (идемпотентно — накрутить или потерять прогресс нельзя);
- за урок награду считает БД в `fn_award_lesson`, за повторение — в
  `fn_award_review`;
- рейтинг отдаётся через `fn_leaderboard_week`;
- сброс прогресса чистит и облако (`fn_reset_progress`); если сети не было,
  обнуление произойдёт при первой успешной синхронизации.

Синхронизируются XP, гемы, сердца, серия, результаты уроков, XP по дням и
статистика слов. Работа без сети не теряет данные: изменения копятся локально
и уходят при возврате в приложение, появлении сети или раз в минуту.

Токен бота **никогда** не попадает во фронтенд — только в секреты функции.

### Автодеплой облака из CI

`.github/workflows/deploy-supabase.yml` применяет миграции и публикует
функцию при пуше в `main`. Нужны секреты в
**Settings → Secrets and variables → Actions**:

| Секрет | Где взять |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_ID` | ref из URL проекта: `https://<ref>.supabase.co` |
| `SUPABASE_DB_PASSWORD` | пароль базы, заданный при создании проекта |

Без этих секретов workflow не падает — шаги деплоя просто пропускаются,
чтобы публикация фронтенда не зависела от настройки облака.

### Проверка миграций локально

Миграции проверяются на настоящем Postgres (нужен Docker) — повторное
применение, RLS, наличие функций и поведение RPC:

```bash
npm run check:migrations
```

## Структура проекта

```
src/
  data/            учебный контент и генератор упражнений
    vocab/         словари пяти разделов
    course.ts      сборка курса (разделы → уроки)
    exercises.ts   генерация заданий (select / build / match)
  features/lesson/ экран урока, три вида упражнений, экран результата
  screens/         карта обучения, повторение, рейтинг, профиль, маршрут урока
  components/      кнопки, сердца, топбар, узлы карты, нижняя навигация
  store/           прогресс (zustand + persist), сессия урока, настройки
  telegram/        SDK: типизация, тема, mock-режим, MainButton/BackButton
  lib/             нормализация ответов, SRS, даты, Supabase, облако
supabase/
  config.toml               настройки проекта и Edge Functions
  migrations/               SQL-миграции (таблицы, RLS, RPC)
  functions/telegram-auth/  проверка initData и выдача сессии
scripts/
  check-bundle-size.mjs     контроль размера сборки
  check-migrations.sh       проверка миграций на локальном Postgres
docs/
  content-review.md         чек-лист для проверки бурятского носителем
  architecture.md           как всё устроено внутри
```

## Проверка учебного материала

Бурятский контент написан аккуратно (ө, ү, һ, дифтонги), но **не проверен
носителем**. Все сомнительные единицы помечены флагом `needsReview`
и собраны в `docs/content-review.md`. Перед публикацией их стоит вычитать.

## Лицензия

Учебный проект. Контент — черновик, требует финальной вычитки носителем.

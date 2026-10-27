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
Без облака прогресс хранится в `localStorage`; чтобы проверить
синхронизацию локально, создайте `.env` из `.env.example`.

Отдельные команды:

```bash
npm run lint             # ESLint: react-hooks и доступность (a11y)
npm run typecheck        # проверка типов без сборки
npm test                 # 199 тестов: логика, курс, отклик, рендеринг
npm run build            # сборка в dist/
npm run size             # контроль размера бандла
npm run check:migrations # миграции и защита от накрутки на Postgres (Docker)
npm run preview          # локальный просмотр сборки
```

## Проверки (GitHub Actions)

| Workflow | Когда запускается | Что проверяет |
|---|---|---|
| `ci.yml` | push в `main`, PR, вручную | валидация workflow, линтер, типы, 173 теста, сборка, размер бандла, Deno-проверка функции, миграции, защита от накрутки |
| `secrets.yml` | push, PR | утечки секретов (gitleaks + проверки токенов Telegram и ключей Supabase) |
| `codeql.yml` | push в `main`, PR, по расписанию | статический анализ безопасности |
| `deploy.yml` | push в `main` | публикация на GitHub Pages |
| `deploy-supabase.yml` | push в `main` (при изменении `supabase/**`) | миграции и Edge Function в облако |

`ci.yml` разбит на независимые job'ы (`workflows`, `lint`, `test`, `build`,
`deno`, `migrations`) — они идут параллельно, а `ci-ok` собирает единый
статус для branch protection.

### Безопасность серверной логики

Прогресс считается на сервере, поэтому схема защищена от накрутки.
Миграция `20261027220000_harden_rpc.sql` закрывает семь способов обойти
награды. Каждый был воспроизведён на реальном Postgres, и на каждый есть
проверка в `scripts/sql/30-security.sql`, которая блокирует деплой:

| Что было | Как закрыто |
|---|---|
| `fn_register_activity` принимала произвольный `uid` — можно было обнулить серию другому игроку | отозван EXECUTE у всех ролей приложения, внутри сверка с `auth.uid()` |
| Роли `anon` (ключ лежит в бандле) были доступны все RPC | `revoke` с `PUBLIC`/`anon`, выданы только шесть нужных функций для `authenticated` |
| `authenticated` могла править свой `xp`, `gems`, `streak` напрямую | права на таблицы отозваны: клиент ходит только через RPC |
| Вставка любого XP в `daily_xp` накручивала лидерборд | то же — прямой доступ к таблице закрыт |
| `fn_push_progress` принимала XP из payload (`{"xp": 50000000}`) | XP, гемы, серия и `dailyXp` из payload игнорируются |
| `fn_award_lesson` начисляла награду за выдуманный `lesson_id` | каталог уроков в таблице `lessons`, награда только за существующий урок |
| View `leaderboard_week` читалась ролью `anon` — имена игроков без авторизации | доступ к view отозван, данные отдаёт только RPC |

Каталог уроков синхронизируется из `course.ts`:

```bash
node scripts/sync-lessons.mjs --write   # обновить список в миграции
```

Скрипт проверяет, что уроков 25, повторений — по одному на раздел,
и что id не дублируются.

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
и общий рейтинг, нужен проект Supabase (бесплатного тарифа достаточно).

### Пошагово для продакшена

**1. Создайте проект.** [supabase.com/dashboard](https://supabase.com/dashboard)
→ **New project**. Запишите пароль базы — он понадобится для деплоя миграций.

Из **Settings → API** скопируйте:
- `Project URL` — вида `https://abcdefgh.supabase.co`
- `anon public` — длинный ключ, начинается с `eyJ`

Часть `abcdefgh` в URL — это **project ref**.

**2. Добавьте секреты в GitHub** (Settings → Secrets and variables → Actions):

| Секрет | Значение | Зачем |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) | деплой миграций и функции |
| `SUPABASE_PROJECT_ID` | project ref из URL | к какому проекту подключаться |
| `SUPABASE_DB_PASSWORD` | пароль базы из шага 1 | применение миграций |
| `VITE_SUPABASE_URL` | Project URL | попадает в сборку фронтенда |
| `VITE_SUPABASE_ANON_KEY` | anon public | попадает в сборку фронтенда |

**3. Добавьте секрет в Supabase** — токен бота от [@BotFather](https://t.me/BotFather):

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <ваш-ref>
supabase secrets set TELEGRAM_BOT_TOKEN=123456789:AA...
```

Токен бота **никогда** не попадает во фронтенд: он живёт только в секретах
Edge Function, клиент его не видит.

**4. Задеплойте** — запушьте в `main`. Workflow `deploy-supabase.yml`
применит миграции и опубликует функцию, а `deploy.yml` пересоберёт
фронтенд с ключами. Либо вручную:

```bash
supabase db push --linked
supabase functions deploy telegram-auth --no-verify-jwt
```

`--no-verify-jwt` обязателен: функция вызывается до авторизации в Supabase,
она сама проверяет подпись `initData`.

**5. Проверьте.** Откройте приложение в Telegram — в профиле должен
появиться бейдж **«Облако»** вместо «Локально».

### Если что-то не работает

| Симптом | Причина и решение |
|---|---|
| Бейдж «Локально» | Секреты `VITE_SUPABASE_*` не заданы, либо приложение открыто в браузере, а не в Telegram (`initData` пустой) |
| Ошибка `invalid_init_data` | `auth_date` старше 24 ч → перезапустите приложение. Либо неверный `TELEGRAM_BOT_TOKEN` |
| Ошибка `server_not_configured` | В Supabase не задан `TELEGRAM_BOT_TOKEN` |
| `unknown lesson` при прохождении урока | Каталог уроков устарел: `node scripts/sync-lessons.mjs --write`, затем задеплойте миграции |
| `permission denied for function` | Миграция защиты не применена — выполните `supabase db push --linked` |

Логи функции:

```bash
supabase functions logs telegram-auth
```

### Как это работает

- клиент отправляет `Telegram.WebApp.initData` в Edge Function `telegram-auth`;
- функция проверяет подпись по HMAC-SHA256 и срок `auth_date` (≤ 24 ч),
  создаёт/находит пользователя и возвращает сессию Supabase;
- синхронизация идёт через `fn_fetch_progress` / `fn_push_progress`: снимок
  прогресса с устройства сливается с облачным по правилам «максимума»;
- за урок награду считает БД в `fn_award_lesson`, за повторение — в
  `fn_award_review`;
- рейтинг отдаётся через `fn_leaderboard_week`;
- сброс прогресса чистит и облако (`fn_reset_progress`); если сети не было,
  обнуление произойдёт при первой успешной синхронизации.

Синхронизируются XP, гемы, сердца, серия и результаты уроков. Работа без
сети не теряет данные: изменения копятся локально и уходят при возврате
в приложение, появлении сети или раз в минуту. Уроки, пройденные офлайн,
начисляют XP на сервере по серверной формуле — клиент присылает только
факт прохождения (`lesson_id`, `score`, `accuracy`), но не награду.

### Что защищено от накрутки

XP и гемы считает только сервер, клиент не может их подменить. Подробности
и список закрытых уязвимостей — в разделе «Безопасность серверной логики».

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
  migrations/               SQL-миграции (таблицы, RLS, RPC, защита)
  functions/telegram-auth/  проверка initData и выдача сессии
scripts/
  check-bundle-size.mjs     контроль размера сборки
  check-migrations.sh       миграции и безопасность на Postgres
  sync-lessons.mjs          каталог уроков для сервера из course.ts
  sql/                      SQL-проверки (используются и в CI)
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

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
npm install
npm run dev       # http://localhost:5173 — работает в браузере (mock-режим)
```

В браузере Telegram SDK подменяется заглушкой (`src/telegram/mock.ts`),
поэтому можно спокойно верстать и тестировать без открытия Telegram.

```bash
npm test           # 147 тестов: логика, курс, синхронизация, рендеринг
npm run typecheck  # проверка типов без сборки
npm run build      # сборка в dist/
npm run preview    # локальный просмотр сборки
```

Эти же команды прогоняются в CI (`.github/workflows/ci.yml`) на каждый push
и pull request, поэтому расхождение локального и удалённого результата
маловероятно.

## Деплой

### GitHub Pages (настроен автоматически)

В репозитории есть два workflow:

| Workflow | Когда запускается | Что делает |
|---|---|---|
| `ci.yml` | push в `main`, pull request, вручную | `npm ci` → типы → 147 тестов → сборка |
| `deploy.yml` | push в `main`, вручную | то же + публикация на GitHub Pages |

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
2. Примените схему: **SQL Editor** → выполните `supabase/schema.sql`.
3. Установите секрет для Edge Function:

   ```bash
   supabase login
   supabase link --project-ref <your-ref>
   supabase secrets set TELEGRAM_BOT_TOKEN=123456:AA...
   supabase functions deploy telegram-auth --no-verify-jwt
   ```

   (`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` подставляются автоматически.)

4. Создайте `.env` из `.env.example`:

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

5. Перезапустите dev-сервер / пересоберите фронтенд.

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

### Обновление уже настроенного проекта

Если схема была применена раньше, выполните `supabase/schema.sql` повторно —
файл идемпотентен и добавит новые функции (`fn_fetch_progress`,
`fn_push_progress`, `fn_reset_progress`, `fn_award_review`). Функция
`fn_sync_progress` больше не используется, её можно удалить вручную:

```sql
drop function if exists public.fn_sync_progress(int, jsonb, jsonb);
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
  schema.sql                таблицы, RLS, RPC-функции
  functions/telegram-auth/  проверка initData и выдача сессии
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

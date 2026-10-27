#!/usr/bin/env bash
#
# Проверка SQL-миграций на локальном Postgres.
# Повторяет то, что делает job `migrations` в .github/workflows/ci.yml.
#
# Схема ссылается на объекты Supabase (auth.users, auth.uid(), роли
# anon/authenticated), которых в чистом Postgres нет, поэтому сначала
# создаются заглушки. Так проверяется именно наш SQL.
#
# Требуется Docker.
#
# Запуск:  bash scripts/check-migrations.sh
#
set -euo pipefail

CONTAINER=buryat-migrations-check
PORT=55433
DB=buryat_test
MIGRATIONS_DIR=supabase/migrations

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "→ Запускаю Postgres 16"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB="$DB" \
  -p "$PORT:5432" \
  postgres:16 >/dev/null

echo "→ Жду готовности"
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 2
done
docker exec "$CONTAINER" pg_isready -U postgres >/dev/null

echo "→ Создаю заглушки схемы auth и ролей"
docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
create schema if not exists auth;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I', r);
    end if;
  end loop;
end $$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);

create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
SQL

apply_all() {
  local label="$1"
  for f in "$MIGRATIONS_DIR"/*.sql; do
    echo "   $label: $(basename "$f")"
    docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q < "$f" > /dev/null
  done
}

echo "→ Первый прогон миграций"
apply_all "прогон 1"

echo "→ Повторный прогон (миграции должны быть идемпотентны)"
apply_all "прогон 2"

echo "→ Проверяю объекты, RLS и функции"
docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
do $$
declare t text;
begin
  foreach t in array array['profiles','user_progress','daily_xp','word_errors'] loop
    if not exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      raise exception 'нет таблицы %', t;
    end if;
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity
    ) then
      raise exception 'RLS выключен на %', t;
    end if;
  end loop;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'fn_leaderboard_week','fn_award_lesson','fn_award_review',
    'fn_fetch_progress','fn_push_progress','fn_reset_progress','fn_hearts_now'
  ] loop
    if not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=f
    ) then
      raise exception 'нет функции %', f;
    end if;
  end loop;
end $$;

select 'объекты, RLS и функции на месте' as result;
SQL

echo "→ Проверяю поведение RPC"
docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'test@buryat.local');

insert into public.profiles (id, tg_id, first_name)
values ('11111111-1111-1111-1111-111111111111', 42, 'Тест');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- Награда за урок: новый рекорд 100/100 → 10 + 5 + 5 = 20 XP, серия 1.
do $$
declare r record;
begin
  select * into r from public.fn_award_lesson('u1l1', 100, 100);
  if r.xp <> 20 or r.streak <> 1 then
    raise exception 'награда за урок: ожидали xp=20 streak=1, получили xp=% streak=%', r.xp, r.streak;
  end if;
end $$;

-- Слияние прогресса идемпотентно: XP не удваивается.
do $$
declare before_xp int; after_xp int;
begin
  select xp into before_xp from public.profiles
  where id='11111111-1111-1111-1111-111111111111';

  perform public.fn_push_progress(jsonb_build_object(
    'xp', before_xp,
    'gems', 4,
    'hearts', 5,
    'heartsUpdatedAt', (extract(epoch from now())*1000)::bigint,
    'streak', 1,
    'lastActiveDay', to_char(current_date,'YYYY-MM-DD'),
    'lessons', jsonb_build_array(jsonb_build_object(
      'lessonId','u1l1','score',100,'accuracy',100,'xp',20)),
    'dailyXp', '{}'::jsonb,
    'wordStats', '{}'::jsonb
  ));

  select xp into after_xp from public.profiles
  where id='11111111-1111-1111-1111-111111111111';

  if after_xp <> before_xp then
    raise exception 'повторная отправка изменила XP: % → %', before_xp, after_xp;
  end if;
end $$;

-- XP по дням не суммируется повторно.
do $$
declare before_daily int; after_daily int;
begin
  select xp into before_daily from public.daily_xp
  where user_id='11111111-1111-1111-1111-111111111111' and day=current_date;

  perform public.fn_push_progress(jsonb_build_object(
    'dailyXp', jsonb_build_object(to_char(current_date,'YYYY-MM-DD'), before_daily)
  ));

  select xp into after_daily from public.daily_xp
  where user_id='11111111-1111-1111-1111-111111111111' and day=current_date;

  if after_daily <> before_daily then
    raise exception 'XP за день изменился при повторной отправке: % → %', before_daily, after_daily;
  end if;
end $$;

-- Награда за повторение: min(20, 2 + 10 + 3) = 15.
do $$
declare r record;
begin
  select * into r from public.fn_award_review(10, 10, '{}'::jsonb);
  if r.xp <> 15 then
    raise exception 'награда за повторение: ожидали 15, получили %', r.xp;
  end if;
end $$;

-- Чтение снимка: структура полей должна совпадать с ожиданиями клиента.
do $$
declare snap jsonb;
begin
  snap := public.fn_fetch_progress();
  if snap->>'xp' is null then raise exception 'в снимке нет xp'; end if;
  if jsonb_typeof(snap->'lessons') <> 'array' then raise exception 'lessons не массив'; end if;
  if jsonb_typeof(snap->'wordStats') <> 'object' then raise exception 'wordStats не объект'; end if;
  if jsonb_typeof(snap->'dailyXp') <> 'object' then raise exception 'dailyXp не объект'; end if;
end $$;

-- Сброс обнуляет XP, гемы, серию и удаляет прогресс уроков.
do $$
declare p record;
begin
  perform public.fn_reset_progress();

  select * into p from public.profiles where id='11111111-1111-1111-1111-111111111111';
  if p.xp <> 0 or p.gems <> 20 or p.streak <> 0 or p.last_active_date is not null then
    raise exception 'сброс неполный: xp=% gems=% streak=%', p.xp, p.gems, p.streak;
  end if;

  if exists (select 1 from public.user_progress where user_id='11111111-1111-1111-1111-111111111111') then
    raise exception 'после сброса остались записи об уроках';
  end if;
  if exists (select 1 from public.daily_xp where user_id='11111111-1111-1111-1111-111111111111') then
    raise exception 'после сброса остались записи о XP по дням';
  end if;
end $$;

-- Ограничения целостности: score не может быть больше 100, сердца — больше 5.
do $$
begin
  begin
    insert into public.user_progress (user_id, lesson_id, best_score)
    values ('11111111-1111-1111-1111-111111111111','bad', 101);
    raise exception 'CHECK на best_score не сработал';
  exception when check_violation then null;
  end;

  begin
    update public.profiles set hearts = 6
    where id='11111111-1111-1111-1111-111111111111';
    raise exception 'CHECK на hearts не сработал';
  exception when check_violation then null;
  end;
end $$;

select 'поведение RPC проверено' as result;
SQL

echo ""
echo "Все проверки миграций пройдены."

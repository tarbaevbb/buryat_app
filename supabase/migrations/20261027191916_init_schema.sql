-- =====================================================================
-- Buryat Learn — схема Supabase
-- Применяется целиком через Supabase SQL Editor или `supabase db push`.
-- Все функции идемпотентны (create or replace / if not exists),
-- поэтому файл можно выполнять повторно.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Профили ----------
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  -- NULL до подтверждения через Telegram; уникальность не мешает нескольким NULL.
  tg_id           bigint unique,
  username        text,
  first_name      text,
  last_name       text,
  photo_url       text,
  language_code   text,
  xp              integer not null default 0 check (xp >= 0),
  gems            integer not null default 20 check (gems >= 0),
  hearts          integer not null default 5 check (hearts between 0 and 5),
  hearts_updated_at timestamptz not null default now(),
  streak          integer not null default 0 check (streak >= 0),
  last_active_date date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- Прогресс по урокам ----------
create table if not exists public.user_progress (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  lesson_id       text not null,
  best_score      integer not null default 0 check (best_score between 0 and 100),
  accuracy        integer not null default 0 check (accuracy between 0 and 100),
  total_xp        integer not null default 0 check (total_xp >= 0),
  completed_count integer not null default 0 check (completed_count >= 0),
  updated_at      timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ---------- XP по дням ----------
create table if not exists public.daily_xp (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day     date not null,
  xp      integer not null default 0 check (xp >= 0),
  primary key (user_id, day)
);

-- ---------- Ошибки по словам ----------
create table if not exists public.word_errors (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  word_id       text not null,
  errors        integer not null default 0 check (errors >= 0),
  seen          integer not null default 0 check (seen >= 0),
  last_error_at timestamptz,
  primary key (user_id, word_id)
);

-- ---------- Индексы ----------
create index if not exists idx_daily_xp_day on public.daily_xp (day, xp desc);
create index if not exists idx_daily_xp_user on public.daily_xp (user_id);
create index if not exists idx_profiles_xp on public.profiles (xp desc);

-- ---------- updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_progress_updated on public.user_progress;
create trigger trg_progress_updated
  before update on public.user_progress
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.user_progress enable row level security;
alter table public.daily_xp      enable row level security;
alter table public.word_errors   enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists progress_all_own on public.user_progress;
create policy progress_all_own on public.user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists daily_xp_all_own on public.daily_xp;
create policy daily_xp_all_own on public.daily_xp
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists word_errors_all_own on public.word_errors;
create policy word_errors_all_own on public.word_errors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- Хелпер: отметка активности и пересчёт серии дней.
-- Возвращает новую серию. Общий для всех «награждающих» функций,
-- чтобы формула серии существовала в одном месте.
-- =====================================================================
create or replace function public.fn_register_activity(p_uid uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak int;
  v_last   date;
  v_today  date := current_date;
begin
  select streak, last_active_date into v_streak, v_last
  from public.profiles where id = p_uid;

  if not found then return 0; end if;

  if v_last is null then
    v_streak := 1;
    v_last := v_today;
  elsif v_today > v_last then
    v_streak := case when v_today - v_last = 1 then coalesce(v_streak, 0) + 1 else 1 end;
    v_last := v_today;
  else
    -- Дата в прошлом или сегодня: серию не меняем, дату назад не двигаем.
    v_streak := coalesce(v_streak, 0);
  end if;

  update public.profiles
     set streak = v_streak,
         last_active_date = v_last
   where id = p_uid;

  return v_streak;
end $$;

-- =====================================================================
-- Лидерборд: недельный рейтинг через view + RPC.
-- =====================================================================
-- View намеренно без security_invoker: он выполняется от владельца,
-- который обходит RLS, иначе лидерборд был бы виден только себе.
-- Доступ к данным идёт только через RPC fn_leaderboard_week ниже.
create or replace view public.leaderboard_week as
select
  p.id            as user_id,
  p.first_name,
  p.username,
  p.photo_url,
  coalesce(sum(d.xp), 0)::int as week_xp
from public.profiles p
left join public.daily_xp d
  on d.user_id = p.id
 and d.day >= date_trunc('week', current_date)::date
group by p.id, p.first_name, p.username, p.photo_url;

create or replace function public.fn_leaderboard_week(p_limit int default 50)
returns table (
  rank      bigint,
  user_id   uuid,
  first_name text,
  username  text,
  photo_url text,
  week_xp   int,
  is_me     boolean
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      rank() over (order by coalesce(l.week_xp, 0) desc, l.user_id) as rank,
      l.user_id, l.first_name, l.username, l.photo_url, coalesce(l.week_xp, 0) as week_xp
    from public.leaderboard_week l
  )
  select r.rank, r.user_id, r.first_name, r.username, r.photo_url, r.week_xp,
         (r.user_id = auth.uid()) as is_me
  from ranked r
  order by r.rank
  limit greatest(1, least(p_limit, 200));
$$;

-- =====================================================================
-- Начисление награды за урок. XP считает БД, клиент присылает только
-- lesson_id, score и accuracy — накрутить опыт с клиента нельзя.
-- =====================================================================
create or replace function public.fn_award_lesson(
  p_lesson_id text,
  p_score     int,
  p_accuracy  int default 0
)
returns table (xp integer, gems integer, streak integer, total_xp integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_score    int  := greatest(0, least(coalesce(p_score, 0), 100));
  v_accuracy int  := greatest(0, least(coalesce(p_accuracy, 0), 100));
  v_prev     int  := 0;
  v_xp       int;
  v_gems     int;
  v_streak   int;
  v_total    int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_lesson_id is null or length(p_lesson_id) = 0 then
    raise exception 'lesson_id required';
  end if;

  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;

  select best_score into v_prev
  from public.user_progress
  where user_id = v_uid and lesson_id = p_lesson_id;
  if not found then v_prev := 0; end if;

  -- Базовая награда + бонус за точность; рекорд урока даёт надбавку.
  v_xp := 10 + case when v_accuracy >= 100 then 5 when v_accuracy >= 80 then 3 else 0 end;
  v_xp := v_xp + case when v_score > v_prev then 5 else 1 end;
  v_gems := round(v_xp / 5.0);

  insert into public.user_progress as up (user_id, lesson_id, best_score, accuracy, total_xp, completed_count)
  values (v_uid, p_lesson_id, v_score, v_accuracy, v_xp, 1)
  on conflict (user_id, lesson_id) do update
    set best_score = greatest(up.best_score, excluded.best_score),
        accuracy   = greatest(up.accuracy, excluded.accuracy),
        total_xp   = up.total_xp + excluded.total_xp,
        completed_count = up.completed_count + 1;

  insert into public.daily_xp as dx (user_id, day, xp)
  values (v_uid, current_date, v_xp)
  on conflict (user_id, day) do update set xp = dx.xp + excluded.xp;

  v_streak := public.fn_register_activity(v_uid);

  -- Алиас обязателен: имена колонок совпадают с выходными параметрами
  -- (RETURNS TABLE (xp, gems, ...)), и без алиаса PostgreSQL не может
  -- отличить переменную от колонки.
  update public.profiles as p
     set xp   = p.xp + v_xp,
         gems = p.gems + v_gems
   where p.id = v_uid
   returning p.xp into v_total;

  return query select v_xp, v_gems, v_streak, v_total;
end $$;

-- =====================================================================
-- Награда за подход в «Повторении». Формула совпадает с reviewXp()
-- в src/lib/progress.ts — при изменении править обе стороны.
-- =====================================================================
create or replace function public.fn_award_review(
  p_correct     int,
  p_total       int,
  p_word_errors jsonb default '{}'::jsonb
)
returns table (xp integer, gems integer, streak integer, total_xp integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_total_n int := greatest(0, least(coalesce(p_total, 0), 100));
  v_correct int := greatest(0, least(coalesce(p_correct, 0), v_total_n));
  v_xp      int;
  v_gems    int;
  v_streak  int;
  v_total   int;
  v_key     text;
  v_val     jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;

  v_xp := least(20, 2 + v_correct + (case when v_total_n > 0 and v_correct >= v_total_n then 3 else 0 end));
  v_gems := round(v_xp / 5.0);

  insert into public.daily_xp as dx (user_id, day, xp)
  values (v_uid, current_date, v_xp)
  on conflict (user_id, day) do update set xp = dx.xp + excluded.xp;

  for v_key, v_val in select * from jsonb_each(coalesce(p_word_errors, '{}'::jsonb)) loop
    insert into public.word_errors as we (user_id, word_id, errors, seen, last_error_at)
    values (
      v_uid, v_key,
      greatest(0, coalesce((v_val ->> 'errors')::int, 0)),
      greatest(0, coalesce((v_val ->> 'seen')::int, 0)),
      to_timestamp(greatest(0, coalesce((v_val ->> 'lastErrorAt')::bigint, 0)) / 1000.0)
    )
    on conflict (user_id, word_id) do update
      set errors = greatest(we.errors, excluded.errors),
          seen   = greatest(we.seen, excluded.seen),
          last_error_at = greatest(we.last_error_at, excluded.last_error_at);
  end loop;

  v_streak := public.fn_register_activity(v_uid);

  -- Алиас обязателен: имена колонок совпадают с выходными параметрами
  -- (RETURNS TABLE (xp, gems, ...)), и без алиаса PostgreSQL не может
  -- отличить переменную от колонки.
  update public.profiles as p
     set xp   = p.xp + v_xp,
         gems = p.gems + v_gems
   where p.id = v_uid
   returning p.xp into v_total;

  return query select v_xp, v_gems, v_streak, v_total;
end $$;

-- =====================================================================
-- Чтение прогресса: возвращает полный снимок состояния игрока.
-- Клиент сливает его с локальным по правилам «максимума»
-- (см. mergeProgress в src/lib/progress.ts).
-- =====================================================================
create or replace function public.fn_fetch_progress()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select jsonb_build_object(
    'xp',                 p.xp,
    'gems',               p.gems,
    'hearts',             p.hearts,
    'heartsUpdatedAt',    (extract(epoch from p.hearts_updated_at) * 1000)::bigint,
    'streak',             p.streak,
    'lastActiveDay',      case when p.last_active_date is null then null
                               else to_char(p.last_active_date, 'YYYY-MM-DD') end,
    'lessons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'lessonId', up.lesson_id,
        'score',    up.best_score,
        'accuracy', up.accuracy,
        'xp',       up.total_xp,
        'completedAt', (extract(epoch from up.updated_at) * 1000)::bigint
      ))
      from public.user_progress up where up.user_id = v_uid
    ), '[]'::jsonb),
    'dailyXp', coalesce((
      select jsonb_object_agg(to_char(dx.day, 'YYYY-MM-DD'), dx.xp)
      from public.daily_xp dx where dx.user_id = v_uid
    ), '{}'::jsonb),
    'wordStats', coalesce((
      select jsonb_object_agg(we.word_id, jsonb_build_object(
        'errors', we.errors,
        'seen',   we.seen,
        'lastErrorAt', coalesce((extract(epoch from we.last_error_at) * 1000)::bigint, 0)
      ))
      from public.word_errors we where we.user_id = v_uid
    ), '{}'::jsonb)
  ) into v_out
  from public.profiles p
  where p.id = v_uid;

  return coalesce(v_out, '{}'::jsonb);
end $$;

-- =====================================================================
-- Отправка снимка прогресса с устройства.
--
-- Используется для офлайн-накопленного прогресса и синхронизации
-- между устройствами. Все поля сливаются по «максимуму», поэтому
-- вызов идемпотентен: повторная отправка того же снимка ничего не меняет
-- и не удваивает XP.
-- =====================================================================
-- Материализация сердец: сколько их стало на момент now().
-- Формула совпадает с materializeHearts() в src/lib/progress.ts
-- (при изменении править обе стороны).
create or replace function public.fn_hearts_now(
  p_hearts int,
  p_at timestamptz,
  p_now timestamptz default now()
)
returns int
language sql
stable
as $$
  select least(5, greatest(0, coalesce(p_hearts, 5)) + floor(
    greatest(0, extract(epoch from (coalesce(p_now, now()) - coalesce(p_at, now())))) / 1800
  )::int);
$$;

create or replace function public.fn_push_progress(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_item        jsonb;
  v_key         text;
  v_val         jsonb;
  v_hearts      int;
  v_hearts_at   timestamptz;
  v_local_hearts int;
  v_local_at    timestamptz;
  v_last        date;
  v_streak      int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;

  v_hearts    := greatest(0, least(coalesce((payload ->> 'hearts')::int, 5), 5));
  v_hearts_at := to_timestamp(greatest(0, coalesce((payload ->> 'heartsUpdatedAt')::bigint, 0)) / 1000.0);
  v_last      := nullif(payload ->> 'lastActiveDay', '')::date;
  v_streak    := greatest(0, coalesce((payload ->> 'streak')::int, 0));

  select p.hearts, p.hearts_updated_at
    into v_local_hearts, v_local_at
  from public.profiles p where p.id = v_uid;

  -- Сравниваем «эффективные» значения: сырые числа без учёта времени
  -- сравнивать нельзя (3 сердца с давней меткой = полный запас).
  v_hearts     := public.fn_hearts_now(v_hearts, v_hearts_at);
  v_local_hearts := public.fn_hearts_now(v_local_hearts, v_local_at);

  update public.profiles p
     set xp   = greatest(p.xp, greatest(0, coalesce((payload ->> 'xp')::int, 0))),
         gems = greatest(p.gems, greatest(0, coalesce((payload ->> 'gems')::int, 0))),
         hearts = greatest(v_local_hearts, v_hearts),
         -- Метка победившей стороны; при равенстве — более ранняя,
         -- чтобы таймер восстановления не откладывался.
         hearts_updated_at = case
           when v_hearts > v_local_hearts then v_hearts_at
           when v_local_hearts > v_hearts then p.hearts_updated_at
           when v_hearts >= 5 then now()
           else least(p.hearts_updated_at, v_hearts_at)
         end,
         -- Серия: побеждает последняя дата занятия; задним числом не продлеваем.
         streak = case
           when v_last is null then p.streak
           when p.last_active_date is null then v_streak
           when v_last > p.last_active_date then v_streak
           when v_last < p.last_active_date then p.streak
           else greatest(p.streak, v_streak)
         end,
         last_active_date = greatest(p.last_active_date, v_last)
   where p.id = v_uid;

  -- Прогресс по урокам: берём лучшие показатели, XP не суммируем.
  for v_item in select * from jsonb_array_elements(coalesce(payload -> 'lessons', '[]'::jsonb)) loop
    if coalesce(v_item ->> 'lessonId', '') = '' then continue; end if;
    insert into public.user_progress as up (user_id, lesson_id, best_score, accuracy, total_xp, completed_count)
    values (
      v_uid,
      v_item ->> 'lessonId',
      greatest(0, least(coalesce((v_item ->> 'score')::int, 0), 100)),
      greatest(0, least(coalesce((v_item ->> 'accuracy')::int, 0), 100)),
      greatest(0, coalesce((v_item ->> 'xp')::int, 0)),
      1
    )
    on conflict (user_id, lesson_id) do update
      set best_score = greatest(up.best_score, excluded.best_score),
          accuracy   = greatest(up.accuracy, excluded.accuracy),
          total_xp   = greatest(up.total_xp, excluded.total_xp);
  end loop;

  -- XP по дням: максимум за день, не сумма.
  for v_key, v_val in select * from jsonb_each(coalesce(payload -> 'dailyXp', '{}'::jsonb)) loop
    continue when v_key !~ '^\d{4}-\d{2}-\d{2}$';
    insert into public.daily_xp as dx (user_id, day, xp)
    values (v_uid, v_key::date, greatest(0, coalesce((v_val)::int, 0)))
    on conflict (user_id, day) do update set xp = greatest(dx.xp, excluded.xp);
  end loop;

  -- Статистика слов.
  for v_key, v_val in select * from jsonb_each(coalesce(payload -> 'wordStats', '{}'::jsonb)) loop
    insert into public.word_errors as we (user_id, word_id, errors, seen, last_error_at)
    values (
      v_uid, v_key,
      greatest(0, coalesce((v_val ->> 'errors')::int, 0)),
      greatest(0, coalesce((v_val ->> 'seen')::int, 0)),
      to_timestamp(greatest(0, coalesce((v_val ->> 'lastErrorAt')::bigint, 0)) / 1000.0)
    )
    on conflict (user_id, word_id) do update
      set errors = greatest(we.errors, excluded.errors),
          seen   = greatest(we.seen, excluded.seen),
          last_error_at = greatest(we.last_error_at, excluded.last_error_at);
  end loop;

  return public.fn_fetch_progress();
end $$;

-- =====================================================================
-- Сброс прогресса. Иначе после очистки на устройстве облако вернуло бы
-- старые XP при следующем входе.
-- =====================================================================
create or replace function public.fn_reset_progress()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  delete from public.user_progress where user_id = v_uid;
  delete from public.daily_xp      where user_id = v_uid;
  delete from public.word_errors   where user_id = v_uid;

  update public.profiles
     set xp = 0,
         gems = 20,
         hearts = 5,
         hearts_updated_at = now(),
         streak = 0,
         last_active_date = null
   where id = v_uid;
end $$;

-- =====================================================================
-- Права
-- =====================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.user_progress, public.daily_xp, public.word_errors to authenticated;
grant select, update on public.profiles to authenticated;

grant execute on function public.fn_leaderboard_week(int) to authenticated;
grant execute on function public.fn_award_lesson(text, int, int) to authenticated;
grant execute on function public.fn_award_review(int, int, jsonb) to authenticated;
grant execute on function public.fn_fetch_progress() to authenticated;
grant execute on function public.fn_push_progress(jsonb) to authenticated;
grant execute on function public.fn_reset_progress() to authenticated;

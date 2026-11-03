-- =====================================================================
-- Убираем механику гемов и увеличиваем запас сердец до 20.
--
-- Причины: гемы существовали только чтобы «выкупать» сердца, а другого
-- применения у них не было. Вместо валюты игрок сразу получает больший
-- запас жизней, который восстанавливается сам.
--
-- Изменения:
--   1. profiles.hearts: default 20, ограничение 0..20, всем полный запас;
--   2. profiles.gems — колонка удаляется;
--   3. RPC больше не считают и не возвращают гемы;
--      fn_award_lesson / fn_award_review меняют форму ответа, поэтому
--      их нужно пересоздать (create or replace не меняет возвращаемый тип);
--   4. fn_hearts_now и fn_push_progress знают про новый максимум.
-- =====================================================================

-- ---------- 1. Сердца: новый максимум ----------
alter table public.profiles alter column hearts set default 20;

-- Имя ограничения при inline-CHECK в init-миграции — profiles_hearts_check.
alter table public.profiles drop constraint if exists profiles_hearts_check;
alter table public.profiles
  add constraint profiles_hearts_check check (hearts between 0 and 20);

-- Разовая выдача полного запаса: у старых игроков было максимум 5,
-- и после смены экономики они не должны остаться с «пятью из двадцати».
-- UPDATE идемпотентен, поэтому повторный прогон миграции безопасен.
update public.profiles set hearts = 20 where hearts < 20;

-- ---------- 2. Материализация сердец: потолок 20 ----------
create or replace function public.fn_hearts_now(
  p_hearts int,
  p_at timestamptz,
  p_now timestamptz default now()
)
returns int
language sql
stable
as $$
  select least(20, greatest(0, coalesce(p_hearts, 20)) + floor(
    greatest(0, extract(epoch from (coalesce(p_now, now()) - coalesce(p_at, now())))) / 1800
  )::int);
$$;

-- ---------- 3. Награда за урок без гемов ----------
-- Форма ответа меняется, поэтому drop + create.
drop function if exists public.fn_award_lesson(text, int, int);

create function public.fn_award_lesson(
  p_lesson_id text,
  p_score     int,
  p_accuracy  int default 0
)
returns table (xp integer, streak integer, total_xp integer)
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
  v_streak   int;
  v_total    int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_lesson_id is null or length(p_lesson_id) = 0 then
    raise exception 'lesson_id required';
  end if;

  -- Урок должен существовать в каталоге: иначе опыт фармится выдуманными id.
  if not exists (select 1 from public.lessons where id = p_lesson_id) then
    raise exception 'unknown lesson: %', p_lesson_id;
  end if;

  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;

  select best_score into v_prev
  from public.user_progress
  where user_id = v_uid and lesson_id = p_lesson_id;
  if not found then v_prev := 0; end if;

  -- Базовая награда + бонус за точность; рекорд урока даёт надбавку.
  v_xp := 10 + case when v_accuracy >= 100 then 5 when v_accuracy >= 80 then 3 else 0 end;
  v_xp := v_xp + case when v_score > v_prev then 5 else 1 end;

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
  -- (RETURNS TABLE (xp, streak, total_xp)), и без алиаса PostgreSQL не может
  -- отличить переменную от колонки.
  update public.profiles as p
     set xp   = p.xp + v_xp
   where p.id = v_uid
   returning p.xp into v_total;

  return query select v_xp, v_streak, v_total;
end $$;

-- ---------- 4. Награда за повторение без гемов ----------
drop function if exists public.fn_award_review(int, int, jsonb);

create function public.fn_award_review(
  p_correct     int,
  p_total       int,
  p_word_errors jsonb default '{}'::jsonb
)
returns table (xp integer, streak integer, total_xp integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_total_n int := greatest(0, least(coalesce(p_total, 0), 50));
  v_correct int := greatest(0, least(coalesce(p_correct, 0), v_total_n));
  v_xp      int;
  v_streak  int;
  v_total   int;
  v_key     text;
  v_val     jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;

  v_xp := least(20, 2 + v_correct + (case when v_total_n > 0 and v_correct >= v_total_n then 3 else 0 end));

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

  update public.profiles as p
     set xp   = p.xp + v_xp
   where p.id = v_uid
   returning p.xp into v_total;

  return query select v_xp, v_streak, v_total;
end $$;

-- ---------- 5. Чтение прогресса: без гемов ----------
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

-- ---------- 6. Отправка снимка: без гемов, потолок сердец 20 ----------
create or replace function public.fn_push_progress(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_item         jsonb;
  v_key          text;
  v_val          jsonb;
  v_hearts       int;
  v_hearts_at    timestamptz;
  v_local_hearts int;
  v_local_at     timestamptz;
  v_lesson       text;
  v_score        int;
  v_accuracy     int;
  v_new_xp       int;
  v_total_gain   int := 0;
  v_streak       int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;

  v_hearts    := greatest(0, least(coalesce((payload ->> 'hearts')::int, 20), 20));
  v_hearts_at := to_timestamp(greatest(0, coalesce((payload ->> 'heartsUpdatedAt')::bigint, 0)) / 1000.0);

  select p.hearts, p.hearts_updated_at
    into v_local_hearts, v_local_at
  from public.profiles p where p.id = v_uid;

  -- Сравниваем «эффективные» значения: сырые числа без учёта времени
  -- сравнивать нельзя (3 сердца с давней меткой = полный запас).
  v_hearts       := public.fn_hearts_now(v_hearts, v_hearts_at);
  v_local_hearts := public.fn_hearts_now(v_local_hearts, v_local_at);

  update public.profiles as p
     set hearts = greatest(v_local_hearts, v_hearts),
         hearts_updated_at = case
           when v_hearts > v_local_hearts then v_hearts_at
           when v_local_hearts > v_hearts then p.hearts_updated_at
           when v_hearts >= 20 then now()
           else least(p.hearts_updated_at, v_hearts_at)
         end
   where p.id = v_uid;

  -- Прогресс по урокам. Незнакомые уроки пропускаем: каталог — источник правды.
  for v_item in select * from jsonb_array_elements(coalesce(payload -> 'lessons', '[]'::jsonb)) loop
    v_lesson := coalesce(v_item ->> 'lessonId', '');
    if v_lesson = '' then continue; end if;
    if not exists (select 1 from public.lessons where id = v_lesson) then continue; end if;

    v_score    := greatest(0, least(coalesce((v_item ->> 'score')::int, 0), 100));
    v_accuracy := greatest(0, least(coalesce((v_item ->> 'accuracy')::int, 0), 100));

    -- Урок уже есть на сервере → XP за него начислен, только улучшаем рекорды.
    if exists (
      select 1 from public.user_progress
      where user_id = v_uid and lesson_id = v_lesson
    ) then
      update public.user_progress as up
         set best_score = greatest(up.best_score, v_score),
             accuracy   = greatest(up.accuracy, v_accuracy)
       where up.user_id = v_uid and up.lesson_id = v_lesson;
      continue;
    end if;

    -- Новый урок (пройден офлайн): считаем награду по формуле fn_award_lesson.
    v_new_xp := 10 + case when v_accuracy >= 100 then 5 when v_accuracy >= 80 then 3 else 0 end + 5;

    insert into public.user_progress (user_id, lesson_id, best_score, accuracy, total_xp, completed_count)
    values (v_uid, v_lesson, v_score, v_accuracy, v_new_xp, 1);

    insert into public.daily_xp as dx (user_id, day, xp)
    values (v_uid, current_date, v_new_xp)
    on conflict (user_id, day) do update set xp = dx.xp + excluded.xp;

    v_total_gain := v_total_gain + v_new_xp;
  end loop;

  -- Статистика слов: счётчики наблюдений, не награда.
  for v_key, v_val in select * from jsonb_each(coalesce(payload -> 'wordStats', '{}'::jsonb)) loop
    insert into public.word_errors as we (user_id, word_id, errors, seen, last_error_at)
    values (
      v_uid, v_key,
      greatest(0, least(coalesce((v_val ->> 'errors')::int, 0), 10000)),
      greatest(0, least(coalesce((v_val ->> 'seen')::int, 0), 10000)),
      to_timestamp(greatest(0, coalesce((v_val ->> 'lastErrorAt')::bigint, 0)) / 1000.0)
    )
    on conflict (user_id, word_id) do update
      set errors = greatest(we.errors, excluded.errors),
          seen   = greatest(we.seen, excluded.seen),
          last_error_at = greatest(we.last_error_at, excluded.last_error_at);
  end loop;

  -- dailyXp из payload игнорируется: его ведут только награждающие функции.
  -- Иначе лидерборд накручивается вставкой строки с любым XP.

  -- Начисляем XP за офлайн-уроки и обновляем серию (если что-то пришло).
  if v_total_gain > 0 then
    v_streak := public.fn_register_activity(v_uid);

    update public.profiles as p
       set xp = p.xp + v_total_gain
     where p.id = v_uid;
  end if;

  return public.fn_fetch_progress();
end $$;

-- ---------- 7. Сброс: полный запас сердец, без гемов ----------
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
         hearts = 20,
         hearts_updated_at = now(),
         streak = 0,
         last_active_date = null
   where id = v_uid;
end $$;

-- ---------- 8. Удаляем колонку ----------
-- Функции выше уже не ссылаются на неё.
alter table public.profiles drop column if exists gems;

-- ---------- 9. Права ----------
-- Пересозданные функции по умолчанию доступны PUBLIC — закрываем.
revoke all on function public.fn_award_lesson(text, int, int) from anon, public;
revoke all on function public.fn_award_review(int, int, jsonb) from anon, public;

grant execute on function public.fn_award_lesson(text, int, int)  to authenticated;
grant execute on function public.fn_award_review(int, int, jsonb) to authenticated;

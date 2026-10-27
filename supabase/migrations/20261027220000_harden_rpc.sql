-- =====================================================================
-- Миграция 2: защита серверной логики от накрутки.
--
-- Что было не так (проверено на реальном Postgres):
--
-- 1. `fn_register_activity(p_uid)` — security definer с произвольным
--    аргументом. Любой авторизованный пользователь мог вызвать её
--    с чужим uid и обнулить серию другому игроку.
--
-- 2. Postgres по умолчанию даёт PUBLIC право EXECUTE на новые функции.
--    Значит `anon` (его ключ лежит в бандле фронтенда) мог вызывать
--    все наши RPC. Внутри стоит проверка auth.uid(), поэтому записать
--    чужие данные не удалось бы, но лишняя поверхность атаки ни к чему.
--
-- 3. Права на таблицы были выданы ролям напрямую, а клиент к таблицам
--    не обращается — он работает только через RPC. Это позволяло
--    `authenticated` править свой xp, gems, streak в обход наград
--    (`update profiles set xp = 999999`) и вставлять фейковый XP в
--    `daily_xp`, накручивая лидерборд.
--
-- 4. `fn_push_progress` принимал XP из payload и сливал его через
--    `greatest`. Это ломало саму идею «сервер — источник истины»:
--    достаточно было прислать `{"xp": 50000000}`.
--
-- 5. `fn_award_lesson` начислял награду за любой несуществующий
--    lesson_id, то есть уроки можно было «проходить» бесконечно.
--
-- 6. View `leaderboard_week` без security_invoker читалась ролью `anon`
--    с публичным ключом: имена игроков были доступны без авторизации.
--
-- 7. `fn_hearts_now` (безопасная сама по себе) была доступна как RPC.
--
-- Здесь закрываются все семь. Схема становится безопасной по умолчанию:
-- deny by default, доступ только через награждающие RPC.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Каталог уроков. Нужен, чтобы награда начислялась только за реально
-- существующие уроки: иначе `fn_award_lesson('что-угодно', 100, 100)`
-- даёт опыт в цикле.
--
-- Заполняется из сгенерированного файла (см. scripts/sync-lessons.mjs),
-- чтобы список не расходился с course.ts.
-- ---------------------------------------------------------------------
create table if not exists public.lessons (
  id         text primary key,
  unit_id    text not null,
  kind       text not null default 'lesson' check (kind in ('lesson', 'review')),
  created_at timestamptz not null default now()
);

-- LESSONS:BEGIN (сгенерировано scripts/sync-lessons.mjs)
insert into public.lessons (id, unit_id, kind) values
  ('u1l1', 'u1', 'lesson'),
  ('u1l2', 'u1', 'lesson'),
  ('u1l3', 'u1', 'lesson'),
  ('u1l4', 'u1', 'lesson'),
  ('u1l5', 'u1', 'review'),
  ('u2l1', 'u2', 'lesson'),
  ('u2l2', 'u2', 'lesson'),
  ('u2l3', 'u2', 'lesson'),
  ('u2l4', 'u2', 'lesson'),
  ('u2l5', 'u2', 'review'),
  ('u3l1', 'u3', 'lesson'),
  ('u3l2', 'u3', 'lesson'),
  ('u3l3', 'u3', 'lesson'),
  ('u3l4', 'u3', 'lesson'),
  ('u3l5', 'u3', 'review'),
  ('u4l1', 'u4', 'lesson'),
  ('u4l2', 'u4', 'lesson'),
  ('u4l3', 'u4', 'lesson'),
  ('u4l4', 'u4', 'lesson'),
  ('u4l5', 'u4', 'review'),
  ('u5l1', 'u5', 'lesson'),
  ('u5l2', 'u5', 'lesson'),
  ('u5l3', 'u5', 'lesson'),
  ('u5l4', 'u5', 'lesson'),
  ('u5l5', 'u5', 'review')
on conflict (id) do update set unit_id = excluded.unit_id, kind = excluded.kind;
-- LESSONS:END

alter table public.lessons enable row level security;

-- Каталог читают все авторизованные (нужен для валидации на клиенте
-- и будущего динамического контента). Записывать может только сервер.
drop policy if exists lessons_select_all on public.lessons;
create policy lessons_select_all on public.lessons
  for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 1. fn_register_activity больше не публичная.
--
-- Функция остаётся security definer (ей нужно писать в чужую строку
-- profiles при пересчёте серии), но:
--   * отозван EXECUTE у PUBLIC, anon и authenticated;
--   * аргумент сверяется с auth.uid() — даже если кто-то получит
--     доступ, подменить игрока он не сможет.
-- ---------------------------------------------------------------------
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
  -- Защита от подмены игрока: внутренний хелпер работает только
  -- с тем пользователем, от имени которого пришёл запрос.
  if p_uid is distinct from auth.uid() then
    raise exception 'forbidden: uid mismatch';
  end if;

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

-- ---------------------------------------------------------------------
-- 5. fn_award_lesson: награда только за существующий урок.
--
-- Дополнительно ограничиваем частоту: один и тот же урок можно
-- «пройти» повторно, но награда за повтор падает до минимума
-- (формула уже даёт 11 XP вместо 20 за отсутствие рекорда).
-- Это ожидаемое поведение — повторение тоже учёба, но бесконечно
-- фармить один урок невыгодно.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- fn_award_review: та же защита — подход ограничен по размеру,
-- чтобы награду нельзя было выбить одним вызовом с p_total = 10^9.
-- ---------------------------------------------------------------------
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
  v_total_n int := greatest(0, least(coalesce(p_total, 0), 50));
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

  update public.profiles as p
     set xp   = p.xp + v_xp,
         gems = p.gems + v_gems
   where p.id = v_uid
   returning p.xp into v_total;

  return query select v_xp, v_gems, v_streak, v_total;
end $$;

-- ---------------------------------------------------------------------
-- 4. fn_push_progress больше не принимает XP, гемы и серию.
--
-- Смысл функции — донести до сервера то, что игрок заработал офлайн.
-- Но XP/гемы/серию из payload брать нельзя: достаточно прислать
-- {"xp": 50000000}, и это работало раньше.
--
-- Решение: для уроков, которых на сервере ещё нет, XP считается здесь
-- по той же формуле, что в fn_award_lesson. Клиент присылает только
-- lesson_id, score и accuracy — то есть факт прохождения, а не награду.
-- Повторная отправка снимка ничего не начислит (урок уже есть) —
-- идемпотентность сохраняется.
--
-- Ограничение: за урок максимум 20 XP, поэтому накрутить нельзя.
-- ---------------------------------------------------------------------
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

  v_hearts    := greatest(0, least(coalesce((payload ->> 'hearts')::int, 5), 5));
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
           when v_hearts >= 5 then now()
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
       set xp   = p.xp + v_total_gain,
           gems = p.gems + round(v_total_gain / 5.0)
     where p.id = v_uid;
  end if;

  return public.fn_fetch_progress();
end $$;

-- ---------------------------------------------------------------------
-- 6. View лидерборда: больше не доступна напрямую.
--
-- Раньше `anon` с публичным ключом мог прочитать имена всех игроков.
-- Теперь представление доступно только роли-владельцу (postgres),
-- а данные отдаёт RPC fn_leaderboard_week с проверкой авторизации.
-- ---------------------------------------------------------------------
revoke all on public.leaderboard_week from anon, authenticated, public;

-- ---------------------------------------------------------------------
-- 3. Права на таблицы отзываются у ролей приложения.
--
-- Клиент работает только через RPC (проверено: в src/ нет ни одного
-- `.from(...)`), поэтому прямой доступ ему не нужен. Это закрывает
-- и правку собственного XP в обход наград, и вставку в daily_xp.
-- ---------------------------------------------------------------------
revoke all on public.profiles      from anon, authenticated;
revoke all on public.user_progress from anon, authenticated;
revoke all on public.daily_xp      from anon, authenticated;
revoke all on public.word_errors   from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2 и 7. Убираем PUBLIC EXECUTE (дефолт Postgres) и оставляем
-- только то, что реально вызывает клиент.
--
-- fn_hearts_now — чистый вычислитель, но её тоже не выставляем наружу:
-- незачем давать лишнюю точку входа.
-- ---------------------------------------------------------------------
revoke all on function public.fn_register_activity(uuid)      from anon, authenticated, public;
revoke all on function public.fn_hearts_now(int, timestamptz, timestamptz) from anon, authenticated, public;
revoke all on function public.fn_leaderboard_week(int)        from anon, public;
revoke all on function public.fn_award_lesson(text, int, int) from anon, public;
revoke all on function public.fn_award_review(int, int, jsonb) from anon, public;
revoke all on function public.fn_fetch_progress()             from anon, public;
revoke all on function public.fn_push_progress(jsonb)         from anon, public;
revoke all on function public.fn_reset_progress()             from anon, public;

-- То, что клиент вызывает: только authenticated и только эти шесть.
grant execute on function public.fn_leaderboard_week(int)         to authenticated;
grant execute on function public.fn_award_lesson(text, int, int)  to authenticated;
grant execute on function public.fn_award_review(int, int, jsonb) to authenticated;
grant execute on function public.fn_fetch_progress()              to authenticated;
grant execute on function public.fn_push_progress(jsonb)          to authenticated;
grant execute on function public.fn_reset_progress()              to authenticated;

grant select on public.lessons to authenticated;
-- anon не должен видеть каталог: у него публичный ключ, доступа к данным быть не должно.
revoke all on public.lessons from anon, public;

-- Схема, но без права создавать объекты.
revoke create on schema public from anon, authenticated, public;
grant usage on schema public to anon, authenticated;

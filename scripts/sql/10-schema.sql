-- =====================================================================
-- Проверка структуры схемы: объекты, RLS, функции.
-- Выполняется после применения миграций. ON_ERROR_STOP=1.
-- =====================================================================

-- Все таблицы должны существовать.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'user_progress', 'daily_xp', 'word_errors', 'lessons'
  ] loop
    if not exists (
      select 1 from pg_tables where schemaname = 'public' and tablename = t
    ) then
      raise exception 'нет таблицы %', t;
    end if;
  end loop;
end $$;

-- На каждой таблице с пользовательскими данными должен быть включён RLS.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'user_progress', 'daily_xp', 'word_errors', 'lessons'
  ] loop
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relrowsecurity
    ) then
      raise exception 'RLS выключен на %', t;
    end if;
  end loop;
end $$;

-- Все функции, которые использует серверная логика, должны существовать.
do $$
declare f text;
begin
  foreach f in array array[
    'fn_register_activity', 'fn_hearts_now', 'fn_leaderboard_week',
    'fn_award_lesson', 'fn_award_review', 'fn_fetch_progress',
    'fn_push_progress', 'fn_reset_progress'
  ] loop
    if not exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = f
    ) then
      raise exception 'нет функции %', f;
    end if;
  end loop;
end $$;

-- Каталог уроков должен быть заполнен: без него награда не начисляется,
-- потому что fn_award_lesson требует существующий lesson_id.
do $$
declare n int;
begin
  select count(*) into n from public.lessons;
  if n < 25 then
    raise exception 'в каталоге уроков только %, ожидалось не меньше 25', n;
  end if;
end $$;

-- У каждого раздела должно быть ровно одно повторение (контроль разбора
-- в scripts/sync-lessons.mjs — если он «поедет», это заметится здесь).
do $$
declare bad int;
begin
  select count(*) into bad from (
    select unit_id from public.lessons
    group by unit_id
    having count(*) filter (where kind = 'review') <> 1
  ) x;
  if bad > 0 then
    raise exception 'в % разделах неверное число повторений', bad;
  end if;
end $$;

-- Клиент ходит только через RPC, значит у ролей приложения не должно быть
-- прав на таблицы: иначе правится XP в обход наград.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'daily_xp', 'word_errors', 'user_progress'] loop
    if has_table_privilege('authenticated', ('public.' || t)::regclass, 'UPDATE')
       or has_table_privilege('authenticated', ('public.' || t)::regclass, 'INSERT')
       or has_table_privilege('anon', ('public.' || t)::regclass, 'SELECT') then
      raise exception 'у ролей остались права на таблицу %', t;
    end if;
  end loop;
end $$;

-- Внутренние хелперы не должны быть доступны снаружи.
do $$
begin
  -- fn_register_activity — через неё можно было испортить серию другому.
  if has_function_privilege('authenticated', 'public.fn_register_activity(uuid)'::regprocedure, 'EXECUTE') then
    raise exception 'fn_register_activity доступна authenticated';
  end if;

  if has_function_privilege('anon', 'public.fn_register_activity(uuid)'::regprocedure, 'EXECUTE') then
    raise exception 'fn_register_activity доступна anon';
  end if;

  -- anon (публичный ключ в бандле) не должен вызывать награждающие RPC.
  if has_function_privilege('anon', 'public.fn_award_lesson(text,int,int)'::regprocedure, 'EXECUTE') then
    raise exception 'anon может вызывать fn_award_lesson';
  end if;
  if has_function_privilege('anon', 'public.fn_push_progress(jsonb)'::regprocedure, 'EXECUTE') then
    raise exception 'anon может вызывать fn_push_progress';
  end if;

  -- Клиент должен иметь доступ к своим шести RPC.
  if not has_function_privilege('authenticated', 'public.fn_award_lesson(text,int,int)'::regprocedure, 'EXECUTE') then
    raise exception 'authenticated лишена fn_award_lesson';
  end if;
  if not has_function_privilege('authenticated', 'public.fn_push_progress(jsonb)'::regprocedure, 'EXECUTE') then
    raise exception 'authenticated лишена fn_push_progress';
  end if;
  if not has_function_privilege('authenticated', 'public.fn_leaderboard_week(int)'::regprocedure, 'EXECUTE') then
    raise exception 'authenticated лишена fn_leaderboard_week';
  end if;
end $$;

select 'проверки схемы, RLS и прав пройдены' as result;

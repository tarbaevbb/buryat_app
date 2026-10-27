-- =====================================================================
-- Проверка защиты от накрутки.
--
-- Каждая попытка ниже до введения migration_2_harden_rpc завершалась
-- успешно. Теперь все они должны падать с insufficient_privilege либо
-- просто не менять данные. Если хоть одна пройдёт — прогресс можно
-- накрутить, и это блокирует деплой.
-- =====================================================================

-- «Атакующий»: обычный авторизованный игрок.
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- ---------------------------------------------------------------------
-- 1. Подмена uid: испортить серию другому игроку.
--    Было: fn_register_activity принимала любой uuid.
-- ---------------------------------------------------------------------
do $$
begin
  begin
    set local role authenticated;
    perform public.fn_register_activity('11111111-1111-1111-1111-111111111111');
    reset role;
    raise exception 'ошибка защиты: подмена uid прошла';
  exception
    when insufficient_privilege then reset role;
  end;
end $$;

-- ---------------------------------------------------------------------
-- 2. Прямая правка своего XP в обход наград.
--    Было: политика profiles_update_own разрешала менять любые поля.
-- ---------------------------------------------------------------------
do $$
begin
  begin
    set local role authenticated;
    update public.profiles set xp = 999999
    where id = '22222222-2222-2222-2222-222222222222';
    reset role;
    raise exception 'ошибка защиты: прямое обновление profiles прошло';
  exception
    when insufficient_privilege then reset role;
  end;
end $$;

-- ---------------------------------------------------------------------
-- 3. Вставка фейкового XP в daily_xp — накрутка лидерборда.
-- ---------------------------------------------------------------------
do $$
begin
  begin
    set local role authenticated;
    insert into public.daily_xp (user_id, day, xp)
    values ('22222222-2222-2222-2222-222222222222', current_date, 999999);
    reset role;
    raise exception 'ошибка защиты: вставка в daily_xp прошла';
  exception
    when insufficient_privilege then reset role;
  end;
end $$;

-- ---------------------------------------------------------------------
-- 4. Роль anon (её ключ лежит в бандле фронтенда) вызывает RPC.
--    Было: Postgres даёт PUBLIC EXECUTE на новые функции по умолчанию.
-- ---------------------------------------------------------------------
do $$
begin
  begin
    set local role anon;
    perform public.fn_award_lesson('u1l1', 100, 100);
    reset role;
    raise exception 'ошибка защиты: anon вызвал fn_award_lesson';
  exception
    when insufficient_privilege then reset role;
  end;
end $$;

do $$
begin
  begin
    set local role anon;
    perform (select payload from (select public.fn_push_progress('{}'::jsonb) as payload) t);
    reset role;
    raise exception 'ошибка защиты: anon вызвал fn_push_progress';
  exception
    when insufficient_privilege then reset role;
  end;
end $$;

-- ---------------------------------------------------------------------
-- 5. anon читает имена игроков через view лидерборда.
--    Было: view исполняется от владельца и была доступна anon.
-- ---------------------------------------------------------------------
do $$
begin
  begin
    set local role anon;
    perform first_name from public.leaderboard_week;
    reset role;
    raise exception 'ошибка защиты: anon прочитал лидерборд';
  exception
    when insufficient_privilege then reset role;
  end;
end $$;

-- ---------------------------------------------------------------------
-- 6. Накрутка XP через payload снимка.
--    Было: fn_push_progress брала xp из payload через greatest().
-- ---------------------------------------------------------------------
do $$
declare xp_before int;
declare xp_after int;
begin
  select xp into xp_before from public.profiles
  where id = '22222222-2222-2222-2222-222222222222';

  set local role authenticated;
  perform public.fn_push_progress(
    '{"xp": 50000000, "gems": 1000000, "streak": 9999, "dailyXp": {"2026-01-01": 999999}}'::jsonb
  );
  reset role;

  select xp into xp_after from public.profiles
  where id = '22222222-2222-2222-2222-222222222222';

  if xp_after <> xp_before then
    raise exception 'ошибка защиты: XP накручен через payload (% → %)', xp_before, xp_after;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. Серия другого игрока не пострадала от попытки подмены.
--    Игрок 2 начинал с серией 5; проверяем, что она осталась прежней.
-- ---------------------------------------------------------------------
do $$
declare s int;
begin
  select streak into s from public.profiles
  where id = '22222222-2222-2222-2222-222222222222';

  if s <> 5 then
    raise exception 'серия игрока 2 изменилась: % вместо 5', s;
  end if;
end $$;

select 'защита от накрутки работает' as result;

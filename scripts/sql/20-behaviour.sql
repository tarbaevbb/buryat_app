-- =====================================================================
-- Функциональные проверки RPC: награды, идемпотентность, сброс.
-- ON_ERROR_STOP=1: любое расхождение останавливает выполнение.
-- =====================================================================

-- Два игрока: «жертва» и «атакующий».
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'player1@buryat.local'),
  ('22222222-2222-2222-2222-222222222222', 'player2@buryat.local')
on conflict (id) do nothing;

insert into public.profiles (id, tg_id, first_name, streak, last_active_date) values
  ('11111111-1111-1111-1111-111111111111', 1, 'Игрок 1', 0, null),
  ('22222222-2222-2222-2222-222222222222', 2, 'Игрок 2', 5, current_date - 10)
on conflict (id) do nothing;

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- ---------------------------------------------------------------------
-- 1. Награда за урок: 10 базовых + 5 за точность 100% + 5 за рекорд = 20.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  select * into r from public.fn_award_lesson('u1l1', 100, 100);
  if r.xp <> 20 then
    raise exception 'награда за урок: ожидали 20 XP, получили %', r.xp;
  end if;
  if r.streak <> 1 then
    raise exception 'серия после первого урока: ожидали 1, получили %', r.streak;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Повтор того же урока даёт меньше (рекорд не превышен).
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  select * into r from public.fn_award_lesson('u1l1', 100, 100);
  if r.xp >= 20 then
    raise exception 'повтор урока дал столько же XP: %', r.xp;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Награда за выдуманный урок не начисляется.
-- ---------------------------------------------------------------------
do $$
begin
  begin
    perform public.fn_award_lesson('выдуманный-урок', 100, 100);
    raise exception 'награда за несуществующий урок не отклонена';
  exception
    when others then
      if sqlerrm not like '%unknown lesson%' then raise; end if;
  end;
end $$;

-- ---------------------------------------------------------------------
-- 4. Офлайн-прогресс: уроки из снимка начисляют XP по формуле сервера.
--    u4l1 при точности 100 → 20 XP, u4l2 при 60 → 10 + 0 + 5 = 15 XP.
-- ---------------------------------------------------------------------
do $$
declare xp_before int;
declare xp_after int;
declare snap jsonb;
begin
  select xp into xp_before from public.profiles
  where id = '11111111-1111-1111-1111-111111111111';

  snap := public.fn_push_progress(jsonb_build_object(
    'lessons', jsonb_build_array(
      jsonb_build_object('lessonId', 'u4l1', 'score', 100, 'accuracy', 100),
      jsonb_build_object('lessonId', 'u4l2', 'score', 70, 'accuracy', 60),
      jsonb_build_object('lessonId', 'выдуманный', 'score', 100, 'accuracy', 100)
    ),
    'wordStats', '{}'::jsonb,
    'hearts', 4,
    'heartsUpdatedAt', (extract(epoch from now()) * 1000)::bigint
  ));

  xp_after := (snap ->> 'xp')::int;

  if xp_after <> xp_before + 35 then
    raise exception 'офлайн-уроки дали % XP, ожидали %',
      xp_after - xp_before, 35;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Повторная отправка того же снимка ничего не меняет (идемпотентность).
-- ---------------------------------------------------------------------
do $$
declare xp_before int;
declare xp_after int;
begin
  select xp into xp_before from public.profiles
  where id = '11111111-1111-1111-1111-111111111111';

  perform public.fn_push_progress(jsonb_build_object(
    'lessons', jsonb_build_array(
      jsonb_build_object('lessonId', 'u4l1', 'score', 100, 'accuracy', 100),
      jsonb_build_object('lessonId', 'u4l2', 'score', 70, 'accuracy', 60)
    )
  ));

  select xp into xp_after from public.profiles
  where id = '11111111-1111-1111-1111-111111111111';

  if xp_after <> xp_before then
    raise exception 'повторная отправка изменила XP: % → %', xp_before, xp_after;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. Награда за повторение: min(20, 2 + 10 + 3) = 15 при идеальном подходе.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  select * into r from public.fn_award_review(10, 10, '{}'::jsonb);
  if r.xp <> 15 then
    raise exception 'награда за повторение: ожидали 15, получили %', r.xp;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. Снимок прогресса: структура полей должна совпадать с ожиданиями клиента.
-- ---------------------------------------------------------------------
do $$
declare snap jsonb;
begin
  snap := public.fn_fetch_progress();

  if (snap ->> 'xp') is null then raise exception 'в снимке нет xp'; end if;
  if jsonb_typeof(snap -> 'lessons') <> 'array' then
    raise exception 'lessons должно быть массивом, а не %', jsonb_typeof(snap -> 'lessons');
  end if;
  if jsonb_typeof(snap -> 'wordStats') <> 'object' then
    raise exception 'wordStats должно быть объектом';
  end if;
  if jsonb_typeof(snap -> 'dailyXp') <> 'object' then
    raise exception 'dailyXp должно быть объектом';
  end if;
  if (snap -> 'hearts') is null then raise exception 'в снимке нет hearts'; end if;
end $$;

-- ---------------------------------------------------------------------
-- 8. Сброс: XP, гемы, серия, уроки и статистика очищаются.
-- ---------------------------------------------------------------------
do $$
declare p record;
begin
  perform public.fn_reset_progress();

  select * into p from public.profiles
  where id = '11111111-1111-1111-1111-111111111111';

  if p.xp <> 0 or p.gems <> 20 or p.streak <> 0 or p.last_active_date is not null then
    raise exception 'сброс неполный: xp=% gems=% streak=%', p.xp, p.gems, p.streak;
  end if;

  if exists (select 1 from public.user_progress
             where user_id = '11111111-1111-1111-1111-111111111111') then
    raise exception 'после сброса остались записи об уроках';
  end if;

  if exists (select 1 from public.daily_xp
             where user_id = '11111111-1111-1111-1111-111111111111') then
    raise exception 'после сброса остались записи о XP по дням';
  end if;

  if exists (select 1 from public.word_errors
             where user_id = '11111111-1111-1111-1111-111111111111') then
    raise exception 'после сброса осталась статистика слов';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 9. Лидерборд доступен авторизованному и помечает свою строку.
-- ---------------------------------------------------------------------
do $$
declare rows int;
declare me int;
begin
  select count(*), count(*) filter (where is_me) into rows, me
  from public.fn_leaderboard_week(10);

  if rows = 0 then raise exception 'лидерборд пуст'; end if;
  if me <> 1 then raise exception 'лидерборд не отметил текущего игрока'; end if;
end $$;

-- ---------------------------------------------------------------------
-- 10. Ограничения целостности: score ≤ 100, сердца ≤ 5.
-- ---------------------------------------------------------------------
do $$
begin
  begin
    insert into public.user_progress (user_id, lesson_id, best_score)
    values ('11111111-1111-1111-1111-111111111111', 'u1l1', 101);
    raise exception 'CHECK на best_score не сработал';
  exception when check_violation then null;
  end;

  begin
    update public.profiles set hearts = 6
    where id = '11111111-1111-1111-1111-111111111111';
    raise exception 'CHECK на hearts не сработал';
  exception when check_violation then null;
  end;
end $$;

select 'проверки поведения RPC пройдены' as result;

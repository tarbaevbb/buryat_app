-- Идентификаторы разделов теперь соответствуют порядку показа:
-- первые слова (u1), числа и время (u2), знакомство (u3).
-- Сначала уводим старые значения во временный диапазон, чтобы избежать
-- конфликтов первичного ключа при перестановке u1/u2/u3.
create table if not exists public.course_id_migrations (
  version text primary key
);

do $$
begin
  if not exists (
    select 1 from public.course_id_migrations
    where version = '20261105090000_reorder_course_ids'
  ) then
    update public.user_progress
    set lesson_id = replace(lesson_id, 'u1l', 'tmp-l')
    where lesson_id like 'u1l%';
    update public.user_progress
    set lesson_id = replace(lesson_id, 'u2l', 'u1l')
    where lesson_id like 'u2l%';
    update public.user_progress
    set lesson_id = replace(lesson_id, 'u3l', 'u2l')
    where lesson_id like 'u3l%';
    update public.user_progress
    set lesson_id = replace(lesson_id, 'tmp-l', 'u3l')
    where lesson_id like 'tmp-l%';

    update public.lessons
    set id = replace(id, 'u1l', 'tmp-l'),
        unit_id = case unit_id when 'u1' then 'tmp-u1' else unit_id end
    where id like 'u1l%';
    update public.lessons
    set id = replace(id, 'u2l', 'u1l'),
        unit_id = case unit_id when 'u2' then 'u1' else unit_id end
    where id like 'u2l%';
    update public.lessons
    set id = replace(id, 'u3l', 'u2l'),
        unit_id = case unit_id when 'u3' then 'u2' else unit_id end
    where id like 'u3l%';
    update public.lessons
    set id = replace(id, 'tmp-l', 'u3l'),
        unit_id = case unit_id when 'tmp-u1' then 'u3' else unit_id end
    where id like 'tmp-l%';

    insert into public.course_id_migrations (version)
    values ('20261105090000_reorder_course_ids');
  end if;
end $$;

-- =====================================================================
-- Заглушки Supabase для чистого Postgres.
--
-- Миграции ссылаются на объекты платформы, которых в standalone Postgres
-- нет. Здесь создаётся минимум, чтобы проверять именно наш SQL:
--   * схема auth с таблицей users (внешний ключ profiles.id)
--   * auth.uid() — id текущего пользователя из настроек сессии
--   * роли anon / authenticated / service_role и права по умолчанию,
--     такие же, как выдаёт Supabase (в этом и смысл: воспроизвести
--     поведение продакшена, включая PUBLIC EXECUTE на функции)
--
-- Подключается с ON_ERROR_STOP=1, идемпотентен.
-- =====================================================================

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

-- Supabase выдаёт права на новые объекты автоматически. Воспроизводим:
-- именно из-за этого PUBLIC получает EXECUTE на функции, и в первой
-- версии схемы роли anon были доступны все RPC.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- auth.uid() читает id из настроек сессии, как это делает Supabase,
-- подставляя claim из JWT. В тестах значение задаётся через
-- `set request.jwt.claim.sub = '<uuid>'`.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

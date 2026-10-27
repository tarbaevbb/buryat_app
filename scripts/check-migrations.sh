#!/usr/bin/env bash
#
# Проверка миграций Supabase на локальном Postgres.
#
# Поднимает контейнер, создаёт заглушки объектов Supabase, применяет
# миграции дважды (проверка идемпотентности) и прогоняет проверки из
# scripts/sql/. Те же самые файлы выполняет job `migrations` в CI —
# поэтому локальный и удалённый результат совпадают.
#
# Требуется Docker.
#
# Запуск:  npm run check:migrations
#
set -euo pipefail

CONTAINER=buryat-migrations-check
PORT=55433
DB=buryat_test
MIGRATIONS_DIR=supabase/migrations
SQL_DIR=scripts/sql

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

psql_run() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q "$@"
}

psql_file() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f - < "$1"
}

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

echo "→ Создаю заглушки Supabase"
psql_file "$SQL_DIR/00-stubs.sql"

apply_migrations() {
  local label="$1"
  for f in "$MIGRATIONS_DIR"/*.sql; do
    echo "   $label: $(basename "$f")"
    psql_file "$f" > /dev/null
  done
}

echo "→ Применяю миграции"
apply_migrations "прогон 1"

echo "→ Повторный прогон (миграции должны быть идемпотентны)"
apply_migrations "прогон 2"

echo "→ Проверяю схему, RLS и права"
psql_file "$SQL_DIR/10-schema.sql"

echo "→ Проверяю поведение RPC"
psql_file "$SQL_DIR/20-behaviour.sql"

echo "→ Проверяю защиту от накрутки"
psql_file "$SQL_DIR/30-security.sql"

echo ""
echo "Все проверки миграций пройдены."

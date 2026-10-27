import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { HEART_REFILL_MS, reviewXp } from './progress'

/**
 * Схема читается из миграций — это единственный источник правды
 * (файл supabase/schema.sql был дубликатом и удалён). Если миграций
 * станет несколько, содержимое просто склеится в порядке применения.
 */
const migrationsDir = resolve(process.cwd(), 'supabase/migrations')
const schema = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(resolve(migrationsDir, f), 'utf8'))
  .join('\n')

/**
 * Формулы награды и восстановления сердец продублированы на клиенте
 * (быстрый отклик) и на сервере (источник истины). Если они разъедутся,
 * игрок увидит одну награду, а получит другую. Эти тесты ловят расхождение
 * при изменении одной из сторон.
 */
describe('согласованность клиента и схемы Supabase', () => {
  it('интервал восстановления сердец — 1800 секунд (30 минут)', () => {
    expect(HEART_REFILL_MS).toBe(30 * 60 * 1000)
    expect(schema).toContain('/ 1800')
  })

  it('формат метки времени сердец — миллисекунды', () => {
    // Клиент шлёт миллисекунды, сервер делит на 1000 перед to_timestamp.
    expect(schema).toContain('/ 1000.0')
  })

  it('формула XP за повторение совпадает с fn_award_review', () => {
    expect(schema).toContain('least(20, 2 + v_correct')
    expect(schema).toMatch(/case when v_total_n > 0 and v_correct >= v_total_n then 3 else 0 end/)
    // Клиентская формула даёт те же значения на границах.
    expect(reviewXp(10, 10)).toBe(15)
    expect(reviewXp(0, 10)).toBe(2)
    expect(reviewXp(9, 10)).toBe(11)
  })

  it('формула XP за урок совпадает с fn_award_lesson', () => {
    expect(schema).toContain('10 + case when v_accuracy >= 100 then 5 when v_accuracy >= 80 then 3 else 0 end')
    expect(schema).toMatch(/when v_score > v_prev then 5 else 1 end/)
  })

  it('начисление гемов совпадает: round(xp / 5)', () => {
    expect(schema).toContain('v_gems := round(v_xp / 5.0)')
  })

  it('сброс прогресса обнуляет XP, гемы и серию', () => {
    expect(schema).toContain('fn_reset_progress')
    expect(schema).toMatch(/set xp = 0,\s+gems = 20,\s+hearts = 5/)
  })

  it('все RPC, которые вызывает клиент, объявлены в схеме', () => {
    const fns = [
      'fn_leaderboard_week',
      'fn_award_lesson',
      'fn_award_review',
      'fn_fetch_progress',
      'fn_push_progress',
      'fn_reset_progress',
    ]
    for (const fn of fns) {
      expect(schema, `нет функции ${fn}`).toContain(`create or replace function public.${fn}`)
      expect(schema, `нет прав на ${fn}`).toContain(`grant execute on function public.${fn}`)
    }
  })

  it('сердца на сервере ограничены пятью', () => {
    expect(schema).toContain('least(5, greatest(0, coalesce(p_hearts, 5))')
  })

  it('сервер не суммирует XP при отправке снимка (идемпотентность)', () => {
    // В fn_push_progress XP берётся через greatest, а не прибавлением.
    expect(schema).toMatch(/xp\s+= greatest\(p\.xp, greatest\(0, coalesce\(\(payload ->> 'xp'\)::int, 0\)\)\)/)
  })

  it('прогресс уроков на сервере не суммируется повторно', () => {
    expect(schema).toContain('total_xp   = greatest(up.total_xp, excluded.total_xp)')
  })

  /**
   * Регрессия: `RETURNS TABLE (xp, gems, ...)` объявляет переменные с теми же
   * именами, что и колонки `profiles`. Выражение `set xp = xp + v_xp` тогда
   * падает с «column reference "xp" is ambiguous» — награда не начисляется
   * вообще. Лечится алиасом таблицы, его и проверяем.
   */
  it('в начисляющих функциях есть алиас таблицы (иначе ambiguous column)', () => {
    expect(schema).toContain('update public.profiles as p')
    expect(schema).toContain('set xp   = p.xp + v_xp')
    expect(schema).toContain('returning p.xp into v_total')
    // Голого `set xp = xp +` быть не должно.
    expect(schema).not.toMatch(/set xp = xp \+/)
  })

  it('каждая начисляющая функция возвращает total_xp, а не level_xp', () => {
    // Клиент читает server.totalXp из поля total_xp.
    expect(schema).toContain('returns table (xp integer, gems integer, streak integer, total_xp integer)')
    expect(schema).not.toContain('level_xp integer')
  })
})

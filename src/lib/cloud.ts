import { supabase } from './supabase'
import type { ProgressSnapshot, WordStat } from './progress'
import { emptySnapshot } from './progress'

export interface LeaderboardRow {
  rank: number
  userId: string
  firstName: string | null
  username: string | null
  photoUrl: string | null
  weekXp: number
  isMe: boolean
}

/** Серверные значения после начисления награды. */
export interface AwardResponse {
  xp: number
  gems: number
  streak: number
  totalXp: number
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Приводит ответ сервера к строгому виду. */
function parseAward(data: unknown): AwardResponse | null {
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null
  if (!row) return null
  return {
    xp: num(row.xp),
    gems: num(row.gems),
    streak: num(row.streak),
    totalXp: num(row.total_xp ?? row.level_xp),
  }
}

/** Загружает недельный лидерборд. */
export async function fetchLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('fn_leaderboard_week', { p_limit: limit })
  if (error) {
    console.warn('[cloud] лидерборд недоступен:', error.message)
    return []
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    rank: num(row.rank),
    userId: String(row.user_id),
    firstName: (row.first_name as string) ?? null,
    username: (row.username as string) ?? null,
    photoUrl: (row.photo_url as string) ?? null,
    weekXp: num(row.week_xp),
    isMe: Boolean(row.is_me),
  }))
}

/** Начисляет награду за урок. XP считает БД. */
export async function awardLessonRemote(
  lessonId: string,
  score: number,
  accuracy: number,
): Promise<AwardResponse | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('fn_award_lesson', {
    p_lesson_id: lessonId,
    p_score: score,
    p_accuracy: accuracy,
  })
  if (error) {
    console.warn('[cloud] не удалось начислить награду за урок:', error.message)
    return null
  }
  return parseAward(data)
}

/** Начисляет награду за подход в «Повторении». Считает БД. */
export async function awardReviewRemote(
  correct: number,
  total: number,
  wordStats: Record<string, WordStat>,
): Promise<AwardResponse | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('fn_award_review', {
    p_correct: correct,
    p_total: total,
    p_word_errors: wordStats,
  })
  if (error) {
    console.warn('[cloud] не удалось начислить награду за повторение:', error.message)
    return null
  }
  return parseAward(data)
}

/**
 * Полный снимок прогресса с сервера.
 * Возвращает null, если облако недоступно (тогда работаем локально).
 */
export async function fetchRemoteProgress(): Promise<ProgressSnapshot | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('fn_fetch_progress')
  if (error) {
    console.warn('[cloud] не удалось прочитать прогресс:', error.message)
    return null
  }
  if (!data || typeof data !== 'object') return null
  return parseSnapshot(data as Record<string, unknown>)
}

/** Отправляет снимок прогресса. Идемпотентно: XP не удваивается. */
export async function pushProgress(
  snapshot: ProgressSnapshot,
): Promise<ProgressSnapshot | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('fn_push_progress', {
    payload: serializeSnapshot(snapshot),
  })
  if (error) {
    console.warn('[cloud] не удалось отправить прогресс:', error.message)
    return null
  }
  if (!data || typeof data !== 'object') return null
  return parseSnapshot(data as Record<string, unknown>)
}

/** Сбрасывает прогресс в облаке. */
export async function resetRemoteProgress(): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.rpc('fn_reset_progress')
  if (error) {
    console.warn('[cloud] не удалось сбросить прогресс:', error.message)
    return false
  }
  return true
}

/* ------------------------------------------------------------------ *
 * Сериализация снимка
 * ------------------------------------------------------------------ */

/**
 * `lessons` — объект на клиенте, массив на сервере: RPC перебирает
 * jsonb_array_elements.
 *
 * Отправляем только то, что сервер действительно обрабатывает:
 * сердца, факты прохождения уроков и статистику слов. XP, гемы, серию
 * и `dailyXp` сервер считает сам — если их прислать, они будут
 * проигнорированы (проверено тестами в scripts/check-migrations.sh).
 * Без этого достаточно было бы прислать `{"xp": 50000000}` и накрутить
 * себе опыт.
 */
function serializeSnapshot(snapshot: ProgressSnapshot) {
  return {
    hearts: snapshot.hearts,
    heartsUpdatedAt: snapshot.heartsUpdatedAt,
    lessons: Object.values(snapshot.lessons).map((l) => ({
      lessonId: l.lessonId,
      score: l.score,
      accuracy: l.accuracy,
    })),
    wordStats: snapshot.wordStats,
  }
}

/** Разбор ответа `fn_fetch_progress` / `fn_push_progress`. */
function parseSnapshot(raw: Record<string, unknown>): ProgressSnapshot {
  const base = emptySnapshot()
  const lessons: ProgressSnapshot['lessons'] = {}
  const rawLessons = raw.lessons
  if (Array.isArray(rawLessons)) {
    for (const item of rawLessons as Record<string, unknown>[]) {
      const id = String(item.lessonId ?? '')
      if (!id) continue
      lessons[id] = {
        lessonId: id,
        score: num(item.score),
        accuracy: num(item.accuracy),
        xp: num(item.xp),
        completedAt: num(item.completedAt),
      }
    }
  }

  const wordStats: Record<string, WordStat> = {}
  const rawWords = (raw.wordStats ?? {}) as Record<string, Record<string, unknown>>
  for (const [id, stat] of Object.entries(rawWords)) {
    wordStats[id] = {
      errors: num(stat?.errors),
      seen: num(stat?.seen),
      lastErrorAt: num(stat?.lastErrorAt),
    }
  }

  const dailyXp: Record<string, number> = {}
  const rawDaily = (raw.dailyXp ?? {}) as Record<string, unknown>
  for (const [day, xp] of Object.entries(rawDaily)) {
    dailyXp[day] = num(xp)
  }

  return {
    xp: num(raw.xp, base.xp),
    gems: num(raw.gems, base.gems),
    hearts: Math.min(5, Math.max(0, num(raw.hearts, base.hearts))),
    heartsUpdatedAt: num(raw.heartsUpdatedAt, base.heartsUpdatedAt),
    streak: num(raw.streak, base.streak),
    lastActiveDay: (raw.lastActiveDay as string | null) ?? null,
    lessons,
    dailyXp,
    wordStats,
  }
}

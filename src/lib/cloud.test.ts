import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptySnapshot } from './progress'

/**
 * Фейковый Supabase: перехватывает `.rpc(...)` и записывает вызовы,
 * чтобы проверить, что клиент шлёт правильные аргументы и корректно
 * разбирает ответы.
 */
interface RpcCall {
  fn: string
  args: Record<string, unknown>
}

const calls: RpcCall[] = []
let handler: (fn: string, args: Record<string, unknown>) => { data: unknown; error: unknown }

vi.mock('./supabase', () => ({
  isCloudEnabled: true,
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args })
      return Promise.resolve(handler(fn, args))
    },
  },
}))

const cloud = await import('./cloud')

beforeEach(() => {
  calls.length = 0
  handler = () => ({ data: null, error: null })
})

describe('cloud: лидерборд', () => {
  it('разбирает строки рейтинга', async () => {
    handler = () => ({
      data: [
        {
          rank: 1,
          user_id: 'u1',
          first_name: 'Бэлиг',
          username: 'belig',
          photo_url: null,
          week_xp: 120,
          is_me: true,
        },
      ],
      error: null,
    })
    const rows = await cloud.fetchLeaderboard(10)
    expect(calls[0]).toEqual({ fn: 'fn_leaderboard_week', args: { p_limit: 10 } })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ rank: 1, weekXp: 120, isMe: true, firstName: 'Бэлиг' })
  })

  it('возвращает пустой список при ошибке', async () => {
    handler = () => ({ data: null, error: { message: 'нет сети' } })
    expect(await cloud.fetchLeaderboard()).toEqual([])
  })
})

describe('cloud: награды', () => {
  it('читает ответ fn_award_lesson (массив из строки)', async () => {
    handler = () => ({ data: [{ xp: 15, gems: 3, streak: 4, total_xp: 315 }], error: null })
    const res = await cloud.awardLessonRemote('u1l1', 100, 100)
    expect(calls[0]).toEqual({
      fn: 'fn_award_lesson',
      args: { p_lesson_id: 'u1l1', p_score: 100, p_accuracy: 100 },
    })
    expect(res).toEqual({ xp: 15, gems: 3, streak: 4, totalXp: 315 })
  })

  it('читает ответ fn_award_review', async () => {
    handler = () => ({ data: [{ xp: 15, gems: 3, streak: 2, total_xp: 415 }], error: null })
    const res = await cloud.awardReviewRemote(10, 10, {})
    expect(calls[0].fn).toBe('fn_award_review')
    expect(res?.xp).toBe(15)
  })

  it('терпит ответ-объект вместо массива', async () => {
    handler = () => ({ data: { xp: 7, gems: 1, streak: 1, total_xp: 7 }, error: null })
    const res = await cloud.awardLessonRemote('u1l1', 50, 40)
    expect(res?.xp).toBe(7)
  })

  it('возвращает null при ошибке сервера', async () => {
    handler = () => ({ data: null, error: { message: 'boom' } })
    expect(await cloud.awardLessonRemote('x', 1, 1)).toBeNull()
    expect(await cloud.awardReviewRemote(1, 1, {})).toBeNull()
  })
})

describe('cloud: снимок прогресса', () => {
  const remotePayload = {
    xp: 300,
    gems: 60,
    hearts: 4,
    heartsUpdatedAt: 1_700_000_000_000,
    streak: 9,
    lastActiveDay: '2026-05-05',
    lessons: [
      { lessonId: 'u1l1', score: 95, accuracy: 90, xp: 22, completedAt: 1000 },
      { lessonId: '', score: 10, accuracy: 10, xp: 1 }, // мусор — должен отфильтроваться
    ],
    dailyXp: { '2026-05-05': 22 },
    wordStats: { ger: { errors: 2, seen: 3, lastErrorAt: 500 } },
  }

  it('разбирает снимок и приводит типы', async () => {
    handler = () => ({ data: remotePayload, error: null })
    const snap = await cloud.fetchRemoteProgress()
    expect(snap?.xp).toBe(300)
    expect(snap?.hearts).toBe(4)
    expect(snap?.lessons.u1l1.score).toBe(95)
    // Пустой lessonId отброшен.
    expect(Object.keys(snap?.lessons ?? {})).toEqual(['u1l1'])
    expect(snap?.wordStats.ger).toEqual({ errors: 2, seen: 3, lastErrorAt: 500 })
    expect(snap?.dailyXp['2026-05-05']).toBe(22)
  })

  it('ограничивает сердца диапазоном 0..5', async () => {
    handler = () => ({ data: { ...remotePayload, hearts: 99 }, error: null })
    expect((await cloud.fetchRemoteProgress())?.hearts).toBe(5)

    handler = () => ({ data: { ...remotePayload, hearts: -3 }, error: null })
    expect((await cloud.fetchRemoteProgress())?.hearts).toBe(0)
  })

  it('подставляет значения по умолчанию при пустом ответе', async () => {
    handler = () => ({ data: {}, error: null })
    const snap = await cloud.fetchRemoteProgress()
    expect(snap?.xp).toBe(0)
    expect(snap?.gems).toBe(emptySnapshot().gems)
    expect(snap?.lessons).toEqual({})
  })

  it('возвращает null при ошибке', async () => {
    handler = () => ({ data: null, error: { message: 'offline' } })
    expect(await cloud.fetchRemoteProgress()).toBeNull()
  })

  it('сериализует уроки как массив и отправляет снимок', async () => {
    handler = () => ({ data: remotePayload, error: null })
    const snapshot = {
      ...emptySnapshot(),
      xp: 42,
      lessons: { u1l1: { lessonId: 'u1l1', score: 80, accuracy: 75, xp: 18, completedAt: 5 } },
    }
    await cloud.pushProgress(snapshot)

    const args = calls[0].args.payload as Record<string, unknown>
    expect(Array.isArray(args.lessons)).toBe(true)
    expect((args.lessons as unknown[])[0]).toMatchObject({ lessonId: 'u1l1', score: 80 })
    // completedAt и xp на сервере не нужны — награду считает он сам.
    expect((args.lessons as Record<string, unknown>[])[0]).not.toHaveProperty('completedAt')
    expect((args.lessons as Record<string, unknown>[])[0]).not.toHaveProperty('xp')
  })

  /**
   * Ключевая проверка безопасности: клиент не должен отправлять XP, гемы,
   * серию и dailyXp. Раньше они уходили в payload, и сервер их принимал —
   * достаточно было подменить значение, чтобы накрутить себе прогресс.
   */
  it('не отправляет XP, гемы, серию и dailyXp', async () => {
    handler = () => ({ data: remotePayload, error: null })
    const snapshot = {
      ...emptySnapshot(),
      xp: 50000000,
      gems: 999999,
      streak: 9999,
      lastActiveDay: '2026-01-01',
      dailyXp: { '2026-01-01': 50000000 },
    }
    await cloud.pushProgress(snapshot)

    const payload = calls[0].args.payload as Record<string, unknown>
    expect(payload).not.toHaveProperty('xp')
    expect(payload).not.toHaveProperty('gems')
    expect(payload).not.toHaveProperty('streak')
    expect(payload).not.toHaveProperty('lastActiveDay')
    expect(payload).not.toHaveProperty('dailyXp')
    // А сердца и статистика слов — отправляются: их ведёт клиент.
    expect(payload).toHaveProperty('hearts')
    expect(payload).toHaveProperty('wordStats')
  })

  it('не падает на мусорных числах', async () => {
    handler = () => ({
      data: { xp: 'abc', gems: null, hearts: 'x', streak: {}, lessons: 'нет', wordStats: 5 },
      error: null,
    })
    const snap = await cloud.fetchRemoteProgress()
    expect(snap?.xp).toBe(0)
    expect(snap?.streak).toBe(0)
    expect(snap?.lessons).toEqual({})
    expect(snap?.wordStats).toEqual({})
  })
})

describe('cloud: сброс', () => {
  it('вызывает fn_reset_progress', async () => {
    handler = () => ({ data: null, error: null })
    expect(await cloud.resetRemoteProgress()).toBe(true)
    expect(calls[0].fn).toBe('fn_reset_progress')
  })

  it('сообщает об ошибке сброса', async () => {
    handler = () => ({ data: null, error: { message: 'нет прав' } })
    expect(await cloud.resetRemoteProgress()).toBe(false)
  })
})

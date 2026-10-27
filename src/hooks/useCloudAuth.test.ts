import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptySnapshot } from '../lib/progress'

/**
 * Фейковый Supabase: подменяем `.rpc`, чтобы проверить поведение
 * синхронизации — особенно сценарий «сброс сделан в офлайне».
 */
interface Call {
  fn: string
  args: Record<string, unknown>
}

const calls: Call[] = []
let online = true
let remoteState: Record<string, unknown> = {}

vi.mock('../lib/supabase', () => ({
  isCloudEnabled: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null } }),
      signOut: () => Promise.resolve(),
    },
    rpc: (fn: string, args: Record<string, unknown> = {}) => {
      calls.push({ fn, args })
      if (!online) return Promise.resolve({ data: null, error: { message: 'offline' } })
      if (fn === 'fn_fetch_progress') return Promise.resolve({ data: remoteState, error: null })
      if (fn === 'fn_push_progress') return Promise.resolve({ data: remoteState, error: null })
      if (fn === 'fn_reset_progress') {
        remoteState = {}
        return Promise.resolve({ data: null, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    },
  },
}))

// Импортируем после мока.
const { flushProgress, resetProgressEverywhere } = await import('./useCloudAuth')
const { useProgress, progressSnapshot } = await import('../store/progressStore')

beforeEach(() => {
  calls.length = 0
  online = true
  remoteState = {}
  useProgress.getState().reset()
  useProgress.getState().markResetSynced()
})

describe('flushProgress', () => {
  it('отправляет снимок, когда есть изменения', async () => {
    useProgress.getState().awardLesson({ lessonId: 'u1l1', score: 100, accuracy: 100, xp: 15 })
    const ok = await flushProgress()
    expect(ok).toBe(true)
    expect(calls.some((c) => c.fn === 'fn_push_progress')).toBe(true)
  })

  it('не отправляет повторно, если ничего не изменилось', async () => {
    useProgress.getState().awardLesson({ lessonId: 'u1l1', score: 100, accuracy: 100, xp: 15 })
    await flushProgress()
    calls.length = 0
    // Сброс фейкового ответа сервера не меняет локальное состояние.
    const again = await flushProgress()
    expect(again).toBe(true)
    expect(calls.filter((c) => c.fn === 'fn_push_progress')).toHaveLength(0)
  })

  it('сообщает о неудаче, когда сервер недоступен', async () => {
    online = false
    useProgress.getState().awardLesson({ lessonId: 'u1l1', score: 100, accuracy: 100, xp: 15 })
    expect(await flushProgress()).toBe(false)
  })

  it('после сброса обнуляет облако, а не заливает пустой снимок поверх старых XP', async () => {
    // В облаке остался старый прогресс.
    remoteState = { xp: 500, gems: 90, hearts: 5, streak: 8, lessons: [], dailyXp: {}, wordStats: {} }

    useProgress.getState().reset() // resetPending = true
    const ok = await flushProgress()

    expect(ok).toBe(true)
    const reset = calls.find((c) => c.fn === 'fn_reset_progress')
    expect(reset).toBeDefined()
    // Пустой снимок поверх старых данным не отправлялся.
    expect(calls.some((c) => c.fn === 'fn_push_progress')).toBe(false)
    expect(useProgress.getState().resetPending).toBe(false)
  })

  it('повторный flush после сброса уже не трогает облако', async () => {
    remoteState = { xp: 500 }
    useProgress.getState().reset()
    await flushProgress()
    calls.length = 0
    await flushProgress()
    expect(calls.filter((c) => c.fn === 'fn_reset_progress')).toHaveLength(0)
  })
})

describe('resetProgressEverywhere', () => {
  it('чистит локально и в облаке', async () => {
    useProgress.getState().awardLesson({ lessonId: 'u1l1', score: 100, accuracy: 100, xp: 40 })
    useProgress.getState().recordWord('ger', false)
    remoteState = { xp: 40 }

    const ok = await resetProgressEverywhere()

    expect(ok).toBe(true)
    const s = useProgress.getState()
    expect(s.xp).toBe(0)
    expect(s.streak).toBe(0)
    expect(Object.keys(s.lessons)).toHaveLength(0)
    expect(Object.keys(s.wordStats)).toHaveLength(0)
    expect(calls.some((c) => c.fn === 'fn_reset_progress')).toBe(true)
    expect(s.resetPending).toBe(false)
  })

  it('в офлайне оставляет флаг, чтобы облако обнулилось позже', async () => {
    online = false
    remoteState = { xp: 777 }

    const ok = await resetProgressEverywhere()

    expect(ok).toBe(false)
    expect(useProgress.getState().xp).toBe(0)
    expect(useProgress.getState().resetPending).toBe(true)

    // Сеть вернулась — при следующей синхронизации облако обнуляется.
    online = true
    calls.length = 0
    const synced = await flushProgress()
    expect(synced).toBe(true)
    expect(calls.some((c) => c.fn === 'fn_reset_progress')).toBe(true)
    expect(useProgress.getState().resetPending).toBe(false)
  })

  it('после офлайн-сброса облако не возвращает старые XP', async () => {
    online = false
    remoteState = { xp: 777, gems: 50, streak: 20 }
    await resetProgressEverywhere()

    online = true
    await flushProgress()

    const s = useProgress.getState()
    // Главное: старый прогресс не «воскрес».
    expect(s.xp).toBe(0)
    expect(s.gems).toBe(20)
    expect(s.streak).toBe(0)
  })
})

describe('снимок прогресса', () => {
  it('включает только синхронизируемые поля', () => {
    const snapshot = progressSnapshot(useProgress.getState())
    expect(snapshot).toEqual({
      xp: expect.any(Number),
      gems: expect.any(Number),
      hearts: expect.any(Number),
      heartsUpdatedAt: expect.any(Number),
      streak: expect.any(Number),
      lastActiveDay: null,
      lessons: {},
      dailyXp: {},
      wordStats: {},
    })
    expect(Object.keys(snapshot)).toEqual(Object.keys(emptySnapshot()))
  })
})

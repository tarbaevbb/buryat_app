import { beforeEach, describe, expect, it } from 'vitest'
import {
  GEMS_PER_REFILL,
  HEART_REFILL_MS,
  MAX_HEARTS,
  levelFromXp,
  useProgress,
  weekXp,
} from './progressStore'
import { dayKey } from '../lib/dates'

function reset() {
  useProgress.getState().reset()
}

describe('progressStore', () => {
  beforeEach(reset)

  it('начисляет XP, гемы и серию за урок', () => {
    useProgress.getState().awardLesson({ lessonId: 'u1l1', score: 100, accuracy: 100, xp: 18 })
    const s = useProgress.getState()
    expect(s.xp).toBe(18)
    expect(s.streak).toBe(1)
    expect(s.gems).toBeGreaterThan(20) // стартовые 20 + награда
    expect(s.lessons['u1l1'].score).toBe(100)
  })

  it('хранит лучший результат урока, а XP суммирует', () => {
    const { awardLesson } = useProgress.getState()
    awardLesson({ lessonId: 'u1l1', score: 50, accuracy: 40, xp: 10 })
    awardLesson({ lessonId: 'u1l1', score: 80, accuracy: 60, xp: 12 })
    const lesson = useProgress.getState().lessons['u1l1']
    expect(lesson.score).toBe(80)
    expect(lesson.accuracy).toBe(60)
    expect(lesson.xp).toBe(22)
  })

  it('сбрасывает серию при пропуске дня', () => {
    const store = useProgress.getState()
    store.awardLesson({ lessonId: 'a', score: 100, accuracy: 100, xp: 10 })
    expect(useProgress.getState().streak).toBe(1)

    // Имитируем, что последняя активность была 3 дня назад.
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    useProgress.setState({ lastActiveDay: dayKey(threeDaysAgo) })

    store.awardLesson({ lessonId: 'b', score: 100, accuracy: 100, xp: 10 })
    expect(useProgress.getState().streak).toBe(1)
  })

  it('продолжает серию, если заниматься каждый день', () => {
    const store = useProgress.getState()
    store.awardLesson({ lessonId: 'a', score: 100, accuracy: 100, xp: 10 })
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    useProgress.setState({ lastActiveDay: dayKey(yesterday) })
    store.awardLesson({ lessonId: 'b', score: 100, accuracy: 100, xp: 10 })
    expect(useProgress.getState().streak).toBe(2)
  })

  it('не начисляет серию дважды за один день', () => {
    const store = useProgress.getState()
    store.awardLesson({ lessonId: 'a', score: 100, accuracy: 100, xp: 10 })
    store.awardLesson({ lessonId: 'b', score: 100, accuracy: 100, xp: 10 })
    expect(useProgress.getState().streak).toBe(1)
  })

  it('запускает таймер восстановления только при потере из полного запаса', () => {
    const store = useProgress.getState()
    expect(store.heartsNow()).toBe(MAX_HEARTS)

    const before = useProgress.getState().heartsUpdatedAt
    store.loseHeart()
    const after = useProgress.getState().heartsUpdatedAt
    expect(useProgress.getState().hearts).toBe(MAX_HEARTS - 1)
    expect(after).toBeGreaterThanOrEqual(before)

    // Пока таймер идёт — не сбрасываем его повторной потерей.
    store.loseHeart()
    expect(useProgress.getState().heartsUpdatedAt).toBe(after)
  })

  it('восстанавливает сердца по прошествии времени', () => {
    useProgress.getState().loseHeart()
    useProgress.getState().loseHeart()
    expect(useProgress.getState().hearts).toBe(MAX_HEARTS - 2)

    // Сдвигаем таймер на 2 интервала назад.
    useProgress.setState({ heartsUpdatedAt: Date.now() - HEART_REFILL_MS * 2 - 1000 })
    expect(useProgress.getState().heartsNow()).toBe(MAX_HEARTS)
  })

  it('не восстанавливает больше максимума', () => {
    useProgress.setState({ heartsUpdatedAt: Date.now() - HEART_REFILL_MS * 999 })
    expect(useProgress.getState().heartsNow()).toBe(MAX_HEARTS)
  })

  it('обменивает гемы на полный запас сердец', () => {
    const store = useProgress.getState()
    store.loseHeart()
    store.loseHeart()
    useProgress.setState({ gems: GEMS_PER_REFILL })

    expect(store.refillHeartsWithGems()).toBe(true)
    expect(useProgress.getState().hearts).toBe(MAX_HEARTS)
    expect(useProgress.getState().gems).toBe(0)
  })

  it('отказывает в восстановлении без гемов', () => {
    useProgress.getState().loseHeart()
    useProgress.setState({ gems: GEMS_PER_REFILL - 1 })
    expect(useProgress.getState().refillHeartsWithGems()).toBe(false)
    expect(useProgress.getState().gems).toBe(GEMS_PER_REFILL - 1)
  })

  it('отказывает в восстановлении при полном запасе', () => {
    useProgress.setState({ gems: 100 })
    expect(useProgress.getState().refillHeartsWithGems()).toBe(false)
    expect(useProgress.getState().gems).toBe(100)
  })

  it('накапливает статистику по словам', () => {
    const store = useProgress.getState()
    store.recordWord('ger', false)
    store.recordWord('ger', true)
    store.recordWord('ger', false)

    const stat = useProgress.getState().wordStats.ger
    expect(stat.errors).toBe(2)
    expect(stat.seen).toBe(3)
    expect(useProgress.getState().totalMistakes).toBe(0)
    expect(useProgress.getState().totalExercises).toBe(0)
  })

  it('учитывает задания отдельно от слов', () => {
    const store = useProgress.getState()
    store.recordAttempt(false) // решено с первой попытки
    store.recordAttempt(true) // были ошибки
    store.recordAttempt(false)

    const s = useProgress.getState()
    expect(s.totalExercises).toBe(3)
    expect(s.totalMistakes).toBe(1)
    // Статистика слов не затрагивается.
    expect(Object.keys(s.wordStats)).toHaveLength(0)
  })

  it('считает недельный XP и уровень', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, need: 100 })
    expect(levelFromXp(250)).toEqual({ level: 3, into: 50, need: 100 })

    const today = dayKey()
    useProgress.setState({ dailyXp: { [today]: 42 } })
    expect(weekXp(useProgress.getState().dailyXp)).toBeGreaterThanOrEqual(42)
  })

  it('начисляет XP за повторение и обновляет серию', () => {
    useProgress.getState().awardReview(10, 10)
    const s = useProgress.getState()
    // Идеальный подход: 2 + 10 + 3 = 15, но не больше 20.
    expect(s.xp).toBe(15)
    expect(s.streak).toBe(1)
    expect(s.dailyXp[dayKey()]).toBe(15)
  })

  it('снижает награду за повторение при ошибках', () => {
    useProgress.getState().awardReview(5, 10)
    expect(useProgress.getState().xp).toBe(7) // 2 + 5, без бонуса
  })

  it('ограничивает награду за повторение сверху', () => {
    useProgress.getState().awardReview(999, 10)
    expect(useProgress.getState().xp).toBeLessThanOrEqual(20)
  })

  it('не двигает серию дважды в один день (урок + повторение)', () => {
    useProgress.getState().awardLesson({ lessonId: 'a', score: 100, accuracy: 100, xp: 10 })
    useProgress.getState().awardReview(10, 10)
    expect(useProgress.getState().streak).toBe(1)
  })

  it('сбрасывает прогресс вместе с локальной статистикой', () => {
    const store = useProgress.getState()
    store.awardLesson({ lessonId: 'a', score: 100, accuracy: 100, xp: 30 })
    store.recordWord('ger', false)
    store.recordAttempt(true)
    store.reset()

    const s = useProgress.getState()
    expect(s.xp).toBe(0)
    expect(s.streak).toBe(0)
    expect(s.hearts).toBe(MAX_HEARTS)
    expect(s.totalExercises).toBe(0)
    expect(s.totalMistakes).toBe(0)
  })

  it('применяет снимок из облака', () => {
    useProgress.getState().applySnapshot({
      xp: 500,
      gems: 80,
      hearts: 3,
      heartsUpdatedAt: Date.now(),
      streak: 7,
      lastActiveDay: '2026-01-01',
      lessons: { u2l1: { lessonId: 'u2l1', score: 90, accuracy: 90, xp: 20, completedAt: 1 } },
      dailyXp: { '2026-01-01': 40 },
      wordStats: { ger: { errors: 1, seen: 2, lastErrorAt: 5 } },
    })
    const s = useProgress.getState()
    expect(s.xp).toBe(500)
    expect(s.lessons.u2l1.score).toBe(90)
    expect(s.streak).toBe(7)
  })

  it('запоминает подпись синхронизации', () => {
    expect(useProgress.getState().syncedSignature).toBeNull()
    useProgress.getState().markSynced('sig-1')
    expect(useProgress.getState().syncedSignature).toBe('sig-1')
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { useProgress } from './progressStore'
import { generateExercises, exerciseVocabIds } from '../data/exercises'
import { sessionSummary, useSession } from './sessionStore'
import type { Exercise } from '../data/types'

/**
 * Повторяет логику LessonScreen: каждая ошибка бьёт по сердцам и статистике слов,
 * а точность считается по заданиям (одна попытка на задание).
 * Проверяем, что счётчики не «разъезжаются».
 */
function playLesson(
  lessonId: string,
  decideWrong: (ex: Exercise, i: number) => boolean,
): { summary: ReturnType<typeof sessionSummary>; wordsTouched: number } {
  const exercises = generateExercises(lessonId)
  const progress = useProgress.getState()
  useSession.getState().start(lessonId, exercises)

  let wordsTouched = 0

  exercises.forEach((ex, i) => {
    let hadWrong = false
    const ids = exerciseVocabIds(ex)
    wordsTouched += ids.length

    if (decideWrong(ex, i)) {
      hadWrong = true
      useSession.getState().submitWrong()
      progress.loseHeart()
      ids.forEach((id) => progress.recordWord(id, false))
    }
    ids.forEach((id) => progress.recordWord(id, true))
    progress.recordAttempt(hadWrong)
    useSession.getState().submitCorrect([])
    useSession.getState().next()
  })

  return { summary: sessionSummary(useSession.getState()), wordsTouched }
}

describe('точность урока', () => {
  beforeEach(() => {
    useProgress.getState().reset()
    useSession.getState().clear()
  })

  it('идеальный урок даёт 100% точности', () => {
    playLesson('u1l1', () => false)
    const s = useProgress.getState()
    expect(s.totalMistakes).toBe(0)
    expect(s.totalExercises).toBeGreaterThan(0)
    expect(s.hearts).toBe(5)
  })

  it('одна ошибка портит ровно одно задание', () => {
    const { summary } = playLesson('u2l1', (_ex, i) => i === 0)
    const s = useProgress.getState()
    expect(s.totalMistakes).toBe(1)
    expect(s.totalExercises).toBe(summary.total)
    expect(s.hearts).toBe(4)
    // Точность = (задания - ошибки) / задания.
    expect(s.totalExercises - s.totalMistakes).toBe(summary.total - 1)
  })

  it('сердца не уходят в минус при множестве ошибок', () => {
    playLesson('u3l1', () => true)
    expect(useProgress.getState().hearts).toBe(0)
  })

  it('слова задания попадают в статистику', () => {
    const { wordsTouched } = playLesson('u4l1', () => false)
    const known = Object.keys(useProgress.getState().wordStats).length
    expect(wordsTouched).toBeGreaterThan(0)
    expect(known).toBeGreaterThan(0)
  })
})

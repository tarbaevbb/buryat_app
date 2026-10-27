import { beforeEach, describe, expect, it } from 'vitest'
import { useProgress } from './progressStore'
import { course } from '../data/course'
import { generateExercises } from '../data/exercises'
import { sessionSummary, useSession } from './sessionStore'

/**
 * Интеграционный тест: проходим уроки «как игрок» и проверяем,
 * что карта разблокируется и прогресс копится корректно.
 */
describe('прохождение курса', () => {
  beforeEach(() => {
    useProgress.getState().reset()
    useSession.getState().clear()
  })

  /** Проходит урок, отвечая верно на все задания. */
  function completeLesson(lessonId: string) {
    const exercises = generateExercises(lessonId)
    useSession.getState().start(lessonId, exercises)
    for (let i = 0; i < exercises.length; i += 1) {
      // Для match-заданий правильный ответ приходит «пачкой» — эмулируем.
      useSession.getState().submitCorrect([])
      useSession.getState().next()
    }
    const summary = sessionSummary(useSession.getState())
    useProgress.getState().awardLesson({
      lessonId,
      score: summary.score,
      accuracy: summary.accuracy,
      xp: summary.xp,
    })
    return summary
  }

  it('первый урок даёт идеальное прохождение и золотую звезду', () => {
    const summary = completeLesson('u1l1')
    expect(summary.score).toBe(100)
    expect(summary.perfect).toBe(true)

    const result = useProgress.getState().lessons['u1l1']
    expect(result.score).toBe(100)
    expect(result.score).toBeGreaterThanOrEqual(95)
  })

  it('проходит весь курс и открывает все уроки', () => {
    for (const lesson of course.lessons) {
      completeLesson(lesson.id)
    }
    const state = useProgress.getState()
    expect(Object.keys(state.lessons)).toHaveLength(course.lessons.length)
    expect(state.xp).toBeGreaterThan(200)
    expect(state.streak).toBe(1) // всё за один день
  })

  it('все уроки курса проходимы и дают XP', () => {
    for (const lesson of course.lessons) {
      const summary = completeLesson(lesson.id)
      expect(summary.xp, `урок ${lesson.id}`).toBeGreaterThan(0)
      expect(summary.total).toBeGreaterThan(3)
    }
  })

  it('повторное прохождение не уменьшает лучший результат', () => {
    completeLesson('u2l1')
    const best = useProgress.getState().lessons['u2l1'].score

    // Второй заход с ошибками.
    const exercises = generateExercises('u2l1')
    useSession.getState().start('u2l1', exercises)
    useSession.getState().submitWrong()
    useSession.getState().submitCorrect([])
    for (let i = 1; i < exercises.length; i += 1) {
      useSession.getState().next()
      useSession.getState().submitCorrect([])
    }
    const summary = sessionSummary(useSession.getState())
    useProgress.getState().awardLesson({
      lessonId: 'u2l1',
      score: summary.score,
      accuracy: summary.accuracy,
      xp: summary.xp,
    })

    expect(useProgress.getState().lessons['u2l1'].score).toBe(best)
  })

  it('ошибки в уроке уменьшают точность и XP', () => {
    const exercises = generateExercises('u3l1')
    useSession.getState().start('u3l1', exercises)
    for (let i = 0; i < exercises.length; i += 1) {
      if (i === 0) useSession.getState().submitWrong()
      useSession.getState().submitCorrect([])
      useSession.getState().next()
    }
    const summary = sessionSummary(useSession.getState())
    expect(summary.perfect).toBe(false)
    expect(summary.mistakes).toBe(1)
    expect(summary.accuracy).toBeLessThan(100)
    expect(summary.score).toBeLessThan(100)
  })

  it('каждое задание любого урока имеет правильный ответ', () => {
    for (const lesson of course.lessons) {
      for (const ex of generateExercises(lesson.id, 12)) {
        if (ex.kind === 'select') {
          expect(ex.options).toContain(ex.answer)
        } else if (ex.kind === 'build') {
          const words = ex.answer.split(/\s+/)
          for (const w of words) expect(ex.tokens).toContain(w)
        } else {
          // В match каждая пара должна быть непустой и уникальной.
          expect(new Set(ex.pairs.map((p) => p.bxr)).size).toBe(ex.pairs.length)
          expect(ex.pairs.every((p) => p.bxr && p.ru)).toBe(true)
        }
      }
    }
  })
})

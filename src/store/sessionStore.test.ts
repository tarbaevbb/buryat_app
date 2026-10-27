import { beforeEach, describe, expect, it } from 'vitest'
import { sessionSummary, useSession } from './sessionStore'
import { generateExercises } from '../data/exercises'
import type { Exercise } from '../data/types'

const stub: Exercise[] = [
  { kind: 'select', id: 's1', mode: 'meaning', promptLang: 'bxr', prompt: 'гэр', answer: 'дом', options: ['дом', 'вода'], vocabId: 'ger' },
  { kind: 'select', id: 's2', mode: 'meaning', promptLang: 'bxr', prompt: 'сай', answer: 'чай', options: ['чай', 'дом'], vocabId: 'sai' },
]

function reset() {
  useSession.getState().clear()
}

describe('sessionStore', () => {
  beforeEach(reset)

  it('стартует на первом задании', () => {
    useSession.getState().start('u1l1', stub)
    const s = useSession.getState()
    expect(s.index).toBe(0)
    expect(s.phase).toBe('answering')
    expect(s.lessonId).toBe('u1l1')
  })

  it('переводит в режим проверки после верного ответа', () => {
    useSession.getState().start('u1l1', stub)
    useSession.getState().submitCorrect(['ger'])
    expect(useSession.getState().phase).toBe('checked')
    expect(useSession.getState().results).toHaveLength(1)
  })

  it('игнорирует повторный submitCorrect', () => {
    useSession.getState().start('u1l1', stub)
    useSession.getState().submitCorrect(['ger'])
    useSession.getState().submitCorrect(['ger'])
    expect(useSession.getState().results).toHaveLength(1)
    expect(useSession.getState().firstTry).toBe(1)
  })

  it('считает ошибки, не закрывая задание', () => {
    useSession.getState().start('u1l1', stub)
    useSession.getState().submitWrong()
    useSession.getState().submitWrong()
    useSession.getState().submitCorrect(['ger'])
    const s = useSession.getState()
    expect(s.mistakes).toBe(2)
    expect(s.phase).toBe('checked')
    // Задание закрыто не с первой попытки.
    expect(s.firstTry).toBe(0)
  })

  it('переходит к следующему заданию', () => {
    useSession.getState().start('u1l1', stub)
    useSession.getState().submitCorrect(['ger'])
    useSession.getState().next()
    expect(useSession.getState().index).toBe(1)
    expect(useSession.getState().phase).toBe('answering')
  })

  it('завершает урок после последнего задания', () => {
    useSession.getState().start('u1l1', stub)
    useSession.getState().submitCorrect(['ger'])
    useSession.getState().next()
    useSession.getState().submitCorrect(['sai'])
    useSession.getState().next()
    expect(useSession.getState().phase).toBe('done')
  })

  it('пустой урок сразу считается завершённым', () => {
    useSession.getState().start('empty', [])
    expect(useSession.getState().phase).toBe('done')
  })

  it('считает итог идеального прохождения', () => {
    useSession.getState().start('u1l1', stub)
    useSession.getState().submitCorrect(['ger'])
    useSession.getState().next()
    useSession.getState().submitCorrect(['sai'])
    const summary = sessionSummary(useSession.getState())

    expect(summary.score).toBe(100)
    expect(summary.accuracy).toBe(100)
    expect(summary.perfect).toBe(true)
    expect(summary.mistakes).toBe(0)
    expect(summary.xp).toBeGreaterThan(10)
  })

  it('снижает награду при ошибках', () => {
    useSession.getState().start('u1l1', stub)
    useSession.getState().submitWrong()
    useSession.getState().submitCorrect(['ger'])
    useSession.getState().next()
    useSession.getState().submitCorrect(['sai'])
    const summary = sessionSummary(useSession.getState())

    expect(summary.perfect).toBe(false)
    expect(summary.mistakes).toBe(1)
    expect(summary.accuracy).toBeLessThan(100)
  })

  it('работает с реальным уроком курса', () => {
    const exercises = generateExercises('u2l1')
    useSession.getState().start('u2l1', exercises)
    expect(useSession.getState().exercises.length).toBeGreaterThan(3)

    for (const _ex of exercises) {
      useSession.getState().submitCorrect([])
      useSession.getState().next()
    }
    expect(useSession.getState().phase).toBe('done')
    expect(useSession.getState().results).toHaveLength(exercises.length)
  })
})

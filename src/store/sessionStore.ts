import { create } from 'zustand'
import type { Exercise } from '../data/types'

export type Phase = 'answering' | 'checked' | 'done'

export interface ExerciseResult {
  exerciseId: string
  correct: boolean
  wordIds: string[]
}

export interface SessionState {
  lessonId: string
  exercises: Exercise[]
  index: number
  phase: Phase
  /** Всего ошибок в уроке (каждая неверная попытка). */
  mistakes: number
  /** Задания, закрытые с первой попытки. */
  firstTry: number
  results: ExerciseResult[]

  start: (lessonId: string, exercises: Exercise[]) => void
  /** Верная попытка: фиксируем результат и переводим в фазу проверки. */
  submitCorrect: (wordIds: string[]) => void
  /** Неверная попытка: только увеличиваем счётчики, задание остаётся открытым. */
  submitWrong: () => void
  next: () => void
  clear: () => void
}

export const useSession = create<SessionState>((set, get) => ({
  lessonId: '',
  exercises: [],
  index: 0,
  phase: 'answering',
  mistakes: 0,
  firstTry: 0,
  results: [],

  start: (lessonId, exercises) =>
    set({
      lessonId,
      exercises,
      index: 0,
      phase: exercises.length ? 'answering' : 'done',
      mistakes: 0,
      firstTry: 0,
      results: [],
    }),

  submitCorrect: (wordIds) => {
    const state = get()
    if (state.phase !== 'answering') return
    const current = state.exercises[state.index]
    if (!current) return
    set({
      phase: 'checked',
      firstTry: state.firstTry + (state.mistakes === 0 ? 1 : 0),
      results: [
        ...state.results,
        { exerciseId: current.id, correct: true, wordIds: wordIdsFor(current, wordIds) },
      ],
    })
  },

  submitWrong: () => set((state) => ({ mistakes: state.mistakes + 1 })),

  next: () => {
    const state = get()
    if (state.index >= state.exercises.length - 1) {
      // Последнее задание закрыто — фиксируем оставшиеся «незакрытые» как ошибки
      // (на практике phase === 'checked', поэтому results уже полон).
      set({ phase: 'done' })
      return
    }
    set({ index: state.index + 1, phase: 'answering' })
  },

  clear: () =>
    set({
      lessonId: '',
      exercises: [],
      index: 0,
      phase: 'answering',
      mistakes: 0,
      firstTry: 0,
      results: [],
    }),
}))

function wordIdsFor(exercise: Exercise, fallback: string[]): string[] {
  if (exercise.kind === 'match') return exercise.pairs.map((p) => p.vocabId)
  if (exercise.kind === 'build') return exercise.sentenceId ? [exercise.sentenceId] : fallback
  return [exercise.vocabId]
}

/** Текущее задание. */
export function currentExercise(state: SessionState): Exercise | undefined {
  return state.exercises[state.index]
}

/** Итоговая статистика урока. */
export function sessionSummary(state: SessionState) {
  const total = state.exercises.length || 1
  const score = Math.round((state.firstTry / total) * 100)
  const accuracy = Math.round(
    ((state.results.length) / Math.max(1, state.results.length + state.mistakes)) * 100,
  )
  const perfect = state.mistakes === 0
  const base = 10
  const bonus = perfect ? 5 : score >= 80 ? 3 : 0
  const xp = base + bonus + Math.floor(state.firstTry / 2)
  return { total, score, accuracy, xp, perfect, mistakes: state.mistakes }
}

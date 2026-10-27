import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dayKey, daysBetween } from '../lib/dates'
import {
  MAX_HEARTS,
  GEMS_PER_REFILL,
  START_GEMS,
  computeHearts,
  gemsForXp,
  nextStreak,
  type LessonResult,
  type ProgressSnapshot,
} from '../lib/progress'

export { MAX_HEARTS, HEART_REFILL_MS, GEMS_PER_REFILL, START_GEMS } from '../lib/progress'
export type { LessonResult } from '../lib/progress'

export interface ProgressState extends ProgressSnapshot {
  /** Заголовок профиля — из Telegram, хранится локально для offline-режима. */
  displayName: string
  /** Подпись последнего снимка, отправленного в облако (для авто-синка). */
  syncedSignature: string | null
  /**
   * Сброс был выполнен, но облако ещё не подтвердило его (не было сети).
   * Пока флаг стоит, синхронизация сначала обнуляет прогресс на сервере —
   * иначе облако вернуло бы старые XP.
   */
  resetPending: boolean
  /**
   * Общая точность: считается по заданиям, а не по словам.
   * Локальная величина — в облако не уходит.
   */
  totalMistakes: number
  totalExercises: number

  heartsNow: () => number
  regenHearts: () => void
  awardLesson: (result: Omit<LessonResult, 'completedAt'>) => void
  awardReview: (correct: number, total: number) => void
  loseHeart: () => void
  refillHeartsWithGems: () => boolean
  recordWord: (wordId: string, correct: boolean) => void
  /**
   * Учитывает завершённое задание для общей точности.
   * `hadError: true` — в задании были ошибки, `false` — решено с первой попытки.
   */
  recordAttempt: (hadError: boolean) => void
  setDisplayName: (name: string) => void
  /** Заменяет прогресс результатом слияния с облаком. */
  applySnapshot: (snapshot: ProgressSnapshot) => void
  markSynced: (signature: string) => void
  /** Сброс: чистит прогресс и помечает, что облако нужно обнулить. */
  reset: () => void
  markResetSynced: () => void
}

/** Поля состояния, нужные для начисления XP (есть и в сторе, и в хранилище). */
interface XpCarrier extends ProgressSnapshot {
  totalMistakes: number
  totalExercises: number
}

export interface PersistedState extends XpCarrier {
  displayName: string
  syncedSignature: string | null
  resetPending: boolean
}

function emptyPersisted(): PersistedState {
  return {
    xp: 0,
    gems: START_GEMS,
    hearts: MAX_HEARTS,
    heartsUpdatedAt: Date.now(),
    streak: 0,
    lastActiveDay: null,
    lessons: {},
    dailyXp: {},
    wordStats: {},
    totalMistakes: 0,
    totalExercises: 0,
    displayName: '',
    syncedSignature: null,
    resetPending: false,
  }
}

/** Выбирает из состояния только синхронизируемые поля. */
export function progressSnapshot(state: XpCarrier | PersistedState | ProgressSnapshot): ProgressSnapshot {
  return {
    xp: state.xp,
    gems: state.gems,
    hearts: state.hearts,
    heartsUpdatedAt: state.heartsUpdatedAt,
    streak: state.streak,
    lastActiveDay: state.lastActiveDay,
    lessons: state.lessons,
    dailyXp: state.dailyXp,
    wordStats: state.wordStats,
  }
}

/** Общая точка начисления XP: обновляет всё, что зависит от опыта. */
function grantXp(state: XpCarrier, xp: number, streak: number, today: string) {
  return {
    xp: state.xp + xp,
    gems: state.gems + gemsForXp(xp),
    dailyXp: { ...state.dailyXp, [today]: (state.dailyXp[today] ?? 0) + xp },
    streak,
    lastActiveDay: today,
  }
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...emptyPersisted(),

      heartsNow: () => {
        const { hearts, heartsUpdatedAt } = get()
        return computeHearts(hearts, heartsUpdatedAt, Date.now())
      },

      regenHearts: () => {
        const { hearts, heartsUpdatedAt } = get()
        const now = Date.now()
        const restored = computeHearts(hearts, heartsUpdatedAt, now)
        if (restored !== hearts) {
          set({ hearts: restored, heartsUpdatedAt: restored >= MAX_HEARTS ? now : heartsUpdatedAt })
        }
      },

      awardLesson: (result) => {
        const today = dayKey()
        set((state) => {
          const prev = state.lessons[result.lessonId]
          const bestScore = Math.max(prev?.score ?? 0, result.score)
          return {
            lessons: {
              ...state.lessons,
              [result.lessonId]: {
                lessonId: result.lessonId,
                score: bestScore,
                accuracy: Math.max(prev?.accuracy ?? 0, result.accuracy),
                xp: (prev?.xp ?? 0) + result.xp,
                completedAt: Date.now(),
              },
            },
            ...grantXp(
              state,
              result.xp,
              nextStreak(state.streak, state.lastActiveDay, today, daysBetween),
              today,
            ),
          }
        })
      },

      awardReview: (correct, total) => {
        const today = dayKey()
        set((state) => {
          const xp = reviewXpLocal(correct, total)
          return grantXp(
            state,
            xp,
            nextStreak(state.streak, state.lastActiveDay, today, daysBetween),
            today,
          )
        })
      },

      loseHeart: () => {
        const now = Date.now()
        set((state) => {
          const current = computeHearts(state.hearts, state.heartsUpdatedAt, now)
          return {
            hearts: Math.max(0, current - 1),
            // Если сердца были полными — с этого момента идёт восстановление.
            heartsUpdatedAt: current >= MAX_HEARTS ? now : state.heartsUpdatedAt,
          }
        })
      },

      refillHeartsWithGems: () => {
        const state = get()
        if (state.gems < GEMS_PER_REFILL) return false
        if (state.heartsNow() >= MAX_HEARTS) return false
        set({ gems: state.gems - GEMS_PER_REFILL, hearts: MAX_HEARTS, heartsUpdatedAt: Date.now() })
        return true
      },

      recordWord: (wordId, correct) => {
        set((state) => {
          const prev = state.wordStats[wordId] ?? { errors: 0, seen: 0, lastErrorAt: 0 }
          return {
            wordStats: {
              ...state.wordStats,
              [wordId]: {
                errors: prev.errors + (correct ? 0 : 1),
                seen: prev.seen + 1,
                lastErrorAt: correct ? prev.lastErrorAt : Date.now(),
              },
            },
          }
        })
      },

      recordAttempt: (hadError) => {
        set((state) => ({
          totalExercises: state.totalExercises + 1,
          totalMistakes: state.totalMistakes + (hadError ? 1 : 0),
        }))
      },

      setDisplayName: (name) => set({ displayName: name }),

      applySnapshot: (snapshot) => set({ ...snapshot }),

      markSynced: (signature) => set({ syncedSignature: signature }),

      reset: () => set({ ...emptyPersisted(), resetPending: true }),

      markResetSynced: () => set({ resetPending: false }),
    }),
    {
      name: 'buryat-progress-v2',
      version: 2,
      partialize: (state) => {
        const {
          heartsNow: _h,
          regenHearts: _r,
          awardLesson: _al,
          awardReview: _ar,
          loseHeart: _lh,
          refillHeartsWithGems: _rg,
          recordWord: _rw,
          recordAttempt: _ra,
          setDisplayName: _sd,
          applySnapshot: _as,
          markSynced: _ms,
          markResetSynced: _mrs,
          reset: _rs,
          ...rest
        } = state
        return rest as PersistedState
      },
      /**
       * Миграция с v1: ключ localStorage менялся с `buryat-progress-v1`,
       * поэтому старые записи переносим вручную (см. migrateLegacyProgress).
       * Заодно домигрируем v2 → v2.1: у старых записей нет `resetPending`.
       */
      migrate: (persisted, version) => {
        if (!persisted) return persisted as never
        const state = persisted as Partial<PersistedState>
        return {
          ...emptyPersisted(),
          ...state,
          syncedSignature: version < 2 ? null : (state.syncedSignature ?? null),
          resetPending: false,
        } as never
      },
    },
  ),
)

/** Локальный XP за подход в «Повторении» — формула из lib/progress. */
function reviewXpLocal(correct: number, total: number): number {
  const safeCorrect = Math.max(0, Math.min(Math.floor(correct), Math.max(0, total)))
  const perfect = total > 0 && safeCorrect >= total
  return Math.min(20, 2 + safeCorrect + (perfect ? 3 : 0))
}

/** Размер недельного и общего XP — реэкспорт удобных хелперов. */
export { levelFromXp, weekXp, reviewXp } from '../lib/progress'

export function completedLessonCount(lessons: Record<string, LessonResult>): number {
  return Object.keys(lessons).length
}

/**
 * Переносит прогресс из старого ключа `buryat-progress-v1`, если он есть,
 * а новый ещё пуст. Вызывается один раз при старте приложения.
 */
export function migrateLegacyProgress(): void {
  const LEGACY_KEY = 'buryat-progress-v1'
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return

    const current = useProgress.getState()
    // Переносим только если в новом сторе ещё нет прогресса.
    if (current.xp > 0 || Object.keys(current.lessons).length > 0) return

    const parsed = JSON.parse(raw) as { state?: Partial<PersistedState> }
    const legacy = parsed?.state
    if (!legacy) return

    useProgress.setState({
      ...emptyPersisted(),
      ...legacy,
      syncedSignature: null,
      // Сердца пересчитываем от исходной метки времени.
      hearts: Math.min(MAX_HEARTS, Math.max(0, legacy.hearts ?? MAX_HEARTS)),
    })
  } catch {
    // Битые данные не должны мешать запуску.
  }
}

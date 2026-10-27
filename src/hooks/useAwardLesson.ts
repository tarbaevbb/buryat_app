import { useCallback } from 'react'
import { awardLessonRemote, awardReviewRemote } from '../lib/cloud'
import { isCloudEnabled } from '../lib/supabase'
import { mergeProgress, stateSignature, type ProgressSnapshot } from '../lib/progress'
import { progressSnapshot, useProgress } from '../store/progressStore'
import { cloudStatus } from './useCloudAuth'
import { flushProgress } from './useCloudAuth'
import type { Summary } from '../features/lesson/LessonResultSheet'

export interface AwardInput {
  lessonId: string
  summary: Summary
}

export interface AwardResult {
  xp: number
  cloud: boolean
}

/**
 * Начисляет награду за урок.
 *
 * 1. Сразу локально — чтобы экран результата отрисовался мгновенно.
 * 2. Затем, если облако доступно, подтверждает на сервере: там XP
 *    пересчитывается из `lesson_id`, `score` и `accuracy`.
 * 3. После подтверждения отправляет полный снимок прогресса — так
 *    накопленный в офлайне прогресс не теряется.
 *
 * Если облако недоступно, результат остаётся в localStorage, а
 * `flushProgress()` догрузит его при появлении сети.
 */
export function useAwardLesson(): (input: AwardInput) => Promise<AwardResult> {
  return useCallback(async ({ lessonId, summary }) => {
    const local = useProgress.getState()
    local.awardLesson({
      lessonId,
      score: summary.score,
      accuracy: summary.accuracy,
      xp: summary.xp,
    })

    if (!isCloudEnabled || cloudStatus() === 'disabled') {
      return { xp: summary.xp, cloud: false }
    }

    const server = await awardLessonRemote(lessonId, summary.score, summary.accuracy)
    if (!server) {
      return { xp: summary.xp, cloud: false }
    }

    // Сервер — источник истины по XP, гемам и серии: подтягиваем его значения,
    // чтобы клиент не «обгонял» базу.
    useProgress.setState((state) => ({
      xp: Math.max(state.xp, server.totalXp),
      gems: Math.max(state.gems, server.gems),
      streak: Math.max(state.streak, server.streak),
    }))

    // Догружаем полный снимок (офлайн-накопленное, статистика слов и т. д.).
    await flushProgress()

    return { xp: server.xp, cloud: true }
  }, [])
}

export interface ReviewAwardInput {
  correct: number
  total: number
  /** Статистика только по словам подхода. */
  wordStats: ProgressSnapshot['wordStats']
}

/**
 * Награда за подход в «Повторении». Считается так же, как за урок:
 * локально, затем подтверждение на сервере.
 */
export function useAwardReview(): (input: ReviewAwardInput) => Promise<AwardResult> {
  return useCallback(async ({ correct, total }) => {
    const local = useProgress.getState()
    local.awardReview(correct, total)
    const localXp = localXpFor(correct, total)

    if (!isCloudEnabled || cloudStatus() === 'disabled') {
      return { xp: localXp, cloud: false }
    }

    const server = await awardReviewRemote(
      correct,
      total,
      progressSnapshot(useProgress.getState()).wordStats,
    )
    if (!server) return { xp: localXp, cloud: false }

    useProgress.setState((state) => ({
      xp: Math.max(state.xp, server.totalXp),
      gems: Math.max(state.gems, server.gems),
      streak: Math.max(state.streak, server.streak),
    }))

    await flushProgress()
    return { xp: server.xp, cloud: true }
  }, [])
}

/** Локальная формула XP за повторение — совпадает с fn_award_review. */
function localXpFor(correct: number, total: number): number {
  const safeCorrect = Math.max(0, Math.min(Math.floor(correct), Math.max(0, total)))
  const perfect = total > 0 && safeCorrect >= total
  return Math.min(20, 2 + safeCorrect + (perfect ? 3 : 0))
}

/** Хелпер для тестов: слияние снимков. */
export { mergeProgress, stateSignature }

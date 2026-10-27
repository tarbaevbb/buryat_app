import { course, getVocab } from '../data/course'
import { makeRng, shuffle } from './rng'
import type { WordStat } from './progress'
import type { VocabItem } from '../data/types'

export type { WordStat }

/**
 * Выбирает слова для «Повторения»: сначала те, где больше всего ошибок,
 * затем давно не встречавшиеся. Детерминировано при заданном `seed`,
 * чтобы список не менялся в середине подхода.
 */
export function pickReviewWords(
  stats: Record<string, WordStat>,
  limit = 10,
  seed = 1,
): VocabItem[] {
  const rng = makeRng(seed)

  const items = Object.entries(stats)
    .map(([id, stat]) => ({ item: getVocab(id), stat }))
    .filter((e): e is { item: VocabItem; stat: WordStat } => Boolean(e.item))

  // 1) Слова с ошибками — по убыванию ошибок, затем «старые» ошибки вперёд.
  const byErrors = items
    .filter((e) => e.stat.errors > 0)
    .sort((a, b) => b.stat.errors - a.stat.errors || a.stat.lastErrorAt - b.stat.lastErrorAt)

  const picked = byErrors.slice(0, limit).map((e) => e.item)

  // 2) Добираем незнакомыми словами курса, если ошибок мало.
  if (picked.length < limit) {
    const pickedIds = new Set(picked.map((p) => p.id))
    const seenIds = new Set(items.map((e) => e.item.id))
    const fresh = [...course.vocab.values()].filter(
      (v) => !pickedIds.has(v.id) && !seenIds.has(v.id) && v.pos !== 'sound' && v.pos !== 'letter',
    )
    picked.push(...shuffle(fresh, rng).slice(0, limit - picked.length))
  }

  // 3) Если и этого мало — любые слова курса.
  if (picked.length < limit) {
    const pickedIds = new Set(picked.map((p) => p.id))
    const rest = [...course.vocab.values()].filter(
      (v) => !pickedIds.has(v.id) && v.pos !== 'sound' && v.pos !== 'letter',
    )
    picked.push(...shuffle(rest, rng).slice(0, limit - picked.length))
  }

  return picked
}

/** Сколько слов пользователь вообще встречал. */
export function knownWordCount(stats: Record<string, WordStat>): number {
  return Object.values(stats).filter((s) => s.seen > 0).length
}

/** Сколько слов требуют внимания (были ошибки). */
export function weakWordCount(stats: Record<string, WordStat>): number {
  return Object.values(stats).filter((s) => s.errors > 0).length
}

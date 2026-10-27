/**
 * Чистая логика прогресса: сердца, серия дней, уровни и слияние локального
 * состояния с облачным. Вынесено из стора, чтобы это можно было тестировать
 * без React и чтобы сервер и клиент считали одинаково.
 */
import { dayKey } from './dates'

export interface WordStat {
  errors: number
  seen: number
  lastErrorAt: number
}

export interface LessonResult {
  lessonId: string
  score: number
  accuracy: number
  xp: number
  completedAt: number
}

/** Всё, что синхронизируется между устройством и облаком. */
export interface ProgressSnapshot {
  xp: number
  gems: number
  hearts: number
  heartsUpdatedAt: number
  streak: number
  lastActiveDay: string | null
  lessons: Record<string, LessonResult>
  dailyXp: Record<string, number>
  wordStats: Record<string, WordStat>
}

export const MAX_HEARTS = 5
export const HEART_REFILL_MS = 30 * 60 * 1000 // одно сердце раз в 30 минут
export const GEMS_PER_REFILL = 50
export const START_GEMS = 20

/** Восстановленные сердца с учётом прошедшего времени. */
export function computeHearts(hearts: number, updatedAt: number, now: number): number {
  return materializeHearts(hearts, updatedAt, now).hearts
}

/**
 * Приводит пару «сырое число сердец + метка старта таймера» к виду,
 * однозначному на момент `now`.
 *
 * Модель: `hearts` — сколько сердец есть на момент `heartsUpdatedAt`,
 * `heartsUpdatedAt` — когда начался отсчёт до следующего сердца.
 * По прошествии целых интервалов счёт растёт, а метка сдвигается ровно
 * на прошедшие интервалы. Благодаря этому пара не «двойного счёта»
 * и одинаково трактуется на клиенте и на сервере.
 *
 * Если сердец стало максимум — метка не важна (таймер не идёт), поэтому
 * выставляем `at = now`.
 */
export function materializeHearts(
  hearts: number,
  updatedAt: number,
  now: number,
): { hearts: number; at: number } {
  const raw = Math.max(0, Math.floor(hearts))
  if (raw >= MAX_HEARTS) return { hearts: MAX_HEARTS, at: now }

  const elapsed = Math.max(0, now - updatedAt)
  const steps = Math.floor(elapsed / HEART_REFILL_MS)
  const value = Math.min(MAX_HEARTS, raw + steps)
  if (value >= MAX_HEARTS) return { hearts: MAX_HEARTS, at: now }
  return { hearts: value, at: updatedAt + steps * HEART_REFILL_MS }
}

/** Текущее число сердец для снимка прогресса. */
export function heartsNow(
  snapshot: Pick<ProgressSnapshot, 'hearts' | 'heartsUpdatedAt'>,
  now = Date.now(),
): number {
  return materializeHearts(snapshot.hearts, snapshot.heartsUpdatedAt, now).hearts
}

/** Серия дней: +1 при занятии в новый день, сброс при пропуске. */
export function nextStreak(
  streak: number,
  lastActiveDay: string | null,
  today: string,
  daysBetween: (a: string, b: string) => number,
): number {
  if (lastActiveDay === today) return streak
  if (!lastActiveDay) return 1
  return daysBetween(lastActiveDay, today) === 1 ? streak + 1 : 1
}

/** Уровень из общего XP: 100 XP на уровень. */
export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  const safe = Math.max(0, Math.floor(xp))
  return { level: Math.floor(safe / 100) + 1, into: safe % 100, need: 100 }
}

/** XP за неделю (с понедельника по сегодня). */
export function weekXp(dailyXp: Record<string, number>, today = new Date()): number {
  const dow = (today.getDay() + 6) % 7
  let total = 0
  for (let i = 0; i <= dow; i += 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    total += dailyXp[dayKey(d)] ?? 0
  }
  return total
}

/**
 * XP за подход в «Повторении». Формула должна совпадать с
 * `fn_award_review` в supabase/migrations/*.sql.
 */
export function reviewXp(correct: number, total: number): number {
  const safeCorrect = Math.max(0, Math.min(Math.floor(correct), Math.max(0, total)))
  const perfect = total > 0 && safeCorrect >= total
  return Math.min(20, 2 + safeCorrect + (perfect ? 3 : 0))
}

/** Округление гемов за XP — та же формула, что в RPC. */
export function gemsForXp(xp: number): number {
  return Math.round(Math.max(0, xp) / 5)
}

/* ------------------------------------------------------------------ *
 * Слияние локального и облачного состояния
 * ------------------------------------------------------------------ */

function mergeLesson(local: LessonResult, remote: LessonResult): LessonResult {
  return {
    lessonId: local.lessonId,
    score: Math.max(local.score, remote.score),
    accuracy: Math.max(local.accuracy, remote.accuracy),
    xp: Math.max(local.xp, remote.xp),
    completedAt: Math.max(local.completedAt, remote.completedAt),
  }
}

function mergeLessons(
  local: Record<string, LessonResult>,
  remote: Record<string, LessonResult>,
): Record<string, LessonResult> {
  const out: Record<string, LessonResult> = { ...local }
  for (const [id, r] of Object.entries(remote)) {
    out[id] = out[id] ? mergeLesson(out[id], r) : r
  }
  return out
}

function mergeDailyXp(
  local: Record<string, number>,
  remote: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { ...local }
  for (const [day, xp] of Object.entries(remote)) {
    out[day] = Math.max(out[day] ?? 0, xp)
  }
  return out
}

function mergeWordStats(
  local: Record<string, WordStat>,
  remote: Record<string, WordStat>,
): Record<string, WordStat> {
  const out: Record<string, WordStat> = { ...local }
  for (const [id, r] of Object.entries(remote)) {
    const l = out[id]
    out[id] = l
      ? {
          errors: Math.max(l.errors, r.errors),
          seen: Math.max(l.seen, r.seen),
          lastErrorAt: Math.max(l.lastErrorAt, r.lastErrorAt),
        }
      : r
  }
  return out
}

/**
 * Серия: побеждает та сторона, где занятие было позже. Если даты совпадают,
 * берём больший счётчик. Так «старая» серия с чужого устройства не
 * продлевается задним числом.
 */
function mergeStreak(
  local: Pick<ProgressSnapshot, 'streak' | 'lastActiveDay'>,
  remote: Pick<ProgressSnapshot, 'streak' | 'lastActiveDay'>,
): Pick<ProgressSnapshot, 'streak' | 'lastActiveDay'> {
  const l = local.lastActiveDay ?? ''
  const r = remote.lastActiveDay ?? ''
  if (l > r) return { streak: local.streak, lastActiveDay: local.lastActiveDay }
  if (r > l) return { streak: remote.streak, lastActiveDay: remote.lastActiveDay }
  return {
    streak: Math.max(local.streak, remote.streak),
    lastActiveDay: local.lastActiveDay ?? remote.lastActiveDay,
  }
}

/**
 * Сердца: приводим обе стороны к моменту `now` и берём большее значение.
 *
 * «Сырое» число сердец без учёта времени сравнивать нельзя: 3 сердца с давней
 * меткой могут означать полный запас. Поэтому сначала материализуем обе пары.
 *
 * Правило намеренно «прощающее»: если на одном устройстве сердца потратили,
 * а на другом запас полный, синхронизация вернёт полный запас. Так играть
 * не наказывается, и совпадает с логикой `fn_push_progress` на сервере.
 */
function mergeHearts(
  local: Pick<ProgressSnapshot, 'hearts' | 'heartsUpdatedAt'>,
  remote: Pick<ProgressSnapshot, 'hearts' | 'heartsUpdatedAt'>,
  now: number,
): Pick<ProgressSnapshot, 'hearts' | 'heartsUpdatedAt'> {
  const l = materializeHearts(local.hearts, local.heartsUpdatedAt, now)
  const r = materializeHearts(remote.hearts, remote.heartsUpdatedAt, now)

  if (l.hearts > r.hearts) return { hearts: l.hearts, heartsUpdatedAt: l.at }
  if (r.hearts > l.hearts) return { hearts: r.hearts, heartsUpdatedAt: r.at }
  // Равенство: идём по более ранней метке — таймер восстановления не откладывается.
  return { hearts: l.hearts, heartsUpdatedAt: Math.min(l.at, r.at) }
}

/**
 * Сливает локальное состояние с облачным.
 *
 * Правила: XP, гемы, результаты уроков, XP по дням и статистика слов берутся
 * по максимуму (прогресс не «откатывается» и не удваивается); серия — по
 * последней дате занятия; сердца — по текущему (с учётом восстановления) числу.
 *
 * Функция чистая: одинаковый вход даёт одинаковый выход.
 */
export function mergeProgress(
  local: ProgressSnapshot,
  remote: ProgressSnapshot,
  now: number = Date.now(),
): ProgressSnapshot {
  return {
    xp: Math.max(local.xp, remote.xp),
    gems: Math.max(local.gems, remote.gems),
    ...mergeHearts(local, remote, now),
    ...mergeStreak(local, remote),
    lessons: mergeLessons(local.lessons, remote.lessons),
    dailyXp: mergeDailyXp(local.dailyXp, remote.dailyXp),
    wordStats: mergeWordStats(local.wordStats, remote.wordStats),
  }
}

/** Пустой снимок — состояние нового игрока. */
export function emptySnapshot(): ProgressSnapshot {
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
  }
}

/**
 * Короткая подпись состояния: по ней авто-синхронизация понимает,
 * изменилось ли что-то, что стоит отправлять в облако.
 *
 * Метку времени восстановления сердец сознательно не включаем: сервер
 * пересчитывает восстановление сам, поэтому «дозревшее» сердце не требует
 * отправки. А вот потерянное сердце (изменившееся число) — требует.
 */
export function stateSignature(snapshot: ProgressSnapshot): string {
  const seenTotal = Object.values(snapshot.wordStats).reduce((a, w) => a + w.seen, 0)
  return [
    heartsNow(snapshot),
    snapshot.streak,
    snapshot.lastActiveDay ?? '',
    Object.keys(snapshot.wordStats).length,
    seenTotal,
  ].join('|')
}

/** Подпись полного снимка — для проверки «нужно ли заливать» при входе. */
export function fullSignature(snapshot: ProgressSnapshot): string {
  return [
    snapshot.xp,
    snapshot.gems,
    Object.keys(snapshot.lessons).length,
    Object.values(snapshot.dailyXp).reduce((a, b) => a + b, 0),
    stateSignature(snapshot),
  ].join('|')
}

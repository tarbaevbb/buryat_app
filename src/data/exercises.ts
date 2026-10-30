import { course, getSentence, getVocab } from './course'
import { hashString, makeRng, shuffle } from '../lib/rng'
import { normalize } from '../lib/normalize'
import type {
  BuildExercise,
  Exercise,
  MatchExercise,
  SelectExercise,
  VocabItem,
} from './types'

/** Пул кандидатов в дистракторы: сначала слова того же урока, потом весь курс. */
function distractorPool(lessonVocab: VocabItem[], pos: VocabItem['pos']): VocabItem[] {
  const samePos = lessonVocab.filter((v) => v.pos === pos)
  const globalSamePos = [...course.vocab.values()].filter((v) => v.pos === pos)
  const seen = new Set<string>()
  return [...samePos, ...globalSamePos].filter((v) => {
    if (seen.has(v.id)) return false
    seen.add(v.id)
    return true
  })
}

function buildSelect(
  rng: () => number,
  vocab: VocabItem,
  options: VocabItem[],
  optionsCount = 4,
): SelectExercise | null {
  const pool = options.filter((o) => o.id !== vocab.id && o.ru !== vocab.ru)
  if (pool.length < optionsCount - 1) return null
  const wrong = shuffle(pool, rng).slice(0, optionsCount - 1)
  const all = shuffle([vocab, ...wrong], rng)
  return {
    kind: 'select',
    id: `select:${vocab.id}`,
    mode: 'meaning',
    promptLang: 'bxr',
    prompt: vocab.bxr,
    answer: vocab.ru,
    options: all.map((o) => o.ru),
    vocabId: vocab.id,
  }
}

/** Задание «выбери правильное чтение» — только для слов со транскрипцией. */
function buildReading(
  rng: () => number,
  vocab: VocabItem,
  pool: VocabItem[],
): SelectExercise | null {
  if (!vocab.transcription) return null
  // Транскрипция совпадает с написанием (хүн → хүн): задание бессмысленно —
  // вопрос и ответ одинаковы, сравнивать нечего.
  if (normalize(vocab.transcription) === normalize(vocab.bxr)) return null
  const candidates = pool.filter((v) => v.transcription && v.transcription !== vocab.transcription)
  if (candidates.length < 2) return null
  const wrong = shuffle(candidates, rng).slice(0, 2)
  const all = shuffle([vocab, ...wrong], rng)
  return {
    kind: 'select',
    id: `reading:${vocab.id}`,
    mode: 'reading',
    promptLang: 'bxr',
    prompt: vocab.bxr,
    answer: vocab.transcription as string,
    options: all.map((v) => v.transcription as string),
    vocabId: vocab.id,
  }
}

/**
 * Делает плитки для сборки предложения: слова ответа + дистракторы,
 * чтобы общее количество было 5–8 плиток.
 */
function buildTiles(answer: string, rng: () => number, extraPool: string[]): string[] {
  const words = answer.split(/\s+/).filter(Boolean)
  const target = Math.min(Math.max(words.length + 3, 6), 9)
  const distractors: string[] = []
  // Сравниваем не по «сырым» строкам, а по нормализованной форме: иначе
  // дистрактор «хүн» попадёт в плитки ответа «Сайн хүн.» — это та же словоформа,
  // и после normalize получился бы ещё один заведомо верный вариант.
  const answerKeys = new Set(words.map((w) => normalize(w)))
  const candidates = shuffle(
    extraPool.filter(
      (w) => !answerKeys.has(normalize(w)) && w.split(/\s+/).length === 1,
    ),
    rng,
  )
  for (const c of candidates) {
    if (words.length + distractors.length >= target) break
    if (!distractors.includes(c)) distractors.push(c)
  }
  return shuffle([...words, ...distractors], rng)
}

function buildSentenceTask(
  rng: () => number,
  sentenceId: string,
  vocabPool: VocabItem[],
): BuildExercise | null {
  const sentence = getSentence(sentenceId)
  if (!sentence) return null
  const extraPool = vocabPool
    .filter((v) => v.pos !== 'phrase' && v.pos !== 'sound')
    .map((v) => v.bxr)
  return {
    kind: 'build',
    id: `build:${sentence.id}`,
    promptLang: 'ru',
    prompt: sentence.ru,
    answer: sentence.bxr,
    tokens: buildTiles(sentence.bxr, rng, extraPool),
    sentenceId: sentence.id,
  }
}

function buildMatch(rng: () => number, vocab: VocabItem[], size = 5): MatchExercise | null {
  const usable = vocab.filter((v) => v.pos !== 'sound' && v.pos !== 'letter' && v.ru.length < 30)
  if (usable.length < 3) return null
  const pairs = shuffle(usable, rng)
    .slice(0, Math.min(size, usable.length))
    .map((v) => ({ bxr: v.bxr, ru: v.ru, vocabId: v.id }))
  return { kind: 'match', id: `match:${pairs.map((p) => p.vocabId).join('_')}`, pairs }
}

/**
 * Собирает набор упражнений для урока.
 * Порядок стабилен (сид от id урока) — прогресс не «перемешивается» между запусками.
 */
export function generateExercises(lessonId: string, target = 10): Exercise[] {
  const lesson = course.lessons.find((l) => l.id === lessonId)
  if (!lesson) return []

  const rng = makeRng(hashString(lessonId))
  const vocab = lesson.vocabIds
    .map((id) => getVocab(id))
    .filter((v): v is VocabItem => Boolean(v))
  if (vocab.length === 0) return []

  const exercises: Exercise[] = []
  const learning = vocab.filter((v) => v.pos !== 'sound' && v.pos !== 'letter')
  const sources = learning.length > 0 ? learning : vocab
  const ordered = shuffle(sources, rng)

  // 1. Сначала — выбор перевода для новых слов.
  for (const item of ordered) {
    if (exercises.length >= Math.ceil(target * 0.5)) break
    const select = buildSelect(rng, item, distractorPool(vocab, item.pos))
    if (select) exercises.push(select)
  }

  // 2. Предложения из урока.
  for (const sentenceId of lesson.sentenceIds) {
    if (exercises.length >= target - 1) break
    const task = buildSentenceTask(rng, sentenceId, vocab)
    if (task) exercises.push(task)
  }

  // 3. Задание на чтение (транскрипция).
  const readingCandidate = ordered.find((v) => v.transcription)
  if (readingCandidate && exercises.length < target) {
    const reading = buildReading(rng, readingCandidate, distractorPool(vocab, readingCandidate.pos))
    if (reading) exercises.push(reading)
  }

  // 4. Добираем выбором перевода в обратную сторону (ru → bxr).
  for (const item of ordered) {
    if (exercises.length >= target - 1) break
    const pool = distractorPool(vocab, item.pos).filter((o) => o.bxr !== item.bxr)
    if (pool.length < 3) continue
    const wrong = shuffle(pool, rng).slice(0, 3)
    const options = shuffle([item, ...wrong], rng).map((o) => o.bxr)
    exercises.push({
      kind: 'select',
      id: `reverse:${item.id}`,
      mode: 'meaning',
      promptLang: 'ru',
      prompt: item.ru,
      answer: item.bxr,
      options,
      vocabId: item.id,
    })
  }

  // 5. Завершаем сопоставлением пар.
  const match = buildMatch(rng, vocab)
  if (match) exercises.push(match)

  // Перемешиваем, но первое задание оставляем «выбор перевода» — мягкий вход.
  const [first, ...rest] = exercises
  return [first, ...shuffle(rest, rng)].filter(Boolean)
}

export function exerciseCount(lessonId: string): number {
  return generateExercises(lessonId).length
}

/**
 * Слова, затронутые заданием — для статистики ошибок и повторения.
 * Для `select` это слово задания; для `match` — все пары; для `build` —
 * слова предложения, которые есть в словаре курса.
 * Пунктуация предложения («гэр.») при сопоставлении отбрасывается.
 */
export function exerciseVocabIds(exercise: Exercise): string[] {
  if (exercise.kind === 'select') return [exercise.vocabId]
  if (exercise.kind === 'match') return exercise.pairs.map((p) => p.vocabId)

  const sentence = getSentence(exercise.sentenceId)
  if (!sentence) return []
  const words = new Set(
    sentence.bxr
      .replace(/[!?.,:;"'«»()\-–—]/g, ' ')
      .split(/\s+/)
      .filter(Boolean),
  )
  return [...course.vocab.values()].filter((v) => words.has(v.bxr)).map((v) => v.id)
}

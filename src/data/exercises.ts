import { course, getSentence, getVocab } from './course'
import { hashString, makeRng, shuffle } from '../lib/rng'
import { normalize } from '../lib/normalize'
import type {
  BuildExercise,
  Exercise,
  MatchExercise,
  SentenceItem,
  SelectExercise,
  VocabItem,
} from './types'

/** Используем лексику текущего и уже пройденных уроков. */
function distractorPool(
  lessonVocab: VocabItem[],
  pos: VocabItem['pos'],
  learnedVocab: VocabItem[],
): VocabItem[] {
  const seen = new Set<string>()
  return [...lessonVocab, ...learnedVocab].filter((v) => {
    if (v.pos !== pos || v.needsReview || seen.has(v.id)) return false
    seen.add(v.id)
    return true
  })
}

function translationKeys(vocab: VocabItem): string[] {
  return [vocab.ru, ...(vocab.ruAlternatives ?? [])].map(normalize)
}

function translationsOverlap(left: VocabItem, right: VocabItem): boolean {
  const rightKeys = new Set(translationKeys(right))
  return translationKeys(left).some((key) => rightKeys.has(key))
}

function uniqueTranslations(vocab: VocabItem): string[] {
  const seen = new Set<string>()
  return [vocab.ru, ...(vocab.ruAlternatives ?? [])].filter((translation) => {
    const key = normalize(translation)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildSelect(
  rng: () => number,
  vocab: VocabItem,
  options: VocabItem[],
  optionsCount = 4,
): SelectExercise | null {
  // Не показываем одинаковые переводы под разными карточками. Иначе в
  // упражнении могут оказаться два фактически правильных ответа.
  const answers = uniqueTranslations(vocab)
  const seen = new Set(answers.map(normalize))
  const pool: VocabItem[] = []
  for (const option of options) {
    if (option.id === vocab.id || translationsOverlap(vocab, option)) continue
    const keys = translationKeys(option)
    if (keys.some((key) => seen.has(key))) continue
    keys.forEach((key) => seen.add(key))
    pool.push(option)
  }
  const wrongCount = Math.min(optionsCount - answers.length, pool.length)
  if (wrongCount < 1) return null
  const wrong = shuffle(pool, rng).slice(0, wrongCount)
  const all = shuffle([...answers, ...wrong.map((option) => option.ru)], rng)
  return {
    kind: 'select',
    id: `select:${vocab.id}`,
    promptLang: 'bxr',
    prompt: vocab.bxr,
    answer: vocab.ru,
    options: all,
    acceptedAnswers: answers,
    vocabId: vocab.id,
  }
}

function buildReverseSelect(
  rng: () => number,
  vocab: VocabItem,
  options: VocabItem[],
): SelectExercise | null {
  const answerKey = normalize(vocab.bxr)
  const seen = new Set([answerKey])
  const pool = options.filter((option) => {
    if (option.id === vocab.id || translationsOverlap(vocab, option)) return false
    const key = normalize(option.bxr)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (pool.length < 2) return null
  const wrong = shuffle(pool, rng).slice(0, 3)
  return {
    kind: 'select',
    id: `reverse:${vocab.id}`,
    promptLang: 'ru',
    prompt: vocab.ru,
    answer: vocab.bxr,
    options: shuffle([vocab, ...wrong], rng).map((option) => option.bxr),
    vocabId: vocab.id,
  }
}

interface SentenceSegmentation {
  chunks: string[]
  vocabIds: string[]
}

/** Сегментирует фразу только на слова и устойчивые выражения, уже изученные учеником. */
function segmentKnownSentence(sentence: string, knownVocab: VocabItem[]): SentenceSegmentation | null {
  const surface = sentence.split(/\s+/).filter(Boolean)
  const words = surface.map((word) => normalize(word))
  const entries = knownVocab
    .filter((v) => !v.needsReview && v.pos !== 'sound' && v.pos !== 'letter')
    .map((v) => ({ id: v.id, words: normalize(v.bxr).split(' ') }))
    .filter((entry) => entry.words.length > 0)
    .sort((a, b) => b.words.length - a.words.length)
  const memo = new Map<number, SentenceSegmentation | null>()

  const visit = (index: number): SentenceSegmentation | null => {
    if (index === words.length) return { chunks: [], vocabIds: [] }
    if (memo.has(index)) return memo.get(index) ?? null

    for (const entry of entries) {
      if (!entry.words.every((word, offset) => words[index + offset] === word)) continue
      const rest = visit(index + entry.words.length)
      if (!rest) continue
      const result = {
        chunks: [surface.slice(index, index + entry.words.length).join(' '), ...rest.chunks],
        vocabIds: [entry.id, ...rest.vocabIds],
      }
      memo.set(index, result)
      return result
    }

    memo.set(index, null)
    return null
  }

  const result = visit(0)
  if (!result) return null
  return { ...result, vocabIds: [...new Set(result.vocabIds)] }
}

/** Добавляет к уже знакомым смысловым блокам несколько изученных слов. */
function buildTiles(chunks: string[], rng: () => number, extraPool: string[]): string[] {
  const target = Math.min(Math.max(chunks.length + 2, 5), 8)
  const distractors: string[] = []
  const answerKeys = new Set(chunks.flatMap((chunk) => normalize(chunk).split(' ')))
  const candidates = shuffle(
    extraPool.filter(
      (w) => !answerKeys.has(normalize(w)) && normalize(w).split(' ').length === 1,
    ),
    rng,
  )
  for (const c of candidates) {
    if (chunks.length + distractors.length >= target) break
    if (!distractors.includes(c)) distractors.push(c)
  }
  return shuffle([...chunks, ...distractors], rng)
}

function buildSentenceTask(
  rng: () => number,
  sentenceId: string,
  knownVocab: VocabItem[],
): BuildExercise | null {
  const sentence = getSentence(sentenceId)
  if (!sentence || sentence.needsReview) return null
  const segmentation = segmentKnownSentence(sentence.bxr, knownVocab)
  // Не требуем собирать по отдельным словам фразу, если она изучалась целиком.
  if (!segmentation || segmentation.chunks.length < 2) return null
  const extraPool = knownVocab
    .filter((v) => v.pos !== 'sound' && v.pos !== 'letter')
    .map((v) => v.bxr)

  return {
    kind: 'build',
    id: `build:${sentence.id}`,
    promptLang: 'ru',
    prompt: sentence.ru,
    answer: sentence.bxr,
    tokens: buildTiles(segmentation.chunks, rng, extraPool),
    sentenceId: sentence.id,
  }
}

function buildSentenceSelect(
  rng: () => number,
  sentenceId: string,
  sentencePool: SentenceItem[],
  knownVocab: VocabItem[],
): SelectExercise | null {
  const sentence = getSentence(sentenceId)
  const segmentation = sentence && segmentKnownSentence(sentence.bxr, knownVocab)
  if (!sentence || sentence.needsReview || !segmentation) return null

  const meaningAnswers = [sentence.ru]
  if (segmentation.vocabIds.length === 1) {
    const wholePhrase = knownVocab.find((item) => item.id === segmentation.vocabIds[0])
    if (wholePhrase?.pos === 'phrase') meaningAnswers.push(...(wholePhrase.ruAlternatives ?? []))
  }
  const acceptedAnswers = [...new Map(meaningAnswers.map((answer) => [normalize(answer), answer])).values()]
  const seen = new Set(acceptedAnswers.map(normalize))
  const distractors = shuffle(sentencePool, rng).filter((candidate) => {
    if (candidate.id === sentence.id || candidate.needsReview) return false
    const candidateSegmentation = segmentKnownSentence(candidate.bxr, knownVocab)
    if (!candidateSegmentation) return false
    const candidateMeanings = [candidate.ru]
    if (candidateSegmentation.vocabIds.length === 1) {
      const wholePhrase = knownVocab.find((item) => item.id === candidateSegmentation.vocabIds[0])
      if (wholePhrase?.pos === 'phrase') candidateMeanings.push(...(wholePhrase.ruAlternatives ?? []))
    }
    const keys = candidateMeanings.map(normalize)
    if (keys.some((key) => !key || seen.has(key))) return false
    keys.forEach((key) => seen.add(key))
    return true
  })
  const wrongCount = Math.min(4 - acceptedAnswers.length, distractors.length)
  if (wrongCount < 1) return null

  const options = shuffle([
    ...acceptedAnswers,
    ...distractors.slice(0, wrongCount).map((item) => item.ru),
  ], rng)
  return {
    kind: 'select',
    id: `sentence-select:${sentence.id}`,
    promptLang: 'bxr',
    prompt: sentence.bxr,
    answer: acceptedAnswers[0],
    acceptedAnswers,
    options,
    vocabId: segmentation.vocabIds[0],
    sentenceId: sentence.id,
    relatedVocabIds: segmentation.vocabIds,
  }
}

function buildMatch(rng: () => number, vocab: VocabItem[], size = 5): MatchExercise | null {
  const seenBxr = new Set<string>()
  const seenRu = new Set<string>()
  const unique = vocab.filter((v) => {
    const bxr = normalize(v.bxr)
    const ru = normalize(v.ru)
    if (v.needsReview || v.pos === 'sound' || v.pos === 'letter' || v.ru.length >= 30) return false
    if (seenBxr.has(bxr) || seenRu.has(ru)) return false
    seenBxr.add(bxr)
    seenRu.add(ru)
    return true
  })
  const ambiguous = new Set<string>()
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      if (translationsOverlap(unique[i], unique[j])) {
        ambiguous.add(unique[i].id)
        ambiguous.add(unique[j].id)
      }
    }
  }
  const usable = unique.filter((v) => !ambiguous.has(v.id))
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
  if (target <= 0) return []
  const lessonIndex = course.lessons.findIndex((l) => l.id === lessonId)
  if (lessonIndex < 0) return []
  const lesson = course.lessons[lessonIndex]

  const rng = makeRng(hashString(lessonId))
  const vocab = lesson.vocabIds
    .map((id) => getVocab(id))
    .filter((v): v is VocabItem => Boolean(v && !v.needsReview))
  if (vocab.length === 0) return []
  const learnedIds = new Set(course.lessons
    .slice(0, lessonIndex)
    .flatMap((previousLesson) => previousLesson.vocabIds))
  const learnedVocab = [...learnedIds]
    .map((id) => getVocab(id))
    .filter((v): v is VocabItem => Boolean(v && !v.needsReview))

  const knownVocabById = new Map([...learnedVocab, ...vocab].map((item) => [item.id, item]))
  const knownVocab = [...knownVocabById.values()]
  const availableSentenceIds = [...new Set(course.lessons
    .slice(0, lessonIndex + 1)
    .flatMap((previousLesson) => previousLesson.sentenceIds))]
  const sentencePool = availableSentenceIds
    .map((id) => getSentence(id))
    .filter((sentence): sentence is SentenceItem => Boolean(sentence && !sentence.needsReview))

  const exercises: Exercise[] = []
  const learning = vocab.filter((v) => v.pos !== 'sound' && v.pos !== 'letter')
  const sources = learning.length > 0 ? learning : vocab
  const ordered = shuffle(sources, rng)

  // 1. Сначала — выбор перевода нескольких слов урока.
  for (const item of ordered) {
    if (exercises.filter((exercise) => exercise.kind === 'select' && !exercise.sentenceId && exercise.promptLang === 'bxr').length >= Math.min(3, Math.ceil(target * 0.3))) break
    const select = buildSelect(rng, item, distractorPool(vocab, item.pos, learnedVocab))
    if (select) exercises.push(select)
  }

  // Небольшое накопительное повторение: возвращаем одно недавно встречавшееся
  // слово в обратном направлении, используя только уже изученные варианты.
  const currentIds = new Set(vocab.map((item) => item.id))
  const recentLesson = course.lessons
    .slice(0, lessonIndex)
    .reverse()
    .find((previousLesson) => previousLesson.kind === 'lesson' && previousLesson.newVocabIds.length > 0)
  const recentIds = new Set(recentLesson?.newVocabIds ?? [])
  const recallCandidates = learnedVocab.filter((item) => recentIds.has(item.id) && !currentIds.has(item.id))
  const recallItem = shuffle(recallCandidates, rng)[0]
  if (recallItem && exercises.length < target - 1) {
    const recall = buildReverseSelect(rng, recallItem, knownVocab.filter((item) => item.pos === recallItem.pos))
    if (recall) exercises.push(recall)
  }

  // 2. Сначала проверяем понимание знакомых фраз в контексте.
  for (const sentenceId of lesson.sentenceIds) {
    if (exercises.length >= target - 1) break
    if (exercises.filter((exercise) => exercise.kind === 'select' && exercise.sentenceId).length >= 2) break
    const select = buildSentenceSelect(rng, sentenceId, sentencePool, knownVocab)
    if (select) exercises.push(select)
  }

  // 3. Собираем только фразы, которые целиком покрыты уже изученными словами
  // или устойчивыми выражениями. Неизвестные грамматические формы пропускаются.
  for (const sentenceId of lesson.sentenceIds) {
    if (exercises.filter((exercise) => exercise.kind === 'build').length >= 2) break
    if (exercises.length >= target - 1) break
    const task = buildSentenceTask(rng, sentenceId, knownVocab)
    if (task) exercises.push(task)
  }

  // 4. Добираем обратным переводом новых слов, не повторяя прямой вопрос.
  for (const item of ordered) {
    if (exercises.length >= target - 1) break
    if (exercises.some((exercise) => exercise.kind === 'select' && exercise.vocabId === item.id && !exercise.sentenceId)) continue
    const reverse = buildReverseSelect(rng, item, distractorPool(vocab, item.pos, learnedVocab))
    if (reverse) exercises.push(reverse)
  }

  // 5. Завершаем сопоставлением пар.
  const match = buildMatch(rng, vocab)
  if (match && exercises.length < target) exercises.push(match)

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
  if (exercise.kind === 'select') return exercise.relatedVocabIds ?? [exercise.vocabId]
  if (exercise.kind === 'match') return exercise.pairs.map((p) => p.vocabId)

  const sentence = getSentence(exercise.sentenceId)
  if (!sentence) return []
  return segmentKnownSentence(sentence.bxr, [...course.vocab.values()])?.vocabIds ?? []
}

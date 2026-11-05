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

/**
 * Дистракторы из текущего и уже пройденных уроков.
 *
 * Порядок важен: `buildSelect` берёт варианты с начала пула, поэтому первыми
 * идут слова с общими тегами — они и есть сильные дистракторы («Үдэрэй мэндэ!»
 * против «Үдэшын мэндэ!»). Совпадение только по части речи — слабое:
 * «среда» и «ученик» рядом ничего не проверяют.
 */
function distractorPool(
  lessonVocab: VocabItem[],
  pos: VocabItem['pos'],
  learnedVocab: VocabItem[],
  anchor?: VocabItem,
): VocabItem[] {
  const seen = new Set<string>()
  const pool = [...lessonVocab, ...learnedVocab].filter((v) => {
    if (v.pos !== pos || v.needsReview || seen.has(v.id)) return false
    seen.add(v.id)
    return true
  })
  if (!anchor) return pool

  const anchorTags = new Set(anchor.tags)
  const shared = (v: VocabItem) => v.tags.filter((tag) => anchorTags.has(tag)).length
  const sameLesson = new Set(lessonVocab.map((v) => v.id))
  // Сортировка стабильная: сначала общие теги, затем слова того же урока,
  // затем остальные — внутри группы порядок сохраняется.
  return [...pool].sort((a, b) => {
    const tagDiff = shared(b) - shared(a)
    if (tagDiff !== 0) return tagDiff
    return Number(sameLesson.has(b.id)) - Number(sameLesson.has(a.id))
  })
}

/**
 * Запасной пул без ограничения по части речи.
 *
 * Нужен для редких частей речи: у наречия «муу» в курсе может не быть ни
 * одного «соседа», и тогда задание не построить вовсе. Смешивать части речи
 * в дистракторах нормально — выбор перевода всё равно проверяет смысл.
 */
function anyPosPool(lessonVocab: VocabItem[], learnedVocab: VocabItem[]): VocabItem[] {
  const seen = new Set<string>()
  return [...lessonVocab, ...learnedVocab].filter((v) => {
    if (v.needsReview || v.pos === 'sound' || v.pos === 'letter' || seen.has(v.id)) return false
    seen.add(v.id)
    return true
  })
}

/**
 * Берёт варианты из начала приоритетного пула, перемешивая только «верх».
 * Полное перемешивание убивало бы смысл сортировки в `distractorPool`.
 */
function takeTop(pool: VocabItem[], count: number, rng: () => number): VocabItem[] {
  return shuffle(pool.slice(0, Math.min(pool.length, count * 2)), rng).slice(0, count)
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
  // В плитках показываем один канонический ответ: два верных варианта в
  // одном вопросе сбивают с толку (синонимы остаются в `acceptedAnswers`).
  const wrongCount = Math.min(optionsCount - 1, pool.length)
  // Меньше трёх вариантов — это угадывание 50/50, такое задание не даём.
  if (wrongCount < 2) return null
  const wrong = takeTop(pool, wrongCount, rng)
  const all = shuffle([answers[0], ...wrong.map((option) => option.ru)], rng)
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
  const wrong = takeTop(pool, 3, rng)
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

/**
 * Сегментирует фразу на смысловые блоки.
 *
 * `unknownBudget` — сколько блоков разрешено взять «как есть», если слова
 * нет в словаре. Такая плитка даётся готовой: ученик не выводит её сам,
 * но собирает порядок фразы. Без бюджета (0) функция строгая — возвращает
 * `null`, если фраза содержит незнакомые формы.
 */
function segmentSentence(
  sentence: string,
  knownVocab: VocabItem[],
  unknownBudget = 0,
): SentenceSegmentation | null {
  const surface = sentence.split(/\s+/).filter(Boolean)
  const words = surface.map((word) => normalize(word))
  const entries = knownVocab
    .filter((v) => !v.needsReview && v.pos !== 'sound' && v.pos !== 'letter')
    .map((v) => ({ id: v.id, words: normalize(v.bxr).split(' ') }))
    .filter((entry) => entry.words.length > 0)
    .sort((a, b) => b.words.length - a.words.length)
  const memo = new Map<string, SentenceSegmentation | null>()

  const visit = (index: number, budget: number): SentenceSegmentation | null => {
    if (index === words.length) return { chunks: [], vocabIds: [] }
    const key = `${index}:${budget}`
    if (memo.has(key)) return memo.get(key) ?? null

    // Сначала пробуем знакомые слова и устойчивые выражения — от длинных к коротким.
    for (const entry of entries) {
      if (!entry.words.every((word, offset) => words[index + offset] === word)) continue
      const rest = visit(index + entry.words.length, budget)
      if (!rest) continue
      const result = {
        chunks: [surface.slice(index, index + entry.words.length).join(' '), ...rest.chunks],
        vocabIds: [entry.id, ...rest.vocabIds],
      }
      memo.set(key, result)
      return result
    }

    // Незнакомое слово: берём как готовую плитку, если бюджет позволяет.
    if (budget > 0) {
      const rest = visit(index + 1, budget - 1)
      if (rest) {
        const result = { chunks: [surface[index], ...rest.chunks], vocabIds: rest.vocabIds }
        memo.set(key, result)
        return result
      }
    }

    memo.set(key, null)
    return null
  }

  const result = visit(0, unknownBudget)
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
  // Сначала строгая сегментация: вся фраза из изученных блоков.
  // Если не выходит — разрешаем одно незнакомое слово готовой плиткой:
  // ученик не выводит его сам, но собирает порядок. Полностью собирать
  // фразу из одних незнакомых плиток смысла нет.
  let segmentation = segmentSentence(sentence.bxr, knownVocab, 0)
  if (!segmentation) segmentation = segmentSentence(sentence.bxr, knownVocab, 1)
  if (!segmentation || segmentation.chunks.length < 2) {
    // Фраза изучается целиком («Үглөөнэй мэндэ!» — одна карточка): собирать
    // по блокам нечего. Если слов немного, даём их готовыми плитками —
    // это тренирует порядок слов, а не догадку.
    const words = sentence.bxr.split(/\s+/).filter(Boolean)
    if (words.length < 2 || words.length > 4) return null
    const extraPool = knownVocab
      .filter((v) => v.pos !== 'sound' && v.pos !== 'letter')
      .map((v) => v.bxr)
    return {
      kind: 'build',
      id: `build:${sentence.id}`,
      promptLang: 'ru',
      prompt: sentence.ru,
      answer: sentence.bxr,
      tokens: buildTiles(words, rng, extraPool),
      sentenceId: sentence.id,
      // Фраза изучается целиком: отдельных слов словаря здесь нет.
      relatedVocabIds: [],
    }
  }
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
    relatedVocabIds: segmentation.vocabIds,
  }
}

function buildSentenceSelect(
  rng: () => number,
  sentenceId: string,
  sentencePool: SentenceItem[],
  knownVocab: VocabItem[],
): SelectExercise | null {
  const sentence = getSentence(sentenceId)
  const segmentation = sentence && segmentSentence(sentence.bxr, knownVocab)
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
    const candidateSegmentation = segmentSentence(candidate.bxr, knownVocab)
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
  const wrongCount = Math.min(4 - 1, distractors.length)
  // Меньше трёх вариантов — угадывание, такое задание не даём.
  if (wrongCount < 2) return null

  const options = shuffle([
    acceptedAnswers[0],
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

function buildMatch(
  rng: () => number,
  vocab: VocabItem[],
  size = 5,
  prefer?: Set<string>,
): MatchExercise | null {
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
  // Сначала берём слова, которые ещё не встречались в этом уроке: сопоставление
  // закрывает до пяти слов сразу, это самый дешёвый способ добить покрытие.
  const prioritized = prefer
    ? [...usable.filter((v) => prefer.has(v.id)), ...usable.filter((v) => !prefer.has(v.id))]
    : usable
  const pairs = shuffle(prioritized, rng)
    .slice(0, Math.min(size, usable.length))
    .map((v) => ({ bxr: v.bxr, ru: v.ru, vocabId: v.id }))
  return { kind: 'match', id: `match:${pairs.map((p) => p.vocabId).join('_')}`, pairs }
}

/**
 * Собирает набор упражнений для урока.
 * Порядок стабилен (сид от id урока) — прогресс не «перемешивается» между запусками.
 */

/** Потолок длины урока: даже большой словарь не должен давать бесконечный подход. */
const MAX_LESSON_EXERCISES = 18

export interface GenerateOptions {
  /**
   * Статистика по словам (ошибки/показы). Если передана, в разминку
   * попадают слова, где ученик чаще ошибался, а не случайные.
   */
  wordStats?: Record<string, { errors: number; seen: number }>
  /** Номер попытки: каждое повторное прохождение даёт другой набор. */
  attempt?: number
}

export function generateExercises(
  lessonId: string,
  target = 10,
  options: GenerateOptions = {},
): Exercise[] {
  if (target <= 0) return []
  const lessonIndex = course.lessons.findIndex((l) => l.id === lessonId)
  if (lessonIndex < 0) return []
  const lesson = course.lessons[lessonIndex]

  // Соль по попытке: без неё второй заход выдаёт ровно те же задания,
  // и слабое место можно «заучить» по порядку, а не выучить.
  const seed = options.attempt && options.attempt > 0
    ? `${lessonId}#${options.attempt}`
    : lessonId
  const rng = makeRng(hashString(seed))
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

  /** Показы уже занятых формулировок — чтобы не спрашивать одно и то же дважды. */
  const usedPrompts = new Set<string>()
  const push = (exercise: Exercise) => {
    exercises.push(exercise)
    if (exercise.kind !== 'match') usedPrompts.add(normalize(exercise.prompt))
  }

  /** Какие слова урока уже отработаны хоть одним заданием. */
  const covered = () => {
    const ids = new Set<string>()
    for (const exercise of exercises) {
      for (const id of exerciseVocabIds(exercise)) ids.add(id)
    }
    return ids
  }

  /** Новые слова урока, по которым нужно гарантировать хотя бы одно задание. */
  const requiredIds =
    lesson.kind === 'review'
      ? []
      : lesson.newVocabIds.filter((id) => {
          const item = knownVocabById.get(id)
          return Boolean(item && !item.needsReview)
        })

  /**
   * Длина урока зависит от размера словаря: иначе пятнадцать новых слов
   * не помещаются в десять заданий, и половина встречается только как
   * дистрактор. Два задания сверх словаря — на повторение и сопоставление.
   */
  const goal = Math.max(target, Math.min(requiredIds.length + 2, MAX_LESSON_EXERCISES))

  // 1. Сначала — выбор перевода нескольких слов урока.
  for (const item of ordered) {
    if (exercises.filter((exercise) => exercise.kind === 'select' && !exercise.sentenceId && exercise.promptLang === 'bxr').length >= Math.min(3, Math.ceil(goal * 0.3))) break
    const select = buildSelect(rng, item, distractorPool(vocab, item.pos, learnedVocab, item))
    if (select) push(select)
  }

  // Небольшое накопительное повторение: возвращаем одно недавно встречавшееся
  // слово в обратном направлении, используя только уже изученные варианты.
  const currentIds = new Set(vocab.map((item) => item.id))
  const recentLesson = course.lessons
    .slice(0, lessonIndex)
    .reverse()
    .find((previousLesson) => previousLesson.kind === 'lesson' && previousLesson.newVocabIds.length > 0)
  const recentIds = new Set(recentLesson?.newVocabIds ?? [])
  const candidates = learnedVocab.filter((item) => !currentIds.has(item.id))
  // Приоритет — слова с ошибками: сначала самые проблемные, затем свежие
  // из прошлого урока, затем любые изученные.
  const stats = options.wordStats ?? {}
  const weak = candidates
    .filter((item) => (stats[item.id]?.errors ?? 0) > 0)
    .sort((a, b) => (stats[b.id]?.errors ?? 0) - (stats[a.id]?.errors ?? 0))
  const recent = candidates.filter((item) => recentIds.has(item.id))
  const recallItem = weak.length > 0
    ? weak[0]
    : shuffle(recent, rng)[0] ?? shuffle(candidates, rng)[0]
  if (recallItem && exercises.length < goal - 1) {
    const recall = buildReverseSelect(rng, recallItem, distractorPool(vocab, recallItem.pos, learnedVocab, recallItem))
    if (recall) push(recall)
  }

  // 2. Сборка фраз — единственный тип, где ученик производит ответ сам,
  // поэтому идёт раньше фразового выбора и получает до трёх заданий.
  for (const sentenceId of lesson.sentenceIds) {
    if (exercises.filter((exercise) => exercise.kind === 'build').length >= 3) break
    if (exercises.length >= goal) break
    const task = buildSentenceTask(rng, sentenceId, knownVocab)
    if (task) push(task)
  }

  // 3. Понимание знакомых фраз в контексте — добираем оставшиеся фразы.
  for (const sentenceId of lesson.sentenceIds) {
    if (exercises.length >= goal - 1) break
    if (exercises.filter((exercise) => exercise.kind === 'select' && exercise.sentenceId).length >= 2) break
    const sentence = getSentence(sentenceId)
    // Короткая фраза вида «Мэндээ!» уже спрашивалась как слово — не дублируем.
    if (!sentence || usedPrompts.has(normalize(sentence.bxr))) continue
    const select = buildSentenceSelect(rng, sentenceId, sentencePool, knownVocab)
    if (select) push(select)
  }

  // 4. Сопоставление пар: закрывает до пяти слов сразу, поэтому идёт до добора.
  const uncoveredNow = new Set(requiredIds.filter((id) => !covered().has(id)))
  const match = buildMatch(rng, vocab, 5, uncoveredNow)
  if (match && exercises.length < goal) push(match)

  // 5. Гарантия покрытия: каждое новое слово встречается хотя бы один раз.
  // Это важнее лимита длины — иначе слова снова останутся без заданий.
  for (const id of shuffle(requiredIds, rng)) {
    if (exercises.length >= MAX_LESSON_EXERCISES) break
    if (covered().has(id)) continue
    const item = knownVocabById.get(id)
    if (!item) continue
    // Сначала пробуем дистракторы той же части речи, затем — любые:
    // иначе редкое наречие или существительное остаётся без задания.
    const strict = distractorPool(vocab, item.pos, learnedVocab, item)
    const samePos = strict.filter((candidate) => candidate.id !== item.id)
    const pool = samePos.length >= 2 ? strict : anyPosPool(vocab, learnedVocab)
    const forward = usedPrompts.has(normalize(item.bxr)) ? null : buildSelect(rng, item, pool)
    if (forward) {
      push(forward)
      continue
    }
    const reverse = buildReverseSelect(rng, item, pool)
    if (reverse) push(reverse)
  }

  // 6. Добираем обратным переводом, не повторяя уже заданный вопрос.
  for (const item of ordered) {
    if (exercises.length >= goal) break
    if (exercises.some((exercise) => exercise.kind === 'select' && exercise.vocabId === item.id && !exercise.sentenceId)) continue
    if (usedPrompts.has(normalize(item.ru))) continue
    const reverse = buildReverseSelect(rng, item, distractorPool(vocab, item.pos, learnedVocab, item))
    if (reverse) push(reverse)
  }

  // Перемешиваем, но первое задание оставляем «выбор перевода» — мягкий вход.
  const [first, ...rest] = exercises
  return [first, ...shuffle(rest, rng)].slice(0, MAX_LESSON_EXERCISES).filter(Boolean)
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
  // Для сборки берём слова, посчитанные при генерации по изученному словарю:
  // повторная сегментация по всему курсу подхватывала слова из будущих уроков.
  if (exercise.relatedVocabIds) return exercise.relatedVocabIds

  const sentence = getSentence(exercise.sentenceId)
  if (!sentence) return []
  return segmentSentence(sentence.bxr, [...course.vocab.values()])?.vocabIds ?? []
}

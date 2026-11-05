import { describe, expect, it } from 'vitest'
import { course, getLesson, getVocab } from '../data/course'
import { exerciseVocabIds, generateExercises } from '../data/exercises'
import { allVocabItems } from '../data/course'
import { normalize } from '../lib/normalize'

describe('структура курса', () => {
  it('содержит 5 разделов по 5 уроков', () => {
    expect(course.units).toHaveLength(5)
    for (const unit of course.units) {
      expect(unit.lessonIds).toHaveLength(5)
    }
    expect(course.lessons).toHaveLength(25)
  })

  it('у каждого урока есть слова или предложения', () => {
    for (const lesson of course.lessons) {
      const hasVocab = lesson.vocabIds.length > 0
      const hasSentences = lesson.sentenceIds.length > 0
      expect(hasVocab || hasSentences, `урок ${lesson.id} пуст`).toBe(true)
    }
  })

  it('в уроке-повторении нет новой лексики', () => {
    const reviews = course.lessons.filter((l) => l.kind === 'review')
    expect(reviews.length).toBeGreaterThan(0)
    for (const r of reviews) {
      expect(r.newVocabIds).toHaveLength(0)
    }
  })

  it('id курса уникальны', () => {
    const ids = allVocabItems.map((v) => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('нет не-ASCII символов в id (защита от «похожих» букв)', () => {
    for (const v of allVocabItems) {
      expect(/^[a-z0-9_]+$/.test(v.id), `плохой id: ${v.id}`).toBe(true)
    }
  })
})

describe('генерация упражнений', () => {
  it('делает непустой набор для каждого урока', () => {
    for (const lesson of course.lessons) {
      const exercises = generateExercises(lesson.id)
      expect(exercises.length, `урок ${lesson.id}`).toBeGreaterThan(3)
    }
  })

  /**
   * Каждое новое слово урока обязано встретиться хотя бы в одном задании.
   * Иначе оно попадает в урок только как дистрактор и не изучается.
   */
  it('каждое новое слово урока отрабатывается хотя бы раз', () => {
    for (const lesson of course.lessons) {
      const covered = new Set<string>()
      for (const exercise of generateExercises(lesson.id)) {
        for (const id of exerciseVocabIds(exercise)) covered.add(id)
      }
      const missing = lesson.newVocabIds.filter(
        (id) => !covered.has(id) && Boolean(getVocab(id)) && !getVocab(id)?.needsReview,
      )
      expect(missing, `урок ${lesson.id}: без заданий остались ${missing.join(', ')}`).toEqual([])
    }
  })

  /** Два варианта — это угадывание 50/50, а не проверка знания. */
  it('в выборе всегда не меньше трёх вариантов', () => {
    for (const lesson of course.lessons) {
      for (const exercise of generateExercises(lesson.id)) {
        if (exercise.kind !== 'select') continue
        expect(
          exercise.options.length,
          `урок ${lesson.id}: «${exercise.prompt}» — ${exercise.options.length} варианта`,
        ).toBeGreaterThanOrEqual(3)
      }
    }
  })

  /** Один и тот же вопрос дважды в уроке — лишний шаг без новой информации. */
  it('не повторяет один и тот же вопрос в уроке', () => {
    for (const lesson of course.lessons) {
      const seen = new Set<string>()
      for (const exercise of generateExercises(lesson.id)) {
        if (exercise.kind === 'match') continue
        const key = `${exercise.promptLang}:${normalize(exercise.prompt)}`
        expect(seen.has(key), `урок ${lesson.id}: «${exercise.prompt}» встречается дважды`).toBe(false)
        seen.add(key)
      }
    }
  })

  /** Число заданий должно догонять размер словаря, иначе слова не помещаются. */
  it('длина урока растёт вместе с числом новых слов', () => {
    for (const lesson of course.lessons) {
      const exercises = generateExercises(lesson.id)
      const newWords = lesson.newVocabIds.filter(
        (id) => Boolean(getVocab(id)) && !getVocab(id)?.needsReview,
      )
      expect(exercises.length, `урок ${lesson.id} (${newWords.length} новых слов)`).toBeGreaterThanOrEqual(
        newWords.length,
      )
    }
  })

  it('во всех заданиях есть правильный ответ', () => {
    for (const lesson of course.lessons) {
      for (const ex of generateExercises(lesson.id)) {
        if (ex.kind === 'select') {
          expect(ex.options).toContain(ex.answer)
          expect(new Set(ex.options).size).toBe(ex.options.length)
        }
        if (ex.kind === 'build') {
          // Плитка может быть устойчивым выражением («хэн бэ?»), но каждое
          // слово ответа должно присутствовать в одной из плиток.
          const tokenWords = new Set(ex.tokens.flatMap((token) => normalize(token).split(/\s+/)))
          for (const word of normalize(ex.answer).split(/\s+/)) {
            expect(tokenWords).toContain(word)
          }
        }
        if (ex.kind === 'match') {
          expect(ex.pairs.length).toBeGreaterThanOrEqual(3)
          const bxr = ex.pairs.map((p) => p.bxr)
          const ru = ex.pairs.map((p) => p.ru)
          expect(new Set(bxr).size).toBe(bxr.length)
          expect(new Set(ru).size).toBe(ru.length)
        }
      }
    }
  })

  it('набор стабилен между вызовами', () => {
    const a = generateExercises('u3l4').map((e) => e.id)
    const b = generateExercises('u3l4').map((e) => e.id)
    expect(a).toEqual(b)
  })

  it('безопасно работает с неизвестным уроком', () => {
    expect(generateExercises('nope')).toEqual([])
    expect(getLesson('nope')).toBeUndefined()
  })

  /** Повторный заход должен давать другой набор, иначе слабое место заучивается по порядку. */
  it('каждая попытка даёт другой набор заданий', () => {
    const first = generateExercises('u3l1', 10, { attempt: 0 }).map((e) => e.id)
    const second = generateExercises('u3l1', 10, { attempt: 1 }).map((e) => e.id)
    expect(first).not.toEqual(second)
    // При этом внутри одной попытки набор стабилен.
    expect(generateExercises('u3l1', 10, { attempt: 1 }).map((e) => e.id)).toEqual(second)
  })

  /** Ошибки прошлых заданий должны влиять на разминку в следующем уроке. */
  it('в разминку попадают слова с ошибками', () => {
    const weakId = 'aba'
    const wordStats = { [weakId]: { errors: 9, seen: 10 } }
    const exercises = generateExercises('u4l2', 10, { wordStats })
    const touched = new Set(exercises.flatMap((e) => exerciseVocabIds(e)))
    expect(touched.has(weakId)).toBe(true)
  })
})

describe('exerciseVocabIds', () => {
  it('для выбора возвращает слово задания', () => {
    const select = generateExercises('u1l1').find((e) => e.kind === 'select')
    expect(select).toBeDefined()
    if (select?.kind === 'select') {
      expect(exerciseVocabIds(select)).toEqual([select.vocabId])
    }
  })

  it('для сопоставления возвращает все пары', () => {
    const match = generateExercises('u3l4').find((e) => e.kind === 'match')
    if (match?.kind === 'match') {
      expect(exerciseVocabIds(match)).toHaveLength(match.pairs.length)
    }
  })

  it('для сборки предложения находит слова из словаря', () => {
    // u1l2 — урок чтения: предложения собраны из слов, которые есть в словаре.
    const build = generateExercises('u1l2').find((e) => e.kind === 'build')
    expect(build).toBeDefined()
    if (build) {
      const ids = exerciseVocabIds(build)
      // Слова предложения, которые есть в словаре, должны быть найдены.
      expect(ids.length).toBeGreaterThan(0)
      expect(ids.every((id) => Boolean(getVocab(id)))).toBe(true)
    }
  })

  it('все затронутые слова существуют в курсе', () => {
    for (const lesson of course.lessons) {
      for (const ex of generateExercises(lesson.id)) {
        for (const id of exerciseVocabIds(ex)) {
          expect(getVocab(id), `слово ${id} отсутствует`).toBeDefined()
        }
      }
    }
  })

  it('не даёт упражнений со словами из будущих уроков', () => {
    for (const [lessonIndex, lesson] of course.lessons.entries()) {
      const learnedIds = new Set(
        course.lessons
          .slice(0, lessonIndex + 1)
          .flatMap((knownLesson) => knownLesson.vocabIds),
      )

      for (const exercise of generateExercises(lesson.id)) {
        for (const vocabId of exerciseVocabIds(exercise)) {
          expect(
            learnedIds.has(vocabId),
            `${lesson.id}: слово ${vocabId} ещё не изучалось`,
          ).toBe(true)
        }
      }
    }
  })
})

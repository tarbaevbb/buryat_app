import { describe, expect, it } from 'vitest'
import { course, getLesson, getVocab } from '../data/course'
import { exerciseVocabIds, generateExercises } from '../data/exercises'
import { allVocabItems } from '../data/course'

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
      // eslint-disable-next-line no-control-regex
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

  it('во всех заданиях есть правильный ответ', () => {
    for (const lesson of course.lessons) {
      for (const ex of generateExercises(lesson.id)) {
        if (ex.kind === 'select') {
          expect(ex.options).toContain(ex.answer)
          expect(new Set(ex.options).size).toBe(ex.options.length)
        }
        if (ex.kind === 'build') {
          // все слова ответа должны быть среди плиток
          for (const word of ex.answer.split(/\s+/)) {
            expect(ex.tokens).toContain(word)
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
    const a = generateExercises('u1l4').map((e) => e.id)
    const b = generateExercises('u1l4').map((e) => e.id)
    expect(a).toEqual(b)
  })

  it('безопасно работает с неизвестным уроком', () => {
    expect(generateExercises('nope')).toEqual([])
    expect(getLesson('nope')).toBeUndefined()
  })
})

describe('exerciseVocabIds', () => {
  it('для выбора возвращает слово задания', () => {
    const select = generateExercises('u2l1').find((e) => e.kind === 'select')
    expect(select).toBeDefined()
    if (select?.kind === 'select') {
      expect(exerciseVocabIds(select)).toEqual([select.vocabId])
    }
  })

  it('для сопоставления возвращает все пары', () => {
    const match = generateExercises('u1l4').find((e) => e.kind === 'match')
    if (match?.kind === 'match') {
      expect(exerciseVocabIds(match)).toHaveLength(match.pairs.length)
    }
  })

  it('для сборки предложения находит слова из словаря', () => {
    const build = generateExercises('u1l4').find((e) => e.kind === 'build')
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
})

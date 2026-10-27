import type { Course, Lesson, SentenceItem, Unit, VocabItem } from './types'
import { unit1, unit1Sentences } from './vocab/unit1'
import { unit2, unit2Sentences } from './vocab/unit2'
import { unit3, unit3Sentences } from './vocab/unit3'
import { unit4, unit4Sentences } from './vocab/unit4'
import { unit5, unit5Sentences } from './vocab/unit5'

const allVocab: VocabItem[] = [...unit1, ...unit2, ...unit3, ...unit4, ...unit5]
const allSentences: SentenceItem[] = [
  ...unit1Sentences,
  ...unit2Sentences,
  ...unit3Sentences,
  ...unit4Sentences,
  ...unit5Sentences,
]

const vocabById = new Map(allVocab.map((v) => [v.id, v]))
const sentenceById = new Map(allSentences.map((s) => [s.id, s]))

/** Собирает id слов по тегам (объединение). */
function byTags(tags: string[]): string[] {
  return allVocab.filter((v) => tags.some((t) => v.tags.includes(t))).map((v) => v.id)
}

interface LessonSpec {
  id: string
  title: string
  titleBxr: string
  kind?: 'lesson' | 'review'
  tags: string[]
  sentenceIds?: string[]
}

interface UnitSpec {
  id: string
  title: string
  titleBxr: string
  description: string
  color: string
  colorShadow: string
  emoji: string
  lessons: LessonSpec[]
}

/**
 * 5 разделов по 5 уроков. Каждый урок — набор слов (по тегам) + предложения.
 * Последний урок раздела — повторение: слова всего раздела без новых.
 */
const unitSpecs: UnitSpec[] = [
  {
    id: 'u1',
    title: 'Алфавит и звуки',
    titleBxr: 'Үзэглэл',
    description: 'Буквы ө, ү, һ и дифтонги. Первые слова.',
    color: '#58cc02',
    colorShadow: '#46a302',
    emoji: '🔤',
    lessons: [
      { id: 'u1l1', title: 'Гласные', titleBxr: 'Үндэhэн үзэгүүд', tags: ['alphabet', 'vowel'] },
      { id: 'u1l2', title: 'Особые звуки һ, ө, ү', titleBxr: 'һ, ө, ү', tags: ['consonant', 'vowel'] },
      { id: 'u1l3', title: 'Дифтонги', titleBxr: 'Дифтонгүүд', tags: ['diphthong'], sentenceIds: ['u1s1', 'u1s2'] },
      {
        id: 'u1l4',
        title: 'Читаем слова',
        titleBxr: 'Үгэ уншанабди',
        tags: ['reading'],
        sentenceIds: ['u1s1', 'u1s2', 'u1s3', 'u1s4', 'u1s5', 'u1s6'],
      },
      {
        id: 'u1l5',
        title: 'Повторение раздела',
        titleBxr: 'Дахин hанаха',
        kind: 'review',
        tags: ['alphabet', 'reading'],
        sentenceIds: ['u1s1', 'u1s3', 'u1s5'],
      },
    ],
  },
  {
    id: 'u2',
    title: 'Приветствия',
    titleBxr: 'Мэндээлгэ',
    description: 'Поздороваться, представиться, попрощаться.',
    color: '#1cb0f6',
    colorShadow: '#1899d6',
    emoji: '👋',
    lessons: [
      { id: 'u2l1', title: 'Здравствуйте', titleBxr: 'Сайн байна уу', tags: ['greeting'], sentenceIds: ['u2s1', 'u2s2', 'u2s8'] },
      { id: 'u2l2', title: 'Знакомство', titleBxr: 'Танилсалга', tags: ['intro', 'pronoun'], sentenceIds: ['u2s3', 'u2s4', 'u2s5'] },
      { id: 'u2l3', title: 'Вежливые слова', titleBxr: 'Хүндэтэ үгэнүүд', tags: ['polite'], sentenceIds: ['u2s6', 'u2s7'] },
      { id: 'u2l4', title: 'Вопросы', titleBxr: 'Асуудал', tags: ['question', 'base'], sentenceIds: ['u2s3', 'u2s5'] },
      {
        id: 'u2l5',
        title: 'Повторение раздела',
        titleBxr: 'Дахин hанаха',
        kind: 'review',
        tags: ['greeting', 'intro', 'polite'],
        sentenceIds: ['u2s1', 'u2s4', 'u2s6', 'u2s8'],
      },
    ],
  },
  {
    id: 'u3',
    title: 'Числа и время',
    titleBxr: 'Тоо ба саг',
    description: 'Счёт до ста, дни недели, время.',
    color: '#ff9600',
    colorShadow: '#e07f00',
    emoji: '🔢',
    lessons: [
      { id: 'u3l1', title: 'От 1 до 10', titleBxr: 'Нэгэнhээ арба', tags: ['num1_10'], sentenceIds: ['u3s1', 'u3s6'] },
      { id: 'u3l2', title: 'Десятки до 100', titleBxr: 'Арбанай тоонууд', tags: ['num10_100'], sentenceIds: ['u3s2'] },
      { id: 'u3l3', title: 'Дни недели', titleBxr: 'Гарагууд', tags: ['weekday'], sentenceIds: ['u3s5'] },
      { id: 'u3l4', title: 'Который час', titleBxr: 'Хэдэн саг бэ', tags: ['time'], sentenceIds: ['u3s3', 'u3s4'] },
      {
        id: 'u3l5',
        title: 'Повторение раздела',
        titleBxr: 'Дахин hанаха',
        kind: 'review',
        tags: ['number', 'time'],
        sentenceIds: ['u3s1', 'u3s2', 'u3s4'],
      },
    ],
  },
  {
    id: 'u4',
    title: 'Семья и люди',
    titleBxr: 'Бүлэ',
    description: 'Родственники, возраст, «у меня есть».',
    color: '#ce82ff',
    colorShadow: '#b566e6',
    emoji: '👨‍👩‍👧',
    lessons: [
      { id: 'u4l1', title: 'Родители', titleBxr: 'Аба эжы', tags: ['family'], sentenceIds: ['u4s1', 'u4s2'] },
      { id: 'u4l2', title: 'Братья и сёстры', titleBxr: 'Аха дүүнэр', tags: ['family'], sentenceIds: ['u4s4', 'u4s6'] },
      { id: 'u4l3', title: 'Дети', titleBxr: 'Хүүгэд', tags: ['people', 'age'], sentenceIds: ['u4s3', 'u4s5'] },
      { id: 'u4l4', title: 'Качества', titleBxr: 'Шэнжэ шанар', tags: ['quality', 'work'], sentenceIds: ['u4s3', 'u4s5'] },
      {
        id: 'u4l5',
        title: 'Повторение раздела',
        titleBxr: 'Дахин hанаха',
        kind: 'review',
        tags: ['family', 'people'],
        sentenceIds: ['u4s1', 'u4s3', 'u4s6'],
      },
    ],
  },
  {
    id: 'u5',
    title: 'Еда и быт',
    titleBxr: 'Эдеэн ба гэр',
    description: 'Продукты, посуда, вкусы.',
    color: '#ff4b4b',
    colorShadow: '#e03c3c',
    emoji: '🍲',
    lessons: [
      { id: 'u5l1', title: 'Продукты', titleBxr: 'Эдеэнэй бүтээгдэхүүн', tags: ['food'], sentenceIds: ['u5s1', 'u5s6'] },
      { id: 'u5l2', title: 'Напитки', titleBxr: 'Ундаанууд', tags: ['drink', 'food'], sentenceIds: ['u5s2'] },
      { id: 'u5l3', title: 'Дом и посуда', titleBxr: 'Гэр ба саба', tags: ['home', 'dish', 'furniture'], sentenceIds: ['u5s3', 'u5s5'] },
      { id: 'u5l4', title: 'Вкусно!', titleBxr: 'Амтатай!', tags: ['food', 'quality'], sentenceIds: ['u5s4', 'u5s6'] },
      {
        id: 'u5l5',
        title: 'Повторение раздела',
        titleBxr: 'Дахин hанаха',
        kind: 'review',
        tags: ['food', 'home', 'drink'],
        sentenceIds: ['u5s1', 'u5s3', 'u5s6'],
      },
    ],
  },
]

function buildUnit(spec: UnitSpec): { unit: Unit; lessons: Lesson[] } {
  const unitVocab = byTags(spec.lessons.flatMap((l) => l.tags))

  const lessons: Lesson[] = spec.lessons.map((l, index) => {
    const vocabIds = byTags(l.tags)
    return {
      id: l.id,
      unitId: spec.id,
      index,
      title: l.title,
      titleBxr: l.titleBxr,
      kind: l.kind ?? 'lesson',
      vocabIds,
      // В уроке «повторение» новой лексики нет — всё уже встречалось в разделе.
      newVocabIds: l.kind === 'review' ? [] : vocabIds,
      sentenceIds: l.sentenceIds ?? [],
    }
  })

  const unit: Unit = {
    id: spec.id,
    index: unitSpecs.indexOf(spec),
    title: spec.title,
    titleBxr: spec.titleBxr,
    description: spec.description,
    color: spec.color,
    colorShadow: spec.colorShadow,
    emoji: spec.emoji,
    lessonIds: lessons.map((l) => l.id),
  }

  void unitVocab
  return { unit, lessons }
}

const built = unitSpecs.map(buildUnit)

export const course: Course = {
  units: built.map((b) => b.unit),
  lessons: built.flatMap((b) => b.lessons),
  vocab: vocabById,
  sentences: sentenceById,
}

export function getLesson(lessonId: string): Lesson | undefined {
  return course.lessons.find((l) => l.id === lessonId)
}

export function getUnit(unitId: string): Unit | undefined {
  return course.units.find((u) => u.id === unitId)
}

export function getVocab(id: string): VocabItem | undefined {
  return vocabById.get(id)
}

export function getSentence(id: string): SentenceItem | undefined {
  return sentenceById.get(id)
}

export const allVocabItems = allVocab
export const allSentenceItems = allSentences

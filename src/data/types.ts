/** Части речи и типы лексики. */
export type Pos =
  | 'noun'
  | 'verb'
  | 'adj'
  | 'num'
  | 'pron'
  | 'adv'
  | 'phrase'
  | 'sound'
  | 'letter'

export interface VocabItem {
  id: string
  /** Бурятское написание (кириллица, с ө/ү/һ). */
  bxr: string
  /** Русский перевод. */
  ru: string
  /** Допустимые варианты перевода, которые тоже считаются правильными. */
  ruAlternatives?: string[]
  pos: Pos
  tags: string[]
  note?: string
  /** true — формулировку надо проверить носителем (см. docs/content-review.md). */
  needsReview?: boolean
}

export interface SentenceItem {
  id: string
  bxr: string
  ru: string
  tags: string[]
  needsReview?: boolean
}

export interface Unit {
  id: string
  index: number
  title: string
  titleBxr: string
  description: string
  /** HEX-цвет темы раздела. */
  color: string
  colorShadow: string
  emoji: string
  lessonIds: string[]
}

export interface Lesson {
  id: string
  unitId: string
  index: number
  title: string
  titleBxr: string
  /** review — только повторение ранее пройденного, без новой лексики. */
  kind: 'lesson' | 'review'
  /** Все слова урока (для дистракторов). */
  vocabIds: string[]
  /** Новые слова урока (попадают в словарь). */
  newVocabIds: string[]
  sentenceIds: string[]
}

export type ExerciseKind = 'select' | 'build' | 'match'

export interface SelectExercise {
  kind: 'select'
  id: string
  promptLang: 'ru' | 'bxr'
  prompt: string
  answer: string
  /** Несколько верных вариантов ответа, если у слова есть синонимичные переводы. */
  acceptedAnswers?: string[]
  options: string[]
  vocabId: string
  /** Фразовый выбор учитывает все слова из предложения в статистике. */
  sentenceId?: string
  relatedVocabIds?: string[]
}

export interface BuildExercise {
  kind: 'build'
  id: string
  promptLang: 'ru' | 'bxr'
  prompt: string
  answer: string
  /** Плитки: слова ответа + дистракторы, перемешаны. */
  tokens: string[]
  sentenceId: string
  /** Слова из словаря, которые реально встретились в собранной фразе. */
  relatedVocabIds?: string[]
}

export interface MatchPair {
  bxr: string
  ru: string
  vocabId: string
}

export interface MatchExercise {
  kind: 'match'
  id: string
  pairs: MatchPair[]
}

export type Exercise = SelectExercise | BuildExercise | MatchExercise

export interface Course {
  units: Unit[]
  lessons: Lesson[]
  vocab: Map<string, VocabItem>
  sentences: Map<string, SentenceItem>
}

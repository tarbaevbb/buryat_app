import type { VocabItem } from '../types'

/**
 * Раздел 1. Уншалга — чтение и первые слова.
 *
 * Раньше здесь были отдельные «звуки» (pos: 'sound' / 'letter'): буквы,
 * дифтонги и их транскрипции. Из них генератор упражнений делал бессмысленные
 * задания («Ы ы» → «звук [ы]», «уй» → «уй»), поэтому раздел переработан:
 * все уроки теперь собираются из настоящих слов, а фонетика отрабатывается
 * на них (слова с ө, ү, һ и дифтонгами).
 *
 * Теги здесь только «учебные» (reading + фонетические подтеги). Служебные
 * темы (food, home, animal…) не ставятся намеренно: `byTags()` собирает
 * слова по всему курсу, и такие теги утаскивали бы эти слова в чужие разделы.
 */
export const unit1: VocabItem[] = [
  // --- Гласные ө, ү ---
  { id: 'hun', bxr: 'хүн', ru: 'человек', transcription: 'хүн', pos: 'noun', tags: ['reading', 'vowel_oe'] },
  { id: 'ughe', bxr: 'үгэ', ru: 'слово', transcription: 'үгэ', pos: 'noun', tags: ['reading', 'vowel_oe'] },
  { id: 'uzeg', bxr: 'үзэг', ru: 'буква', transcription: 'үзэг', pos: 'noun', tags: ['reading', 'vowel_oe'] },
  { id: 'huen', bxr: 'һүн', ru: 'молоко', transcription: 'һүн', pos: 'noun', tags: ['reading', 'vowel_oe', 'sound_h'], note: 'сүү — вариант написания' },

  // --- Звук һ ---
  { id: 'usun', bxr: 'уһан', ru: 'вода', transcription: 'уhан', pos: 'noun', tags: ['reading', 'sound_h'] },
  { id: 'hain', bxr: 'һайн', ru: 'хороший', transcription: 'hайн', pos: 'adj', tags: ['reading', 'sound_h', 'diphthong'] },

  // --- Дифтонги ---
  { id: 'sai', bxr: 'сай', ru: 'чай', transcription: 'сай', pos: 'noun', tags: ['reading', 'diphthong'] },
  { id: 'noho', bxr: 'нохой', ru: 'собака', transcription: 'нохой', pos: 'noun', tags: ['reading', 'diphthong'] },

  // --- Остальные слова для чтения ---
  { id: 'ger', bxr: 'гэр', ru: 'дом', transcription: 'гэр', pos: 'noun', tags: ['reading'] },
  { id: 'morin', bxr: 'морин', ru: 'лошадь', transcription: 'морин', pos: 'noun', tags: ['reading'] },
  { id: 'nom', bxr: 'ном', ru: 'книга', transcription: 'ном', pos: 'noun', tags: ['reading'] },
  { id: 'khelen', bxr: 'хэлэн', ru: 'язык (речь)', transcription: 'хэлэн', pos: 'noun', tags: ['reading'] },
  { id: 'naran', bxr: 'наран', ru: 'солнце', transcription: 'наран', pos: 'noun', tags: ['reading'] },
  { id: 'modon', bxr: 'модон', ru: 'дерево', transcription: 'модон', pos: 'noun', tags: ['reading'] },
  { id: 'ehe', bxr: 'ехэ', ru: 'большой', transcription: 'ехэ', pos: 'adj', tags: ['reading'] },
  { id: 'khara', bxr: 'хара', ru: 'чёрный', transcription: 'хара', pos: 'adj', tags: ['reading'] },
  { id: 'sagaan', bxr: 'сагаан', ru: 'белый', transcription: 'сагаан', pos: 'adj', tags: ['reading'] },
  { id: 'ulaan', bxr: 'улаан', ru: 'красный', transcription: 'улаан', pos: 'adj', tags: ['reading'] },
  { id: 'nogoon', bxr: 'ногоон', ru: 'зелёный', transcription: 'ногоон', pos: 'adj', tags: ['reading'] },
  { id: 'shara', bxr: 'шара', ru: 'жёлтый', transcription: 'шара', pos: 'adj', tags: ['reading'] },
  { id: 'talha', bxr: 'талха', ru: 'хлеб', transcription: 'талха', pos: 'noun', tags: ['reading'] },
  { id: 'buga', bxr: 'буга', ru: 'олень', transcription: 'буга', pos: 'noun', tags: ['reading'], needsReview: true },
  { id: 'yabaha', bxr: 'ябаха', ru: 'идти', transcription: 'ябаха', pos: 'verb', tags: ['reading'] },
  { id: 'uuha', bxr: 'ууха', ru: 'пить', transcription: 'ууха', pos: 'verb', tags: ['reading'] },
  { id: 'edikhe', bxr: 'эдихэ', ru: 'есть (кушать)', transcription: 'эдихэ', pos: 'verb', tags: ['reading'] },
]

export const unit1Sentences = [
  { id: 'u1s1', bxr: 'Энэ гэр.', ru: 'Это дом.', tags: ['reading', 'u1'] },
  { id: 'u1s2', bxr: 'Энэ морин.', ru: 'Это лошадь.', tags: ['reading', 'u1'] },
  { id: 'u1s3', bxr: 'Сайн хүн.', ru: 'Хороший человек.', tags: ['reading', 'u1'], needsReview: true },
  { id: 'u1s4', bxr: 'Сагаан талха.', ru: 'Белый хлеб.', tags: ['reading', 'u1'] },
  { id: 'u1s5', bxr: 'Ногоон модон.', ru: 'Зелёное дерево.', tags: ['reading', 'u1'] },
  { id: 'u1s6', bxr: 'Би уһан уунаб.', ru: 'Я пью воду.', tags: ['reading', 'u1'] },
]

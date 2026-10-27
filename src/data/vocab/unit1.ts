import type { VocabItem } from '../types'

/**
 * Раздел 1. Үзэглэл — алфавит и звуки.
 * Цель: научиться читать специфические буквы бурятского алфавита
 * (ө, ү, һ, дифтонги) и короткие слова.
 */
export const unit1: VocabItem[] = [
  // --- Буквы и звуки ---
  { id: 'a', bxr: 'А а', ru: 'звук [а]', transcription: 'а', pos: 'sound', tags: ['alphabet', 'vowel'] },
  { id: 'o', bxr: 'О о', ru: 'звук [о]', transcription: 'о', pos: 'sound', tags: ['alphabet', 'vowel'] },
  { id: 'oe', bxr: 'Ө ө', ru: 'звук [ө] — как нем. ö', transcription: 'ө', pos: 'sound', tags: ['alphabet', 'vowel'], needsReview: true },
  { id: 'u', bxr: 'У у', ru: 'звук [у]', transcription: 'у', pos: 'sound', tags: ['alphabet', 'vowel'] },
  { id: 'ue', bxr: 'Ү ү', ru: 'звук [ү] — как нем. ü', transcription: 'ү', pos: 'sound', tags: ['alphabet', 'vowel'], needsReview: true },
  { id: 'e', bxr: 'Э э', ru: 'звук [э]', transcription: 'э', pos: 'sound', tags: ['alphabet', 'vowel'] },
  { id: 'i', bxr: 'И и', ru: 'звук [и]', transcription: 'и', pos: 'sound', tags: ['alphabet', 'vowel'] },
  { id: 'y', bxr: 'Ы ы', ru: 'звук [ы]', transcription: 'ы', pos: 'sound', tags: ['alphabet', 'vowel'] },
  { id: 'ha', bxr: 'Һ һ', ru: 'лёгкий выдох [h]', transcription: 'һ', pos: 'sound', tags: ['alphabet', 'consonant'] },
  { id: 'kh', bxr: 'Х х', ru: 'звук [х]', transcription: 'х', pos: 'sound', tags: ['alphabet', 'consonant'] },
  { id: 'ai', bxr: 'ай', ru: 'дифтонг [ай]', transcription: 'ай', pos: 'sound', tags: ['alphabet', 'diphthong'] },
  { id: 'oi', bxr: 'ой', ru: 'дифтонг [ой]', transcription: 'ой', pos: 'sound', tags: ['alphabet', 'diphthong'] },
  { id: 'ei', bxr: 'эй', ru: 'дифтонг [эй]', transcription: 'эй', pos: 'sound', tags: ['alphabet', 'diphthong'] },
  { id: 'ui', bxr: 'уй', ru: 'дифтонг [уй]', transcription: 'уй', pos: 'sound', tags: ['alphabet', 'diphthong'] },

  // --- Слова для отработки чтения ---
  { id: 'ger', bxr: 'гэр', ru: 'дом', transcription: 'гэр', pos: 'noun', tags: ['reading', 'home'] },
  { id: 'usun', bxr: 'уһан', ru: 'вода', transcription: 'уhан', pos: 'noun', tags: ['reading', 'food'] },
  { id: 'sai', bxr: 'сай', ru: 'чай', transcription: 'сай', pos: 'noun', tags: ['reading', 'food'] },
  { id: 'morin', bxr: 'морин', ru: 'лошадь', transcription: 'морин', pos: 'noun', tags: ['reading', 'animal'] },
  { id: 'noho', bxr: 'нохой', ru: 'собака', transcription: 'нохой', pos: 'noun', tags: ['reading', 'animal'] },
  { id: 'hun', bxr: 'хүн', ru: 'человек', transcription: 'хүн', pos: 'noun', tags: ['reading', 'people'] },
  { id: 'nom', bxr: 'ном', ru: 'книга', transcription: 'ном', pos: 'noun', tags: ['reading', 'school'] },
  { id: 'ughe', bxr: 'үгэ', ru: 'слово', transcription: 'үгэ', pos: 'noun', tags: ['reading', 'school'] },
  { id: 'khelen', bxr: 'хэлэн', ru: 'язык (речь)', transcription: 'хэлэн', pos: 'noun', tags: ['reading', 'school'] },
  { id: 'uzeg', bxr: 'үзэг', ru: 'буква', transcription: 'үзэг', pos: 'noun', tags: ['reading', 'school'] },
  { id: 'naran', bxr: 'наран', ru: 'солнце', transcription: 'наран', pos: 'noun', tags: ['reading', 'nature'] },
  { id: 'modon', bxr: 'модон', ru: 'дерево', transcription: 'модон', pos: 'noun', tags: ['reading', 'nature'] },
  { id: 'hain', bxr: 'һайн', ru: 'хороший', transcription: 'hайн', pos: 'adj', tags: ['reading', 'quality'] },
  { id: 'ehe', bxr: 'ехэ', ru: 'большой', transcription: 'ехэ', pos: 'adj', tags: ['reading', 'quality'] },
  { id: 'khara', bxr: 'хара', ru: 'чёрный', transcription: 'хара', pos: 'adj', tags: ['reading', 'color'] },
  { id: 'sagaan', bxr: 'сагаан', ru: 'белый', transcription: 'сагаан', pos: 'adj', tags: ['reading', 'color'] },
  { id: 'ulaan', bxr: 'улаан', ru: 'красный', transcription: 'улаан', pos: 'adj', tags: ['reading', 'color'] },
  { id: 'nogoon', bxr: 'ногоон', ru: 'зелёный', transcription: 'ногоон', pos: 'adj', tags: ['reading', 'color'] },
  { id: 'shara', bxr: 'шара', ru: 'жёлтый', transcription: 'шара', pos: 'adj', tags: ['reading', 'color'] },
  { id: 'huen', bxr: 'һүн', ru: 'молоко', transcription: 'һүн', pos: 'noun', tags: ['reading', 'food', 'drink'], note: 'сүү — вариант написания' },
  { id: 'talha', bxr: 'талха', ru: 'хлеб', transcription: 'талха', pos: 'noun', tags: ['reading', 'food'] },
  { id: 'buga', bxr: 'буга', ru: 'олень', transcription: 'буга', pos: 'noun', tags: ['reading', 'animal'], needsReview: true },
  { id: 'yabaha', bxr: 'ябаха', ru: 'идти', transcription: 'ябаха', pos: 'verb', tags: ['reading', 'action'] },
  { id: 'uuha', bxr: 'ууха', ru: 'пить', transcription: 'ууха', pos: 'verb', tags: ['reading', 'action'] },
  { id: 'edikhe', bxr: 'эдихэ', ru: 'есть (кушать)', transcription: 'эдихэ', pos: 'verb', tags: ['reading', 'action'] },
]

export const unit1Sentences = [
  { id: 'u1s1', bxr: 'Энэ гэр.', ru: 'Это дом.', tags: ['reading', 'u1'] },
  { id: 'u1s2', bxr: 'Энэ морин.', ru: 'Это лошадь.', tags: ['reading', 'u1'] },
  { id: 'u1s3', bxr: 'Сайн хүн.', ru: 'Хороший человек.', tags: ['reading', 'u1'], needsReview: true },
  { id: 'u1s4', bxr: 'Сагаан талха.', ru: 'Белый хлеб.', tags: ['reading', 'u1'] },
  { id: 'u1s5', bxr: 'Ногоон модон.', ru: 'Зелёное дерево.', tags: ['reading', 'u1'] },
  { id: 'u1s6', bxr: 'Би уһан уунаб.', ru: 'Я пью воду.', tags: ['reading', 'u1'] },
]

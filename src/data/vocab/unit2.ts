import type { VocabItem } from '../types'

/**
 * Раздел 1. Түрүүшын үгэнүүд — первые слова.
 *
 * Здесь живут звуки (ө, ү, һ, дифтонги) и первые слова, а также вежливые
 * слова и вопросы — то, что не вошло в раздел «Танилсалга».
 *
 * Теги описывают тематику слов. Состав уроков задаётся явно в course.ts,
 * чтобы тематические пересечения не переносили слова в чужой урок.
 */
export const unit2: VocabItem[] = [
  // --- Звуки ө, ү ---
  { id: 'hun', bxr: 'хүн', ru: 'человек', transcription: 'хүн', pos: 'noun', tags: ['reading', 'vowel_oe'] },
  { id: 'ughe', bxr: 'үгэ', ru: 'слово', transcription: 'үгэ', pos: 'noun', tags: ['reading', 'vowel_oe'] },
  { id: 'uzeg', bxr: 'үзэг', ru: 'буква', transcription: 'үзэг', pos: 'noun', tags: ['reading', 'vowel_oe'] },
  { id: 'huen', bxr: 'һүн', ru: 'молоко', transcription: 'һүн', pos: 'noun', tags: ['reading', 'vowel_oe', 'sound_h'], note: 'сүү — вариант написания' },

  // --- Звук һ ---
  { id: 'usun', bxr: 'уһан', ru: 'вода', transcription: 'уһан', pos: 'noun', tags: ['reading', 'sound_h'] },
  { id: 'hain', bxr: 'һайн', ru: 'хороший', transcription: 'һайн', pos: 'adj', tags: ['reading', 'sound_h', 'diphthong'] },

  // --- Дифтонги ---
  { id: 'sai', bxr: 'сай', ru: 'чай', transcription: 'сай', pos: 'noun', tags: ['reading', 'diphthong'] },
  { id: 'noho', bxr: 'нохой', ru: 'собака', transcription: 'нохой', pos: 'noun', tags: ['reading', 'diphthong'] },

  // --- Слова для чтения ---
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
  { id: 'yabaha', bxr: 'ябаха', ru: 'идти', transcription: 'ябаха', pos: 'verb', tags: ['reading'] },
  { id: 'uuha', bxr: 'ууха', ru: 'пить', transcription: 'ууха', pos: 'verb', tags: ['reading'] },
  { id: 'edikhe', bxr: 'эдихэ', ru: 'есть (кушать)', transcription: 'эдихэ', pos: 'verb', tags: ['reading'] },

  // --- Вежливые слова ---
  { id: 'sain', bxr: 'сайн', ru: 'хороший, добрый (можно использовать как приветствие)', pos: 'adj', tags: ['polite'], transcription: 'сайн' },
  { id: 'baina', bxr: 'байна', ru: 'есть, находится', pos: 'verb', tags: ['polite'], transcription: 'байна' },
  { id: 'sain_baina', bxr: 'сайн байна', ru: 'здравствуй', pos: 'verb', tags: ['polite'], transcription: 'сайн байна' },
  { id: 'tiim', bxr: 'тиимэ', ru: 'да, верно', pos: 'phrase', tags: ['polite'], transcription: 'тиимэ' },
  { id: 'ugui', bxr: 'үгүй', ru: 'нет, не имеется', pos: 'phrase', tags: ['polite'], transcription: 'үгүй' },
  { id: 'muu', bxr: 'муу', ru: 'плохо', pos: 'adv', tags: ['polite'], transcription: 'муу' },
  { id: 'zaa', bxr: 'заа', ru: 'ладно', pos: 'phrase', tags: ['polite']},

  // --- Вопросы, школа, дом ---
  { id: 'khen_be', bxr: 'хэн бэ?', ru: 'кто (это)?', pos: 'phrase', tags: ['question'], transcription: 'хэн бэ' },
  { id: 'yamar', bxr: 'ямар', ru: 'какой', pos: 'pron', tags: ['question'], transcription: 'ямар' },
  { id: 'khaana', bxr: 'хаана', ru: 'где', pos: 'adv', tags: ['question'], transcription: 'хаана' },
  { id: 'hedi', bxr: 'хэды', ru: 'сколько', pos: 'pron', tags: ['question'], transcription: 'хэды' },
  { id: 'yuu', bxr: 'юу', ru: 'что', pos: 'pron', tags: ['question'], transcription: 'юу' },
  { id: 'ene', bxr: 'энэ', ru: 'это', pos: 'pron', tags: ['question'], transcription: 'энэ' },
  { id: 'tere', bxr: 'тэрэ', ru: 'то', pos: 'pron', tags: ['question'], transcription: 'тэрэ' },
  { id: 'medene', bxr: 'мэдэнэ', ru: 'знает', pos: 'verb', tags: ['question'], transcription: 'мэдэнэ' },
  { id: 'bish', bxr: 'бэшэ', ru: 'не (отрицание)', pos: 'phrase', tags: ['question'], transcription: 'бэшэ' },
  { id: 'bagsha', bxr: 'багша', ru: 'учитель', pos: 'noun', tags: ['question', 'school'], transcription: 'багша' },
  { id: 'huragshan', bxr: 'һурагша', ru: 'ученик', pos: 'noun', tags: ['question', 'school'], transcription: 'һурагша' },
  { id: 'geree', bxr: 'гэртээ', ru: 'дома', pos: 'adv', tags: ['question', 'home'], transcription: 'гэртээ' },
]

export const unit2Sentences = [
  { id: 'u1s1', bxr: 'Энэ гэр.', ru: 'Это дом.', tags: ['reading', 'u1'] },
  { id: 'u1s2', bxr: 'Энэ морин.', ru: 'Это лошадь.', tags: ['reading', 'u1'] },
  { id: 'u1s3', bxr: 'Сайн хүн.', ru: 'Хороший человек.', tags: ['reading', 'u1'], needsReview: true },
  { id: 'u1s4', bxr: 'Сагаан талха.', ru: 'Белый хлеб.', tags: ['reading', 'u1'] },
  { id: 'u1s5', bxr: 'Ногоон модон.', ru: 'Зелёное дерево.', tags: ['reading', 'u1'] },
  { id: 'u1s6', bxr: 'Би уһан уунаб.', ru: 'Я пью воду.', tags: ['reading', 'u1'] },
  { id: 'u1s7', bxr: 'Энэ хэн бэ?', ru: 'Кто это?', tags: ['question', 'u1'] },
  { id: 'u1s8', bxr: 'Энэ багша.', ru: 'Это учитель.', tags: ['question', 'u1'] },
]

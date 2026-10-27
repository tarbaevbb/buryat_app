import type { VocabItem } from '../types'

/**
 * Раздел 3. Тоо ба саг — числа и время.
 */
export const unit3: VocabItem[] = [
  // Числа 1–10
  { id: 'neg', bxr: 'нэгэн', ru: 'один', pos: 'num', tags: ['number', 'num1_10'], transcription: 'нэгэн' },
  { id: 'khoyor', bxr: 'хоёр', ru: 'два', pos: 'num', tags: ['number', 'num1_10'], transcription: 'хоёр' },
  { id: 'gurba', bxr: 'гурбан', ru: 'три', pos: 'num', tags: ['number', 'num1_10'], transcription: 'гурбан' },
  { id: 'durbe', bxr: 'дүрбэн', ru: 'четыре', pos: 'num', tags: ['number', 'num1_10'], transcription: 'дүрбэн' },
  { id: 'taba', bxr: 'табан', ru: 'пять', pos: 'num', tags: ['number', 'num1_10'], transcription: 'табан' },
  { id: 'zurgaa', bxr: 'зургаан', ru: 'шесть', pos: 'num', tags: ['number', 'num1_10'], transcription: 'зургаан' },
  { id: 'dolo', bxr: 'долоон', ru: 'семь', pos: 'num', tags: ['number', 'num1_10'], transcription: 'долоон' },
  { id: 'naima', bxr: 'найман', ru: 'восемь', pos: 'num', tags: ['number', 'num1_10'], transcription: 'найман' },
  { id: 'yuhen', bxr: 'юhэн', ru: 'девять', pos: 'num', tags: ['number', 'num1_10'], transcription: 'юhэн' },
  { id: 'arba', bxr: 'арбан', ru: 'десять', pos: 'num', tags: ['number', 'num1_10'], transcription: 'арбан' },
  // Десятки
  { id: 'khori', bxr: 'хорин', ru: 'двадцать', pos: 'num', tags: ['number', 'num10_100'], transcription: 'хорин' },
  { id: 'guchi', bxr: 'гушан', ru: 'тридцать', pos: 'num', tags: ['number', 'num10_100'], transcription: 'гушан' },
  { id: 'dushi', bxr: 'дүшэн', ru: 'сорок', pos: 'num', tags: ['number', 'num10_100'], transcription: 'дүшэн' },
  { id: 'tabi', bxr: 'табин', ru: 'пятьдесят', pos: 'num', tags: ['number', 'num10_100'], transcription: 'табин' },
  { id: 'zhara', bxr: 'жаран', ru: 'шестьдесят', pos: 'num', tags: ['number', 'num10_100'], transcription: 'жаран' },
  { id: 'dala', bxr: 'далан', ru: 'семьдесят', pos: 'num', tags: ['number', 'num10_100'], transcription: 'далан' },
  { id: 'naya', bxr: 'наян', ru: 'восемьдесят', pos: 'num', tags: ['number', 'num10_100'], transcription: 'наян' },
  { id: 'yere', bxr: 'ерэн', ru: 'девяносто', pos: 'num', tags: ['number', 'num10_100'], transcription: 'ерэн' },
  { id: 'zuu', bxr: 'зуун', ru: 'сто', pos: 'num', tags: ['number', 'num10_100'], transcription: 'зуун' },
  // Дни недели
  { id: 'd1', bxr: 'дабаан', ru: 'понедельник', pos: 'noun', tags: ['weekday', 'time'], needsReview: true },
  { id: 'd2', bxr: 'мягмар', ru: 'вторник', pos: 'noun', tags: ['weekday', 'time'], transcription: 'мягмар' },
  { id: 'd3', bxr: 'лхагба', ru: 'среда', pos: 'noun', tags: ['weekday', 'time'], transcription: 'лхагба', needsReview: true },
  { id: 'd4', bxr: 'пүрэбэ', ru: 'четверг', pos: 'noun', tags: ['weekday', 'time'], transcription: 'пүрэбэ' },
  { id: 'd5', bxr: 'баасан', ru: 'пятница', pos: 'noun', tags: ['weekday', 'time'], transcription: 'баасан' },
  { id: 'd6', bxr: 'бүбэ', ru: 'суббота', pos: 'noun', tags: ['weekday', 'time'], needsReview: true },
  { id: 'd7', bxr: 'няма', ru: 'воскресенье', pos: 'noun', tags: ['weekday', 'time'], transcription: 'няма' },
  // Время
  { id: 'sag', bxr: 'саг', ru: 'время, час', pos: 'noun', tags: ['time'], transcription: 'саг' },
  { id: 'ude', bxr: 'үдэ', ru: 'полдень, день', pos: 'noun', tags: ['time'], transcription: 'үдэ' },
  { id: 'honi', bxr: 'hонин', ru: 'интересный', pos: 'adj', tags: ['quality'], transcription: 'hонин' },
  { id: 'honog', bxr: 'хоног', ru: 'сутки, день', pos: 'noun', tags: ['time'], needsReview: true },
  { id: 'odo', bxr: 'одоо', ru: 'сейчас', pos: 'adv', tags: ['time'], transcription: 'одоо' },
  { id: 'ugloo', bxr: 'үглөө', ru: 'утро', pos: 'adj', tags: ['time'], needsReview: true },
]

export const unit3Sentences = [
  { id: 'u3s1', bxr: 'Нэгэн, хоёр, гурбан.', ru: 'Один, два, три.', tags: ['number', 'u3'] },
  { id: 'u3s2', bxr: 'Би хорин настай.', ru: 'Мне двадцать лет.', tags: ['number', 'age', 'u3'], needsReview: true },
  { id: 'u3s3', bxr: 'Одоо хэдэн саг бэ?', ru: 'Сколько сейчас времени?', tags: ['time', 'question', 'u3'], needsReview: true },
  { id: 'u3s4', bxr: 'Одоо арбан саг.', ru: 'Сейчас десять часов.', tags: ['time', 'u3'], needsReview: true },
  { id: 'u3s5', bxr: 'Баасан гараг.', ru: 'Пятница.', tags: ['weekday', 'u3'], needsReview: true },
  { id: 'u3s6', bxr: 'Табан талха.', ru: 'Пять лепёшек.', tags: ['number', 'food', 'u3'] },
]

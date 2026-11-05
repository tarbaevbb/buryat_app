import type { VocabItem } from '../types'

/**
 * Раздел 2. Тоо ба саг — числа и время.
 */
export const unit2: VocabItem[] = [
  // Числа 1–15
  { id: 'neg', bxr: 'нэгэн', ru: 'один', pos: 'num', tags: ['number', 'num1_10'], transcription: 'нэгэн' },
  { id: 'khoyor', bxr: 'хоёр', ru: 'два', pos: 'num', tags: ['number', 'num1_10'], transcription: 'хоёр' },
  { id: 'gurba', bxr: 'гурбан', ru: 'три', pos: 'num', tags: ['number', 'num1_10'], transcription: 'гурбан' },
  { id: 'durbe', bxr: 'дүрбэн', ru: 'четыре', pos: 'num', tags: ['number', 'num1_10'], transcription: 'дүрбэн' },
  { id: 'taba', bxr: 'табан', ru: 'пять', pos: 'num', tags: ['number', 'num1_10'], transcription: 'табан' },
  { id: 'zurgaa', bxr: 'зургаан', ru: 'шесть', pos: 'num', tags: ['number', 'num1_10'], transcription: 'зургаан' },
  { id: 'dolo', bxr: 'долоон', ru: 'семь', pos: 'num', tags: ['number', 'num1_10'], transcription: 'долоон' },
  { id: 'naima', bxr: 'найман', ru: 'восемь', pos: 'num', tags: ['number', 'num1_10'], transcription: 'найман' },
  { id: 'yuhen', bxr: 'юһэн', ru: 'девять', pos: 'num', tags: ['number', 'num1_10'], transcription: 'юһэн' },
  { id: 'arba', bxr: 'арбан', ru: 'десять', pos: 'num', tags: ['number', 'num1_10'], transcription: 'арбан' },
  { id: 'arban_neg', bxr: 'арбан нэгэн', ru: 'одиннадцать', pos: 'num', tags: ['number', 'num11_19'] },
  { id: 'arban_khoyor', bxr: 'арбан хоёр', ru: 'двенадцать', pos: 'num', tags: ['number', 'num11_19'] },
  { id: 'arban_gurba', bxr: 'арбан гурбан', ru: 'тринадцать', pos: 'num', tags: ['number', 'num11_19'] },
  { id: 'arban_durbe', bxr: 'арбан дүрбэн', ru: 'четырнадцать', pos: 'num', tags: ['number', 'num11_19'] },
  { id: 'arban_taba', bxr: 'арбан табан', ru: 'пятнадцать', pos: 'num', tags: ['number', 'num11_19'] },
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
  { id: 'd1', bxr: 'дабаа', ru: 'понедельник', pos: 'noun', tags: ['weekday', 'time'] },
  { id: 'd2', bxr: 'мягмар', ru: 'вторник', pos: 'noun', tags: ['weekday', 'time'], transcription: 'мягмар' },
  { id: 'd3', bxr: 'лхагба', ru: 'среда', pos: 'noun', tags: ['weekday', 'time'], note: 'Произносится как һагба' },
  { id: 'd4', bxr: 'пүрбэ', ru: 'четверг', pos: 'noun', tags: ['weekday', 'time'], transcription: 'пүрбэ' },
  { id: 'd5', bxr: 'баасан', ru: 'пятница', pos: 'noun', tags: ['weekday', 'time'], transcription: 'баасан' },
  { id: 'd6', bxr: 'бямба', ru: 'суббота', pos: 'noun', tags: ['weekday', 'time'], transcription: 'бямба' },
  { id: 'd7', bxr: 'нима', ru: 'воскресенье', pos: 'noun', tags: ['weekday', 'time'], transcription: 'нима', note: 'Также встречается форма няма.' },
  // Время
  { id: 'sag', bxr: 'саг', ru: 'время, час', pos: 'noun', tags: ['time'], transcription: 'саг' },
  { id: 'ude', bxr: 'үдэ', ru: 'полдень', pos: 'noun', tags: ['time'], transcription: 'үдэ' },
  { id: 'uder', bxr: 'үдэр', ru: 'день', pos: 'noun', tags: ['time'], transcription: 'үдэр' },
  { id: 'munouder', bxr: 'мүнөөдэр', ru: 'сегодня', pos: 'noun', tags: ['time'], transcription: 'мүнөөдэр' },
  { id: 'odo', bxr: 'одоо', ru: 'сейчас', pos: 'adv', tags: ['time'], transcription: 'одоо' },
  { id: 'ugloo', bxr: 'үглөө', ru: 'завтра', pos: 'adj', tags: ['time'] },
  { id: 'usergelder', bxr: 'үсэгэлдэр', ru: 'вчера', pos: 'adj', tags: ['time'] },
  { id: 'sag_hedy_bolozho_bainab', bxr: 'Саг хэды боложо байнаб?', ru: 'Который час?', pos: 'phrase', tags: ['time'] },
  { id: 'munuu_naiman_chas', bxr: 'Мүнөө найман час боложо байна.', ru: 'Сейчас восемь часов.', pos: 'phrase', tags: ['time'] },
]

export const unit2Sentences = [
  { id: 'u2s1', bxr: 'Нэгэн, хоёр, гурбан.', ru: 'Один, два, три.', tags: ['number', 'u2'] },
  { id: 'u2s2', bxr: 'Хорин, гушан, дүшэн.', ru: 'Двадцать, тридцать, сорок.', tags: ['number', 'u2'] },
  { id: 'u2s3', bxr: 'Саг хэды боложо байнаб?', ru: 'Который час?', tags: ['time', 'question', 'u2'] },
  { id: 'u2s4', bxr: 'Мүнөө найман час боложо байна.', ru: 'Сейчас восемь часов.', tags: ['time', 'u2'] },
  { id: 'u2s5', bxr: 'Мүнөөдэр гарагай хоёр.', ru: 'Сегодня понедельник.', tags: ['weekday', 'u2'] },
  { id: 'u2s6', bxr: 'Табан талха.', ru: 'Пять лепёшек.', tags: ['number', 'food', 'u2'] },
  { id: 'u2s7', bxr: 'Гурбан гурба хэдыб?', ru: 'Сколько будет трижды три?', tags: ['number', 'u2'] },
]

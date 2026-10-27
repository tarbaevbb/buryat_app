import type { VocabItem } from '../types'

/**
 * Раздел 2. Мэндээлгэ — приветствия и знакомство.
 */
export const unit2: VocabItem[] = [
  { id: 'sain_baina', bxr: 'Сайн байна уу?', ru: 'Здравствуйте!', pos: 'phrase', tags: ['greeting'], note: 'букв. «здоровы ли вы?»' },
  { id: 'mendee', bxr: 'Мэндээ!', ru: 'Привет!', pos: 'phrase', tags: ['greeting'] },
  { id: 'sain', bxr: 'сайн', ru: 'хорошо, здоровый', pos: 'adj', tags: ['greeting', 'quality'], transcription: 'сайн' },
  { id: 'baina', bxr: 'байна', ru: 'есть, находится', pos: 'verb', tags: ['greeting', 'base'], transcription: 'байна' },
  { id: 'bayarla', bxr: 'баярлалаа', ru: 'спасибо', pos: 'phrase', tags: ['greeting', 'polite'], transcription: 'баярлалаа' },
  { id: 'usharla', bxr: 'ушарлаа', ru: 'извините, простите', pos: 'phrase', tags: ['greeting', 'polite'], transcription: 'ушарлаа', needsReview: true },
  { id: 'tiim', bxr: 'тиимэ', ru: 'да, верно', pos: 'phrase', tags: ['polite'], transcription: 'тиимэ' },
  { id: 'ugui', bxr: 'үгүй', ru: 'нет, не имеется', pos: 'phrase', tags: ['polite'], transcription: 'үгүй' },
  { id: 'bi', bxr: 'би', ru: 'я', pos: 'pron', tags: ['pronoun'], transcription: 'би' },
  { id: 'shi', bxr: 'ши', ru: 'ты', pos: 'pron', tags: ['pronoun'], transcription: 'ши' },
  { id: 'ta', bxr: 'та', ru: 'вы', pos: 'pron', tags: ['pronoun'], transcription: 'та' },
  { id: 'nere', bxr: 'нэрэ', ru: 'имя', pos: 'noun', tags: ['people', 'intro'], transcription: 'нэрэ' },
  { id: 'nere_mnii', bxr: 'нэрэмни', ru: 'моё имя', pos: 'phrase', tags: ['intro'], transcription: 'нэрэмни' },
  { id: 'shini_nere', bxr: 'Шинии нэрэ хэн бэ?', ru: 'Как тебя зовут?', pos: 'phrase', tags: ['intro'], needsReview: true },
  { id: 'ta_nere', bxr: 'Танай нэрэ хэн бэ?', ru: 'Как вас зовут?', pos: 'phrase', tags: ['intro'], needsReview: true },
  { id: 'khen_be', bxr: 'хэн бэ?', ru: 'кто (это)?', pos: 'phrase', tags: ['question'], transcription: 'хэн бэ' },
  { id: 'yamar', bxr: 'ямар', ru: 'какой', pos: 'pron', tags: ['question'], transcription: 'ямар' },
  { id: 'khaana', bxr: 'хаана', ru: 'где', pos: 'adv', tags: ['question'], transcription: 'хаана' },
  { id: 'bagsha', bxr: 'багша', ru: 'учитель', pos: 'noun', tags: ['people', 'school'], transcription: 'багша' },
  { id: 'huragshan', bxr: 'hурагша', ru: 'ученик', pos: 'noun', tags: ['people', 'school'], transcription: 'hурагша' },
  { id: 'geree', bxr: 'гэртээ', ru: 'дома', pos: 'adv', tags: ['home'], transcription: 'гэртээ' },
  { id: 'hedi', bxr: 'хэды', ru: 'сколько', pos: 'pron', tags: ['question'], needsReview: true },
  { id: 'yuu', bxr: 'юу', ru: 'что', pos: 'pron', tags: ['question'], transcription: 'юу' },
  { id: 'ene', bxr: 'энэ', ru: 'это', pos: 'pron', tags: ['base'], transcription: 'энэ' },
  { id: 'tere', bxr: 'тэрэ', ru: 'то', pos: 'pron', tags: ['base'], transcription: 'тэрэ' },
  { id: 'medene', bxr: 'мэдэнэ', ru: 'знает', pos: 'verb', tags: ['base'], transcription: 'мэдэнэ' },
  { id: 'bish', bxr: 'бэшэ', ru: 'не (отрицание)', pos: 'phrase', tags: ['base'], transcription: 'бэшэ' },
  { id: 'muu', bxr: 'муу', ru: 'плохо', pos: 'adv', tags: ['quality'], transcription: 'муу' },
  { id: 'daa', bxr: 'даа', ru: 'ладно, хорошо (частица)', pos: 'phrase', tags: ['polite'], needsReview: true },
  { id: 'bayartai', bxr: 'баяртай', ru: 'до свидания', pos: 'phrase', tags: ['greeting'], transcription: 'баяртай' },
]

export const unit2Sentences = [
  { id: 'u2s1', bxr: 'Сайн байна уу?', ru: 'Здравствуйте!', tags: ['greeting', 'u2'] },
  { id: 'u2s2', bxr: 'Би сайн байнаб.', ru: 'Я хорошо (поживаю).', tags: ['greeting', 'u2'], needsReview: true },
  { id: 'u2s3', bxr: 'Энэ хэн бэ?', ru: 'Кто это?', tags: ['question', 'u2'] },
  { id: 'u2s4', bxr: 'Энэ багша.', ru: 'Это учитель.', tags: ['intro', 'u2'] },
  { id: 'u2s5', bxr: 'Шинии нэрэ хэн бэ?', ru: 'Как тебя зовут?', tags: ['intro', 'u2'], needsReview: true },
  { id: 'u2s6', bxr: 'Баярлалаа!', ru: 'Спасибо!', tags: ['polite', 'u2'] },
  { id: 'u2s7', bxr: 'Ушарлаа.', ru: 'Извините.', tags: ['polite', 'u2'], needsReview: true },
  { id: 'u2s8', bxr: 'Баяртай!', ru: 'До свидания!', tags: ['greeting', 'u2'] },
]

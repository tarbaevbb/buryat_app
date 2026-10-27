import type { VocabItem } from '../types'

/**
 * Раздел 4. Бүлэ — семья и люди.
 */
export const unit4: VocabItem[] = [
  { id: 'aba', bxr: 'аба', ru: 'отец', pos: 'noun', tags: ['family'], transcription: 'аба' },
  { id: 'ezhy', bxr: 'эжы', ru: 'мать', pos: 'noun', tags: ['family'], transcription: 'эжы' },
  { id: 'aha', bxr: 'аха', ru: 'старший брат', pos: 'noun', tags: ['family'], transcription: 'аха' },
  { id: 'egeshe', bxr: 'эгэшэ', ru: 'старшая сестра', pos: 'noun', tags: ['family'], transcription: 'эгэшэ' },
  { id: 'duu', bxr: 'дүү', ru: 'младший брат/сестра', pos: 'noun', tags: ['family'], transcription: 'дүү' },
  { id: 'khubun', bxr: 'хүбүүн', ru: 'сын, мальчик', pos: 'noun', tags: ['family', 'people'], transcription: 'хүбүүн' },
  { id: 'basagan', bxr: 'басаган', ru: 'дочь, девочка', pos: 'noun', tags: ['family', 'people'], transcription: 'басаган' },
  { id: 'nagasa', bxr: 'нагаса', ru: 'дядя (по матери)', pos: 'noun', tags: ['family'], transcription: 'нагаса', needsReview: true },
  { id: 'abagai', bxr: 'абгай', ru: 'тётя (по отцу)', pos: 'noun', tags: ['family'], transcription: 'абгай', needsReview: true },
  { id: 'khugshe', bxr: 'хүгшэн', ru: 'старый', pos: 'adj', tags: ['people', 'quality'], transcription: 'хүгшэн' },
  { id: 'zaluu', bxr: 'залуу', ru: 'молодой', pos: 'adj', tags: ['people', 'quality'], transcription: 'залуу' },
  { id: 'bule', bxr: 'бүлэ', ru: 'семья', pos: 'noun', tags: ['family'], transcription: 'бүлэ' },
  { id: 'naha', bxr: 'наhан', ru: 'возраст, годы', pos: 'noun', tags: ['age'], transcription: 'наhан' },
  { id: 'nasta', bxr: 'наста', ru: 'лет (кому-то)', pos: 'phrase', tags: ['age'], transcription: 'наста', needsReview: true },
  { id: 'khoyor_duu', bxr: 'хоёр дүү', ru: 'двое младших', pos: 'phrase', tags: ['family'], transcription: 'хоёр дүү' },
  { id: 'ger_bule', bxr: 'гэр бүлэ', ru: 'семья (дом-семья)', pos: 'phrase', tags: ['family'], transcription: 'гэр бүлэ' },
  { id: 'uulzaha', bxr: 'уулзаха', ru: 'встречаться', pos: 'verb', tags: ['action'], transcription: 'уулзаха' },
  { id: 'durakhai', bxr: 'дуратай', ru: 'любимый', pos: 'adj', tags: ['quality'], transcription: 'дуратай' },
  { id: 'khairtai', bxr: 'хайртай', ru: 'дорогой, любимый', pos: 'adj', tags: ['quality'], transcription: 'хайртай' },
  { id: 'ajil', bxr: 'ажал', ru: 'работа', pos: 'noun', tags: ['work'], transcription: 'ажал' },
  { id: 'ajilsha', bxr: 'ажалша', ru: 'работник', pos: 'noun', tags: ['work', 'people'], transcription: 'ажалша' },
  { id: 'baha', bxr: 'баhа', ru: 'ещё, тоже', pos: 'adv', tags: ['base'], transcription: 'баhа' },
  { id: 'orda', bxr: 'ордо', ru: 'дворец', pos: 'noun', tags: ['place'], needsReview: true },
  { id: 'zurag', bxr: 'зураг', ru: 'картина, фото', pos: 'noun', tags: ['object'], transcription: 'зураг' },
  { id: 'ongoso', bxr: 'онгосо', ru: 'самолёт', pos: 'noun', tags: ['transport'], needsReview: true },
  { id: 'gar', bxr: 'гар', ru: 'рука', pos: 'noun', tags: ['body'], transcription: 'гар' },
]

export const unit4Sentences = [
  { id: 'u4s1', bxr: 'Энэ минии аба.', ru: 'Это мой отец.', tags: ['family', 'u4'], needsReview: true },
  { id: 'u4s2', bxr: 'Энэ минии эжы.', ru: 'Это моя мать.', tags: ['family', 'u4'], needsReview: true },
  { id: 'u4s3', bxr: 'Манай бүлэ ехэ.', ru: 'Наша семья большая.', tags: ['family', 'u4'], needsReview: true },
  { id: 'u4s4', bxr: 'Би ахатай.', ru: 'У меня есть старший брат.', tags: ['family', 'u4'], needsReview: true },
  { id: 'u4s5', bxr: 'Хүбүүн залуу.', ru: 'Мальчик молодой.', tags: ['people', 'u4'] },
  { id: 'u4s6', bxr: 'Эгэшэ багша.', ru: 'Старшая сестра — учитель.', tags: ['family', 'u4'] },
]

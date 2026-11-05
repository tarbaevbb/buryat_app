import type { VocabItem } from '../types'

/**
 * Раздел 4. Бүлэ — семья и люди.
 */
export const unit4: VocabItem[] = [
  { id: 'aba', bxr: 'аба', ru: 'отец', pos: 'noun', tags: ['family'], transcription: 'аба' },
  { id: 'ezhy', bxr: 'эжы', ru: 'мать', pos: 'noun', tags: ['family'], transcription: 'эжы' },
  { id: 'khubun', bxr: 'хүбүүн', ru: 'сын, мальчик', pos: 'noun', tags: ['family', 'people'], transcription: 'хүбүүн' },
  { id: 'basagan', bxr: 'басаган', ru: 'дочь, девочка', pos: 'noun', tags: ['family', 'people'], transcription: 'басаган' },
  { id: 'aha', bxr: 'ахай', ru: 'старший брат', pos: 'noun', tags: ['family'], transcription: 'ахай' },
  { id: 'egeshe', bxr: 'абжаа', ru: 'старшая сестра', pos: 'noun', tags: ['family'], transcription: 'абжаа' },
  { id: 'duu', bxr: 'дүү хүбүүн', ru: 'младший брат', pos: 'noun', tags: ['family'], transcription: 'дүү хүбүүн' },
  { id: 'duu', bxr: 'дүү басаган', ru: 'младшая сестра', pos: 'noun', tags: ['family'], transcription: 'дүү басаган' },
  { id: 'ubgen_aba', bxr: 'хүгшэн аба', ru: 'дедушка (по отцу)', pos: 'phrase', tags: ['family'] },
  { id: 'khugshe_ezhy', bxr: 'хүгшэн эжы', ru: 'бабушка (по отцу)', pos: 'phrase', tags: ['family'] },
  { id: 'nukher', bxr: 'нүхэр', ru: 'друг', pos: 'noun', tags: ['people', 'family'] },
  { id: 'ene_munuu_ubgen_aba', bxr: 'Энэ мүнөө үбгэн аба.', ru: 'Это дедушка.', pos: 'phrase', tags: ['family'] },
  { id: 'ene_minii_nukher_badma', bxr: 'Энэ минии нүхэр Бадма.', ru: 'Это мой друг Бадма.', pos: 'phrase', tags: ['family'] },
  { id: 'bide_ubgen_aba_haa_huraataibdi', bxr: 'Бидэ үбгэн абаһаа һураатайбди.', ru: 'Мы учимся у дедушки.', pos: 'phrase', tags: ['family'] },
  { id: 'nagasa', bxr: 'нагаса', ru: 'дядя (по матери)', pos: 'noun', tags: ['family'], transcription: 'нагаса', needsReview: true },
  { id: 'abagai', bxr: 'абгай', ru: 'тётя (по отцу)', pos: 'noun', tags: ['family'], transcription: 'абгай', needsReview: true },
  { id: 'khugshe', bxr: 'хүгшэн', ru: 'старый', pos: 'adj', tags: ['people', 'quality'], transcription: 'хүгшэн' },
  { id: 'zaluu', bxr: 'залуу', ru: 'молодой', pos: 'adj', tags: ['people', 'quality'], transcription: 'залуу' },
  { id: 'bule', bxr: 'бүлэ', ru: 'семья', pos: 'noun', tags: ['family'], transcription: 'бүлэ' },
  { id: 'naha', bxr: 'наһан', ru: 'возраст, годы', pos: 'noun', tags: ['age'], transcription: 'наһан' },
  { id: 'khoyor_duu', bxr: 'хоёр дүү', ru: 'двое младших', pos: 'phrase', tags: ['family'], transcription: 'хоёр дүү' },
  { id: 'ger_bule', bxr: 'гэр бүлэ', ru: 'семья (дом-семья)', pos: 'phrase', tags: ['family'], transcription: 'гэр бүлэ' },
  { id: 'uulzaha', bxr: 'уулзаха', ru: 'встречаться', pos: 'verb', tags: ['action'], transcription: 'уулзаха' },
  { id: 'durakhai', bxr: 'дуратай', ru: 'любимый', pos: 'adj', tags: ['quality'], transcription: 'дуратай' },
  { id: 'khundete', bxr: 'хүндэтэ', ru: 'уважаемый', pos: 'adj', tags: ['quality'], transcription: 'хүндэтэ' }
]

export const unit4Sentences = [
  { id: 'u4s1', bxr: 'Энэ минии аба.', ru: 'Это мой отец.', tags: ['family', 'u4'], needsReview: true },
  { id: 'u4s2', bxr: 'Энэ минии эжы.', ru: 'Это моя мать.', tags: ['family', 'u4'], needsReview: true },
  { id: 'u4s3', bxr: 'Манай бүлэ ехэ.', ru: 'Наша семья большая.', tags: ['family', 'u4'], needsReview: true },
  { id: 'u4s4', bxr: 'Би ахатай.', ru: 'У меня есть старший брат.', tags: ['family', 'u4'], needsReview: true },
  { id: 'u4s5', bxr: 'Хүбүүн залуу.', ru: 'Мальчик молодой.', tags: ['people', 'u4'] },
  { id: 'u4s6', bxr: 'Эгэшэ багша.', ru: 'Старшая сестра — учитель.', tags: ['family', 'u4'] },
  { id: 'u4s7', bxr: 'Энэ минии хүгшэн аба.', ru: 'Это мой дедушка.', tags: ['family', 'u4'] },
  { id: 'u4s8', bxr: 'Энэ минии нүхэр Бадма.', ru: 'Это мой друг Бадма.', tags: ['family', 'u4'] },
  { id: 'u4s9', bxr: 'Бидэ үбгэн абаһаа һураатайбди.', ru: 'Мы учимся у дедушки.', tags: ['family', 'u4'] },
]

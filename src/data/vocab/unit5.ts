import type { VocabItem } from '../types'

/**
 * Раздел 5. Эдеэн ба гэр — еда и быт.
 */
export const unit5: VocabItem[] = [
  // Еда
  { id: 'idehen', bxr: 'эдеэн', ru: 'еда', pos: 'noun', tags: ['food'] },
  { id: 'buuda', bxr: 'буудай', ru: 'пшеница', pos: 'noun', tags: ['food'] },
  { id: 'tulga', bxr: 'тулга', ru: 'плита, треножник', pos: 'noun', tags: ['home'] },
  { id: 'budaa', bxr: 'будаа', ru: 'крупа, рис', pos: 'noun', tags: ['food'] },
  { id: 'malhan', bxr: 'мяһан', ru: 'мясо', pos: 'noun', tags: ['food'] },
  { id: 'zagahan', bxr: 'загаһан', ru: 'рыба', pos: 'noun', tags: ['food'] },
  { id: 'tohon', bxr: 'тоһон', ru: 'масло', pos: 'noun', tags: ['food'] },
  { id: 'talhan', bxr: 'талхан', ru: 'мука', pos: 'noun', tags: ['food'] },
  { id: 'dabsan', bxr: 'дабһан', ru: 'соль', pos: 'noun', tags: ['food'] },
  { id: 'zohehei', bxr: 'зөөхэй', ru: 'сметана', pos: 'noun', tags: ['food'] },
  { id: 'eezgei', bxr: 'ээзгэй', ru: 'творог, сушёный молочный продукт', pos: 'noun', tags: ['food', 'culture'] },
  { id: 'khuruud', bxr: 'хурууд', ru: 'сушёный творог, спрессованный творог (род сыра)', pos: 'noun', tags: ['food', 'culture'] },
  { id: 'sagaan_idehen', bxr: 'сагаан эдеэн', ru: 'молочная пища', pos: 'phrase', tags: ['food', 'culture'] },
  { id: 'airag', bxr: 'айраг', ru: 'кумыс (айраг)', pos: 'noun', tags: ['food', 'culture'] },
  { id: 'buhler', bxr: 'бүүзэ', ru: 'буузы', pos: 'noun', tags: ['food', 'culture'] },
  // Напитки
  { id: 'hutai_sai', bxr: 'һүтэй сай', ru: 'чай с молоком', pos: 'phrase', tags: ['food', 'drink'] },
  { id: 'sai_uukha_gut', bxr: 'Сай ууха гүт?', ru: 'Будете пить чай?', pos: 'phrase', tags: ['drink'] },
  { id: 'huen', bxr: 'һүн', ru: 'молоко', pos: 'phrase', tags: ['drink'] },
  // Посуда и быт
  { id: 'ayaga', bxr: 'аяга', ru: 'чашка', pos: 'noun', tags: ['home', 'dish'] },
  { id: 'tabag', bxr: 'табаг', ru: 'тарелка', pos: 'noun', tags: ['home', 'dish'] },
  { id: 'heree', bxr: 'һэрээ', ru: 'вилка', pos: 'noun', tags: ['home', 'dish'] },
  { id: 'halbaga', bxr: 'халбага', ru: 'ложка', pos: 'noun', tags: ['home', 'dish'] },
  { id: 'amharta', bxr: 'амһарта', ru: 'посуда, сосуд', pos: 'noun', tags: ['home', 'dish']},
  { id: 'shere', bxr: 'шэрээ', ru: 'стол', pos: 'noun', tags: ['home', 'furniture'] },
  { id: 'oron', bxr: 'орон', ru: 'кровать, постель, страна (в завимости от контекста)', pos: 'noun', tags: ['home', 'furniture'] },
  { id: 'uden', bxr: 'үүдэн', ru: 'дверь', pos: 'noun', tags: ['home'] },
  { id: 'sonho', bxr: 'сонхо', ru: 'окно', pos: 'noun', tags: ['home'] },
  { id: 'gazar', bxr: 'газар', ru: 'земля, место', pos: 'noun', tags: ['nature'] },
  // Глаголы и качества
  { id: 'amta', bxr: 'амтатай', ru: 'вкусный', pos: 'adj', tags: ['food', 'quality'] },
  { id: 'buuzada_durataib', bxr: 'Би буузада ехэ дуратайб.', ru: 'Я очень люблю буузы.', pos: 'phrase', tags: ['food', 'quality'] },
  { id: 'ene_amtatai_gu', bxr: 'Энэ амтатай гү?', ru: 'Это вкусно?', pos: 'phrase', tags: ['food', 'quality'] },
  { id: 'ehe_amtatai', bxr: 'Ехэ амтатай.', ru: 'Очень вкусно.', pos: 'phrase', tags: ['food', 'quality'] },
  { id: 'haikhan', bxr: 'һайхан', ru: 'красивый', pos: 'adj', tags: ['quality'] },
  { id: 'hari', bxr: 'хари', ru: 'чужой, далёкий, иностранный', pos: 'adj', tags: ['quality'] }
]

export const unit5Sentences = [
  { id: 'u5s1', bxr: 'Би сай уунаб.', ru: 'Я пью чай.', tags: ['food', 'u5'] },
  { id: 'u5s2', bxr: 'Сүүтэй сай амтатай.', ru: 'Чай с молоком вкусный.', tags: ['food', 'u5'], needsReview: true },
  { id: 'u5s3', bxr: 'Энэ шэрээ.', ru: 'Это стол.', tags: ['home', 'u5'] },
  { id: 'u5s4', bxr: 'Би бууза эдихэ дуратай.', ru: 'Я люблю есть буузы.', tags: ['food', 'u5'], needsReview: true },
  { id: 'u5s5', bxr: 'Гэртээ аяга байна.', ru: 'Дома есть чашка.', tags: ['home', 'u5'], needsReview: true },
  { id: 'u5s6', bxr: 'Мяһан амтатай.', ru: 'Мясо вкусное.', tags: ['food', 'u5'] },
  { id: 'u5s7', bxr: 'Сай ууха гүт?', ru: 'Будете пить чай?', tags: ['food', 'u5'] },
  { id: 'u5s8', bxr: 'Би буузада ехэ дуратайб.', ru: 'Я очень люблю буузы.', tags: ['food', 'u5'] },
  { id: 'u5s9', bxr: 'Энэ амтатай гү?', ru: 'Это вкусно?', tags: ['food', 'u5'] },
  { id: 'u5s10', bxr: 'Ехэ амтатай.', ru: 'Очень вкусно.', tags: ['food', 'u5'] },
]

import type { VocabItem } from '../types'

/**
 * Раздел 5. Эдеэн ба гэр — еда и быт.
 */
export const unit5: VocabItem[] = [
  // Еда
  { id: 'idehen', bxr: 'эдеэн', ru: 'еда', pos: 'noun', tags: ['food'], transcription: 'эдеэн' },
  { id: 'buuda', bxr: 'буудай', ru: 'пшеница', pos: 'noun', tags: ['food'], transcription: 'буудай' },
  { id: 'tulga', bxr: 'тулга', ru: 'плита, треножник', pos: 'noun', tags: ['home'], transcription: 'тулга' },
  { id: 'budaa', bxr: 'будаа', ru: 'крупа, рис', pos: 'noun', tags: ['food'], transcription: 'будаа' },
  { id: 'malhan', bxr: 'мяhан', ru: 'мясо', pos: 'noun', tags: ['food'], transcription: 'мяhан' },
  { id: 'zagahan', bxr: 'загаhан', ru: 'рыба', pos: 'noun', tags: ['food'], transcription: 'загаhан' },
  { id: 'tohon', bxr: 'тоhон', ru: 'масло', pos: 'noun', tags: ['food'], transcription: 'тоhон' },
  { id: 'dahan', bxr: 'даhан', ru: 'соль, молочное', pos: 'noun', tags: ['food'], transcription: 'даhан', needsReview: true },
  { id: 'sagaan_idehen', bxr: 'сагаан эдеэн', ru: 'молочная пища', pos: 'phrase', tags: ['food', 'culture'], transcription: 'сагаан эдеэн' },
  { id: 'airag', bxr: 'айраг', ru: 'кумыс (айраг)', pos: 'noun', tags: ['food', 'culture'], transcription: 'айраг' },
  { id: 'buhler', bxr: 'бүүзэ', ru: 'буузы (позы)', pos: 'noun', tags: ['food', 'culture'], transcription: 'бүүзэ' },
  // Напитки
  { id: 'sai_zu', bxr: 'сүүтэй сай', ru: 'чай с молоком', pos: 'phrase', tags: ['food', 'drink'], transcription: 'сүүтэй сай' },
  { id: 'zurkhai', bxr: 'зурхай', ru: 'питьё, квас', pos: 'noun', tags: ['drink'], needsReview: true },
  // Посуда и быт
  { id: 'ayaga', bxr: 'аяга', ru: 'чашка', pos: 'noun', tags: ['home', 'dish'], transcription: 'аяга' },
  { id: 'saba', bxr: 'саба', ru: 'посуда, сосуд', pos: 'noun', tags: ['home', 'dish'], transcription: 'саба', needsReview: true },
  { id: 'shere', bxr: 'шэрээ', ru: 'стол', pos: 'noun', tags: ['home', 'furniture'], transcription: 'шэрээ' },
  { id: 'oron', bxr: 'орон', ru: 'кровать, место', pos: 'noun', tags: ['home', 'furniture'], transcription: 'орон' },
  { id: 'nomoi_san', bxr: 'номой сан', ru: 'библиотека', pos: 'phrase', tags: ['place'], needsReview: true },
  { id: 'uden', bxr: 'үүдэн', ru: 'дверь', pos: 'noun', tags: ['home'], transcription: 'үүдэн' },
  { id: 'sonho', bxr: 'сонхо', ru: 'окно', pos: 'noun', tags: ['home'], transcription: 'сонхо' },
  { id: 'gazar', bxr: 'газар', ru: 'земля, место', pos: 'noun', tags: ['nature'], transcription: 'газар' },
  // Глаголы и качества
  { id: 'amta', bxr: 'амтатай', ru: 'вкусный', pos: 'adj', tags: ['food', 'quality'], transcription: 'амтатай' },
  { id: 'haikhan', bxr: 'haikhan', ru: 'красивый', pos: 'adj', tags: ['quality'], transcription: 'haikhan' },
  { id: 'hari', bxr: 'хари', ru: 'чужой, далёкий', pos: 'adj', tags: ['quality'], transcription: 'хари', needsReview: true },
  { id: 'uugaa', bxr: 'уугаа', ru: 'напиток', pos: 'noun', tags: ['drink'], needsReview: true },
  { id: 'khana', bxr: 'хана', ru: 'стена', pos: 'noun', tags: ['home'], transcription: 'хана' },
]

export const unit5Sentences = [
  { id: 'u5s1', bxr: 'Би сай уунаб.', ru: 'Я пью чай.', tags: ['food', 'u5'] },
  { id: 'u5s2', bxr: 'Сүүтэй сай амтатай.', ru: 'Чай с молоком вкусный.', tags: ['food', 'u5'], needsReview: true },
  { id: 'u5s3', bxr: 'Энэ шэрээ.', ru: 'Это стол.', tags: ['home', 'u5'] },
  { id: 'u5s4', bxr: 'Би бууза эдихэ дуратай.', ru: 'Я люблю есть буузы.', tags: ['food', 'u5'], needsReview: true },
  { id: 'u5s5', bxr: 'Гэртээ аяга байна.', ru: 'Дома есть чашка.', tags: ['home', 'u5'], needsReview: true },
  { id: 'u5s6', bxr: 'Мяhан амтатай.', ru: 'Мясо вкусное.', tags: ['food', 'u5'] },
]

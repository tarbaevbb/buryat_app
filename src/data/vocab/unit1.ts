import type { VocabItem } from '../types'

/**
 * Раздел 1. Танилсалга — знакомство.
 *
 * Содержание взято из тематического списка фраз «Знакомство» (прислан
 * носителем): приветствия по времени суток, имя и фамилия, возраст,
 * происхождение и национальность. Бурятский текст сохранён как в источнике.
 *
 * Теги здесь только «учебные»: они описывают, в какой урок попадает фраза.
 * Теги описывают тематику слов. Состав уроков задаётся явно в course.ts,
 * чтобы повторяющиеся темы не переносили фразы в чужой урок.
 */
export const unit1: VocabItem[] = [
  // --- Приветствия и вежливость ---
  { id: 'sain_baina_greet', bxr: 'Сайн байна!', ru: 'Здравствуйте!', pos: 'phrase', tags: ['greet_day'] },
  { id: 'mendee_greet', bxr: 'Мэндээ!', ru: 'Привет!', pos: 'phrase', tags: ['greet_day'] },
  { id: 'ugluuney_mende', bxr: 'Үглөөнэй мэндэ!', ru: 'Доброе утро!', pos: 'phrase', tags: ['greet_day'] },
  { id: 'uderey_mende', bxr: 'Үдэрэй мэндэ!', ru: 'Добрый день!', pos: 'phrase', tags: ['greet_day'] },
  { id: 'udesyn_mende', bxr: 'Үдэшын мэндэ!', ru: 'Добрый вечер!', pos: 'phrase', tags: ['greet_day'] },
  { id: 'khulisegty', bxr: 'Хүлисэгты', ru: 'Извините', pos: 'phrase', tags: ['greet_day'] },
  { id: 'bayarla', bxr: 'баярлалаа', ru: 'спасибо', pos: 'phrase', tags: ['greet_day'] },
  { id: 'bayartai', bxr: 'баяртай', ru: 'до свидания', pos: 'phrase', tags: ['greet_day'] },
  { id: 'honin_yuun_be', bxr: 'һонин юун бэ?', ru: 'Что нового?', pos: 'phrase', tags: ['greet_day'] },

  // --- Имя, фамилия, отчество ---
  { id: 'minii_nere', bxr: 'Минии нэрэ…', ru: 'Меня зовут…', pos: 'phrase', tags: ['intro_name'] },
  { id: 'famili_mini', bxr: 'Фамилимни…', ru: 'Моя фамилия…', pos: 'phrase', tags: ['intro_name'] },
  { id: 'obogtoib', bxr: '… гэжэ обогтойб', ru: 'Моё отчество…', pos: 'phrase', tags: ['intro_name'] },
  { id: 'shii_khen_nereteibshi', bxr: 'Ши хэн гэжэ нэрэтэйбши?', ru: 'Как тебя зовут?', pos: 'phrase', tags: ['intro_name'] },
  { id: 'shii_khen_famili', bxr: 'Ши хэн гэжэ фамилитайбши?', ru: 'Как твоя фамилия?', pos: 'phrase', tags: ['intro_name'] },
  { id: 'khen_obogtoibshi', bxr: 'Хэн гэжэ обогтойбши?', ru: 'Как ваше отчество?', pos: 'phrase', tags: ['intro_name'] },
  { id: 'neree_khelys', bxr: 'Нэрээ хэлыш даа', ru: 'Назови своё имя', pos: 'phrase', tags: ['intro_name'] },
  { id: 'neree_beshegdedeg', bxr: 'Танай нэрэ яагаад бэшэгдэдэг бэ?', ru: 'Как пишется ваше имя?', pos: 'phrase', tags: ['intro_name'] },
  { id: 'nereer_duudakha', bxr: 'Би таниие нэрээртнай дуудахаб', ru: 'Я буду звать вас по имени', pos: 'phrase', tags: ['intro_name'] },
  { id: 'nere', bxr: 'нэрэ', ru: 'имя', pos: 'noun', tags: ['intro_name'], transcription: 'нэрэ' },

  // --- Возраст ---
  { id: 'shii_khedyteibshi', bxr: 'Ши хэдытэйбши?', ru: 'Сколько тебе лет?', pos: 'phrase', tags: ['intro_age'] },
  { id: 'bi_arbataib', bxr: 'Би арбатайб', ru: 'Мне 10 лет', pos: 'phrase', tags: ['intro_age'] },
  { id: 'ta_nahaa_khusenkhei', bxr: 'Та наһаа хүсэнхэй гүт?', ru: 'Вы совершеннолетний?', pos: 'phrase', tags: ['intro_age'] },
  { id: 'bi_usheo', bxr: 'Үгы, би үшөө наһаяа хүсөөдүйб', ru: 'Нет, я ещё несовершеннолетний', pos: 'phrase', tags: ['intro_age'] },
  { id: 'ta_khezee_turoobta', bxr: 'Та хэзээ түрөөбта?', ru: 'Когда вы родились?', pos: 'phrase', tags: ['intro_age'] },
  { id: 'bi_2002', bxr: 'Би 2002 оной майн 15-да түрөөб', ru: 'Я родился 15 мая 2002 года', pos: 'phrase', tags: ['intro_age'] },
  { id: 'turehen_uderi', bxr: 'Танай түрэһэн үдэр хэзээб?', ru: 'Какого числа ваш день рождения?', pos: 'phrase', tags: ['intro_age'] },
  { id: 'bi', bxr: 'би', ru: 'я', pos: 'pron', tags: ['intro_age'], transcription: 'би' },
  { id: 'shi', bxr: 'ши', ru: 'ты', pos: 'pron', tags: ['intro_age'], transcription: 'ши' },
  { id: 'ta', bxr: 'та', ru: 'вы', pos: 'pron', tags: ['intro_age'], transcription: 'та' },

  // --- Откуда вы и кто по национальности ---
  { id: 'ta_khaanahaa', bxr: 'Та хаанаһаа ерээбта?', ru: 'Откуда вы приехали?', pos: 'phrase', tags: ['intro_origin'] },
  { id: 'ta_khaanakhibta', bxr: 'Та хаанахибта?', ru: 'Откуда вы родом?', pos: 'phrase', tags: ['intro_origin'] },
  { id: 'ta_yamar_yahanaipta', bxr: 'Та ямар яһанайбта?', ru: 'Какая у вас национальность?', pos: 'phrase', tags: ['intro_origin'] },
  { id: 'bi_buryaad', bxr: 'Би буряад яһанайб', ru: 'Я по национальности бурят', pos: 'phrase', tags: ['intro_origin'] },
  { id: 'bi_orod', bxr: 'Би ород яһанайб', ru: 'Я по национальности русский', pos: 'phrase', tags: ['intro_origin'] },
  { id: 'tanilhan_bayartai', bxr: 'Тантай танилсаһандаа ехэ баяртай байнаб', ru: 'Я очень рад, что познакомился с вами', pos: 'phrase', tags: ['intro_origin'] },
  { id: 'yaazha_uulzaba', bxr: 'Яажа шамтай уулзаба гээшэбиб!', ru: 'Как хорошо, что я тебя встретил!', pos: 'phrase', tags: ['intro_origin'] },
  { id: 'holiin_turel', bxr: 'Бидэ холын түрэлбди', ru: 'Мы дальние родственники', pos: 'phrase', tags: ['intro_origin'] },
  { id: 'turel_beshe', bxr: 'Тэрэ намтай түрэл бэшэ', ru: 'Он мне не родственник', pos: 'phrase', tags: ['intro_origin'] },
]

export const unit1Sentences = [
  { id: 'u1s1', bxr: 'Сайн байна!', ru: 'Здравствуйте!', tags: ['greet_day', 'u1'] },
  { id: 'u1s2', bxr: 'Мэндээ!', ru: 'Привет!', tags: ['greet_day', 'u1'] },
  { id: 'u1s3', bxr: 'Үглөөнэй мэндэ!', ru: 'Доброе утро!', tags: ['greet_day', 'u1'] },
  { id: 'u1s4', bxr: 'Үдэрэй мэндэ!', ru: 'Добрый день!', tags: ['greet_day', 'u1'] },
  { id: 'u1s5', bxr: 'Үдэшын мэндэ!', ru: 'Добрый вечер!', tags: ['greet_day', 'u1'] },
  { id: 'u1s6', bxr: 'Ши хэн гэжэ нэрэтэйбши?', ru: 'Как тебя зовут?', tags: ['intro_name', 'u1'] },
  { id: 'u1s7', bxr: 'Би арбатайб', ru: 'Мне 10 лет', tags: ['intro_age', 'u1'] },
  { id: 'u1s8', bxr: 'Ши хэдытэйбши?', ru: 'Сколько тебе лет?', tags: ['intro_age', 'u1'] },
  { id: 'u1s9', bxr: 'Би буряад яһанайб', ru: 'Я по национальности бурят', tags: ['intro_origin', 'u1'] },
  { id: 'u1s10', bxr: 'Та хаанаһаа ерээбта?', ru: 'Откуда вы приехали?', tags: ['intro_origin', 'u1'] },
  { id: 'u1s11', bxr: 'Би ехэ баяртай байнаб', ru: 'Я очень рад', tags: ['intro_origin', 'u1'] },
  { id: 'u1s12', bxr: 'Хүлисэгты', ru: 'Извините', tags: ['greet_day', 'u1'] },
]

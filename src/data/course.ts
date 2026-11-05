import type { Course, Lesson, SentenceItem, Unit, VocabItem } from './types'
import { unit1, unit1Sentences } from './vocab/unit1'
import { unit2, unit2Sentences } from './vocab/unit2'
import { unit3, unit3Sentences } from './vocab/unit3'
import { unit4, unit4Sentences } from './vocab/unit4'
import { unit5, unit5Sentences } from './vocab/unit5'

const allVocab: VocabItem[] = [...unit1, ...unit2, ...unit3, ...unit4, ...unit5]
const allSentences: SentenceItem[] = [
  ...unit1Sentences,
  ...unit2Sentences,
  ...unit3Sentences,
  ...unit4Sentences,
  ...unit5Sentences,
]

const vocabById = new Map(allVocab.map((v) => [v.id, v]))
const sentenceById = new Map(allSentences.map((s) => [s.id, s]))

interface LessonSpec {
  id: string
  title: string
  titleBxr: string
  kind?: 'lesson' | 'review'
  vocabIds: string[]
  sentenceIds?: string[]
}

interface UnitSpec {
  id: string
  title: string
  titleBxr: string
  description: string
  color: string
  colorShadow: string
  emoji: string
  lessons: LessonSpec[]
}

/**
 * 5 разделов по 5 уроков. Лексика каждого урока задана явно, чтобы общие
 * тематические теги не переносили слова между разными уроками.
 * Последний урок раздела — повторение: слова всего раздела без новых.
 */
const unitSpecs: UnitSpec[] = [
  {
    id: 'u1',
    title: 'Первые слова',
    titleBxr: 'Түрүүшын үгэнүүд',
    description: 'Базовые слова с особыми буквами, цвета, частые выражения и вопросы.',
    color: '#1cb0f6',
    colorShadow: '#1899d6',
    emoji: '🔤',
    lessons: [
      // Уроки строятся из слов с нужным фонетическим признаком, а не из
      // «звуков» отдельными карточками — иначе задания получаются тавтологичными.
      {
        id: 'u1l1',
        title: 'Слова с буквами ө, ү, һ',
        titleBxr: 'Ө, ү, һ',
        vocabIds: ['hun', 'ughe', 'uzeg', 'huen', 'usun', 'hain'],
        sentenceIds: [],
      },
      {
        id: 'u1l2',
        title: 'Первые простые слова',
        titleBxr: 'Түрүүшын үгэнүүд',
        vocabIds: ['sai', 'noho', 'ger', 'morin', 'nom', 'khelen', 'naran', 'modon', 'shubuun', 'ene'],
        sentenceIds: ['u1s1', 'u1s2'],
      },
      {
        id: 'u1l3',
        title: 'Частые слова и цвета',
        titleBxr: 'Үнгэнүүд ба хэрэгтэй үгэнүүд',
        vocabIds: ['sain', 'baina', 'tiim', 'ugui', 'muu', 'daa', 'ehe', 'khara', 'sagaan', 'ulaan', 'nogoon', 'shara', 'honi', 'uulen', 'uulen_suglarna'],
        sentenceIds: ['u1s9'],
      },
      {
        id: 'u1l4',
        title: 'Вопросы',
        titleBxr: 'Асуудал',
        vocabIds: ['khen_be', 'yamar', 'khaana', 'hedi', 'yuu', 'tere', 'medene', 'bish', 'bagsha', 'huragshan', 'geree', 'talha', 'buga', 'yabaha', 'uuha', 'edikhe'],
        sentenceIds: ['u1s7', 'u1s8'],
      },
      {
        id: 'u1l5',
        title: 'Повторение раздела',
        titleBxr: 'Дахин һанаха',
        kind: 'review',
        vocabIds: ['hun', 'ughe', 'uzeg', 'huen', 'usun', 'hain', 'sai', 'noho', 'ger', 'morin', 'nom', 'khelen', 'naran', 'modon', 'shubuun', 'ehe', 'khara', 'sagaan', 'ulaan', 'nogoon', 'shara', 'talha', 'buga', 'yabaha', 'uuha', 'edikhe', 'sain', 'baina', 'tiim', 'ugui', 'muu', 'daa', 'honi', 'uulen', 'uulen_suglarna', 'khen_be', 'yamar', 'khaana', 'hedi', 'yuu', 'ene', 'tere', 'medene', 'bish', 'bagsha', 'huragshan', 'geree'],
        sentenceIds: ['u1s1', 'u1s5', 'u1s7', 'u1s9'],
      },
    ],
  },
  {
    id: 'u2',
    title: 'Числа и время',
    titleBxr: 'Тоо ба саг',
    description: 'Счёт до ста, дни недели, время.',
    color: '#ff9600',
    colorShadow: '#e07f00',
    emoji: '🔢',
    lessons: [
      { id: 'u2l1', title: 'От 1 до 15', titleBxr: 'Нэгэнһээ арбан таба', vocabIds: ['neg', 'khoyor', 'gurba', 'durbe', 'taba', 'zurgaa', 'dolo', 'naima', 'yuhen', 'arba', 'arban_neg', 'arban_khoyor', 'arban_gurba', 'arban_durbe', 'arban_taba', 'gurban_gurba_hedyb'], sentenceIds: ['u2s1', 'u2s7'] },
      { id: 'u2l2', title: 'Десятки до 100', titleBxr: 'Арбанай тоонууд', vocabIds: ['khori', 'guchi', 'dushi', 'tabi', 'zhara', 'dala', 'naya', 'yere', 'zuu'], sentenceIds: ['u2s2'] },
      { id: 'u2l3', title: 'Дни недели', titleBxr: 'Долоон хоногой гарагууд', vocabIds: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'], sentenceIds: ['u2s5'] },
      { id: 'u2l4', title: 'Который час', titleBxr: 'Хэдэн саг бэ', vocabIds: ['sag', 'ude', 'honog', 'odo', 'ugloo', 'naima', 'sag_hedy_bolozho_bainab', 'munuu_naiman_chas'], sentenceIds: ['u2s3', 'u2s4'] },
      {
        id: 'u2l5',
        title: 'Повторение раздела',
        titleBxr: 'Дахин һанаха',
        kind: 'review',
        vocabIds: ['neg', 'khoyor', 'gurba', 'durbe', 'taba', 'zurgaa', 'dolo', 'naima', 'yuhen', 'arba', 'arban_neg', 'arban_khoyor', 'arban_gurba', 'arban_durbe', 'arban_taba', 'gurban_gurba_hedyb', 'khori', 'guchi', 'dushi', 'tabi', 'zhara', 'dala', 'naya', 'yere', 'zuu', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'sag', 'ude', 'honog', 'odo', 'ugloo', 'sag_hedy_bolozho_bainab', 'munuu_naiman_chas'],
        sentenceIds: ['u2s1', 'u2s3', 'u2s4', 'u2s5', 'u2s7'],
      },
    ],
  },
  {
    id: 'u3',
    title: 'Знакомство',
    titleBxr: 'Танилсалга',
    description: 'Поздороваться, назвать себя, рассказать о возрасте и откуда вы.',
    color: '#58cc02',
    colorShadow: '#46a302',
    emoji: '🤝',
    lessons: [
      {
        id: 'u3l1',
        title: 'Приветствия',
        titleBxr: 'Мэндээлгэ',
        vocabIds: ['sain_baina_greet', 'mendee_greet', 'ugluuney_mende', 'uderey_mende', 'udesyn_mende', 'khulisegty', 'bayarla', 'bayartai', 'honin_yuun_be', 'tanilsahyiemni_zubshoogyt'],
        sentenceIds: ['u3s1', 'u3s2', 'u3s3', 'u3s4', 'u3s5', 'u3s12', 'u3s13'],
      },
      { id: 'u3l2', title: 'Как вас зовут', titleBxr: 'Нэрэ', vocabIds: ['minii_nere', 'famili_mini', 'obogtoib', 'shii_khen_nereteibshi', 'shii_khen_famili', 'khen_obogtoibshi', 'neree_khelys', 'neree_beshegdedeg', 'nereer_duudakha', 'bogonoor_nerelekheb', 'nere'], sentenceIds: ['u3s6', 'u3s14'] },
      { id: 'u3l3', title: 'Возраст и дата рождения', titleBxr: 'Наһан', vocabIds: ['shii_khedyteibshi', 'bi_arbataib', 'ta_nahaa_khusenkhei', 'bi_usheo', 'ta_khezee_turoobta', 'bi_2002', 'turehen_uderi', 'neriin_uderi_bayar', 'bi', 'shi', 'ta'], sentenceIds: ['u3s7', 'u3s8', 'u3s15'] },
      {
        id: 'u3l4',
        title: 'Откуда вы',
        titleBxr: 'Хаанаһаа',
        vocabIds: ['ta_khaanahaa', 'ta_khaanakhibta', 'ta_yamar_yahanaipta', 'bi_buryaad', 'bi_orod', 'tanilhan_bayartai', 'yaazha_uulzaba', 'holiin_turel', 'turel_beshe'],
        sentenceIds: ['u3s9', 'u3s10', 'u3s11'],
      },
      {
        id: 'u3l5',
        title: 'Повторение раздела',
        titleBxr: 'Дахин һанаха',
        kind: 'review',
        vocabIds: ['sain_baina_greet', 'mendee_greet', 'ugluuney_mende', 'uderey_mende', 'udesyn_mende', 'khulisegty', 'bayarla', 'bayartai', 'honin_yuun_be', 'tanilsahyiemni_zubshoogyt', 'minii_nere', 'famili_mini', 'obogtoib', 'shii_khen_nereteibshi', 'shii_khen_famili', 'khen_obogtoibshi', 'neree_khelys', 'neree_beshegdedeg', 'nereer_duudakha', 'bogonoor_nerelekheb', 'nere', 'shii_khedyteibshi', 'bi_arbataib', 'ta_nahaa_khusenkhei', 'bi_usheo', 'ta_khezee_turoobta', 'bi_2002', 'turehen_uderi', 'neriin_uderi_bayar', 'bi', 'shi', 'ta', 'ta_khaanahaa', 'ta_khaanakhibta', 'ta_yamar_yahanaipta', 'bi_buryaad', 'bi_orod', 'tanilhan_bayartai', 'yaazha_uulzaba', 'holiin_turel', 'turel_beshe'],
        sentenceIds: ['u3s1', 'u3s3', 'u3s7', 'u3s9', 'u3s13', 'u3s14', 'u3s15'],
      },
    ],
  },
  {
    id: 'u4',
    title: 'Семья и люди',
    titleBxr: 'Бүлэ',
    description: 'Родственные термины, семья, описание людей и занятий.',
    color: '#ce82ff',
    colorShadow: '#b566e6',
    emoji: '👨‍👩‍👧',
    lessons: [
      { id: 'u4l1', title: 'Родители и семья', titleBxr: 'Аба эжы', vocabIds: ['aba', 'ezhy', 'bule', 'ger_bule', 'naha', 'ubgen_aba', 'khugshe_ezhy', 'ene_munuu_ubgen_aba', 'bide_ubgen_aba_haa_huraataibdi'], sentenceIds: ['u4s7', 'u4s9'] },
      { id: 'u4l2', title: 'Братья, сёстры и друзья', titleBxr: 'Аха дүүнэр', vocabIds: ['aha', 'egeshe', 'duu_hubuun', 'duu_basagan', 'khoyor_duu', 'nagasa', 'abagai', 'nukher', 'ene_minii_nukher_badma'], sentenceIds: ['u4s6', 'u4s8'] },
      { id: 'u4l3', title: 'Дети и возраст', titleBxr: 'Хүүгэд ба наһан', vocabIds: ['khubun', 'basagan', 'nasta', 'khugshe', 'zaluu'], sentenceIds: ['u4s5'] },
      { id: 'u4l4', title: 'Люди и занятия', titleBxr: 'Хүнүүд ба ажал', vocabIds: ['uulzaha', 'durakhai', 'khairtai', 'ajil', 'ajilsha', 'baha', 'orda', 'zurag', 'ongoso', 'gar'], sentenceIds: [] },
      {
        id: 'u4l5',
        title: 'Повторение раздела',
        titleBxr: 'Дахин һанаха',
        kind: 'review',
        vocabIds: ['aba', 'ezhy', 'aha', 'egeshe', 'duu_hubuun', 'duu_basagan', 'khubun', 'basagan', 'ubgen_aba', 'khugshe_ezhy', 'nukher', 'ene_munuu_ubgen_aba', 'ene_minii_nukher_badma', 'bide_ubgen_aba_haa_huraataibdi', 'nagasa', 'abagai', 'khugshe', 'zaluu', 'bule', 'naha', 'nasta', 'khoyor_duu', 'ger_bule', 'uulzaha', 'durakhai', 'khairtai', 'ajil', 'ajilsha', 'baha', 'orda', 'zurag', 'ongoso', 'gar'],
        sentenceIds: ['u4s6', 'u4s7', 'u4s8', 'u4s9'],
      },
    ],
  },
  {
    id: 'u5',
    title: 'Еда и быт',
    titleBxr: 'Эдеэн ба гэр',
    description: 'Продукты, посуда, вкусы.',
    color: '#ff4b4b',
    colorShadow: '#e03c3c',
    emoji: '🍲',
    lessons: [
      { id: 'u5l1', title: 'Продукты', titleBxr: 'Эдеэнэй зүйлнүүд', vocabIds: ['idehen', 'buuda', 'budaa', 'malhan', 'zagahan', 'tohon', 'guril', 'dabsan', 'zohehei', 'eezgei', 'khuruud', 'dahan'], sentenceIds: [] },
      { id: 'u5l2', title: 'Напитки и традиционные продукты', titleBxr: 'Ундаан ба сагаан эдеэн', vocabIds: ['sagaan_idehen', 'airag', 'buhler', 'sai_zu', 'sai_uukha_gut', 'zurkhai', 'uugaa', 'sai', 'huen', 'idehen'], sentenceIds: ['u5s7'] },
      { id: 'u5l3', title: 'Дом и посуда', titleBxr: 'Гэр ба саба', vocabIds: ['tulga', 'ayaga', 'tabag', 'heree', 'halbaga', 'saba', 'shere', 'oron', 'nomoi_san', 'uden', 'sonho', 'gazar', 'khana'], sentenceIds: ['u5s3'] },
      { id: 'u5l4', title: 'Вкус и описание', titleBxr: 'Амтан ба шанар', vocabIds: ['amta', 'buuzada_durataib', 'ene_amtatai_gu', 'ehe_amtatai', 'haikhan', 'hari', 'sain', 'muu', 'ehe', 'khara', 'sagaan', 'ulaan', 'nogoon', 'shara'], sentenceIds: ['u5s6', 'u5s8', 'u5s9', 'u5s10'] },
      {
        id: 'u5l5',
        title: 'Повторение раздела',
        titleBxr: 'Дахин һанаха',
        kind: 'review',
        vocabIds: ['idehen', 'buuda', 'tulga', 'budaa', 'malhan', 'zagahan', 'tohon', 'guril', 'dabsan', 'zohehei', 'eezgei', 'khuruud', 'dahan', 'sagaan_idehen', 'airag', 'buhler', 'sai_zu', 'sai_uukha_gut', 'zurkhai', 'ayaga', 'tabag', 'heree', 'halbaga', 'saba', 'shere', 'oron', 'nomoi_san', 'uden', 'sonho', 'gazar', 'amta', 'buuzada_durataib', 'ene_amtatai_gu', 'ehe_amtatai', 'haikhan', 'hari', 'uugaa', 'khana'],
        sentenceIds: ['u5s1', 'u5s3', 'u5s6', 'u5s7', 'u5s8', 'u5s9', 'u5s10'],
      },
    ],
  },
]

const alreadyIntroducedVocab = new Set<string>()

function buildUnit(spec: UnitSpec): { unit: Unit; lessons: Lesson[] } {
  const lessons: Lesson[] = spec.lessons.map((l, index) => {
    const availableIds = l.vocabIds.filter((id) => Boolean(vocabById.get(id) && !vocabById.get(id)?.needsReview))
    const newVocabIds = l.kind === 'review'
      ? []
      : availableIds.filter((id) => !alreadyIntroducedVocab.has(id))
    newVocabIds.forEach((id) => alreadyIntroducedVocab.add(id))
    return {
      id: l.id,
      unitId: spec.id,
      index,
      title: l.title,
      titleBxr: l.titleBxr,
      kind: l.kind ?? 'lesson',
      // Сомнительные единицы не попадают в обучение и повторение до проверки.
      vocabIds: availableIds,
      // В уроке «повторение» новой лексики нет — всё уже встречалось в разделе.
      newVocabIds,
      sentenceIds: l.sentenceIds ?? [],
    }
  })

  const unit: Unit = {
    id: spec.id,
    index: unitSpecs.indexOf(spec),
    title: spec.title,
    titleBxr: spec.titleBxr,
    description: spec.description,
    color: spec.color,
    colorShadow: spec.colorShadow,
    emoji: spec.emoji,
    lessonIds: lessons.map((l) => l.id),
  }

  return { unit, lessons }
}

const built = unitSpecs.map(buildUnit)

export const course: Course = {
  units: built.map((b) => b.unit),
  lessons: built.flatMap((b) => b.lessons),
  vocab: vocabById,
  sentences: sentenceById,
}

export function getLesson(lessonId: string): Lesson | undefined {
  return course.lessons.find((l) => l.id === lessonId)
}

export function getUnit(unitId: string): Unit | undefined {
  return course.units.find((u) => u.id === unitId)
}

export function getVocab(id: string): VocabItem | undefined {
  return vocabById.get(id)
}

export function getSentence(id: string): SentenceItem | undefined {
  return sentenceById.get(id)
}

export const allVocabItems = allVocab
export const allSentenceItems = allSentences

import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { OptionCard } from '../components/Button'
import { useProgress } from '../store/progressStore'
import { pickReviewWords } from '../lib/srs'
import { isCorrect } from '../lib/normalize'
import { reviewXp } from '../lib/progress'
import { feedback, primeFeedback } from '../lib/feedback'
import { course } from '../data/course'
import { makeRng, shuffle } from '../lib/rng'
import { useAwardReview } from '../hooks/useAwardLesson'
import type { VocabItem } from '../data/types'

/** Локальный предпросмотр XP (совпадает с формулой сервера). */
const reviewXpLocalPreview = reviewXp

/**
 * Повторение: тренажёр по словам, где чаще всего были ошибки.
 * Формат — «выбери перевод», 10 слов за подход.
 */
export function ReviewScreen() {
  const wordStats = useProgress((s) => s.wordStats)
  const recordWord = useProgress((s) => s.recordWord)
  const awardReview = useAwardReview()
  const [round, setRound] = useState(0)
  const [index, setIndex] = useState(0)
  const [wrongPicks, setWrongPicks] = useState<string[]>([])
  const [solved, setSolved] = useState(0)
  /** Сколько слов закрыто с первой попытки — для награды. */
  const [firstTry, setFirstTry] = useState(0)
  const firstTryRef = useRef(true)
  const awardedRef = useRef(false)

  /**
   * Список слов фиксируется на подход. Считаем его по «снимку» статистики
   * один раз при старте подхода: если бы список зависел от живого `wordStats`,
   * он пересобирался бы после каждого ответа и текущее слово «перескакивало».
   */
  const [words, setWords] = useState<VocabItem[]>(() => pickReviewWords(wordStats, 10, 1))

  const current: VocabItem | undefined = words[index]

  const options = useMemo(() => {
    if (!current) return []
    const pool = [...course.vocab.values()].filter(
      (v) => v.ru !== current.ru && v.pos === current.pos,
    )
    const rng = makeRng(index + current.id.length)
    const wrong = shuffle(pool, rng).slice(0, 3)
    return shuffle([...wrong.map((w) => w.ru), current.ru], rng)
  }, [current, index])

  const pick = (option: string) => {
    if (!current || wrongPicks.includes(option)) return
    primeFeedback()

    if (isCorrect(option, current.ru)) {
      feedback('correct')
      recordWord(current.id, true)
      setSolved((n) => n + 1)
      if (firstTryRef.current) setFirstTry((n) => n + 1)
      firstTryRef.current = true
      setWrongPicks([])
      setIndex((i) => i + 1)
      return
    }

    feedback('wrong')
    recordWord(current.id, false)
    firstTryRef.current = false
    setWrongPicks((p) => [...p, option])
  }

  const finished = words.length > 0 && index >= words.length
  const noWords = words.length === 0

  /** Награда за подход: считается один раз при завершении. */
  useEffect(() => {
    if (!finished || words.length === 0 || awardedRef.current) return
    awardedRef.current = true
    void awardReview({
      correct: firstTry,
      total: words.length,
      wordStats: useProgress.getState().wordStats,
    })
  }, [finished, words.length, firstTry, awardReview])

  const restart = () => {
    // Новый подход — фиксируем свежую статистику и новый набор слов.
    setWords(pickReviewWords(useProgress.getState().wordStats, 10, round + 2))
    awardedRef.current = false
    firstTryRef.current = true
    setRound((r) => r + 1)
    setIndex(0)
    setWrongPicks([])
    setSolved(0)
    setFirstTry(0)
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar />

      <main className="flex-1 px-4 pb-8">
        <div className="mb-5 flex items-center gap-2">
          <RefreshCw size={20} className="text-brand" />
          <h1 className="text-lg font-black">Повторение</h1>
        </div>

        {noWords && (
          <p className="rounded-2xl bg-tg-secondary-bg p-4 text-sm text-tg-hint">
            Пока нечего повторять — пройдите пару уроков, и здесь появятся слова,
            которые стоит закрепить.
          </p>
        )}

        {!noWords && finished && (
          <div className="rounded-2xl border-2 border-brand/30 bg-brand/10 p-5 text-center">
            <p className="text-4xl">🎯</p>
            <p className="mt-2 font-black">Повторение завершено</p>
            <p className="text-sm text-brand">
              С первой попытки: {firstTry} из {words.length}
            </p>
            <p className="mt-1 text-sm font-bold text-gold">
              +{reviewXpLocalPreview(firstTry, words.length)} XP
            </p>
            <button
              type="button"
              onClick={restart}
              style={{ ['--btn-shadow' as string]: 'var(--color-brand-shadow)' }}
              className="btn-3d no-select mt-4 w-full bg-brand py-3 text-white"
            >
              Ещё подход
            </button>
          </div>
        )}

        {!noWords && !finished && current && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-tg-hint">
              {index + 1} из {words.length}
            </p>
            <div className="mb-5 rounded-2xl bg-tg-secondary-bg p-5 text-center">
              <p className="text-2xl font-black">{current.bxr}</p>
              {current.transcription && (
                <p className="mt-1 text-sm text-tg-hint">[{current.transcription}]</p>
              )}
            </div>
            <div className="grid gap-3">
              {options.map((option) => {
                const isWrong = wrongPicks.includes(option)
                return (
                  <OptionCard
                    key={option}
                    state={isWrong ? 'wrong' : 'idle'}
                    disabled={isWrong}
                    onClick={() => pick(option)}
                  >
                    {option}
                  </OptionCard>
                )
              })}
            </div>
            <p className="mt-4 text-center text-xs text-tg-hint">
              Ошибок за подход: {words.length - solved}
            </p>
          </>
        )}
      </main>
    </div>
  )
}

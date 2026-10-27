import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { MatchExercise } from '../../../data/types'
import { shuffle, makeRng, hashString } from '../../../lib/rng'
import { feedback, primeFeedback } from '../../../lib/feedback'

interface Props {
  exercise: MatchExercise
  checked: boolean
  onWrong: () => void
  onCorrect: () => void
}

type Side = 'bxr' | 'ru'

interface Slot {
  id: string
  text: string
  side: Side
  pairIndex: number
}

/**
 * Сопоставление пар: слева бурятские слова, справа русские переводы.
 * Все пары найдены → onCorrect(). Неверная пара подсвечивается и гаснет.
 */
export function MatchExerciseView({ exercise, checked, onWrong, onCorrect }: Props) {
  const seed = useMemo(() => hashString(exercise.id), [exercise.id])
  const left = useMemo<Slot[]>(
    () =>
      shuffle(
        exercise.pairs.map((p, i) => ({
          id: `l${i}`,
          text: p.bxr,
          side: 'bxr' as Side,
          pairIndex: i,
        })),
        makeRng(seed),
      ),
    [exercise.pairs, seed],
  )
  const right = useMemo<Slot[]>(
    () =>
      shuffle(
        exercise.pairs.map((p, i) => ({
          id: `r${i}`,
          text: p.ru,
          side: 'ru' as Side,
          pairIndex: i,
        })),
        makeRng(seed + 1),
      ),
    [exercise.pairs, seed],
  )

  const [selected, setSelected] = useState<Slot | null>(null)
  const [matched, setMatched] = useState<number[]>([])
  const [wrongPair, setWrongPair] = useState<string[]>([])
  /** Ключ кадра: меняется при каждой ошибке, чтобы анимация проигрывалась снова. */
  const [shakeKey, setShakeKey] = useState(0)

  useEffect(() => {
    setSelected(null)
    setMatched([])
    setWrongPair([])
    setShakeKey(0)
  }, [exercise.id])

  const total = exercise.pairs.length
  const done = matched.length === total

  const tap = (slot: Slot) => {
    if (checked || matched.includes(slot.pairIndex)) return
    primeFeedback()

    // Первый выбор либо смена стороны — просто выделяем плитку.
    if (!selected || selected.side === slot.side) {
      // Повторный тап по выделенной плитке снимает выделение.
      if (selected?.id === slot.id) {
        setSelected(null)
        return
      }
      feedback('tap')
      setSelected(slot)
      return
    }

    if (selected.pairIndex === slot.pairIndex) {
      feedback('correct')
      const next = [...matched, slot.pairIndex]
      setMatched(next)
      setSelected(null)
      setWrongPair([])
      if (next.length === total) onCorrect()
      return
    }

    feedback('wrong')
    setWrongPair([selected.id, slot.id])
    setShakeKey((k) => k + 1)
    setSelected(null)
    onWrong()
  }

  const slotState = (slot: Slot): string => {
    if (matched.includes(slot.pairIndex)) return 'bg-brand/10 border-brand text-brand opacity-60'
    if (selected?.id === slot.id) return 'bg-sky/10 border-sky text-sky'
    if (wrongPair.includes(slot.id)) return 'bg-danger/10 border-danger text-danger animate-shake'
    return 'bg-tg-bg border-tg-secondary-bg'
  }

  return (
    <div className="animate-pop-in">
      <h2 className="mb-1 text-xl font-black">Соедините пары</h2>
      <p className="mb-5 text-sm text-tg-hint">
        Найдено {matched.length} из {total}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {[left, right].map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-3">
            {column.map((slot) => (
              <motion.button
                key={`${slot.id}:${wrongPair.includes(slot.id) ? shakeKey : 0}`}
                type="button"
                disabled={checked || matched.includes(slot.pairIndex)}
                onClick={() => tap(slot)}
                className={`card-3d no-select px-2 py-3 text-center text-sm font-bold ${slotState(slot)}`}
              >
                {slot.text}
              </motion.button>
            ))}
          </div>
        ))}
      </div>

      {done && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-xl bg-brand/10 p-3 text-center text-sm font-bold text-brand"
        >
          Все пары найдены 🎉
        </motion.p>
      )}
    </div>
  )
}

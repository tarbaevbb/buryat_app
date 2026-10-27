import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { BuildExercise } from '../../../data/types'
import { normalize } from '../../../lib/normalize'
import { haptic } from '../../../telegram/init'

interface Props {
  exercise: BuildExercise
  checked: boolean
  onWrong: () => void
  onCorrect: () => void
}

interface Tile {
  /** Уникальный ключ плитки — слова могут повторяться. */
  uid: string
  word: string
}

/**
 * Сборка предложения из плиток. Порядок плиток задаётся данными (стабилен),
 * пользователь складывает ответ в «строку» сверху.
 */
export function BuildExerciseView({ exercise, checked, onWrong, onCorrect }: Props) {
  const [pool, setPool] = useState<Tile[]>([])
  const [line, setLine] = useState<Tile[]>([])

  useEffect(() => {
    setPool(exercise.tokens.map((word, i) => ({ uid: `${i}:${word}`, word })))
    setLine([])
  }, [exercise])

  const takeTile = (tile: Tile) => {
    if (checked) return
    haptic('select')
    setPool((p) => p.filter((t) => t.uid !== tile.uid))
    setLine((l) => [...l, tile])
  }

  const returnTile = (tile: Tile) => {
    if (checked) return
    haptic('select')
    setLine((l) => l.filter((t) => t.uid !== tile.uid))
    setPool((p) => [...p, tile])
  }

  const check = () => {
    const built = line.map((t) => t.word).join(' ')
    if (normalize(built) === normalize(exercise.answer)) {
      haptic('success')
      onCorrect()
    } else {
      haptic('error')
      onWrong()
    }
  }

  return (
    <div className="animate-pop-in">
      <h2 className="mb-4 text-xl font-black">Переведите на бурятский</h2>

      <div className="mb-5 rounded-2xl bg-tg-secondary-bg p-5">
        <p className="text-lg font-bold leading-snug">{exercise.prompt}</p>
      </div>

      {/* Строка ответа */}
      <div className="mb-4 min-h-[64px] border-b-2 border-dashed border-tg-secondary-bg pb-3">
        <div className="flex flex-wrap gap-2">
          {line.map((tile) => (
            <motion.button
              key={tile.uid}
              layout
              type="button"
              onClick={() => returnTile(tile)}
              className="card-3d no-select bg-tg-bg px-3 py-2 font-semibold"
            >
              {tile.word}
            </motion.button>
          ))}
          {line.length === 0 && (
            <span className="py-2 text-sm text-tg-hint">Нажимайте слова ниже…</span>
          )}
        </div>
      </div>

      {/* Пул слов */}
      <div className="mb-6 flex flex-wrap gap-2">
        {pool.map((tile) => (
          <motion.button
            key={tile.uid}
            layout
            type="button"
            onClick={() => takeTile(tile)}
            className="card-3d no-select bg-tg-bg px-3 py-2 font-semibold"
          >
            {tile.word}
          </motion.button>
        ))}
      </div>

      {!checked && (
        <button
          type="button"
          onClick={check}
          disabled={line.length === 0}
          style={{ ['--btn-shadow' as string]: 'var(--color-brand-shadow)' }}
          className="btn-3d no-select w-full bg-brand py-3.5 text-base text-white"
        >
          Проверить
        </button>
      )}

      {checked && (
        <p className="rounded-xl bg-brand/10 p-3 text-sm font-semibold text-brand">
          {exercise.answer}
        </p>
      )}
    </div>
  )
}

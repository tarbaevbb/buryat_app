import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { SelectExercise } from '../../../data/types'
import { normalize } from '../../../lib/normalize'
import { OptionCard } from '../../../components/Button'
import { feedback, primeFeedback } from '../../../lib/feedback'

interface Props {
  exercise: SelectExercise
  checked: boolean
  onWrong: () => void
  onCorrect: () => void
}

/**
 * Выбор правильного варианта. Неверный тап помечает плитку красным и разрешает
 * попробовать снова — задание не «закрывается» ошибкой.
 */
export function SelectExerciseView({ exercise, checked, onWrong, onCorrect }: Props) {
  const [wrongPicks, setWrongPicks] = useState<string[]>([])
  /** Плитка, которую нужно «тряхнуть» — ключ кадра анимации. */
  const [shaking, setShaking] = useState<{ option: string; key: number } | null>(null)
  const acceptedAnswers = exercise.acceptedAnswers ?? [exercise.answer]
  const isAcceptedAnswer = (option: string) =>
    acceptedAnswers.some((answer) => normalize(option) === normalize(answer))

  useEffect(() => {
    setWrongPicks([])
    setShaking(null)
  }, [exercise.id])

  const pick = (option: string) => {
    if (checked || wrongPicks.includes(option)) return

    // Разблокируем аудио внутри жеста: иначе браузер может «проглотить»
    // первый сигнал, и звук появится только со второго нажатия.
    primeFeedback()

    if (isAcceptedAnswer(option)) {
      feedback('correct')
      onCorrect()
      return
    }

    feedback('wrong')
    setWrongPicks((prev) => [...prev, option])
    setShaking({ option, key: Date.now() })
    onWrong()
  }

  const title = exercise.sentenceId
    ? 'Как понять эту фразу?'
    : exercise.promptLang === 'bxr'
      ? 'Что это значит?'
      : 'Как сказать по-бурятски?'

  return (
    <div className="animate-pop-in">
      <h2 className="mb-4 text-xl font-black">{title}</h2>

      <div className="mb-6 rounded-2xl bg-tg-secondary-bg p-5 text-center">
        <p className="text-2xl font-black leading-snug">{exercise.prompt}</p>
      </div>

      <div className="grid gap-3">
        {exercise.options.map((option, i) => {
          const isWrong = wrongPicks.includes(option)
          const state = checked
              ? isAcceptedAnswer(option)
              ? 'correct'
              : isWrong
                ? 'wrong'
                : 'idle'
            : isWrong
              ? 'wrong'
              : 'idle'
          const shouldShake = shaking?.option === option
          return (
            <motion.div
              // Ключ меняется при каждом неверном тапе — анимация проигрывается заново.
              key={`${option}:${shouldShake ? shaking.key : 0}:${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={shouldShake ? 'animate-shake' : ''}
            >
              <OptionCard state={state} disabled={checked || isWrong} onClick={() => pick(option)}>
                {option}
              </OptionCard>
            </motion.div>
          )
        })}
      </div>

      {checked && (
        <p className="mt-4 rounded-xl bg-brand/10 p-3 text-sm font-semibold text-brand">
          {exercise.prompt} — {acceptedAnswers.join(' / ')}
        </p>
      )}
    </div>
  )
}

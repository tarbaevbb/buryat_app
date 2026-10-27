import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { generateExercises, exerciseVocabIds } from '../../data/exercises'
import { getLesson } from '../../data/course'
import { GEMS_PER_REFILL, useProgress } from '../../store/progressStore'
import { sessionSummary, useSession } from '../../store/sessionStore'
import { haptic, isTelegram } from '../../telegram/init'
import { useBackButton, useMainButton } from '../../telegram/hooks'
import { Hearts } from '../../components/Hearts'
import { useAwardLesson } from '../../hooks/useAwardLesson'
import { SelectExerciseView } from './exercises/SelectExercise'
import { BuildExerciseView } from './exercises/BuildExercise'
import { MatchExerciseView } from './exercises/MatchExercise'
import { LessonResultSheet } from './LessonResultSheet'

interface Props {
  lessonId: string
  onExit: () => void
}

/**
 * Экран урока: прогресс сверху, задание по центру, «Проверить/Продолжить» снизу.
 * Сердца уменьшаются за каждую ошибку; при нуле урок прерывается.
 *
 * Внутри Telegram кнопка снизу — нативная MainButton, поэтому своя кнопка
 * не показывается (иначе их было бы две). В браузере — обычная кнопка.
 */
export function LessonScreen({ lessonId, onExit }: Props) {
  const lesson = useMemo(() => getLesson(lessonId), [lessonId])
  const exercises = useMemo(() => generateExercises(lessonId), [lessonId])

  const session = useSession()
  const { start, submitCorrect, submitWrong, next, clear } = session
  const loseHeart = useProgress((s) => s.loseHeart)
  const refill = useProgress((s) => s.refillHeartsWithGems)
  const gems = useProgress((s) => s.gems)
  const heartsNow = useProgress((s) => s.heartsNow)
  const recordWord = useProgress((s) => s.recordWord)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const awardLesson = useAwardLesson()

  const [outOfHearts, setOutOfHearts] = useState(false)
  const [confirmedExit, setConfirmedExit] = useState(false)
  const awardedRef = useRef(false)
  /** Была ли ошибка в текущем задании — для подсчёта общей точности. */
  const hadWrongRef = useRef(false)
  const inTelegram = isTelegram()

  useEffect(() => {
    start(lessonId, exercises)
    awardedRef.current = false
    hadWrongRef.current = false
    return () => clear()
  }, [lessonId, exercises, start, clear])

  useEffect(() => {
    hadWrongRef.current = false
  }, [session.index])

  const current = session.exercises[session.index]
  const isLast = session.index >= session.exercises.length - 1
  const progress = session.exercises.length
    ? Math.round(
        ((session.index + (session.phase === 'checked' ? 1 : 0)) / session.exercises.length) * 100,
      )
    : 0

  const handleWrong = useCallback(() => {
    submitWrong()
    loseHeart()
    hadWrongRef.current = true
    if (heartsNow() <= 0) {
      haptic('error')
      setOutOfHearts(true)
    }
    if (current) exerciseVocabIds(current).forEach((id) => recordWord(id, false))
  }, [submitWrong, loseHeart, heartsNow, current, recordWord])

  const handleCorrect = useCallback(() => {
    if (current) exerciseVocabIds(current).forEach((id) => recordWord(id, true))
    // Точность считаем по заданию: одна попытка на задание,
    // в минус идёт, если в этом задании была ошибка.
    recordAttempt(hadWrongRef.current)
    submitCorrect([])
  }, [submitCorrect, current, recordWord, recordAttempt])

  const summary = useMemo(() => sessionSummary(session), [session])
  const finished = session.phase === 'done'

  const finish = useCallback(() => {
    if (!lesson || awardedRef.current) return
    awardedRef.current = true
    void awardLesson({ lessonId, summary })
  }, [lesson, lessonId, summary, awardLesson])

  // Награда начисляется ровно один раз при завершении урока.
  useEffect(() => {
    if (session.phase === 'done' && session.exercises.length > 0) finish()
  }, [session.phase, session.exercises.length, finish])

  const mainAction = useCallback(() => {
    haptic('light')
    if (finished) {
      onExit()
      return
    }
    next()
  }, [finished, next, onExit])

  useMainButton({
    text: isLast ? 'Завершить' : 'Продолжить',
    // MainButton показываем, только когда ответ уже проверен — как в Duolingo.
    visible: !finished && session.phase === 'checked',
    enabled: true,
    onClick: mainAction,
  })

  const backAction = useCallback(() => {
    haptic('light')
    setConfirmedExit(true)
  }, [])
  useBackButton(true, backAction)

  if (!lesson) {
    return (
      <div className="p-6 text-center">
        <p className="font-bold">Урок не найден.</p>
        <button type="button" onClick={onExit} className="mt-4 font-bold text-sky">
          Вернуться
        </button>
      </div>
    )
  }

  if (outOfHearts) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="text-5xl">💔</span>
        <h2 className="text-xl font-black">Сердца закончились</h2>
        <p className="text-sm text-tg-hint">
          Восстановите сердца за {GEMS_PER_REFILL}💎 или подождите — они возвращаются сами.
        </p>
        <div className="w-full">
          <Hearts />
        </div>
        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={() => {
              if (refill()) {
                haptic('success')
                setOutOfHearts(false)
              }
            }}
            disabled={gems < GEMS_PER_REFILL}
            style={{ ['--btn-shadow' as string]: 'var(--color-danger-shadow)' }}
            className="btn-3d no-select flex-1 bg-danger py-3 text-white disabled:opacity-40"
          >
            За {GEMS_PER_REFILL}💎
          </button>
          <button
            type="button"
            onClick={onExit}
            style={{ ['--btn-shadow' as string]: 'rgba(0,0,0,0.15)' }}
            className="btn-3d no-select flex-1 bg-tg-secondary-bg py-3 text-tg-text"
          >
            Выйти
          </button>
        </div>
      </div>
    )
  }

  if (finished) {
    return <LessonResultSheet summary={summary} lesson={lesson} onContinue={onExit} />
  }

  if (!current) {
    return (
      <div className="p-6 text-center">
        <p className="font-bold">В этом уроке нет заданий.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="pt-safe sticky top-0 z-10 bg-tg-bg/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            aria-label="Выйти из урока"
            onClick={backAction}
            className="no-select text-tg-hint"
          >
            <X size={22} />
          </button>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-tg-secondary-bg">
            <motion.div
              className="h-full rounded-full bg-brand"
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            />
          </div>
          <Hearts compact />
        </div>
      </header>

      <main className="flex-1 px-4 pb-6 pt-2">
        {current.kind === 'select' && (
          <SelectExerciseView
            exercise={current}
            checked={session.phase === 'checked'}
            onWrong={handleWrong}
            onCorrect={handleCorrect}
          />
        )}
        {current.kind === 'build' && (
          <BuildExerciseView
            exercise={current}
            checked={session.phase === 'checked'}
            onWrong={handleWrong}
            onCorrect={handleCorrect}
          />
        )}
        {current.kind === 'match' && (
          <MatchExerciseView
            exercise={current}
            checked={session.phase === 'checked'}
            onWrong={handleWrong}
            onCorrect={handleCorrect}
          />
        )}
      </main>

      <footer className="pb-safe sticky bottom-0 border-t-2 border-tg-secondary-bg bg-tg-bg px-4 py-3">
        {session.phase === 'checked' ? (
          // В Telegram эту роль выполняет MainButton — свою кнопку не дублируем.
          !inTelegram && (
            <button
              type="button"
              onClick={mainAction}
              style={{ ['--btn-shadow' as string]: 'var(--color-brand-shadow)' }}
              className="btn-3d no-select w-full bg-brand py-3.5 text-base text-white"
            >
              {isLast ? 'Завершить' : 'Продолжить'}
            </button>
          )
        ) : (
          <p className="text-center text-sm text-tg-hint">
            Выберите ответ
            {session.mistakes > 0 && ` · ошибок: ${session.mistakes}`}
          </p>
        )}
      </footer>

      {confirmedExit && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-tg-bg p-5 text-center">
            <h3 className="mb-2 text-lg font-black">Выйти из урока?</h3>
            <p className="mb-5 text-sm text-tg-hint">Прогресс этого урока не сохранится.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmedExit(false)}
                style={{ ['--btn-shadow' as string]: 'rgba(0,0,0,0.15)' }}
                className="btn-3d no-select flex-1 bg-tg-secondary-bg py-3 text-tg-text"
              >
                Продолжить
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmedExit(false)
                  onExit()
                }}
                style={{ ['--btn-shadow' as string]: 'var(--color-danger-shadow)' }}
                className="btn-3d no-select flex-1 bg-danger py-3 text-white"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

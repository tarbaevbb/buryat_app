import { motion } from 'framer-motion'
import { Star, Zap, Target, AlertTriangle } from 'lucide-react'
import type { Lesson } from '../../data/types'
import { XpBar } from '../../components/TopBar'
import { useProgress } from '../../store/progressStore'

export interface Summary {
  total: number
  score: number
  accuracy: number
  xp: number
  perfect: boolean
  mistakes: number
}

interface Props {
  summary: Summary
  lesson: Lesson
  onContinue: () => void
}

/** Экран результата урока: звёзды, XP, точность. */
export function LessonResultSheet({ summary, lesson, onContinue }: Props) {
  const xp = useProgress((s) => s.xp)
  const streak = useProgress((s) => s.streak)
  const stars = summary.perfect ? 3 : summary.score >= 80 ? 2 : summary.score >= 50 ? 1 : 0

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
        className="text-6xl"
      >
        {summary.perfect ? '🏆' : summary.score >= 80 ? '🎉' : '👍'}
      </motion.div>

      <div>
        <h2 className="text-2xl font-black">
          {summary.perfect ? 'Идеально!' : summary.score >= 80 ? 'Отличная работа!' : 'Урок пройден'}
        </h2>
        <p className="mt-1 text-sm text-tg-hint">
          {lesson.titleBxr} · {lesson.title}
        </p>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 220, damping: 14 }}
          >
            <Star
              size={40}
              className={i < stars ? 'fill-gold text-gold' : 'fill-tg-secondary-bg text-tg-secondary-bg'}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid w-full max-w-sm grid-cols-3 gap-3">
        <Tile icon={<Zap size={20} className="text-gold" />} label="XP" value={`+${summary.xp}`} />
        <Tile
          icon={<Target size={20} className="text-sky" />}
          label="Точность"
          value={`${summary.accuracy}%`}
        />
        <Tile
          icon={<AlertTriangle size={20} className="text-danger" />}
          label="Ошибки"
          value={String(summary.mistakes)}
        />
      </div>

      <div className="w-full max-w-sm">
        <XpBar xp={xp} />
        <p className="mt-2 text-xs font-semibold text-tg-hint">
          Всего {xp} XP · серия {streak} 🔥
        </p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        style={{ ['--btn-shadow' as string]: 'var(--color-brand-shadow)' }}
        className="btn-3d no-select w-full max-w-sm bg-brand py-3.5 text-base text-white"
      >
        Продолжить
      </button>
    </div>
  )
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border-2 border-tg-secondary-bg p-3">
      <div className="mb-1 flex justify-center">{icon}</div>
      <div className="text-lg font-black">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-tg-hint">{label}</div>
    </div>
  )
}

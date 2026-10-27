import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import type { Lesson } from '../data/types'
import type { LessonResult } from '../store/progressStore'

interface Props {
  lesson: Lesson
  index: number
  result?: LessonResult
  unlocked: boolean
  active: boolean
  color: string
  colorShadow: string
  onClick: () => void
}

/**
 * Узел урока на «карте»: кружок со звездой (идеальное прохождение),
 * галочка пройденного либо замок.
 */
export function SkillNode({
  lesson,
  index,
  result,
  unlocked,
  active,
  color,
  colorShadow,
  onClick,
}: Props) {
  const done = Boolean(result)
  const perfect = (result?.score ?? 0) >= 95
  const background = done ? color : unlocked ? color : '#e5e7eb'
  const shadow = done || unlocked ? colorShadow : '#cbd5e1'
  const offset = index % 2 === 0 ? 'translate-x-0' : 'translate-x-8'

  return (
    <div className={`flex flex-col items-center ${offset}`}>
      <motion.button
        type="button"
        whileTap={{ scale: unlocked ? 0.94 : 1 }}
        disabled={!unlocked}
        onClick={onClick}
        style={{ background, boxShadow: `0 6px 0 0 ${shadow}` }}
        className={`no-select relative flex h-[74px] w-[74px] items-center justify-center rounded-full ${
          active && !done ? 'ring-4 ring-brand/30' : ''
        }`}
        aria-label={`Урок ${index + 1}: ${lesson.title}`}
      >
        {done ? (
          <Star size={34} className={perfect ? 'fill-white text-white' : 'fill-white/70 text-white'} />
        ) : (
          <span className="text-2xl font-black text-white/95">{index + 1}</span>
        )}
        {!unlocked && (
          <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-400 px-1.5 text-xs text-white">
            🔒
          </span>
        )}
      </motion.button>
      <span className="mt-2 max-w-[130px] text-center text-xs font-bold leading-tight text-tg-hint">
        {lesson.title}
      </span>
    </div>
  )
}

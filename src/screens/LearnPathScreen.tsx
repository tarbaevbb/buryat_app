import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { course } from '../data/course'
import { useProgress } from '../store/progressStore'
import { TopBar } from '../components/TopBar'
import { SkillNode } from '../components/SkillNode'
import { Hearts } from '../components/Hearts'
import type { Lesson } from '../data/types'

/**
 * Карта обучения: разделы сверху вниз, внутри — «тропинка» из узлов.
 * Урок разблокируется, когда предыдущий пройден (или это первый урок курса).
 */
export function LearnPathScreen() {
  const navigate = useNavigate()
  const lessons = useProgress((s) => s.lessons)

  const { firstUnfinished } = useMemo(() => {
    const flat = course.units.flatMap((u) => u.lessonIds)
    const first = flat.find((id) => !lessons[id]) ?? flat[flat.length - 1]
    return { firstUnfinished: first }
  }, [lessons])

  const isUnlocked = (lessonId: string): boolean => {
    if (lessonId === firstUnfinished) return true
    const all = course.units.flatMap((u) => u.lessonIds)
    const idx = all.indexOf(lessonId)
    if (idx <= 0) return true
    const prev = all[idx - 1]
    return Boolean(lessons[prev])
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar showXp />

      <main className="flex-1 px-4 pb-8">
        <div className="mb-5">
          <Hearts />
        </div>

        {course.units.map((unit) => {
          const unitLessons: Lesson[] = unit.lessonIds
            .map((id) => course.lessons.find((l) => l.id === id))
            .filter((l): l is Lesson => Boolean(l))
          const done = unitLessons.filter((l) => lessons[l.id]).length

          return (
            <section key={unit.id} className="mb-8">
              <div
                className="mb-4 rounded-2xl p-4 text-white"
                style={{ background: unit.color, boxShadow: `0 4px 0 0 ${unit.colorShadow}` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                      Раздел {unit.index + 1}
                    </p>
                    <h2 className="text-lg font-black">{unit.titleBxr}</h2>
                    <p className="text-sm opacity-90">{unit.title}</p>
                  </div>
                  <span className="text-3xl">{unit.emoji}</span>
                </div>
                <p className="mt-2 text-xs opacity-90">{unit.description}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-500"
                    style={{ width: `${(done / unitLessons.length) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] font-bold opacity-90">
                  {done} из {unitLessons.length} уроков
                </p>
              </div>

              <div className="flex flex-col items-center gap-5">
                {unitLessons.map((lesson, i) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <SkillNode
                      lesson={lesson}
                      index={i}
                      result={lessons[lesson.id]}
                      unlocked={isUnlocked(lesson.id)}
                      active={lesson.id === firstUnfinished}
                      color={unit.color}
                      colorShadow={unit.colorShadow}
                      onClick={() => navigate(`/lesson/${lesson.id}`)}
                    />
                  </motion.div>
                ))}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}

import { Flame, Gem, Zap } from 'lucide-react'
import { levelFromXp, useProgress } from '../store/progressStore'

export function XpBar({ xp }: { xp: number }) {
  const { level, into, need } = levelFromXp(xp)
  const percent = Math.min(100, Math.round((into / need) * 100))
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-gold">Ур. {level}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-tg-secondary-bg">
        <div
          className="h-full rounded-full bg-gold transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-tg-hint">{into}/{need}</span>
    </div>
  )
}

/** Верхняя панель: streak, гемы, XP. */
export function TopBar({ showXp = false }: { showXp?: boolean }) {
  const streak = useProgress((s) => s.streak)
  const gems = useProgress((s) => s.gems)
  const xp = useProgress((s) => s.xp)

  return (
    <header className="pt-safe sticky top-0 z-20 bg-tg-bg/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Stat icon={<Flame size={18} className="fill-orange-400 text-orange-400" />} value={streak} />
          <Stat icon={<Gem size={18} className="text-sky" />} value={gems} />
          <Stat icon={<Zap size={18} className="fill-gold text-gold" />} value={xp} />
        </div>
        <span className="text-sm font-bold text-tg-hint">Буряад хэлэн</span>
      </div>
      {showXp && (
        <div className="px-4 pb-3">
          <XpBar xp={xp} />
        </div>
      )}
    </header>
  )
}

function Stat({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span className="flex items-center gap-1 text-sm font-bold">
      {icon}
      {value}
    </span>
  )
}

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { HEART_REFILL_MS, MAX_HEARTS, useProgress } from '../store/progressStore'

/**
 * Сердца с таймером восстановления.
 *
 * Гемов в игре нет, поэтому «купить» запас нельзя: он восстанавливается
 * сам по одному сердцу за `HEART_REFILL_MS`.
 */
export function Hearts({ compact = false }: { compact?: boolean }) {
  const hearts = useProgress((s) => s.hearts)
  const heartsUpdatedAt = useProgress((s) => s.heartsUpdatedAt)
  const regenHearts = useProgress((s) => s.regenHearts)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    regenHearts()
    const id = window.setInterval(() => {
      setNow(Date.now())
      regenHearts()
    }, 1000)
    return () => window.clearInterval(id)
  }, [regenHearts])

  const minutesLeft =
    hearts >= MAX_HEARTS
      ? 0
      : Math.max(1, Math.ceil((HEART_REFILL_MS - (now - heartsUpdatedAt)) / 60000))

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-danger">
        <Heart size={18} className="fill-danger" />
        {hearts}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-tg-secondary-bg p-3">
      <Heart size={24} className="fill-danger text-danger" />
      <div className="flex-1">
        <div className="font-bold">
          {hearts} / {MAX_HEARTS}
        </div>
        <div className="text-xs text-tg-hint">
          {hearts >= MAX_HEARTS ? 'Все сердца на месте' : `Следующее через ~${minutesLeft} мин.`}
        </div>
      </div>
    </div>
  )
}

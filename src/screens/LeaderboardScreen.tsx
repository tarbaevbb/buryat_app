import { useEffect, useMemo, useState } from 'react'
import { Trophy, RefreshCw } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { useProgress, weekXp } from '../store/progressStore'
import { isCloudEnabled } from '../lib/supabase'
import { fetchLeaderboard, type LeaderboardRow } from '../lib/cloud'
import { useCloudAuth } from '../hooks/useCloudAuth'

/** Недельный рейтинг: онлайн (Supabase) либо локальная заглушка. */
export function LeaderboardScreen() {
  const cloud = useCloudAuth()
  const displayName = useProgress((s) => s.displayName)
  const weekXpValue = useProgress((s) => weekXp(s.dailyXp))
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(isCloudEnabled)

  useEffect(() => {
    if (!isCloudEnabled || cloud.status !== 'online') {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchLeaderboard(50).then((data) => {
      if (cancelled) return
      setRows(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [cloud.status])

  const localRow = useMemo<LeaderboardRow>(
    () => ({
      rank: 0,
      userId: 'me',
      firstName: displayName || 'Вы',
      username: null,
      photoUrl: null,
      weekXp: weekXpValue,
      isMe: true,
    }),
    [displayName, weekXpValue],
  )

  const list = rows.length > 0 ? rows : [localRow]

  return (
    <div className="flex min-h-full flex-col">
      <TopBar />

      <main className="flex-1 px-4 pb-8">
        <div className="mb-5 flex items-center gap-2">
          <Trophy size={20} className="text-gold" />
          <h1 className="text-lg font-black">Рейтинг недели</h1>
        </div>

        {!isCloudEnabled && (
          <p className="mb-4 rounded-2xl bg-tg-secondary-bg p-3 text-xs text-tg-hint">
            Облако не подключено: показан ваш локальный результат. Добавьте
            VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY, чтобы соревноваться с другими.
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-tg-hint">
            <RefreshCw size={16} className="animate-spin" />
            Загрузка…
          </div>
        )}

        <ul className="grid gap-2">
          {list.map((row, i) => (
            <li
              key={row.userId}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                row.isMe ? 'border-brand/40 bg-brand/5' : 'border-tg-secondary-bg'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                  i === 0
                    ? 'bg-gold text-white'
                    : i === 1
                      ? 'bg-slate-300 text-white'
                      : i === 2
                        ? 'bg-orange-300 text-white'
                        : 'bg-tg-secondary-bg text-tg-hint'
                }`}
              >
                {rows.length > 0 ? row.rank : '—'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {row.firstName || row.username || 'Игрок'}
                  {row.isMe && <span className="ml-1 text-brand">(вы)</span>}
                </p>
                {row.username && (
                  <p className="truncate text-xs text-tg-hint">@{row.username}</p>
                )}
              </div>
              <span className="shrink-0 font-black text-gold">{row.weekXp} XP</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

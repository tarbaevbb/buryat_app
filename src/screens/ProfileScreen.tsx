import { useMemo, useState } from 'react'
import { Flame, Zap, BookOpen, Target, Gem, Cloud, CloudOff, RotateCcw, Loader } from 'lucide-react'
import { TopBar, XpBar } from '../components/TopBar'
import { Hearts } from '../components/Hearts'
import { useProgress, levelFromXp } from '../store/progressStore'
import { useSettings } from '../store/settingsStore'
import { course } from '../data/course'
import { knownWordCount, weakWordCount } from '../lib/srs'
import { useCloudAuth, resetProgressEverywhere, flushProgress } from '../hooks/useCloudAuth'
import { isCloudEnabled } from '../lib/supabase'

export function ProfileScreen() {
  const cloud = useCloudAuth()
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const {
    xp,
    gems,
    streak,
    lessons,
    wordStats,
    dailyXp,
    displayName,
    totalExercises,
    totalMistakes,
    setDisplayName,
  } = useProgress()

  const settings = useSettings()
  const { level } = levelFromXp(xp)
  const known = knownWordCount(wordStats)
  const weak = weakWordCount(wordStats)
  const doneLessons = Object.keys(lessons).length
  const perfectLessons = Object.values(lessons).filter((l) => l.score >= 95).length

  const accuracy = useMemo(
    () =>
      totalExercises === 0
        ? 0
        : Math.round(((totalExercises - totalMistakes) / totalExercises) * 100),
    [totalExercises, totalMistakes],
  )

  const last14 = useMemo(() => {
    const days: { key: string; xp: number }[] = []
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`
      days.push({ key, xp: dailyXp[key] ?? 0 })
    }
    return days
  }, [dailyXp])

  const maxDayXp = Math.max(10, ...last14.map((d) => d.xp))

  return (
    <div className="flex min-h-full flex-col">
      <TopBar />

      <main className="flex-1 px-4 pb-8">
        {/* Карточка игрока */}
        <div className="mb-5 rounded-2xl border-2 border-tg-secondary-bg p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl font-black text-white">
              {(displayName || 'Б')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ваше имя"
                className="w-full bg-transparent text-lg font-black outline-none placeholder:text-tg-hint"
              />
              <p className="text-xs font-semibold text-tg-hint">Уровень {level}</p>
            </div>
            <span
              className={`flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold ${
                cloud.status === 'online'
                  ? 'bg-brand/10 text-brand'
                  : 'bg-tg-secondary-bg text-tg-hint'
              }`}
            >
              {cloud.status === 'connecting' ? (
                <Loader size={14} className="animate-spin" />
              ) : cloud.status === 'online' ? (
                <Cloud size={14} />
              ) : (
                <CloudOff size={14} />
              )}
              {cloud.status === 'online'
                ? 'Облако'
                : cloud.status === 'connecting'
                  ? 'Подключение…'
                  : 'Локально'}
            </span>
          </div>
          <div className="mt-4">
            <XpBar xp={xp} />
          </div>
        </div>

        {/* Метрики */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Metric icon={<Zap size={18} className="text-gold" />} label="Всего XP" value={xp} />
          <Metric
            icon={<Flame size={18} className="text-orange-400" />}
            label="Серия дней"
            value={streak}
          />
          <Metric icon={<Gem size={18} className="text-sky" />} label="Гемы" value={gems} />
          <Metric
            icon={<Target size={18} className="text-danger" />}
            label="Точность"
            value={`${accuracy}%`}
          />
          <Metric
            icon={<BookOpen size={18} className="text-brand" />}
            label="Уроков пройдено"
            value={`${doneLessons} / ${course.lessons.length}`}
          />
          <Metric
            icon={<BookOpen size={18} className="text-gold" />}
            label="Идеально"
            value={perfectLessons}
          />
          <Metric
            icon={<BookOpen size={18} className="text-sky" />}
            label="Слов изучено"
            value={known}
          />
          <Metric
            icon={<Target size={18} className="text-danger" />}
            label="Слабых слов"
            value={weak}
          />
        </div>

        {/* Активность за 2 недели */}
        <section className="mb-5 rounded-2xl border-2 border-tg-secondary-bg p-4">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-tg-hint">
            Активность (14 дней)
          </h2>
          <div className="flex h-24 items-end gap-1">
            {last14.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-brand transition-all"
                  style={{ height: `${Math.max(2, (d.xp / maxDayXp) * 80)}px`, opacity: d.xp ? 1 : 0.25 }}
                  title={`${d.key}: ${d.xp} XP`}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="mb-5">
          <Hearts />
        </div>

        {/* Настройки */}
        <section className="mb-5 rounded-2xl border-2 border-tg-secondary-bg p-4">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-tg-hint">
            Настройки
          </h2>
          <Toggle
            label="Звук"
            checked={settings.sound}
            onChange={settings.setSound}
          />
          <Toggle
            label="Вибрация"
            checked={settings.haptics}
            onChange={settings.setHaptics}
          />
          <Toggle
            label="Показывать транскрипцию"
            checked={settings.showTranscription}
            onChange={settings.setShowTranscription}
          />
        </section>

        {/* Действия */}
        <div className="grid gap-3">
          {isCloudEnabled && cloud.status === 'online' && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                const ok = await flushProgress()
                setNotice(ok ? 'Прогресс сохранён в облаке' : 'Не удалось синхронизировать')
                setBusy(false)
                window.setTimeout(() => setNotice(null), 2500)
              }}
              className="no-select flex items-center justify-center gap-2 rounded-2xl border-2 border-brand/40 py-3 text-sm font-bold text-brand disabled:opacity-50"
            >
              {busy ? <Loader size={16} className="animate-spin" /> : <Cloud size={16} />}
              Синхронизировать сейчас
            </button>
          )}
          {isCloudEnabled && cloud.status !== 'online' && (
            <button
              type="button"
              onClick={cloud.retry}
              className="btn-3d no-select bg-sky py-3 text-white"
              style={{ ['--btn-shadow' as string]: 'var(--color-sky-shadow)' }}
            >
              Повторить подключение к облаку
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="no-select flex items-center justify-center gap-2 rounded-2xl border-2 border-danger/40 py-3 text-sm font-bold text-danger"
          >
            <RotateCcw size={16} />
            Сбросить прогресс
          </button>
        </div>

        {notice && (
          <p className="mt-4 rounded-xl bg-tg-secondary-bg p-3 text-center text-sm font-semibold">
            {notice}
          </p>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-tg-hint">
          Буряад хэлэн · Mini App для изучения бурятского языка.
          <br />
          Учебный материал помечен для проверки носителем (см. docs/content-review.md).
        </p>
      </main>

      {confirmReset && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-tg-bg p-5 text-center">
            <h3 className="mb-2 text-lg font-black">Сбросить всё?</h3>
            <p className="mb-5 text-sm text-tg-hint">
              Будут удалены XP, серия, прогресс уроков и статистика ошибок
              {isCloudEnabled && cloud.status === 'online' ? ' — и в облаке тоже' : ''}.
              Действие необратимо.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmReset(false)}
                className="btn-3d no-select flex-1 bg-tg-secondary-bg py-3 text-tg-text disabled:opacity-50"
                style={{ ['--btn-shadow' as string]: 'rgba(0,0,0,0.15)' }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  await resetProgressEverywhere()
                  setBusy(false)
                  setConfirmReset(false)
                }}
                style={{ ['--btn-shadow' as string]: 'var(--color-danger-shadow)' }}
                className="btn-3d no-select flex flex-1 items-center justify-center gap-2 bg-danger py-3 text-white disabled:opacity-50"
              >
                {busy && <Loader size={16} className="animate-spin" />}
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl border-2 border-tg-secondary-bg p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-tg-hint">
        {icon}
        {label}
      </div>
      <div className="text-xl font-black">{value}</div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2">
      <span className="text-sm font-semibold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-tg-secondary-bg'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </label>
  )
}

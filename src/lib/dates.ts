/** Локальная дата в формате YYYY-MM-DD (без UTC-сдвига). */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** Возвращает понедельник недели, к которой относится дата. */
export function startOfWeek(date: Date = new Date()): Date {
  const copy = new Date(date)
  const day = (copy.getDay() + 6) % 7 // 0 = понедельник
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`)
  const db = new Date(`${b}T00:00:00`)
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

export function formatRelativeDay(dateKey: string): string {
  const diff = daysBetween(dateKey, dayKey())
  if (diff === 0) return 'сегодня'
  if (diff === 1) return 'вчера'
  if (diff < 7) return `${diff} дн. назад`
  return dateKey
}

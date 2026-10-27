import { createMockWebApp } from './mock'
import { applySafeArea, applyTheme, subscribeTheme } from './theme'
import type { TgWebApp } from './types'

let cached: TgWebApp | undefined

export function isTelegram(): boolean {
  return Boolean(window.Telegram?.WebApp?.initData)
}

/** Возвращает Telegram WebApp либо mock-заглушку (в браузере). */
export function tg(): TgWebApp {
  if (cached) return cached
  const real = window.Telegram?.WebApp
  if (real && real.initData) {
    cached = real
  } else {
    // Пробуем взять объект SDK без initData (браузер) — всё равно неинтерактивен,
    // поэтому подменяем на mock, чтобы не было «мёртвых» кнопок.
    cached = createMockWebApp()
  }
  return cached
}

/**
 * Базовая инициализация. Вызывается один раз при старте.
 *
 * Блокировку свайпов и подтверждение закрытия здесь НЕ включаем: они
 * нужны только внутри урока (чтобы случайный свайп не сбросил прогресс),
 * а в остальных экранах мешают — приложение нельзя свернуть.
 * Управление ими — через `lockSwipes()` / `unlockSwipes()`.
 */
export function initTelegram(): void {
  const app = tg()
  applyTheme(app)
  applySafeArea(app)
  subscribeTheme(app)
  safe(() => app.ready())
  safe(() => app.expand())
}

/**
 * Запрещает вертикальные свайпы и включает подтверждение закрытия.
 * Используется на экране урока.
 */
export function lockSwipes(): void {
  const app = tg()
  safe(() => app.disableVerticalSwipes?.())
  safe(() => app.enableClosingConfirmation?.())
}

/** Возвращает обычное поведение: приложение можно листать и свернуть. */
export function unlockSwipes(): void {
  const app = tg()
  safe(() => app.enableVerticalSwipes?.())
  safe(() => app.disableClosingConfirmation?.())
}

export function startParam(): string | undefined {
  return tg().initDataUnsafe?.start_param
}

/** Сырой initData для передачи на сервер (пустой в браузере). */
export function initDataRaw(): string {
  return window.Telegram?.WebApp?.initData ?? ''
}

export function tgUser() {
  return tg().initDataUnsafe?.user
}

/** Безопасный вызов необязательных методов SDK разных версий. */
function safe(fn: () => void): void {
  try {
    fn()
  } catch {
    /* старые версии SDK могут не поддерживать метод */
  }
}

/**
 * Вибрация через нативный API Telegram.
 *
 * Настройку «Вибрация» здесь не проверяем: решение принимает `feedback`
 * в src/lib/feedback.ts, чтобы логика была в одном месте. Вызов напрямую
 * нужен только для случаев, когда вибрация обязана быть (сейчас таких нет).
 */
export function haptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'select',
): void {
  const h = tg().HapticFeedback
  if (!h) return
  try {
    if (type === 'select') h.selectionChanged()
    else if (type === 'success' || type === 'error' || type === 'warning')
      h.notificationOccurred(type)
    else h.impactOccurred(type)
  } catch {
    /* игнорируем */
  }
}

export * from './types'

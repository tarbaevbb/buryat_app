import type { TgWebApp } from './types'

const THEME_KEYS = [
  'bg_color',
  'text_color',
  'hint_color',
  'link_color',
  'button_color',
  'button_text_color',
  'secondary_bg_color',
  'header_bg_color',
] as const

const CSS_VARS: Record<(typeof THEME_KEYS)[number], string> = {
  bg_color: '--tg-bg',
  text_color: '--tg-text',
  hint_color: '--tg-hint',
  link_color: '--tg-link',
  button_color: '--tg-button',
  button_text_color: '--tg-button-text',
  secondary_bg_color: '--tg-secondary-bg',
  header_bg_color: '--tg-bg',
}

function fallbackByScheme(wa: TgWebApp | undefined): Record<string, string> {
  const dark = wa?.colorScheme === 'dark'
  return {
    '--tg-bg': dark ? '#17212b' : '#ffffff',
    '--tg-text': dark ? '#f5f5f5' : '#0f172a',
    '--tg-hint': dark ? '#8b93a1' : '#8b93a1',
    '--tg-link': '#1cb0f6',
    '--tg-button': '#58cc02',
    '--tg-button-text': '#ffffff',
    '--tg-secondary-bg': dark ? '#232e3c' : '#f2f4f7',
  }
}

/** Раскладывает themeParams в CSS-переменные и держит их в актуальном состоянии. */
export function applyTheme(wa?: TgWebApp): void {
  const root = document.documentElement
  const vars = fallbackByScheme(wa)
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value))

  const params = wa?.themeParams
  if (!params) return
  for (const key of THEME_KEYS) {
    const value = params[key]
    if (value) root.style.setProperty(CSS_VARS[key], value)
  }
}

function applySafeArea(wa?: TgWebApp): void {
  const root = document.documentElement
  const top = wa?.safeAreaInset?.top ?? 0
  const contentTop = wa?.contentSafeAreaInset?.top ?? 0
  const bottom = wa?.safeAreaInset?.bottom ?? 0
  const contentBottom = wa?.contentSafeAreaInset?.bottom ?? 0
  root.style.setProperty('--safe-top', `${Math.max(top, contentTop)}px`)
  root.style.setProperty('--safe-bottom', `${Math.max(bottom, contentBottom)}px`)
}

export function subscribeTheme(wa?: TgWebApp): () => void {
  if (!wa?.onEvent) return () => {}
  const onChange = () => {
    applyTheme(wa)
    applySafeArea(wa)
  }
  wa.onEvent('themeChanged', onChange)
  wa.onEvent('safeAreaChanged', onChange)
  wa.onEvent('contentSafeAreaChanged', onChange)
  wa.onEvent('viewportChanged', onChange)
  return () => {
    wa.offEvent?.('themeChanged', onChange)
    wa.offEvent?.('safeAreaChanged', onChange)
    wa.offEvent?.('contentSafeAreaChanged', onChange)
    wa.offEvent?.('viewportChanged', onChange)
  }
}

export { applySafeArea }

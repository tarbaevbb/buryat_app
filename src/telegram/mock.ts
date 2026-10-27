import type { TgUser, TgWebApp } from './types'

/**
 * Заглушка Telegram WebApp для локальной разработки в браузере.
 * Позволяет вёрстать без открытия приложения внутри Telegram.
 */
export function createMockWebApp(): TgWebApp {
  const mainHandlers = new Set<() => void>()
  const backHandlers = new Set<() => void>()
  const mockUser: TgUser = {
    id: 100000001,
    first_name: 'Тест',
    last_name: 'Хэрэглэгшэ',
    username: 'dev_user',
    language_code: 'ru',
  }

  const lightTheme = {
    bg_color: '#ffffff',
    text_color: '#0f172a',
    hint_color: '#8b93a1',
    link_color: '#1cb0f6',
    button_color: '#58cc02',
    button_text_color: '#ffffff',
    secondary_bg_color: '#f2f4f7',
  }

  const syncTheme = () => {
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    wa.colorScheme = dark ? 'dark' : 'light'
    wa.themeParams = dark
      ? {
          bg_color: '#17212b',
          text_color: '#f5f5f5',
          hint_color: '#8b93a1',
          link_color: '#5eb5f7',
          button_color: '#58cc02',
          button_text_color: '#ffffff',
          secondary_bg_color: '#232e3c',
        }
      : lightTheme
  }

  const wa: TgWebApp = {
    initData: '',
    initDataUnsafe: { user: mockUser, start_param: undefined },
    version: '7.10-mock',
    platform: 'web',
    colorScheme: 'light',
    themeParams: lightTheme,
    isExpanded: true,
    viewportHeight: window.innerHeight,
    viewportStableHeight: window.innerHeight,
    safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
    contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },

    ready() {},
    expand() {},
    close() {},
    openLink(url: string) {
      window.open(url, '_blank', 'noopener')
    },
    disableVerticalSwipes() {},
    requestFullscreen() {},
    onEvent(event: string, handler: () => void) {
      if (event === 'themeChanged') {
        window
          .matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', handler)
      }
    },
    offEvent(event: string, handler: () => void) {
      if (event === 'themeChanged') {
        window
          .matchMedia('(prefers-color-scheme: dark)')
          .removeEventListener('change', handler)
      }
    },
    MainButton: {
      text: '',
      isVisible: false,
      isActive: false,
      color: '#58cc02',
      textColor: '#ffffff',
      show() {
        this.isVisible = true
      },
      hide() {
        this.isVisible = false
      },
      enable() {
        this.isActive = true
      },
      disable() {
        this.isActive = false
      },
      setText(text: string) {
        this.text = text
      },
      onClick(cb: () => void) {
        mainHandlers.add(cb)
      },
      offClick(cb: () => void) {
        mainHandlers.delete(cb)
      },
      showProgress() {},
      hideProgress() {},
      setParams(params) {
        if (params.text !== undefined) this.setText(params.text)
        if (params.is_active !== undefined) this.isActive = params.is_active
        if (params.is_visible !== undefined) this.isVisible = params.is_visible
      },
    },
    BackButton: {
      isVisible: false,
      show() {
        this.isVisible = true
      },
      hide() {
        this.isVisible = false
      },
      onClick(cb: () => void) {
        backHandlers.add(cb)
      },
      offClick(cb: () => void) {
        backHandlers.delete(cb)
      },
    },
  }

  syncTheme()
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', syncTheme)

  return wa
}

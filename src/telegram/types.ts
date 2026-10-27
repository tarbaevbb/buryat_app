/**
 * Минимальные типы Telegram WebApp SDK.
 * Официальные типы лежат в @types/telegram-web-app, но здесь достаточно
 * того, что мы реально используем — меньше зависимостей и проще feature-detect.
 */

export interface TgThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
  header_bg_color?: string
}

export interface TgSafeAreaInset {
  top: number
  bottom: number
  left: number
  right: number
}

export interface TgUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

export interface TgWebApp {
  initData: string
  initDataUnsafe: {
    user?: TgUser
    start_param?: string
    query_id?: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: TgThemeParams
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  safeAreaInset?: TgSafeAreaInset
  contentSafeAreaInset?: TgSafeAreaInset

  ready(): void
  expand(): void
  close(): void
  openLink(url: string): void
  enableClosingConfirmation?(): void
  disableClosingConfirmation?(): void
  disableVerticalSwipes?(): void
  requestFullscreen?(): void
  openTelegramLink?(url: string): void

  onEvent(event: string, handler: () => void): void
  offEvent(event: string, handler: () => void): void

  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }

  MainButton: {
    text: string
    isVisible: boolean
    isActive: boolean
    color: string
    textColor: string
    show(): void
    hide(): void
    enable(): void
    disable(): void
    setText(text: string): void
    onClick(cb: () => void): void
    offClick(cb: () => void): void
    showProgress(leaveActive?: boolean): void
    hideProgress(): void
    setParams(params: {
      text?: string
      color?: string
      text_color?: string
      is_active?: boolean
      is_visible?: boolean
    }): void
  }

  BackButton: {
    isVisible: boolean
    show(): void
    hide(): void
    onClick(cb: () => void): void
    offClick(cb: () => void): void
  }

  CloudStorage?: {
    setItem(key: string, value: string, cb?: (err: string | null, ok?: boolean) => void): void
    getItem(key: string, cb: (err: string | null, value?: string) => void): void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp }
  }
}

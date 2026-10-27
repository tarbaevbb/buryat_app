import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Ловит ошибки рендера и показывает понятное сообщение вместо белого экрана.
 *
 * Почему это важно именно в Telegram: у Mini App нет консоли и адресной
 * строки, поэтому «пустая страница» не даёт пользователю ни подсказки,
 * ни выхода. Здесь он видит объяснение и кнопку, которая перезагружает
 * приложение.
 *
 * Ошибки границей не глушатся молча: сообщение выводится в консоль, а
 * текст ошибки показывается в свёрнутом виде — это помогает при жалобах.
 *
 * Совместимо с React 18 без сторонних зависимостей (классовый компонент —
 * единственный способ перехватить ошибку рендера).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Единственная точка, где мы видим такие ошибки: своего логирования
    // у приложения нет, поэтому хотя бы в консоль.
    console.error('[app] ошибка рендера:', error, info.componentStack)
  }

  private handleReload = (): void => {
    // Полная перезагрузка, а не сброс состояния: неизвестно, что именно
    // сломалось, и повторный рендер может упасть снова.
    window.location.reload()
  }

  private handleReset = (): void => {
    // Мягкий вариант: пробуем отрисовать интерфейс заново без перезагрузки.
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-tg-bg p-6 text-center text-tg-text">
        <span className="text-5xl">😕</span>

        <div>
          <h1 className="text-xl font-black">Что-то сломалось</h1>
          <p className="mt-2 text-sm text-tg-hint">
            Прогресс сохранён — он хранится на устройстве. Попробуйте перезагрузить
            приложение.
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            type="button"
            onClick={this.handleReload}
            style={{ ['--btn-shadow' as string]: 'var(--color-brand-shadow)' }}
            className="btn-3d no-select w-full bg-brand py-3.5 text-base text-white"
          >
            Перезагрузить
          </button>
          <button
            type="button"
            onClick={this.handleReset}
            className="no-select w-full rounded-2xl border-2 border-tg-secondary-bg py-3 text-sm font-bold text-tg-hint"
          >
            Попробовать снова
          </button>
        </div>

        {/* Текст ошибки в свёрнутом виде: нужен для диагностики, но не мешает. */}
        <details className="w-full max-w-xs text-left">
          <summary className="cursor-pointer text-xs font-semibold text-tg-hint">
            Подробности
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-tg-secondary-bg p-3 text-[11px] leading-relaxed text-tg-hint">
            {error.name}: {error.message}
          </pre>
        </details>
      </div>
    )
  }
}

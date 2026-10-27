import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Props {
  children: ReactNode
  className?: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  /** Тень «объёмной» кнопки. */
  variant?: 'brand' | 'sky' | 'gold' | 'danger' | 'plain'
}

const VARIANTS: Record<string, string> = {
  brand: 'bg-brand text-white',
  sky: 'bg-sky text-white',
  gold: 'bg-gold text-white',
  danger: 'bg-danger text-white',
  plain: 'bg-tg-secondary-bg text-tg-text',
}

const SHADOW: Record<string, string> = {
  brand: 'var(--color-brand-shadow)',
  sky: 'var(--color-sky-shadow)',
  gold: 'var(--color-gold-shadow)',
  danger: 'var(--color-danger-shadow)',
  plain: 'rgba(0,0,0,0.15)',
}

/**
 * Кнопка в стиле Duolingo: нижняя «тень» даёт объём, при нажатии — уезжает вниз.
 * Используется и как вариант ответа, и как Primary-кнопка.
 */
export function Button({
  children,
  className = '',
  onClick,
  active = false,
  disabled = false,
  variant = 'brand',
}: Props) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      style={{ ['--btn-shadow' as string]: SHADOW[variant] }}
      className={`btn-3d no-select px-4 py-3.5 text-base ${VARIANTS[variant]} ${
        active ? 'ring-2 ring-offset-0' : ''
      } ${className}`}
    >
      {children}
    </motion.button>
  )
}

/** Вариант ответа: обычный / выбранный / правильный / неправильный. */
export function OptionCard({
  children,
  state = 'idle',
  onClick,
  disabled,
}: {
  children: ReactNode
  state?: 'idle' | 'selected' | 'correct' | 'wrong'
  onClick?: () => void
  disabled?: boolean
}) {
  const styles: Record<string, string> = {
    idle: 'bg-tg-bg border-tg-secondary-bg text-tg-text',
    selected: 'bg-sky/10 border-sky text-sky',
    correct: 'bg-brand/10 border-brand text-brand',
    wrong: 'bg-danger/10 border-danger text-danger',
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`card-3d no-select w-full px-4 py-3.5 text-left text-base font-semibold ${styles[state]}`}
    >
      {children}
    </button>
  )
}

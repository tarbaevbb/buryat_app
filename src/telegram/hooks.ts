import { useEffect } from 'react'
import { tg } from './init'

interface MainButtonOptions {
  text: string
  visible?: boolean
  enabled?: boolean
  onClick: () => void
  /** Скрывать кнопку, когда она не нужна (например, на экране результата). */
  color?: string
  textColor?: string
  progress?: boolean
}

/**
 * Синхронизирует Telegram MainButton с состоянием экрана.
 * В браузере (mock) остаётся невидимой — там используется обычная кнопка.
 */
export function useMainButton({
  text,
  visible = true,
  enabled = true,
  onClick,
  color,
  textColor,
  progress = false,
}: MainButtonOptions): void {
  useEffect(() => {
    const mb = tg().MainButton
    mb.setParams({
      text,
      is_visible: visible,
      is_active: enabled,
      ...(color ? { color } : {}),
      ...(textColor ? { text_color: textColor } : {}),
    })
    if (progress) mb.showProgress(true)
    else mb.hideProgress()
    mb.onClick(onClick)
    return () => {
      mb.offClick(onClick)
      mb.hide()
      mb.hideProgress()
    }
  }, [text, visible, enabled, onClick, color, textColor, progress])
}

export function useBackButton(visible: boolean, onClick: () => void): void {
  useEffect(() => {
    const bb = tg().BackButton
    bb.onClick(onClick)
    if (visible) bb.show()
    else bb.hide()
    return () => {
      bb.offClick(onClick)
      bb.hide()
    }
  }, [visible, onClick])
}

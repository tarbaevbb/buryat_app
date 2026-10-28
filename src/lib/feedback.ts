/**
 * Единая точка обратной связи: вибрация и звук.
 *
 * Зачем отдельный модуль: раньше `haptic()` вызывался напрямую из
 * компонентов и игнорировал настройки — выключенная в профиле «Вибрация»
 * ни на что не влияла, а звука не было вовсе.
 *
 * Теперь компоненты вызывают `feedback(...)`, а решение «вибрировать /
 * звучать» принимается здесь, по актуальным настройкам.
 */
import { haptic as tgHaptic } from '../telegram/init'
import { playSound, primeAudio, type SoundName } from './sound'
import { useSettings } from '../store/settingsStore'

/** Виды событий в интерфейсе. */
export type FeedbackKind =
  | 'tap' // выбор плитки, переключение
  | 'select' // смена выделения (лёгкий отклик без звука)
  | 'correct' // верный ответ
  | 'wrong' // ошибка
  | 'complete' // урок пройден
  | 'heartLost' // потеря сердца

/** Что делаем для каждого события. */
const MAP: Record<FeedbackKind, { haptic: Parameters<typeof tgHaptic>[0]; sound?: SoundName }> = {
  tap: { haptic: 'light', sound: 'tap' },
  select: { haptic: 'select' },
  correct: { haptic: 'success', sound: 'correct' },
  wrong: { haptic: 'error', sound: 'wrong' },
  complete: { haptic: 'success', sound: 'complete' },
  heartLost: { haptic: 'heavy', sound: 'heartLost' },
}

/**
 * Проигрывает отклик для события, если соответствующие настройки включены.
 *
 * Настройки читаются из стора напрямую (не через хук), потому что функция
 * вызывается из обработчиков, а не во время рендера.
 */
export function feedback(kind: FeedbackKind): void {
  const { sound, haptics } = useSettings.getState()
  const action = MAP[kind]

  // ВРЕМЕННАЯ ОТЛАДКА: видно, дошли ли до вызова и что в настройках.
  // Если здесь haptics: false — вибрация отключена в профиле, и haptic()
  // не вызывается вовсе. Логи убрать после выяснения причины.
  console.log('[feedback]', kind, { sound, haptics })

  if (haptics) tgHaptic(action.haptic)
  if (sound && action.sound) playSound(action.sound)
}

/**
 * Разогревает аудио внутри пользовательского жеста.
 *
 * Браузеры (и особенно Telegram WebView) блокируют звук до первого
 * касания. Вызываем на действиях, которые точно являются тапом,
 * чтобы сигнал результата урока потом не «проглотился».
 */
export function primeFeedback(): void {
  if (useSettings.getState().sound) primeAudio()
}

/** Есть ли вообще смысл воспроизводить звук (для тестов и отладки). */
export function soundEnabled(): boolean {
  return useSettings.getState().sound
}

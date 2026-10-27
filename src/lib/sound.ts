/**
 * Звуковые эффекты через Web Audio API.
 *
 * Почему синтез, а не mp3: у приложения нет звуковых файлов, а готовых
 * записей бурятского произношения нет. Короткие сигналы (верно / неверно /
 * нажатие) синтезируются на месте — это ноль загрузок и ноль зависимостей,
 * а бандл не растёт.
 *
 * Важная деталь: браузеры не дают запускать звук до первого действия
 * пользователя. Контекст создаётся при первом воспроизведении (обычно это
 * нажатие кнопки), а если он «уснул» — будится через `resume()`.
 * Ошибки аудио не должны ломать урок, поэтому всё обёрнуто в try/catch.
 */

/** Доступные сигналы. */
export type SoundName = 'tap' | 'correct' | 'wrong' | 'complete' | 'heartLost'

interface Tone {
  /** Частота в герцах. */
  freq: number
  /** Длительность в секундах. */
  duration: number
  /** Пауза перед началом, секунды. */
  delay?: number
  type?: OscillatorType
  /** Пиковая громкость, 0..1. */
  gain?: number
}

/**
 * Сигналы собраны из коротких нот. Восходящие интервалы читаются как
 * «получилось», нисходящие — как «не вышло»; это стандартный приём
 * в игровых интерфейсах.
 */
const SOUNDS: Record<SoundName, Tone[]> = {
  // Лёгкий щелчок при выборе плитки.
  tap: [{ freq: 880, duration: 0.04, type: 'sine', gain: 0.05 }],

  // Две ноты вверх: C6 → E6.
  correct: [
    { freq: 1046.5, duration: 0.09, type: 'sine', gain: 0.09 },
    { freq: 1318.5, duration: 0.12, delay: 0.07, type: 'sine', gain: 0.09 },
  ],

  // Короткий низкий сигнал: воспринимается как «мимо».
  wrong: [{ freq: 196, duration: 0.18, type: 'triangle', gain: 0.07 }],

  // Мажорный аккорд при завершении урока: C6 → E6 → G6.
  complete: [
    { freq: 1046.5, duration: 0.1, type: 'sine', gain: 0.08 },
    { freq: 1318.5, duration: 0.1, delay: 0.1, type: 'sine', gain: 0.08 },
    { freq: 1568, duration: 0.24, delay: 0.2, type: 'sine', gain: 0.09 },
  ],

  // Потеря сердца: две ноты вниз.
  heartLost: [
    { freq: 392, duration: 0.12, type: 'triangle', gain: 0.07 },
    { freq: 261.6, duration: 0.2, delay: 0.1, type: 'triangle', gain: 0.07 },
  ],
}

let ctx: AudioContext | null = null

/** Инициализирует или будит аудиоконтекст. `null`, если аудио недоступно. */
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    // Автовоспроизведение заблокировано до жеста пользователя:
    // контекст создаётся «спящим», будим его здесь.
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Проигрывает набор нот. */
function playTones(tones: Tone[]): void {
  const audio = getContext()
  if (!audio) return

  const now = audio.currentTime
  for (const tone of tones) {
    try {
      const osc = audio.createOscillator()
      const gain = audio.createGain()

      osc.type = tone.type ?? 'sine'
      osc.frequency.value = tone.freq

      const start = now + (tone.delay ?? 0)
      const end = start + tone.duration
      const peak = tone.gain ?? 0.08

      // Плавные атака и затухание: без них слышны щелчки на краях.
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.linearRampToValueAtTime(peak, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)

      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(start)
      osc.stop(end + 0.02)
    } catch {
      // Один проблемный тон не должен мешать остальным.
    }
  }
}

/**
 * Воспроизводит сигнал. Не проверяет настройки — это делает `feedback`,
 * чтобы решение «звук включён?» принималось в одном месте.
 */
export function playSound(name: SoundName): void {
  playTones(SOUNDS[name])
}

/**
 * «Разогревает» аудиоконтекст внутри пользовательского жеста.
 * Нужна там, где первый сигнал может прозвучать не сразу после нажатия
 * (например, результат урока в Telegram).
 */
export function primeAudio(): void {
  getContext()
}

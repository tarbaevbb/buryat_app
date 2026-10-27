import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Заглушка Web Audio API и navigator.vibrate.
 *
 * Проверяем, что звук и вибрация действительно вызываются и что настройки
 * из профиля на них влияют. Раньше настройка «Вибрация» ни на что не
 * влияла, а звука не было вовсе — эти тесты не дадут вернуть регресс.
 */
const oscillators: { freq: number; type: string; started: boolean }[] = []
let vibrateCalls: Array<number | number[]> = []
let contextState: AudioContextState = 'running'
let resumeCalls = 0

class FakeAudioContext {
  get state() {
    return contextState
  }
  get currentTime() {
    return 0
  }
  resume() {
    resumeCalls += 1
    contextState = 'running'
    return Promise.resolve()
  }
  createOscillator() {
    const osc = {
      type: 'sine',
      _freq: 0,
      get frequency() {
        return {
          get value() {
            return osc._freq
          },
          set value(v: number) {
            osc._freq = v
          },
        }
      },
      connect: () => {},
      start: () => {
        const record = oscillators.find((o) => o.freq === osc._freq && !o.started)
        if (record) record.started = true
        else oscillators.push({ freq: osc._freq, type: osc.type, started: true })
      },
      stop: () => {},
    }
    return osc
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    }
  }
  get destination() {
    return {}
  }
}

beforeEach(() => {
  oscillators.length = 0
  vibrateCalls = []
  contextState = 'running'
  resumeCalls = 0

  vi.stubGlobal('AudioContext', FakeAudioContext)
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true,
    writable: true,
    value: (pattern: number | number[]) => {
      vibrateCalls.push(pattern)
      return true
    },
  })
})

const { useSettings } = await import('../store/settingsStore')
const { feedback, primeFeedback, soundEnabled } = await import('../lib/feedback')
const { playSound, primeAudio } = await import('../lib/sound')

describe('звук', () => {
  beforeEach(() => {
    useSettings.setState({ sound: true, haptics: true })
  })

  it('воспроизводит сигнал для верного ответа', () => {
    playSound('correct')
    expect(oscillators.length).toBeGreaterThan(0)
  })

  it('каждый сигнал состоит из своих нот', () => {
    playSound('tap')
    const tapCount = oscillators.length

    oscillators.length = 0
    playSound('complete')
    const completeCount = oscillators.length

    // У завершения урока нот больше, чем у щелчка, — сигналы различимы.
    expect(completeCount).toBeGreaterThan(tapCount)
    expect(tapCount).toBe(1)
    expect(completeCount).toBe(3)
  })

  it('сигналы различаются по частоте', () => {
    playSound('wrong')
    const wrongFreq = oscillators[0]?.freq

    oscillators.length = 0
    playSound('correct')
    const correctFreq = oscillators[0]?.freq

    expect(wrongFreq).not.toBe(correctFreq)
    // Ошибка звучит ниже правильного ответа.
    expect(wrongFreq).toBeLessThan(correctFreq)
  })

  it('не падает, если Web Audio недоступен', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => playSound('correct')).not.toThrow()
  })

  it('будит уснувший аудиоконтекст', () => {
    // Реальный сценарий: браузер создаёт контекст «спящим» до жеста
    // пользователя, поэтому его нужно разбудить через resume().
    contextState = 'suspended'
    primeAudio()
    expect(resumeCalls).toBeGreaterThan(0)
  })

  it('не будит контекст, который уже работает', () => {
    contextState = 'running'
    primeAudio()
    expect(resumeCalls).toBe(0)
  })

  it('будит контекст и при воспроизведении сигнала', () => {
    contextState = 'suspended'
    playSound('tap')
    expect(resumeCalls).toBeGreaterThan(0)
  })
})

describe('вибрация и звук вместе (feedback)', () => {
  beforeEach(() => {
    useSettings.setState({ sound: true, haptics: true })
  })

  it('отклик включает и вибрацию, и звук', () => {
    feedback('correct')
    expect(vibrateCalls.length).toBeGreaterThan(0)
    expect(oscillators.length).toBeGreaterThan(0)
  })

  it('настройка «Звук» выключает только звук', () => {
    useSettings.setState({ sound: false, haptics: true })
    feedback('correct')

    expect(vibrateCalls.length).toBeGreaterThan(0)
    expect(oscillators.length).toBe(0)
  })

  it('настройка «Вибрация» выключает только вибрацию', () => {
    useSettings.setState({ sound: true, haptics: false })
    feedback('correct')

    expect(vibrateCalls.length).toBe(0)
    expect(oscillators.length).toBeGreaterThan(0)
  })

  it('обе настройки выключены — нет ни звука, ни вибрации', () => {
    useSettings.setState({ sound: false, haptics: false })
    feedback('correct')

    expect(vibrateCalls.length).toBe(0)
    expect(oscillators.length).toBe(0)
  })

  it('«select» даёт только вибрацию, без звука', () => {
    feedback('select')
    expect(vibrateCalls.length).toBeGreaterThan(0)
    expect(oscillators.length).toBe(0)
  })

  it('«complete» играет аккорд из трёх нот', () => {
    feedback('complete')
    expect(oscillators.length).toBe(3)
  })

  it('«heartLost» отличается от обычной ошибки', () => {
    feedback('wrong')
    const wrongVibrations = [...vibrateCalls]
    oscillators.length = 0
    vibrateCalls = []

    feedback('heartLost')
    const heartVibrations = [...vibrateCalls]

    expect(heartVibrations).not.toEqual(wrongVibrations)
    expect(oscillators.length).toBeGreaterThan(0)
  })

  it('не падает без navigator.vibrate', () => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    expect(() => feedback('correct')).not.toThrow()
  })
})

describe('primeFeedback', () => {
  it('разогревает аудио только когда звук включён', () => {
    // Контекст создаётся «спящим» и будится при первом жесте.
    useSettings.setState({ sound: true, haptics: true })
    contextState = 'suspended'
    primeFeedback()
    expect(resumeCalls).toBeGreaterThan(0)

    resumeCalls = 0
    useSettings.setState({ sound: false })
    primeFeedback()
    expect(resumeCalls).toBe(0)
  })

  it('soundEnabled отражает настройку', () => {
    useSettings.setState({ sound: true })
    expect(soundEnabled()).toBe(true)
    useSettings.setState({ sound: false })
    expect(soundEnabled()).toBe(false)
  })
})

describe('вибрация в mock-режиме Telegram', () => {
  it('HapticFeedback переводит типы на navigator.vibrate', async () => {
    const { createMockWebApp } = await import('../telegram/mock')
    const app = createMockWebApp()

    vibrateCalls = []
    app.HapticFeedback?.impactOccurred('light')
    expect(vibrateCalls.length).toBe(1)

    vibrateCalls = []
    app.HapticFeedback?.notificationOccurred('success')
    // Успех — двойной тик.
    expect(vibrateCalls[0]).toEqual([18, 50, 18])

    vibrateCalls = []
    app.HapticFeedback?.notificationOccurred('error')
    // Ошибка — три удара: заметнее, чем успех.
    expect((vibrateCalls[0] as number[]).length).toBe(5)

    vibrateCalls = []
    app.HapticFeedback?.selectionChanged()
    expect(vibrateCalls.length).toBe(1)
  })
})

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SettingsState {
  sound: boolean
  haptics: boolean
  setSound: (v: boolean) => void
  setHaptics: (v: boolean) => void
}

/**
 * Настройки приложения.
 *
 * `showTranscription` убрана вместе с полем `transcription` в лексике:
 * задания на чтение временно не генерируются, поэтому переключателю
 * нечего было показывать. Если транскрипции вернутся — вернуть и его.
 * Старое значение в localStorage игнорируется: persist просто не находит ключ.
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      haptics: true,
      setSound: (sound) => set({ sound }),
      setHaptics: (haptics) => set({ haptics }),
    }),
    { name: 'buryat-settings-v1' },
  ),
)

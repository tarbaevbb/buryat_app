import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SettingsState {
  sound: boolean
  haptics: boolean
  showTranscription: boolean
  setSound: (v: boolean) => void
  setHaptics: (v: boolean) => void
  setShowTranscription: (v: boolean) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      haptics: true,
      showTranscription: true,
      setSound: (sound) => set({ sound }),
      setHaptics: (haptics) => set({ haptics }),
      setShowTranscription: (showTranscription) => set({ showTranscription }),
    }),
    { name: 'buryat-settings-v1' },
  ),
)

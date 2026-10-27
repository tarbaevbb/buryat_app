import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Клиент Supabase. Если переменные окружения не заданы — приложение
 * работает полностью локально (см. `isCloudEnabled`).
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'buryat-auth-v1',
        },
      })
    : null

export const isCloudEnabled = Boolean(supabase)

const AUTH_FN = 'telegram-auth'

export interface CloudUser {
  id: string
  tgId: number
  firstName: string | null
  username: string | null
  photoUrl: string | null
}

/** Обменивает initData на сессию Supabase через Edge Function. */
export async function signInWithTelegram(initData: string): Promise<CloudUser | null> {
  if (!supabase) return null
  const { data, error } = await supabase.functions.invoke(AUTH_FN, {
    body: { initData },
  })
  if (error || !data?.access_token) {
    console.warn('[cloud] не удалось войти через Telegram:', error?.message ?? data?.error)
    return null
  }

  const { error: setError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })
  if (setError) {
    console.warn('[cloud] не удалось установить сессию:', setError.message)
    return null
  }

  return data.user as CloudUser
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
}

export async function currentSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

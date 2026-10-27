import { useEffect, useState } from 'react'
import { isCloudEnabled, signInWithTelegram, supabase, type CloudUser } from '../lib/supabase'
import { fetchRemoteProgress, pushProgress, resetRemoteProgress } from '../lib/cloud'
import {
  fullSignature,
  mergeProgress,
  stateSignature,
  type ProgressSnapshot,
} from '../lib/progress'
import { progressSnapshot, useProgress } from '../store/progressStore'
import { initDataRaw, tgUser } from '../telegram/init'

export type CloudStatus = 'disabled' | 'connecting' | 'online' | 'offline'

export interface CloudAuth {
  status: CloudStatus
  user: CloudUser | null
  retry: () => void
}

interface AuthSnapshot {
  status: CloudStatus
  user: CloudUser | null
}

const initial: AuthSnapshot = {
  status: isCloudEnabled ? 'connecting' : 'disabled',
  user: null,
}

let snapshot: AuthSnapshot = initial
let inFlight: Promise<void> | null = null
let started = false
const listeners = new Set<() => void>()

function setSnapshot(next: Partial<AuthSnapshot>): void {
  snapshot = { ...snapshot, ...next }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Сливает локальный прогресс с облачным и фиксирует результат. */
async function reconcile(): Promise<boolean> {
  // Если ранее был сброс, который облако не подтвердило, — сначала обнуляем сервер,
  // иначе он вернул бы старые XP и слияние их бы «воскресило».
  if (useProgress.getState().resetPending) {
    const cleared = await resetRemoteProgress()
    if (!cleared) return false
    useProgress.getState().markResetSynced()
  }

  const remote = await fetchRemoteProgress()
  if (!remote) return false

  const local = progressSnapshot(useProgress.getState())
  const merged = mergeProgress(local, remote)
  useProgress.getState().applySnapshot(merged)

  // Если после слияния появилось что-то, чего нет в облаке, — догружаем.
  if (fullSignature(merged) !== fullSignature(remote)) {
    const confirmed = await pushProgress(merged)
    if (confirmed) useProgress.getState().applySnapshot(mergeProgress(merged, confirmed))
  }

  useProgress.getState().markSynced(fullSignature(progressSnapshot(useProgress.getState())))
  return true
}

/** Единственный вход в облако на всё приложение. */
async function connect(): Promise<void> {
  if (!isCloudEnabled) {
    setSnapshot({ status: 'disabled' })
    return
  }
  if (inFlight) return inFlight

  inFlight = (async () => {
    setSnapshot({ status: 'connecting' })

    // Имя из Telegram сохраняем локально в любом случае.
    const tg = tgUser()
    const progress = useProgress.getState()
    if (tg?.first_name && !progress.displayName) progress.setDisplayName(tg.first_name)

    const { data } = (await supabase!.auth.getSession()) ?? { data: { session: null } }
    if (data.session) {
      const meta = data.session.user.user_metadata ?? {}
      setSnapshot({
        user: {
          id: data.session.user.id,
          tgId: Number(meta.tg_id ?? 0),
          firstName: (meta.first_name as string) ?? null,
          username: (meta.username as string) ?? null,
          photoUrl: null,
        },
      })
      setSnapshot({ status: (await reconcile()) ? 'online' : 'offline' })
      return
    }

    const raw = initDataRaw()
    if (!raw) {
      setSnapshot({ status: 'offline' })
      return
    }

    const cloudUser = await signInWithTelegram(raw)
    if (!cloudUser) {
      setSnapshot({ status: 'offline' })
      return
    }

    setSnapshot({ user: cloudUser })
    if (cloudUser.firstName) useProgress.getState().setDisplayName(cloudUser.firstName)
    setSnapshot({ status: (await reconcile()) ? 'online' : 'offline' })
  })().finally(() => {
    inFlight = null
  })

  return inFlight
}

/**
 * Хук авторизации: только читает состояние. Вход выполняет `bootstrapCloud()`
 * один раз при старте приложения.
 */
export function useCloudAuth(): CloudAuth {
  const [state, setState] = useState<AuthSnapshot>(snapshot)

  useEffect(() => {
    setState(snapshot)
    return subscribe(() => setState(snapshot))
  }, [])

  return {
    status: state.status,
    user: state.user,
    retry: () => {
      void connect()
    },
  }
}

/** Текущий статус облака без подписки — для не-React кода. */
export function cloudStatus(): CloudStatus {
  return snapshot.status
}

/**
 * Отправляет снимок прогресса, если он изменился с прошлой успешной отправки.
 * Вызывается при завершении урока, повторения и при возврате в приложение.
 * Возвращает `true`, если данные подтверждены сервером.
 */
export async function flushProgress(): Promise<boolean> {
  if (!isCloudEnabled || snapshot.status === 'disabled') return false

  // Неподтверждённый сброс: сначала чистим сервер, иначе он вернёт старый прогресс.
  if (useProgress.getState().resetPending) {
    const cleared = await resetRemoteProgress()
    if (!cleared) return false
    useProgress.getState().markResetSynced()
    useProgress.getState().markSynced(stateSignature(progressSnapshot(useProgress.getState())))
    return true
  }

  const state = useProgress.getState()
  const current = progressSnapshot(state)
  const signature = stateSignature(current)
  if (state.syncedSignature === signature) return true // отправлять нечего

  if (snapshot.status === 'offline') {
    // Пробуем восстановить соединение — возможно, сеть уже вернулась.
    await connect()
    if (cloudStatus() !== 'online') return false
  }

  const confirmed = await pushProgress(current)
  if (!confirmed) return false

  const merged = mergeProgress(current, confirmed)
  useProgress.getState().applySnapshot(merged)
  useProgress.getState().markSynced(stateSignature(progressSnapshot(useProgress.getState())))
  return true
}

/** Сбрасывает прогресс и в облаке, чтобы он не вернулся при следующем входе. */
export async function resetProgressEverywhere(): Promise<boolean> {
  // reset() ставит флаг resetPending — он гарантирует, что облако
  // будет обнулено (сейчас или при первой возможности).
  useProgress.getState().reset()

  if (!isCloudEnabled) return true

  // Пробуем сразу, независимо от статуса: если сессии ещё нет или нет сети,
  // вызов просто не пройдёт, а флаг resetPending доведёт дело позже.
  const cleared = await resetRemoteProgress()
  if (cleared) useProgress.getState().markResetSynced()
  useProgress.getState().markSynced(stateSignature(progressSnapshot(useProgress.getState())))
  return cleared
}

/**
 * Запуск облака и авто-синхронизации. Вызывается один раз из main.tsx.
 *
 * Авто-синхронизация: при возврате в приложение (visibilitychange),
 * при появлении сети (online) и раз в минуту — как страховка от
 * потерянных результатов в офлайне.
 */
export function bootstrapCloud(): void {
  if (started) return
  started = true

  void connect()

  if (!isCloudEnabled) return

  const onFocus = () => void flushProgress()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onFocus()
  })
  window.addEventListener('online', () => void flushProgress())
  window.setInterval(() => void flushProgress(), 60_000)
}

/** Слияние для тестов: переиспользует чистую функцию из lib/progress. */
export function mergeSnapshots(local: ProgressSnapshot, remote: ProgressSnapshot): ProgressSnapshot {
  return mergeProgress(local, remote)
}

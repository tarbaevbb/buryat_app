/**
 * Проверка Telegram `initData` — чистая логика без Deno-специфичных API.
 *
 * Вынесено из `index.ts`, чтобы это можно было покрыть тестами: код
 * вызывается и в edge-функции, и в CI. Использует только Web Crypto
 * (`globalThis.crypto.subtle`), который есть и в Deno, и в Node 18+.
 *
 * Алгоритм из документации Telegram (Validating data received via the Mini App).
 * Запись `HMAC_SHA256(a, b)` в документации означает: данные `a`, ключ `b`.
 *
 *   secret_key = HMAC_SHA256(bot_token, "WebAppData")       // данные bot_token, ключ "WebAppData"
 *   hash       = HMAC_SHA256(data_check_string, secret_key)  // данные строка, ключ secret_key
 *
 * Ниже это переведено в наш `hmacSha256(key, message)`, поэтому порядок
 * аргументов выглядит обратным к записи в документации. Перепутать их
 * легко, а подпись тогда не сойдётся никогда — это проверяет тест
 * «совпадает с независимой реализацией через node:crypto».
 */

export interface TgUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

export interface VerifiedInitData {
  user: TgUser
  authDate: number
}

/** Сколько живёт `initData`, прежде чем считаться просроченным. */
export const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60

export function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * HMAC-SHA256. Ключ принимается как `ArrayBuffer | string`, потому что
 * современные типы TypeScript не пропускают `Uint8Array<ArrayBufferLike>`
 * в `importKey` (view может лежать поверх SharedArrayBuffer).
 */
export async function hmacSha256(
  key: ArrayBuffer | string,
  message: string,
): Promise<ArrayBuffer> {
  const rawKey = typeof key === 'string' ? new TextEncoder().encode(key) : key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
}

/**
 * Проверяет подпись `initData`.
 *
 * `now` можно передать для тестов; по умолчанию берётся текущее время.
 * Возвращает пользователя и время авторизации либо `null`, если подпись
 * не совпала, поле `hash` отсутствует, `auth_date` просрочен или
 * пользователь не распарсился.
 */
export async function verifyInitData(
  initData: string,
  botToken: string,
  now: number = Date.now(),
): Promise<VerifiedInitData | null> {
  if (!initData || !botToken) return null

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')

  // Строка для проверки: все поля кроме hash, отсортированные по ключу,
  // в формате key=value через перевод строки.
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n')

  // secret_key = HMAC_SHA256(bot_token, "WebAppData"): данные — токен, ключ — "WebAppData".
  const secretKey = await hmacSha256('WebAppData', botToken)
  const signature = await hmacSha256(secretKey, dataCheckString)
  if (bytesToHex(signature) !== hash.toLowerCase()) return null

  const authDate = Number(params.get('auth_date') ?? 0)
  if (!authDate || !Number.isFinite(authDate)) return null
  // Просроченную подпись не принимаем: иначе перехваченный initData
  // можно было бы использовать вечно.
  if (now / 1000 - authDate > MAX_AUTH_AGE_SECONDS) return null

  const rawUser = params.get('user')
  if (!rawUser) return null
  try {
    const user = JSON.parse(rawUser) as TgUser
    return user?.id ? { user, authDate } : null
  } catch {
    return null
  }
}

/**
 * Пароль детерминирован: один и тот же Telegram-аккаунт всегда получает
 * тот же пароль, поэтому повторный вход работает без хранения секрета
 * на клиенте.
 */
export function passwordFor(userId: number, serviceKey: string): string {
  return `${serviceKey.slice(0, 24)}.${userId}.buryat`
}

/**
 * Собирает валидный `initData`. Нужен только для тестов и локальной отладки —
 * в проде строка приходит от Telegram.
 */
export async function buildInitData(
  payload: Record<string, string>,
  botToken: string,
): Promise<string> {
  const dataCheckString = Object.entries(payload)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n')
  // Тот же порядок, что в verifyInitData: секрет считается от bot_token.
  const secretKey = await hmacSha256('WebAppData', botToken)
  const signature = await hmacSha256(secretKey, dataCheckString)
  const params = new URLSearchParams({ ...payload, hash: bytesToHex(signature) })
  return params.toString()
}

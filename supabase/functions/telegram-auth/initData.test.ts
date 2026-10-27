import { describe, expect, it } from 'vitest'
import { createHmac } from 'node:crypto'
import {
  MAX_AUTH_AGE_SECONDS,
  buildInitData,
  bytesToHex,
  hmacSha256,
  passwordFor,
  verifyInitData,
} from './initData'

/**
 * Тесты проверки Telegram initData.
 *
 * Подпись считаем независимо — через `node:crypto`, а не той же функцией,
 * которую проверяем. Иначе тест подтверждал бы только согласованность
 * кода с самим собой: перепутанные аргументы HMAC остались бы незамеченными.
 */
// Заведомо не токен: подпись считается локально от этой строки.
// Формат намеренно не похож на боевой, чтобы сканеры секретов
// не давали ложных срабатываний.
const BOT_TOKEN = 'test-bot-token-not-a-real-secret'

/** Независимая реализация алгоритма Telegram через node:crypto. */
function telegramHash(payload: Record<string, string>, botToken: string): string {
  const dataCheckString = Object.entries(payload)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n')
  // secret_key = HMAC_SHA256(bot_token, "WebAppData"), ключ — строка.
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  // hash = HMAC_SHA256(data_check_string, secret_key), ключ — бинарный.
  return createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
}

const USER = {
  id: 12345678,
  first_name: 'Бэлиг',
  username: 'belig',
  language_code: 'ru',
}

function payloadAt(authDate: number): Record<string, string> {
  return {
    auth_date: String(authDate),
    query_id: 'TEST_QUERY_ID_FOR_UNIT_TESTS_ONLY',
    user: JSON.stringify(USER),
  }
}

function validInitData(authDate = Math.floor(Date.now() / 1000)): string {
  const payload = payloadAt(authDate)
  return new URLSearchParams({ ...payload, hash: telegramHash(payload, BOT_TOKEN) }).toString()
}

describe('hmacSha256', () => {
  it('совпадает с node:crypto (ключ-строка)', async () => {
    const ours = bytesToHex(await hmacSha256('WebAppData', BOT_TOKEN))
    const theirs = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest('hex')
    expect(ours).toBe(theirs)
  })

  it('совпадает с node:crypto (бинарный ключ)', async () => {
    const key = new TextEncoder().encode('secret').buffer as ArrayBuffer
    const ours = bytesToHex(await hmacSha256(key, 'message'))
    const theirs = createHmac('sha256', Buffer.from('secret')).update('message').digest('hex')
    expect(ours).toBe(theirs)
  })

  it('разные ключи дают разный результат', async () => {
    const a = bytesToHex(await hmacSha256('key-a', 'msg'))
    const b = bytesToHex(await hmacSha256('key-b', 'msg'))
    expect(a).not.toBe(b)
  })
})

describe('verifyInitData: порядок аргументов HMAC', () => {
  it('принимает подпись, посчитанную по документации Telegram', async () => {
    // Главный тест: если в коде перепутать данные и ключ, здесь будет null.
    const result = await verifyInitData(validInitData(), BOT_TOKEN)
    expect(result).not.toBeNull()
    expect(result?.user.id).toBe(USER.id)
    expect(result?.user.first_name).toBe('Бэлиг')
  })

  it('secret_key считается от bot_token, а не наоборот', async () => {
    // Ошибочный вариант: secret = HMAC(message=bot_token, key="WebAppData")
    // заметно отличается от правильного, поэтому подпись не пройдёт.
    const payload = payloadAt(Math.floor(Date.now() / 1000))
    const dataCheckString = Object.entries(payload)
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('\n')
    const wrongSecret = createHmac('sha256', BOT_TOKEN).update('WebAppData').digest()
    const wrongHash = createHmac('sha256', wrongSecret).update(dataCheckString).digest('hex')

    const initData = new URLSearchParams({ ...payload, hash: wrongHash }).toString()
    expect(await verifyInitData(initData, BOT_TOKEN)).toBeNull()
  })

  it('отвергает подпись от другого бота', async () => {
    const initData = validInitData()
    expect(await verifyInitData(initData, '999999:OtherBotToken')).toBeNull()
  })
})

describe('verifyInitData: защита от подделок', () => {
  it('отвергает подделанное поле при валидном hash', async () => {
    const authDate = Math.floor(Date.now() / 1000)
    const payload = payloadAt(authDate)
    const hash = telegramHash(payload, BOT_TOKEN)
    // Подменяем пользователя, оставляя старый hash.
    const tampered = new URLSearchParams({
      ...payload,
      user: JSON.stringify({ id: 999, first_name: 'Взломщик' }),
      hash,
    }).toString()
    expect(await verifyInitData(tampered, BOT_TOKEN)).toBeNull()
  })

  it('отвергает подделанный auth_date', async () => {
    const payload = payloadAt(Math.floor(Date.now() / 1000))
    const hash = telegramHash(payload, BOT_TOKEN)
    const tampered = new URLSearchParams({
      ...payload,
      auth_date: String(Math.floor(Date.now() / 1000) + 99999),
      hash,
    }).toString()
    expect(await verifyInitData(tampered, BOT_TOKEN)).toBeNull()
  })

  it('отвергает просроченный initData', async () => {
    const old = Math.floor(Date.now() / 1000) - MAX_AUTH_AGE_SECONDS - 60
    expect(await verifyInitData(validInitData(old), BOT_TOKEN)).toBeNull()
  })

  it('принимает initData ровно на границе срока', async () => {
    const now = Date.now()
    const authDate = Math.floor(now / 1000) - MAX_AUTH_AGE_SECONDS + 10
    expect(await verifyInitData(validInitData(authDate), BOT_TOKEN, now)).not.toBeNull()
  })

  it('отвергает initData без hash', async () => {
    const payload = payloadAt(Math.floor(Date.now() / 1000))
    const noHash = new URLSearchParams(payload).toString()
    expect(await verifyInitData(noHash, BOT_TOKEN)).toBeNull()
  })

  it('отвергает пустой hash', async () => {
    const payload = payloadAt(Math.floor(Date.now() / 1000))
    const emptyHash = new URLSearchParams({ ...payload, hash: '' }).toString()
    expect(await verifyInitData(emptyHash, BOT_TOKEN)).toBeNull()
  })

  it('отвергает битый JSON в поле user', async () => {
    const authDate = Math.floor(Date.now() / 1000)
    const payload = { auth_date: String(authDate), user: '{не-json' }
    const initData = new URLSearchParams({
      ...payload,
      hash: telegramHash(payload, BOT_TOKEN),
    }).toString()
    expect(await verifyInitData(initData, BOT_TOKEN)).toBeNull()
  })

  it('отвергает user без id', async () => {
    const authDate = Math.floor(Date.now() / 1000)
    const payload = { auth_date: String(authDate), user: JSON.stringify({ first_name: 'X' }) }
    const initData = new URLSearchParams({
      ...payload,
      hash: telegramHash(payload, BOT_TOKEN),
    }).toString()
    expect(await verifyInitData(initData, BOT_TOKEN)).toBeNull()
  })

  it('отвергает отсутствие auth_date', async () => {
    const payload = { user: JSON.stringify(USER) }
    const initData = new URLSearchParams({
      ...payload,
      hash: telegramHash(payload, BOT_TOKEN),
    }).toString()
    expect(await verifyInitData(initData, BOT_TOKEN)).toBeNull()
  })

  it('безопасно обрабатывает пустые входные данные', async () => {
    expect(await verifyInitData('', BOT_TOKEN)).toBeNull()
    expect(await verifyInitData('auth_date=1', '')).toBeNull()
    expect(await verifyInitData('мусор', BOT_TOKEN)).toBeNull()
  })
})

describe('verifyInitData: порядок полей не важен', () => {
  it('работает при любом порядке параметров в строке', async () => {
    const authDate = Math.floor(Date.now() / 1000)
    const payload = payloadAt(authDate)
    const hash = telegramHash(payload, BOT_TOKEN)

    // Поля специально в обратном порядке.
    const shuffled = new URLSearchParams()
    shuffled.set('hash', hash)
    shuffled.set('user', payload.user)
    shuffled.set('auth_date', payload.auth_date)
    shuffled.set('query_id', payload.query_id)

    const result = await verifyInitData(shuffled.toString(), BOT_TOKEN)
    expect(result).not.toBeNull()
    expect(result?.user.id).toBe(USER.id)
  })

  it('сообщает auth_date из подписи', async () => {
    const authDate = Math.floor(Date.now() / 1000) - 10
    const result = await verifyInitData(validInitData(authDate), BOT_TOKEN)
    expect(result?.authDate).toBe(authDate)
  })
})

describe('buildInitData', () => {
  it('создаёт строку, которую принимает verifyInitData', async () => {
    const payload = payloadAt(Math.floor(Date.now() / 1000))
    const built = await buildInitData(payload, BOT_TOKEN)
    expect(await verifyInitData(built, BOT_TOKEN)).not.toBeNull()
  })

  it('подпись совпадает с независимой реализацией', async () => {
    const payload = payloadAt(1_700_000_000)
    const built = await buildInitData(payload, BOT_TOKEN)
    const hash = new URLSearchParams(built).get('hash')
    expect(hash).toBe(telegramHash(payload, BOT_TOKEN))
  })
})

describe('passwordFor', () => {
  it('детерминирован для одного аккаунта', () => {
    expect(passwordFor(42, 'service-key-abcdefghijklmnop')).toBe(
      passwordFor(42, 'service-key-abcdefghijklmnop'),
    )
  })

  it('различается для разных аккаунтов', () => {
    expect(passwordFor(1, 'key')).not.toBe(passwordFor(2, 'key'))
  })

  it('длина ограничена 24 символами ключа', () => {
    const pwd = passwordFor(7, 'abcdefghijklmnopqrstuvwxyz0123456789')
    expect(pwd).toBe('abcdefghijklmnopqrstuvwx.7.buryat')
  })
})

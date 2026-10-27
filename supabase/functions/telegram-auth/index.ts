// =====================================================================
// Supabase Edge Function: telegram-auth
// Проверяет Telegram.WebApp.initData по HMAC-SHA256 (секрет —
// HMAC_SHA256(bot_token, "WebAppData")) и выдаёт сессию Supabase.
//
// Секреты:
//   supabase secrets set TELEGRAM_BOT_TOKEN=123:ABC
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY подставляются автоматически
//
// Деплой: supabase functions deploy telegram-auth --no-verify-jwt
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60

interface TgUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSha256(
  key: Uint8Array | string,
  message: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
}

/** Проверка подписи initData. */
async function verifyInitData(
  initData: string,
  botToken: string,
): Promise<{ user: TgUser; authDate: number } | null> {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n')

  const secretKey = await hmacSha256('WebAppData', botToken)
  const signature = await hmacSha256(new Uint8Array(secretKey), dataCheckString)
  if (bytesToHex(signature) !== hash.toLowerCase()) return null

  const authDate = Number(params.get('auth_date') ?? 0)
  if (!authDate) return null
  if (Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) return null

  const rawUser = params.get('user')
  if (!rawUser) return null
  try {
    const user = JSON.parse(rawUser) as TgUser
    return user?.id ? { user, authDate } : null
  } catch {
    return null
  }
}

/** Пароль детерминирован: позволяет повторно войти тем же Telegram-аккаунтом. */
function passwordFor(userId: number, serviceKey: string): string {
  return `${serviceKey.slice(0, 24)}.${userId}.buryat`
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!botToken || !supabaseUrl || !serviceKey) {
      return json({ error: 'server_not_configured' }, 500)
    }

    const { initData } = (await req.json().catch(() => ({}))) as {
      initData?: string
    }
    if (!initData) return json({ error: 'initData_required' }, 400)

    const verified = await verifyInitData(initData, botToken)
    if (!verified) return json({ error: 'invalid_init_data' }, 401)

    const { user } = verified
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const email = `tg${user.id}@buryat.local`
    const password = passwordFor(user.id, serviceKey)
    const profileFields = {
      tg_id: user.id,
      username: user.username ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      photo_url: user.photo_url ?? null,
      language_code: user.language_code ?? null,
    }

    // 1) Создаём auth-пользователя (идемпотентно).
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { tg_id: user.id, username: user.username ?? null },
    })

    let authUserId: string | undefined = created.data?.user?.id

    if (!authUserId) {
      // Пользователь уже существует — входим по детерминированному паролю.
      const first = await admin.auth.signInWithPassword({ email, password })
      if (first.error) {
        // Пароль мог устареть при смене service-role ключа: находим пользователя
        // через auth API и переустанавливаем пароль.
        const { data: found } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const match = found?.users?.find((u) => u.email === email)
        if (!match) {
          return json({ error: 'auth_failed', detail: first.error.message }, 500)
        }
        await admin.auth.admin.updateUserById(match.id, { password })
        authUserId = match.id
      } else if (first.data.session) {
        await admin.from('profiles').upsert({ id: first.data.user.id, ...profileFields }, {
          onConflict: 'id',
        })
        return json({
          access_token: first.data.session.access_token,
          refresh_token: first.data.session.refresh_token,
          expires_at: first.data.session.expires_at,
          user: {
            id: first.data.user.id,
            tgId: user.id,
            firstName: user.first_name ?? null,
            username: user.username ?? null,
            photoUrl: user.photo_url ?? null,
          },
        })
      }
    }

    // 2) Профиль строго по id auth-пользователя.
    await admin.from('profiles').upsert(
      { id: authUserId, ...profileFields },
      { onConflict: 'id' },
    )

    // 3) Выдаём сессию.
    const { data: session, error: sessionError } = await admin.auth.signInWithPassword({
      email,
      password,
    })
    if (sessionError || !session.session) {
      return json({ error: 'session_failed', detail: sessionError?.message }, 500)
    }

    return json({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
      expires_at: session.session.expires_at,
      user: {
        id: authUserId,
        tgId: user.id,
        firstName: user.first_name ?? null,
        username: user.username ?? null,
        photoUrl: user.photo_url ?? null,
      },
    })
  } catch (err) {
    return json({ error: 'unexpected', detail: String(err) }, 500)
  }
})

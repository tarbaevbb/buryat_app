// =====================================================================
// Supabase Edge Function: telegram-auth
//
// Проверяет Telegram.WebApp.initData по HMAC-SHA256 и выдаёт сессию
// Supabase, привязанную к Telegram-аккаунту.
//
// Секреты:
//   supabase secrets set TELEGRAM_BOT_TOKEN=123:ABC
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY подставляются автоматически
//
// Деплой: supabase functions deploy telegram-auth --no-verify-jwt
//
// Логика проверки подписи живёт в ./initData.ts и покрыта тестами
// (supabase/functions/telegram-auth/initData.test.ts).
// =====================================================================
import { createClient } from '@supabase/supabase-js'
import { passwordFor, verifyInitData } from './initData.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

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

    // Локальная часть адреса: настоящая почта не нужна, вход идёт по паролю.
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

    // 1) Создаём auth-пользователя. Если он уже есть — просто входим.
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { tg_id: user.id, username: user.username ?? null },
    })

    let authUserId: string | undefined = created.data?.user?.id

    if (!authUserId) {
      const first = await admin.auth.signInWithPassword({ email, password })

      if (first.error) {
        // Пароль мог устареть (например, сменился service-role ключ).
        // Находим пользователя и переустанавливаем пароль.
        const { data: found } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        })
        const match = found?.users?.find((u) => u.email === email)
        if (!match) {
          return json({ error: 'auth_failed', detail: first.error.message }, 500)
        }
        await admin.auth.admin.updateUserById(match.id, { password })
        authUserId = match.id
      } else if (first.data.session) {
        // Быстрый путь: профиль обновляем и сразу отдаём существующую сессию.
        await admin
          .from('profiles')
          .upsert({ id: first.data.user.id, ...profileFields }, { onConflict: 'id' })

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

    if (!authUserId) return json({ error: 'auth_failed' }, 500)

    // 2) Профиль строго по id auth-пользователя, иначе RLS его не увидит.
    await admin
      .from('profiles')
      .upsert({ id: authUserId, ...profileFields }, { onConflict: 'id' })

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

import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Мок обязателен: `useCloudAuth` тянет за собой Supabase-клиент. */
vi.mock('../lib/supabase', () => ({
  isCloudEnabled: false,
  supabase: null,
  signOut: () => Promise.resolve(),
}))

const { checkSessionOwner } = await import('./useCloudAuth')
const { useProgress } = await import('../store/progressStore')

/**
 * Смена Telegram-аккаунта на одном устройстве.
 *
 * Сессия Supabase лежит в localStorage и общая для всех аккаунтов Telegram
 * в домене (Desktop и Web делят хранилище). Без сверки `tg_id` второй
 * пользователь видел бы имя, XP, серию и историю уроков первого — это
 * утечка данных, поэтому проверка обязана быть покрыта тестами.
 */
describe('checkSessionOwner', () => {
  it('совпадение tg_id — сессия своя', () => {
    expect(checkSessionOwner(12345, 12345)).toBe('ok')
  })

  it('разные tg_id — сессия чужая, нужен повторный вход', () => {
    expect(checkSessionOwner(111, 222)).toBe('mismatch')
  })

  it('в сессии нет tg_id — считаем чужой', () => {
    // Так выглядят старые записи или вход иным способом: доверять нельзя.
    expect(checkSessionOwner(null, 222)).toBe('mismatch')
    expect(checkSessionOwner(undefined, 222)).toBe('mismatch')
    expect(checkSessionOwner(0, 222)).toBe('mismatch')
  })

  it('нет текущего tg_id (браузер без Telegram) — сверять не с чем', () => {
    // Вне Telegram initData пустой, поэтому обычный браузер продолжает
    // работать с сохранённой сессией, как раньше.
    expect(checkSessionOwner(12345, null)).toBe('unknown')
    expect(checkSessionOwner(12345, undefined)).toBe('unknown')
    expect(checkSessionOwner(12345, 0)).toBe('unknown')
  })

  it('оба значения пустые — сверять нечего', () => {
    expect(checkSessionOwner(null, null)).toBe('unknown')
  })
})

/**
 * Локальная очистка при смене владельца.
 *
 * Ключевое отличие `clearLocal` от `reset`: первый не помечает облако
 * на удаление. Если бы при смене аккаунта ставился флаг сброса, то
 * `reconcile()` обнулил бы прогресс владельца сессии — то есть пострадал
 * бы предыдущий пользователь.
 */
describe('clearLocal', () => {
  beforeEach(() => {
    useProgress.getState().clearLocal()
  })

  it('убирает прогресс предыдущего пользователя', () => {
    const store = useProgress.getState()
    store.awardLesson({ lessonId: 'u1l1', score: 100, accuracy: 100, xp: 20 })
    store.recordWord('ger', false)
    store.setDisplayName('Прошлый игрок')

    expect(useProgress.getState().xp).toBeGreaterThan(0)

    useProgress.getState().clearLocal()
    const after = useProgress.getState()

    expect(after.xp).toBe(0)
    expect(after.streak).toBe(0)
    expect(after.lessons).toEqual({})
    expect(after.wordStats).toEqual({})
    expect(after.displayName).toBe('')
    // Подпись синхронизации тоже сбрасывается: иначе следующий пользователь
    // решил бы, что данные уже отправлены, и не залил бы свои.
    expect(after.syncedSignature).toBeNull()
  })

  it('НЕ помечает облако на удаление', () => {
    useProgress.getState().awardLesson({
      lessonId: 'u1l1',
      score: 100,
      accuracy: 100,
      xp: 20,
    })
    useProgress.getState().clearLocal()

    // Флаг сброса привёл бы к обнулению чужого облака при синхронизации.
    expect(useProgress.getState().resetPending).toBe(false)
  })

  it('сброс (reset) в отличие от него ставит флаг', () => {
    useProgress.getState().reset()
    expect(useProgress.getState().resetPending).toBe(true)
  })
})

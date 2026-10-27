import { describe, expect, it } from 'vitest'
import {
  GEMS_PER_REFILL,
  HEART_REFILL_MS,
  MAX_HEARTS,
  computeHearts,
  emptySnapshot,
  fullSignature,
  gemsForXp,
  heartsNow,
  levelFromXp,
  mergeProgress,
  nextStreak,
  reviewXp,
  stateSignature,
  weekXp,
  type ProgressSnapshot,
} from './progress'
import { daysBetween } from './dates'

const NOW = 1_700_000_000_000

function snapshot(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return { ...emptySnapshot(), ...overrides }
}

describe('computeHearts', () => {
  it('не восстанавливает сердца до истечения интервала', () => {
    expect(computeHearts(3, NOW, NOW + HEART_REFILL_MS - 1)).toBe(3)
  })

  it('восстанавливает по одному сердцу за интервал', () => {
    expect(computeHearts(3, NOW, NOW + HEART_REFILL_MS)).toBe(4)
    expect(computeHearts(3, NOW, NOW + HEART_REFILL_MS * 2)).toBe(5)
  })

  it('не превышает максимум', () => {
    expect(computeHearts(1, NOW, NOW + HEART_REFILL_MS * 100)).toBe(MAX_HEARTS)
  })

  it('при полном запасе не зависит от времени', () => {
    expect(computeHearts(MAX_HEARTS, NOW, NOW + HEART_REFILL_MS * 50)).toBe(MAX_HEARTS)
  })

  it('устойчив к «сдвигу времени назад»', () => {
    // Метка времени из будущего не должна давать отрицательное восстановление.
    expect(computeHearts(2, NOW + HEART_REFILL_MS * 10, NOW)).toBe(2)
  })

  it('heartsNow использует текущее время', () => {
    const snap = snapshot({ hearts: 1, heartsUpdatedAt: Date.now() - HEART_REFILL_MS * 2 })
    expect(heartsNow(snap)).toBe(3)
  })
})

describe('nextStreak', () => {
  it('первое занятие даёт серию 1', () => {
    expect(nextStreak(0, null, '2026-05-01', daysBetween)).toBe(1)
  })

  it('второй день подряд увеличивает серию', () => {
    expect(nextStreak(4, '2026-05-01', '2026-05-02', daysBetween)).toBe(5)
  })

  it('тот же день не меняет серию', () => {
    expect(nextStreak(4, '2026-05-02', '2026-05-02', daysBetween)).toBe(4)
  })

  it('пропуск дня сбрасывает серию', () => {
    expect(nextStreak(9, '2026-05-01', '2026-05-03', daysBetween)).toBe(1)
  })

  it('работает через границу месяца', () => {
    expect(nextStreak(3, '2026-01-31', '2026-02-01', daysBetween)).toBe(4)
  })

  it('работает через границу года', () => {
    expect(nextStreak(1, '2026-12-31', '2027-01-01', daysBetween)).toBe(2)
  })
})

describe('levelFromXp', () => {
  it('считает уровень и прогресс', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, need: 100 })
    expect(levelFromXp(99)).toEqual({ level: 1, into: 99, need: 100 })
    expect(levelFromXp(100)).toEqual({ level: 2, into: 0, need: 100 })
    expect(levelFromXp(1250)).toEqual({ level: 13, into: 50, need: 100 })
  })

  it('не ломается на отрицательном и дробном XP', () => {
    expect(levelFromXp(-5).level).toBe(1)
    expect(levelFromXp(150.9)).toEqual({ level: 2, into: 50, need: 100 })
  })
})

describe('weekXp', () => {
  it('суммирует с понедельника по сегодня', () => {
    // Понедельник и вторник одной недели.
    const monday = new Date(2026, 4, 4)
    const tuesday = new Date(2026, 4, 5)
    expect(weekXp({ '2026-05-04': 30, '2026-05-05': 20 }, tuesday)).toBe(50)
    expect(weekXp({ '2026-05-04': 30 }, monday)).toBe(30)
  })

  it('не берёт XP прошлой недели', () => {
    const tuesday = new Date(2026, 4, 5)
    expect(weekXp({ '2026-04-27': 999, '2026-05-05': 10 }, tuesday)).toBe(10)
  })
})

describe('reviewXp и gemsForXp', () => {
  it('даёт бонус за идеальный подход', () => {
    expect(reviewXp(10, 10)).toBe(15)
    expect(reviewXp(5, 10)).toBe(7)
  })

  it('ограничен 20 XP', () => {
    expect(reviewXp(50, 50)).toBe(20)
  })

  it('не падает на пустом подходе', () => {
    expect(reviewXp(0, 0)).toBe(2)
    expect(reviewXp(-5, 10)).toBe(2)
  })

  it('гемы — округление XP / 5', () => {
    expect(gemsForXp(15)).toBe(3)
    expect(gemsForXp(12)).toBe(2)
    expect(gemsForXp(0)).toBe(0)
  })
})

describe('mergeProgress', () => {
  it('берёт максимум по XP, гемам и результатам уроков', () => {
    const local = snapshot({
      xp: 100,
      gems: 10,
      lessons: { u1l1: { lessonId: 'u1l1', score: 80, accuracy: 70, xp: 20, completedAt: 100 } },
    })
    const remote = snapshot({
      xp: 250,
      gems: 40,
      lessons: {
        u1l1: { lessonId: 'u1l1', score: 95, accuracy: 90, xp: 25, completedAt: 200 },
        u2l1: { lessonId: 'u2l1', score: 60, accuracy: 55, xp: 12, completedAt: 150 },
      },
    })
    const merged = mergeProgress(local, remote, NOW)

    expect(merged.xp).toBe(250)
    expect(merged.gems).toBe(40)
    expect(merged.lessons.u1l1.score).toBe(95)
    expect(merged.lessons.u1l1.completedAt).toBe(200)
    expect(merged.lessons.u2l1.score).toBe(60)
  })

  it('объединяет уроки с обеих сторон, не теряя ни один', () => {
    const merged = mergeProgress(
      snapshot({
        lessons: { a: { lessonId: 'a', score: 50, accuracy: 50, xp: 5, completedAt: 1 } },
      }),
      snapshot({
        lessons: { b: { lessonId: 'b', score: 70, accuracy: 70, xp: 7, completedAt: 2 } },
      }),
      NOW,
    )
    expect(Object.keys(merged.lessons).sort()).toEqual(['a', 'b'])
  })

  it('XP по дням — максимум за день, не сумма', () => {
    const merged = mergeProgress(
      snapshot({ dailyXp: { '2026-05-01': 30 } }),
      snapshot({ dailyXp: { '2026-05-01': 50, '2026-05-02': 10 } }),
      NOW,
    )
    expect(merged.dailyXp['2026-05-01']).toBe(50)
    expect(merged.dailyXp['2026-05-02']).toBe(10)
  })

  it('статистика слов сливается по максимуму', () => {
    const merged = mergeProgress(
      snapshot({ wordStats: { ger: { errors: 1, seen: 5, lastErrorAt: 100 } } }),
      snapshot({
        wordStats: {
          ger: { errors: 3, seen: 2, lastErrorAt: 50 },
          sai: { errors: 1, seen: 1, lastErrorAt: 60 },
        },
      }),
      NOW,
    )
    expect(merged.wordStats.ger).toEqual({ errors: 3, seen: 5, lastErrorAt: 100 })
    expect(merged.wordStats.sai.seen).toBe(1)
  })

  it('серию берёт с той стороны, где занятие было позже', () => {
    const merged = mergeProgress(
      snapshot({ streak: 10, lastActiveDay: '2026-05-01' }),
      snapshot({ streak: 2, lastActiveDay: '2026-05-05' }),
      NOW,
    )
    expect(merged.streak).toBe(2)
    expect(merged.lastActiveDay).toBe('2026-05-05')
  })

  it('не продлевает старую серию с другого устройства', () => {
    const merged = mergeProgress(
      snapshot({ streak: 99, lastActiveDay: '2026-01-01' }),
      snapshot({ streak: 3, lastActiveDay: '2026-05-05' }),
      NOW,
    )
    expect(merged.streak).toBe(3)
  })

  it('при одинаковой дате берёт больший счётчик', () => {
    const merged = mergeProgress(
      snapshot({ streak: 4, lastActiveDay: '2026-05-05' }),
      snapshot({ streak: 9, lastActiveDay: '2026-05-05' }),
      NOW,
    )
    expect(merged.streak).toBe(9)
  })

  it('сердца: при равных метках берёт большее значение', () => {
    const merged = mergeProgress(
      snapshot({ hearts: 2, heartsUpdatedAt: NOW }),
      snapshot({ hearts: 4, heartsUpdatedAt: NOW }),
      NOW,
    )
    expect(merged.hearts).toBe(4)
  })

  it('сердца: побеждает сторона с большим текущим запасом', () => {
    // Локально 5 сердец (событие старое, запал успел восстановиться),
    // в облаке 3 сердца — при синхронизации запас выравнивается вверх.
    const merged = mergeProgress(
      snapshot({ hearts: 5, heartsUpdatedAt: NOW - 10_000 }),
      snapshot({ hearts: 3, heartsUpdatedAt: NOW }),
      NOW,
    )
    expect(merged.hearts).toBe(MAX_HEARTS)
  })

  it('сердца: восстановление до полного запаса учитывается как полный запас', () => {
    const merged = mergeProgress(
      snapshot({ hearts: 1, heartsUpdatedAt: NOW - HEART_REFILL_MS * 4 }),
      snapshot({ hearts: 3, heartsUpdatedAt: NOW }),
      NOW,
    )
    expect(merged.hearts).toBe(MAX_HEARTS)
  })

  it('сердца: при равенстве берёт более раннюю метку', () => {
    const earlier = NOW - 5_000
    const merged = mergeProgress(
      snapshot({ hearts: 4, heartsUpdatedAt: earlier }),
      snapshot({ hearts: 4, heartsUpdatedAt: NOW }),
      NOW,
    )
    expect(merged.hearts).toBe(4)
    // Более ранняя метка — следующее сердце придёт раньше.
    expect(merged.heartsUpdatedAt).toBe(earlier)
  })

  it('идемпотентно: слияние с самим собой ничего не меняет', () => {
    const base = snapshot({
      xp: 123,
      gems: 7,
      streak: 5,
      lastActiveDay: '2026-05-05',
      hearts: 3,
      heartsUpdatedAt: NOW,
      lessons: { a: { lessonId: 'a', score: 90, accuracy: 88, xp: 22, completedAt: 9 } },
      dailyXp: { '2026-05-05': 22 },
      wordStats: { ger: { errors: 2, seen: 3, lastErrorAt: 7 } },
    })
    expect(mergeProgress(base, base, NOW)).toEqual(base)
  })

  it('коммутативно по ключевым полям', () => {
    const a = snapshot({ xp: 50, streak: 2, lastActiveDay: '2026-05-01', hearts: 3, heartsUpdatedAt: NOW })
    const b = snapshot({ xp: 80, streak: 4, lastActiveDay: '2026-05-02', hearts: 2, heartsUpdatedAt: NOW })
    const ab = mergeProgress(a, b, NOW)
    const ba = mergeProgress(b, a, NOW)
    expect(ab.xp).toBe(ba.xp)
    expect(ab.streak).toBe(ba.streak)
    expect(ab.hearts).toBe(ba.hearts)
  })
})

describe('подписи состояния', () => {
  it('меняется при потере сердца', () => {
    // Метка свежая, поэтому восстановление ещё не произошло.
    const at = Date.now()
    const a = snapshot({ hearts: 5, heartsUpdatedAt: at })
    const b = snapshot({ hearts: 4, heartsUpdatedAt: at })
    expect(stateSignature(a)).not.toBe(stateSignature(b))
  })

  it('не считает изменением восстановленное сердце', () => {
    // 4 сердца с давней меткой = уже 5: подпись совпадает с полным запасом.
    const a = snapshot({ hearts: 5, heartsUpdatedAt: Date.now() })
    const b = snapshot({ hearts: 4, heartsUpdatedAt: Date.now() - HEART_REFILL_MS * 5 })
    expect(stateSignature(a)).toBe(stateSignature(b))
  })

  it('меняется при новом слове в статистике', () => {
    const a = snapshot()
    const b = snapshot({ wordStats: { ger: { errors: 0, seen: 1, lastErrorAt: 0 } } })
    expect(stateSignature(a)).not.toBe(stateSignature(b))
  })

  it('не меняется, если ничего не произошло', () => {
    const a = snapshot({ heartsUpdatedAt: NOW })
    const b = snapshot({ heartsUpdatedAt: NOW })
    expect(stateSignature(a)).toBe(stateSignature(b))
  })

  it('полная подпись учитывает XP и уроки', () => {
    const a = snapshot({ xp: 10 })
    const b = snapshot({ xp: 20 })
    expect(fullSignature(a)).not.toBe(fullSignature(b))
  })
})

describe('emptySnapshot', () => {
  it('даёт стартовое состояние', () => {
    const s = emptySnapshot()
    expect(s.xp).toBe(0)
    expect(s.gems).toBeGreaterThan(0)
    expect(s.hearts).toBe(MAX_HEARTS)
    expect(s.streak).toBe(0)
    expect(s.lastActiveDay).toBeNull()
    expect(GEMS_PER_REFILL).toBeGreaterThan(0)
  })
})

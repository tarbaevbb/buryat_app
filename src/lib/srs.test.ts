import { describe, expect, it } from 'vitest'
import { knownWordCount, pickReviewWords, weakWordCount, type WordStat } from './srs'

const stat = (errors: number, seen = 1, lastErrorAt = 0): WordStat => ({
  errors,
  seen,
  lastErrorAt,
})

describe('pickReviewWords', () => {
  it('ставит слова с ошибками вперёд, по убыванию ошибок', () => {
    const words = pickReviewWords(
      {
        ger: stat(5),
        sai: stat(1),
        nom: stat(3),
      },
      3,
      1,
    )
    expect(words.map((w) => w.id)).toEqual(['ger', 'nom', 'sai'])
  })

  it('игнорирует неизвестные id', () => {
    const words = pickReviewWords({ 'не-существует': stat(9) }, 5, 1)
    expect(words.every((w) => w.id !== 'не-существует')).toBe(true)
  })

  it('добирает словами курса, когда ошибок мало', () => {
    const words = pickReviewWords({ ger: stat(1) }, 10, 1)
    expect(words).toHaveLength(10)
    expect(words[0].id).toBe('ger')
  })

  it('не отдаёт больше запрошенного количества', () => {
    const words = pickReviewWords({ ger: stat(1) }, 3, 1)
    expect(words).toHaveLength(3)
  })

  it('детерминирован при одном сиде', () => {
    const a = pickReviewWords({ ger: stat(1) }, 8, 42).map((w) => w.id)
    const b = pickReviewWords({ ger: stat(1) }, 8, 42).map((w) => w.id)
    expect(a).toEqual(b)
  })

  it('даёт разный набор при разных сидах', () => {
    const a = pickReviewWords({}, 10, 1).map((w) => w.id)
    const b = pickReviewWords({}, 10, 2).map((w) => w.id)
    expect(a.join(',')).not.toBe(b.join(','))
  })

  it('не включает буквы и звуки', () => {
    const words = pickReviewWords({}, 25, 7)
    expect(words.some((w) => w.pos === 'sound' || w.pos === 'letter')).toBe(false)
  })

  it('не дублирует слова в наборе', () => {
    const words = pickReviewWords({ ger: stat(3) }, 12, 5)
    const ids = words.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('счётчики', () => {
  it('считает изученные и слабые слова', () => {
    const stats = { ger: stat(0), sai: stat(2), nom: stat(0, 3) }
    expect(knownWordCount(stats)).toBe(3)
    expect(weakWordCount(stats)).toBe(1)
  })

  it('на пустой статистике возвращает нули', () => {
    expect(knownWordCount({})).toBe(0)
    expect(weakWordCount({})).toBe(0)
  })
})

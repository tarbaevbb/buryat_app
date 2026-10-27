import { describe, expect, it } from 'vitest'
import { isCorrect, looseKey, normalize } from './normalize'

describe('normalize', () => {
  it('приводит регистр и убирает пунктуацию', () => {
    expect(normalize('Сайн байна уу?')).toBe('сайн байна уу')
    expect(normalize('  Гэр,  ')).toBe('гэр')
  })
})

describe('looseKey', () => {
  it('смешивает ө/о, ү/у, һ/х, й/и', () => {
    expect(looseKey('ө')).toBe('о')
    expect(looseKey('үгэ')).toBe('угэ')
    expect(looseKey('һүн')).toBe('хун')
    expect(looseKey('нохой')).toBe('нохои')
  })
})

describe('isCorrect', () => {
  it('принимает точное совпадение', () => {
    expect(isCorrect('гэр', 'гэр')).toBe(true)
  })

  it('не наказывает за о/ө и у/ү', () => {
    expect(isCorrect('уhан', 'уһан')).toBe(true)
    expect(isCorrect('сүүтэй сай', 'суутэй сай')).toBe(true)
  })

  it('игнорирует пунктуацию и регистр', () => {
    expect(isCorrect('Сайн байна уу?', 'сайн байна уу')).toBe(true)
  })

  it('отклоняет другой ответ', () => {
    expect(isCorrect('морин', 'нохой')).toBe(false)
  })
})

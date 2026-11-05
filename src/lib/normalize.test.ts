import { describe, expect, it } from 'vitest'
import { normalize } from './normalize'

describe('normalize', () => {
  it('приводит регистр и убирает пунктуацию', () => {
    expect(normalize('Сайн байна уу?')).toBe('сайн байна уу')
    expect(normalize('  Гэр,  ')).toBe('гэр')
  })
})

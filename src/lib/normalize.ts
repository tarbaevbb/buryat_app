export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[!?.,:;"'«»()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Сравнение ответов с учётом типичных для бурятского опечаток:
 * смешение о/ө, у/ү, h/һ/х, й/и.
 */
export function looseKey(input: string): string {
  return normalize(input)
    .replace(/ө/g, 'о')
    .replace(/ү/g, 'у')
    .replace(/[һh]/g, 'х')
    .replace(/й/g, 'и')
}

export function isCorrect(given: string, expected: string): boolean {
  const a = normalize(given)
  const b = normalize(expected)
  if (a === b) return true
  const la = looseKey(given)
  const lb = looseKey(expected)
  if (la === lb) return true
  // допускаем пропуск/лишний мягкий знак
  return la.replace(/ь/g, '') === lb.replace(/ь/g, '')
}

#!/usr/bin/env node
/**
 * Проверка размера сборки.
 *
 * Бандл не должен расти незаметно: приложение — Mini App, который
 * открывают по мобильной сети. Скрипт падает, если JS или CSS превысил
 * лимит, и печатает таблицу для summary в CI.
 *
 * Запуск:  node scripts/check-bundle-size.mjs
 * Лимиты:  scripts/bundle-budgets.json
 */
import { appendFileSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const DIST = 'dist'
const BUDGETS = new URL('./bundle-budgets.json', import.meta.url)

const budgets = JSON.parse(readFileSync(BUDGETS, 'utf8'))

/** Собирает размеры всех файлов сборки. */
function collect(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...collect(full))
    } else {
      const buf = readFileSync(full)
      out.push({
        path: full.replace(`${DIST}/`, ''),
        raw: buf.length,
        gzip: gzipSync(buf).length,
      })
    }
  }
  return out
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

let failed = false
const rows = []

// --- Проверка по типам файлов ---
for (const [ext, limit] of Object.entries(budgets.extensions)) {
  const files = collect(DIST).filter((f) => f.path.endsWith(ext))
  if (files.length === 0) continue

  const rawTotal = files.reduce((a, f) => a + f.raw, 0)
  const gzipTotal = files.reduce((a, f) => a + f.gzip, 0)
  const over = gzipTotal > limit.gzip

  if (over) failed = true

  rows.push({
    label: `${ext} (${files.length} файл${files.length === 1 ? '' : 'а'})`,
    raw: rawTotal,
    gzip: gzipTotal,
    limit: limit.gzip,
    over,
  })

  console.log(
    `${over ? '✗' : '✓'} ${ext}: ${kb(gzipTotal)} gzip (${kb(rawTotal)} raw) — лимит ${kb(limit.gzip)}`,
  )
  if (over) {
    console.error(
      `  Превышение на ${kb(gzipTotal - limit.gzip)}. ` +
        `Уменьшите бандл или поднимите лимит в scripts/bundle-budgets.json.`,
    )
  }
}

// --- Проверка отдельных крупных файлов ---
const all = collect(DIST)
for (const [pattern, limit] of Object.entries(budgets.files ?? {})) {
  const re = new RegExp(pattern)
  for (const file of all.filter((f) => re.test(f.path))) {
    const over = file.gzip > limit.gzip
    if (over) failed = true
    console.log(
      `${over ? '✗' : '✓'} ${file.path}: ${kb(file.gzip)} gzip — лимит ${kb(limit.gzip)}`,
    )
  }
}

// --- Итог ---
console.log('')
console.log(`Всего файлов: ${all.length}, суммарно ${kb(all.reduce((a, f) => a + f.gzip, 0))} gzip`)

// Таблица для GitHub Actions summary.
if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    '### Размер сборки',
    '',
    '| Файл | Raw | gzip | Лимит |',
    '|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${r.label} | ${kb(r.raw)} | ${kb(r.gzip)} | ${r.over ? '❌ ' : ''}${kb(r.limit)} |`,
    ),
    '',
    `Всего: **${kb(all.reduce((a, f) => a + f.gzip, 0))}** gzip`,
    '',
  ]
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'))
}

if (failed) {
  console.error('\nСборка превысила лимиты размера.')
  process.exit(1)
}
console.log('\nРазмеры в норме.')

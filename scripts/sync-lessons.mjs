#!/usr/bin/env node
/**
 * Генерирует SQL-вставку каталога уроков из `src/data/course.ts`.
 *
 * Зачем: сервер должен знать список уроков, чтобы награду нельзя было
 * получить за выдуманный id (`fn_award_lesson('что-угодно', 100, 100)`).
 * Держать список вручную в SQL — источник расхождений, поэтому он
 * выводится из того же файла, что использует клиент.
 *
 * Запуск:  node scripts/sync-lessons.mjs            # показать SQL
 *          node scripts/sync-lessons.mjs --write    # записать в миграцию
 *
 * Значения попадают в миграцию между маркерами LESSONS:BEGIN/END.
 *
 * Разбор идёт по тексту, а не через import: так скрипт не требует сборки
 * TypeScript. Алгоритм — подсчёт скобок, потому что уроки в файле
 * записаны и в одну строку, и в несколько.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const COURSE = join(ROOT, 'src/data/course.ts')
const MIGRATION = join(ROOT, 'supabase/migrations/20261027220000_harden_rpc.sql')

const BEGIN = '-- LESSONS:BEGIN (сгенерировано scripts/sync-lessons.mjs)'
const END = '-- LESSONS:END'

/**
 * Возвращает содержимое массива, начинающегося с `[` на позиции `start`.
 * Учитывает вложенные `[]` и `{}`, а также строки в кавычках
 * (иначе скобка внутри строки сломала бы подсчёт).
 */
function sliceBalanced(text, start) {
  let depth = 0
  let inString = null

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]

    if (inString) {
      if (ch === '\\') {
        i += 1 // пропускаем экранированный символ
      } else if (ch === inString) {
        inString = null
      }
      continue
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch
      continue
    }
    if (ch === '[' || ch === '{') depth += 1
    else if (ch === ']' || ch === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  throw new Error('Не найдена закрывающая скобка')
}

/** Разбивает содержимое массива на элементы верхнего уровня. */
function splitTopLevel(arrayText) {
  const inner = arrayText.slice(1, -1)
  const parts = []
  let depth = 0
  let inString = null
  let current = ''

  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i]

    if (inString) {
      current += ch
      if (ch === '\\') {
        current += inner[i + 1] ?? ''
        i += 1
      } else if (ch === inString) {
        inString = null
      }
      continue
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch
      current += ch
      continue
    }
    if (ch === '[' || ch === '{') depth += 1
    if (ch === ']' || ch === '}') depth -= 1

    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) parts.push(current)

  return parts.map((p) => p.trim()).filter(Boolean)
}

/** Достаёт значение строкового поля из текста объекта. */
function stringField(text, name) {
  const re = new RegExp(`\\b${name}:\\s*'([^']*)'`)
  const m = re.exec(text)
  return m ? m[1] : null
}

function readLessons() {
  const src = readFileSync(COURSE, 'utf8')

  // Находим unitSpecs = [ ... ]
  const specsMatch = /const\s+unitSpecs\s*:\s*UnitSpec\[\]\s*=\s*\[/.exec(src)
  if (!specsMatch) throw new Error('Не найден массив unitSpecs в course.ts')

  const specsText = sliceBalanced(src, specsMatch.index + specsMatch[0].length - 1)
  const units = splitTopLevel(specsText)

  const lessons = []

  for (const unitText of units) {
    const unitId = stringField(unitText, 'id')
    if (!unitId || !/^u\d$/.test(unitId)) continue

    const lessonsKey = /\blessons:\s*\[/.exec(unitText)
    if (!lessonsKey) continue

    const lessonsText = sliceBalanced(
      unitText,
      lessonsKey.index + lessonsKey[0].length - 1,
    )

    for (const lessonText of splitTopLevel(lessonsText)) {
      const id = stringField(lessonText, 'id')
      if (!id) continue
      lessons.push({
        id,
        unitId,
        kind: /kind:\s*'review'/.test(lessonText) ? 'review' : 'lesson',
      })
    }
  }

  if (lessons.length === 0) throw new Error(`Не удалось извлечь уроки из ${COURSE}`)

  return lessons
}

/**
 * Проверки, что разбор не «поехал»: их срабатывание означает, что
 * структура course.ts изменилась и парсер нужно поправить.
 */
function validate(lessons) {
  const seen = new Set()
  for (const l of lessons) {
    if (seen.has(l.id)) throw new Error(`Дублирующийся урок: ${l.id}`)
    seen.add(l.id)
  }

  const units = new Set(lessons.map((l) => l.unitId)).size
  const reviews = lessons.filter((l) => l.kind === 'review').length
  if (reviews !== units) {
    throw new Error(`Повторений ${reviews}, разделов ${units} — разбор сбился`)
  }

  for (const l of lessons) {
    if (!/^u\dl\d$/.test(l.id)) throw new Error(`Странный id урока: ${l.id}`)
  }

  return lessons
}

const lessons = validate(readLessons())

const sql = [
  BEGIN,
  'insert into public.lessons (id, unit_id, kind) values',
  lessons.map((l) => `  ('${l.id}', '${l.unitId}', '${l.kind}')`).join(',\n'),
  'on conflict (id) do update set unit_id = excluded.unit_id, kind = excluded.kind;',
  END,
].join('\n')

if (!process.argv.includes('--write')) {
  console.log(sql)
  console.error(
    `\nУроков: ${lessons.length} ` +
      `(${lessons.filter((l) => l.kind === 'review').length} повторений)`,
  )
  console.error('Добавьте --write, чтобы записать в миграцию.')
  process.exit(0)
}

if (!existsSync(MIGRATION)) {
  console.error(`Миграция не найдена: ${MIGRATION}`)
  process.exit(1)
}

const current = readFileSync(MIGRATION, 'utf8')
const beginIdx = current.indexOf(BEGIN)
const endIdx = current.indexOf(END)

if (beginIdx === -1 || endIdx === -1) {
  console.error('В миграции нет маркеров LESSONS:BEGIN / LESSONS:END')
  process.exit(1)
}

const updated = current.slice(0, beginIdx) + sql + current.slice(endIdx + END.length)
writeFileSync(MIGRATION, updated)
console.log(`Записано уроков: ${lessons.length} → ${MIGRATION}`)

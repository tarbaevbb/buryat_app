import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// В тестах Telegram SDK нет — это ожидаемый сценарий (mock-режим).
vi.stubGlobal('Telegram', undefined)

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('App', () => {
  it('рендерит карту обучения на главной', () => {
    renderAt('/')
    expect(screen.getByText('Буряад хэлэн')).toBeTruthy()
    expect(screen.getByText('Чтение и первые слова')).toBeTruthy()
    expect(screen.getByText('Учиться')).toBeTruthy()
  })

  it('показывает все пять разделов курса', () => {
    renderAt('/')
    for (const title of [
      'Чтение и первые слова',
      'Приветствия',
      'Числа и время',
      'Семья и люди',
      'Еда и быт',
    ]) {
      expect(screen.getByText(title)).toBeTruthy()
    }
  })

  it('рендерит экран профиля', () => {
    renderAt('/profile')
    expect(screen.getByText('Сбросить прогресс')).toBeTruthy()
    expect(screen.getByText('Активность (14 дней)')).toBeTruthy()
  })

  it('рендерит рейтинг и повторение', () => {
    renderAt('/leaderboard')
    expect(screen.getByText('Рейтинг недели')).toBeTruthy()
    cleanup()
    renderAt('/review')
    expect(screen.getByText('Повторение')).toBeTruthy()
  })

  it('неизвестный маршрут ведёт на главную', () => {
    renderAt('/такого-нет')
    expect(screen.getByText('Учиться')).toBeTruthy()
  })
})

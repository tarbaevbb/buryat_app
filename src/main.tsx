import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initTelegram } from './telegram/init'
import { bootstrapCloud } from './hooks/useCloudAuth'
import { migrateLegacyProgress } from './store/progressStore'

// Прогресс из старого ключа localStorage переносим до монтирования,
// чтобы первый рендер уже показывал актуальные цифры.
migrateLegacyProgress()

// Тема и safe-area применяются до рендера: иначе первый кадр будет
// со «светлыми» цветами даже в тёмной теме Telegram.
initTelegram()

// Вход в облако и авто-синхронизация — ровно один раз на сессию.
bootstrapCloud()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Граница внутри StrictMode, но снаружи роутера: ошибка в самом
        роутере тоже должна показывать понятный экран, а не пустую страницу. */}
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

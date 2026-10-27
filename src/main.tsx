import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initTelegram } from './telegram/init'
import { bootstrapCloud } from './hooks/useCloudAuth'
import { migrateLegacyProgress } from './store/progressStore'

// Прогресс из старого ключа localStorage переносим до монтирования,
// чтобы первый рендер уже показывал актуальные цифры.
migrateLegacyProgress()

initTelegram()
// Вход в облако и авто-синхронизация — ровно один раз на сессию.
bootstrapCloud()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)

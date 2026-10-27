import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
  test: {
    // jsdom нужен для smoke-тестов рендеринга; чистая логика работает и без DOM.
    environment: 'jsdom',
    // Тесты edge-функции лежат рядом с кодом (supabase/functions/**),
    // чтобы их можно было запускать и через vitest, и через deno test.
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    environmentOptions: {
      jsdom: { url: 'https://example.test/' },
    },
  },
})

import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'

/**
 * Плоский конфиг ESLint (flat config).
 *
 * Набор правил подобран под этот проект: React 18 без JSX-трансформаций,
 * TypeScript в strict-режиме, Telegram Mini App (браузерное окружение).
 * Стилистику не проверяем — только потенциальные ошибки и доступность,
 * чтобы не спорить о форматировании.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'supabase/functions/**', // Deno — проверяется отдельно через deno lint
      'eslint.config.js', // конфиг линтера проверять не нужно
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // --- React ---
      // Ловит забытые зависимости в useEffect/useMemo — самая частая причина
      // «залипших» значений и лишних перерисовок.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Компоненты должны экспортироваться по одному — иначе HMR ломается.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // --- Доступность ---
      // В приложении много иконочных кнопок (закрыть урок, выйти из тупика),
      // поэтому alt/aria-label и корректные роли обязательны.
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/mouse-events-have-key-events': 'warn',

      // --- TypeScript: ослабляем то, что мешает в этом проекте ---
      // Неиспользуемые аргументы с подчёркиванием — намеренные заглушки API.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // `void promise` — осознанный способ пометить «специально не ждём».
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Тесты: доступ к describe/it/expect и node-глобалам.
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
      // В тестах удобно собирать объекты «на месте» без полной типизации.
      '@typescript-eslint/no-explicit-any': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
    },
  },

  // Служебные скрипты сборки: окружение Node, а не браузер.
  {
    files: ['scripts/**/*.{js,mjs}', '*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
)

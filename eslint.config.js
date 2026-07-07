import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  { ignores: ['dist/**', 'node_modules/**', '.vite/**', 'bake-recordings/**', 'browserstack/**', '**/*.tmp.mjs'] },

  js.configs.recommended,
  jsxA11y.flatConfigs.recommended,

  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    linterOptions: {
      // The codebase carries forward-looking `eslint-disable no-console` hints;
      // no-console isn't enabled here, so don't nag about them.
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // autoFocus on the open-berth input is a deliberate UX choice — advisory only.
      'jsx-a11y/no-autofocus': 'warn',
      // Unused destructured props (e.g. onNavigate) are common here — warn, don't fail.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' }],
      // The a11y rules stay advisory: this is a heavily visual, WebGL/scroll-driven
      // site with many intentional decorative elements. Surface, don't block.
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/media-has-caption': 'off',
    },
  },

  // Node-side tooling (build/bake scripts, config) — Node globals only.
  {
    files: ['scripts/**', 'vite.config.js', 'eslint.config.js', 'src/bake/**'],
    languageOptions: { globals: { ...globals.node } },
  },
]

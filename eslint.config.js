import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // core/ は React Native へそのまま持っていく。DOM も React も触らせん。
    // このルールが壊れると「移植できる芯」という前提そのものが崩れる。
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'core/ は DOM 非依存。renderer 側でやる' },
        { name: 'document', message: 'core/ は DOM 非依存。renderer 側でやる' },
        { name: 'navigator', message: 'core/ は DOM 非依存。renderer 側でやる' },
        { name: 'localStorage', message: 'core/ は DOM 非依存。renderer 側でやる' },
        { name: 'SVGElement', message: 'core/ は DOM 非依存。renderer 側でやる' },
        { name: 'DOMPoint', message: 'core/ は DOM 非依存。renderer 側でやる' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'core/ は React 非依存' },
            { group: ['**/web/**', '../web/*'], message: 'core/ は renderer に依存せん（依存の向きは逆）' },
            { group: ['@tanstack/*'], message: 'core/ はルータに依存せん' },
          ],
        },
      ],
    },
  },
  {
    // Artifact として配る単一 HTML の中身。ブラウザで直に走るので DOM グローバルを許す。
    files: ['tools/calibrator/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: globals.browser },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['scripts/**/*.ts', '*.config.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
)

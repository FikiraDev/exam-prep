import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'oxlint'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  categories: {
    correctness: 'error',
    suspicious: 'warn',
    perf: 'warn',
    style: 'off',
    pedantic: 'off',
    restriction: 'off',
    nursery: 'off',
  },
  plugins: [
    'eslint',
    'typescript',
    'oxc',
    'unicorn',
    'import',
    'react',
    'jsx-a11y',
    'react-perf',
    'promise',
    'vitest',
  ],
  jsPlugins: [
    {
      name: 'tailwindcss',
      specifier: 'eslint-plugin-tailwindcss',
    },
  ],
  options: {
    reportUnusedDisableDirectives: 'error',
    typeAware: true,
  },
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  settings: {
    react: {
      version: '19.2.0',
      linkComponents: [
        {
          name: 'Link',
          linkAttribute: 'to',
        },
      ],
    },
    'jsx-a11y': {
      components: {
        Link: 'a',
      },
    },
    tailwindcss: {
      attributes: ['class', 'className', 'ngClass', '@apply', 'class:list'],
      cssConfigPath: join(root, 'apps/web/src/styles.css'),
      functions: ['classnames', 'clsx', 'cn', 'ctl', 'cva', 'tv', 'tw', 'twMerge'],
    },
  },
  rules: {
    '@typescript-eslint/array-type': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-import-type-side-effects': 'error',
    '@typescript-eslint/no-inferrable-types': 'error',
    '@typescript-eslint/prefer-function-type': 'error',
    curly: 'error',
    eqeqeq: 'error',
    'import/consistent-type-specifier-style': 'error',
    'import/first': 'error',
    'import/no-duplicates': 'error',
    'no-else-return': 'error',
    'no-nested-ternary': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-const': 'error',
    'prefer-template': 'error',
    'react/button-has-type': 'error',
    'react/checked-requires-onchange-or-readonly': 'error',
    'react/jsx-boolean-value': 'error',
    'react/jsx-curly-brace-presence': 'error',
    'react/jsx-fragments': 'error',
    'react/jsx-no-target-blank': 'error',
    'react/jsx-no-useless-fragment': 'error',
    'react/no-danger': 'error',
    'react/react-in-jsx-scope': 'off',
    'react/rules-of-hooks': 'error',
    'react/self-closing-comp': 'error',
    'tailwindcss/classnames-order': 'warn',
    'tailwindcss/no-contradicting-classname': 'error',
    'tailwindcss/no-custom-classname': 'warn',
    'unicorn/throw-new-error': 'error',
  },
  ignorePatterns: [
    'convex/_generated/**',
    'apps/web/src/routeTree.gen.ts',
    '.tanstack/**',
    '.wrangler/**',
    '.output/**',
    '.vinxi/**',
    'dist/**',
    'dist-ssr/**',
    'coverage/**',
  ],
  overrides: [
    {
      files: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
      env: {
        vitest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['convex/**/*.{ts,tsx}'],
      env: {
        browser: false,
        node: false,
      },
    },
  ],
})

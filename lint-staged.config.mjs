/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.{js,cjs,mjs,jsx,ts,tsx,cts,mts}': [
    'pnpm exec oxfmt',
    'pnpm exec oxlint -c ./oxlint.config.mjs --deny-warnings',
  ],
  '*.{css,html,json,md,mdx,yaml,yml}': 'pnpm exec oxfmt',
}

/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.{js,cjs,mjs,jsx,ts,tsx,cts,mts}': ['pnpm exec oxfmt', 'node ./scripts/oxlint-staged.mjs'],
  '*.{css,html,json,md,mdx,yaml,yml}': 'pnpm exec oxfmt',
}

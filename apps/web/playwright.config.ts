import { defineConfig } from '@playwright/test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const configDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(configDir, '../..')
const env = loadEnv('test', repoRoot, '')
const convexUrl = env.VITE_CONVEX_URL

if (!convexUrl) {
  throw new Error('VITE_CONVEX_URL must be set for Playwright auth tests.')
}

process.env.VITE_CONVEX_URL = convexUrl

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  webServer: {
    command: 'env -u NO_COLOR pnpm run dev',
    reuseExistingServer: !process.env.CI,
    url: 'https://exam-prep.localhost',
    ignoreHTTPSErrors: true,
  },
  use: {
    baseURL: 'https://exam-prep.localhost',
    ignoreHTTPSErrors: true,
  },
})

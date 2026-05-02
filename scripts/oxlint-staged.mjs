import { spawnSync } from 'node:child_process'
import { relative } from 'node:path'
import { cwd } from 'node:process'

const args = process.argv.slice(2)

const rootFiles = []
const webFiles = []

for (const arg of args) {
  if (arg === '--') {
    continue
  }

  const rel = relative(cwd(), arg)
  if (rel.startsWith('apps/web/')) {
    webFiles.push(rel.replace('apps/web/', ''))
  } else {
    rootFiles.push(arg)
  }
}

let exitCode = 0

if (rootFiles.length > 0) {
  const result = spawnSync(
    'pnpm',
    ['exec', 'oxlint', '-c', './oxlint.config.mjs', '--deny-warnings', ...rootFiles],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) {
    exitCode = result.status || 1
  }
}

if (webFiles.length > 0) {
  const result = spawnSync(
    'pnpm',
    ['exec', 'oxlint', '-c', './oxlint.config.mjs', '--deny-warnings', ...webFiles],
    { cwd: 'apps/web', stdio: 'inherit' },
  )
  if (result.status !== 0) {
    exitCode = result.status || 1
  }
}

process.exit(exitCode)

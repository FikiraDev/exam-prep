import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  })
}

function commandWorks(command, args) {
  const result = run(command, args, { stdio: 'ignore' })
  return result.status === 0
}

function git(args) {
  return run('git', args)
}

function gitStdout(args) {
  const result = git(args)
  return result.status === 0 ? result.stdout.trim() : null
}

function resolveCommit(ref) {
  return gitStdout(['rev-parse', '--verify', '--quiet', ref])
}

function resolveOriginHeadRef() {
  const ref = gitStdout(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  return ref && ref.startsWith('origin/') ? ref : null
}

function createBaseCandidate(ref) {
  const commit = resolveCommit(ref)

  if (!commit) {
    return null
  }

  return { ref, commit }
}

function addCandidate(candidates, seenRefs, ref) {
  if (!ref || seenRefs.has(ref)) {
    return
  }

  const candidate = createBaseCandidate(ref)
  if (!candidate) {
    return
  }

  seenRefs.add(ref)
  candidates.push(candidate)
}

export function resolveBaseCandidates() {
  const candidates = []
  const seenRefs = new Set()

  addCandidate(candidates, seenRefs, resolveOriginHeadRef())

  for (const ref of ['origin/main', 'main', 'origin/master', 'master', 'HEAD~1']) {
    addCandidate(candidates, seenRefs, ref)
  }

  return candidates
}

export function isRecoverableBaseRefError(result) {
  if (result.status !== 2) {
    return false
  }

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  return /could not create a temporary worktree|base ref/i.test(output)
}

export function writeOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout)
  }

  writeStderr(result)
}

export function writeStderr(result) {
  const stderr = filterBenignNodeModulesWarning(result.stderr)

  if (stderr) {
    process.stderr.write(stderr)
  }
}

function filterBenignNodeModulesWarning(stderr) {
  if (!stderr) {
    return stderr
  }

  if (!hasInstalledRootNodeModules()) {
    return stderr
  }

  const lines = stderr.split('\n')
  const filteredLines = lines.filter(
    (line) =>
      !line.includes(
        'WARN node_modules directory not found. Run `npm install` / `pnpm install` first for accurate results.',
      ),
  )

  return filteredLines.join('\n')
}

function hasInstalledRootNodeModules() {
  return existsSync(join(process.cwd(), 'node_modules'))
}

export function parseJsonResult(result) {
  const stdout = result.stdout?.trim()

  if (!stdout) {
    return null
  }

  try {
    return JSON.parse(stdout)
  } catch {
    return null
  }
}

export function truncateText(value, maxLength = 220) {
  if (typeof value !== 'string') {
    return value
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 3)}...`
}

export function resolveRunner() {
  if (commandWorks('pnpm', ['exec', 'fallow', '--version'])) {
    return ['pnpm', ['exec', 'fallow']]
  }

  if (commandWorks('fallow', ['--version'])) {
    return ['fallow', []]
  }

  return null
}

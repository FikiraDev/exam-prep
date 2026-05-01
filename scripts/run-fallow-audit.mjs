import { spawnSync } from 'node:child_process'

function run(command, args, options = {}) {
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

function resolveBaseCandidates() {
  const candidates = []
  const seenRefs = new Set()

  addCandidate(candidates, seenRefs, resolveOriginHeadRef())

  for (const ref of ['origin/main', 'main', 'origin/master', 'master', 'HEAD~1']) {
    addCandidate(candidates, seenRefs, ref)
  }

  return candidates
}

function isRecoverableBaseRefError(result) {
  if (result.status !== 2) {
    return false
  }

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  return /could not create a temporary worktree|base ref/i.test(output)
}

function writeOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout)
  }

  if (result.stderr) {
    process.stderr.write(result.stderr)
  }
}

function runAudit(command, prefixArgs, candidate) {
  const args = [...prefixArgs, 'audit', '--quiet', '--base', candidate.commit]
  return run(command, args, { stdio: 'pipe' })
}

function runAuditWithFallbacks(command, prefixArgs, candidates) {
  for (const [index, candidate] of candidates.entries()) {
    const result = runAudit(command, prefixArgs, candidate)
    const isLast = index === candidates.length - 1

    if (!isRecoverableBaseRefError(result) || isLast) {
      writeOutput(result)
      return result
    }

    console.warn(
      `[hooks] Fallow audit could not use base ref '${candidate.ref}'. Retrying with the next available base candidate.`,
    )
  }

  throw new Error('[hooks] Unreachable: no fallow audit result was produced.')
}

function resolveRunner() {
  if (commandWorks('pnpm', ['exec', 'fallow', '--version'])) {
    return ['pnpm', ['exec', 'fallow']]
  }

  if (commandWorks('fallow', ['--version'])) {
    return ['fallow', []]
  }

  return null
}

const runner = resolveRunner()

if (!runner) {
  console.warn(
    '[hooks] Skipping Fallow audit because the binary is unavailable. Run `pnpm install` or install `fallow` globally to enable the graph audit gate.',
  )
  process.exit(0)
}

const baseCandidates = resolveBaseCandidates()

if (baseCandidates.length === 0) {
  console.warn(
    '[hooks] Skipping Fallow audit because no base ref could be resolved. Set up `origin/HEAD`, create `main`/`master`, or make another commit before relying on the audit gate.',
  )
  process.exit(0)
}

const [command, prefixArgs] = runner
const result = runAuditWithFallbacks(command, prefixArgs, baseCandidates)

process.exit(result.status ?? 1)

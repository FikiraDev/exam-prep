import { bold, cyan, gray, printRule } from './color-utils.mjs'
import {
  isRecoverableBaseRefError,
  parseJsonResult,
  resolveBaseCandidates,
  resolveRunner,
  run,
  writeOutput,
  writeStderr,
} from './fallow-core.mjs'
import {
  printComplexityFindings,
  printDeadCodeFindings,
  printDuplicationFindings,
} from './fallow-formatters.mjs'
import { createStructuredLogger } from './log-utils.mjs'

const logger = createStructuredLogger('hooks][fallow')

function formatCount(label, count) {
  return `${count} ${label}${count === 1 ? '' : 's'}`
}

const logInfo = logger.info
const logWarn = logger.warn
const logError = logger.error

function buildFailureCounts(summary) {
  return [
    formatCount('dead-code issue', summary.dead_code_issues ?? 0),
    formatCount('complexity finding', summary.complexity_findings ?? 0),
    formatCount('duplication clone group', summary.duplication_clone_groups ?? 0),
  ]
}

function buildAuditSummaryMessage(audit) {
  const summary = audit.summary ?? {}
  const changedFilesCount = audit.changed_files_count ?? 0

  if (audit.verdict === 'pass') {
    return `audit_passed changed_files=${changedFilesCount}`
  }

  const counts = buildFailureCounts(summary)
  return `audit_failed changed_files=${changedFilesCount} summary=${counts.join(', ')}`
}

function printAuditSummary(audit) {
  const message = buildAuditSummaryMessage(audit)

  if (audit.verdict === 'pass') {
    logInfo(message, {
      base_ref: audit.base_ref,
      elapsed_ms: audit.elapsed_ms,
      head_sha: audit.head_sha,
    })
    return
  }

  logError(message, {
    base_ref: audit.base_ref,
    elapsed_ms: audit.elapsed_ms,
    head_sha: audit.head_sha,
  })
}

function printAuditFindings(audit) {
  if (audit.verdict === 'pass') {
    return
  }

  printComplexityFindings(logger, audit.complexity?.findings ?? [])
  printDeadCodeFindings(logger, audit.dead_code)
  printDuplicationFindings(logger, audit.duplication)
}

function runAudit(command, prefixArgs, candidate) {
  const args = [
    ...prefixArgs,
    'audit',
    '--format',
    'json',
    '--quiet',
    '--explain',
    '--base',
    candidate.commit,
  ]
  return run(command, args, { stdio: 'pipe' })
}

function runAuditWithFallbacks(command, prefixArgs, candidates) {
  for (const [index, candidate] of candidates.entries()) {
    logInfo('audit_attempt_start', {
      attempt: index + 1,
      base_commit: candidate.commit,
      base_ref: candidate.ref,
      command,
    })
    const result = runAudit(command, prefixArgs, candidate)
    const isLast = index === candidates.length - 1

    if (!isRecoverableBaseRefError(result) || isLast) {
      return result
    }

    logWarn('audit_attempt_retry', {
      attempt: index + 1,
      base_ref: candidate.ref,
      reason: 'recoverable_base_ref_error',
    })
  }

  throw new Error('[hooks][fallow][error] unreachable_no_audit_result')
}

const runner = resolveRunner()

if (!runner) {
  logWarn('audit_skipped', {
    reason: 'missing_fallow_binary',
    resolution: 'Run `pnpm install` or install `fallow` globally.',
  })
  process.exit(0)
}

const baseCandidates = resolveBaseCandidates()

if (baseCandidates.length === 0) {
  logWarn('audit_skipped', {
    reason: 'missing_base_ref',
    resolution: 'Set up `origin/HEAD`, create `main` or `master`, or make another commit.',
  })
  process.exit(0)
}

const [command, prefixArgs] = runner
printRule()
console.log(cyan(bold('  FALLOW AUDIT')))
console.log(gray(`  Base candidates: ${baseCandidates.map((c) => c.ref).join(', ')}`))
printRule()

logInfo('audit_context', {
  base_candidates: baseCandidates.map((candidate) => candidate.ref),
  runner: [command, ...prefixArgs].join(' '),
})
const result = runAuditWithFallbacks(command, prefixArgs, baseCandidates)
const audit = parseJsonResult(result)

if (audit) {
  writeStderr(result)
  printAuditSummary(audit)
  printAuditFindings(audit)
} else {
  logError('audit_parse_failed', {
    reason: 'non_json_output',
    status: result.status,
  })
  writeOutput(result)
}

process.exit(result.status ?? 1)

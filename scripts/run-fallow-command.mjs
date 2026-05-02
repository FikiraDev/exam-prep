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
  printDeadCodeFindings,
  printDuplicationFindings,
  printHealthInsights,
} from './fallow-formatters.mjs'
import { createStructuredLogger } from './log-utils.mjs'

const commandName = process.argv[2]

function logDeadCodeSummary(logger, json) {
  const totalIssues = json.total_issues ?? 0
  logFindingSummary(logger, 'dead_code_summary', totalIssues, {
    total_issues: totalIssues,
    grouped_by: json.grouped_by,
  })
}

function summarizeHealth(logger, json) {
  logger.info('health_summary', buildHealthSummary(json))
  return printHealthInsights(logger, json)
}

function summarizeDuplication(logger, json) {
  const cloneGroupCount = getCloneGroupCount(json)
  logFindingSummary(logger, 'duplication_summary', cloneGroupCount, {
    clone_groups: cloneGroupCount,
    files_with_clones: json.stats?.files_with_clones,
    duplication_percentage: json.stats?.duplication_percentage,
  })
  return printDuplicationFindings(logger, json)
}

function buildHealthSummary(json) {
  return {
    findings: getHealthFindingCount(json),
    files_analyzed: getFilesAnalyzed(json),
    grade: getHealthGrade(json),
    score: getHealthScoreValue(json),
  }
}

function getCloneGroupCount(json) {
  if (json.stats && typeof json.stats.clone_groups === 'number') {
    return json.stats.clone_groups
  }

  if (Array.isArray(json.clone_groups)) {
    return json.clone_groups.length
  }

  return 0
}

function logFindingSummary(logger, eventName, findingCount, details) {
  const level = findingCount > 0 ? 'error' : 'info'
  logger[level](eventName, details)
}

function getHealthFindingCount(json) {
  return json.findings?.length ?? 0
}

function getFilesAnalyzed(json) {
  return json.summary?.files_analyzed
}

function getHealthGrade(json) {
  return json.health_score?.grade
}

function getHealthScoreValue(json) {
  return json.health_score?.score
}

const COMMANDS = {
  'dead-code:web': {
    header: 'FALLOW DEAD CODE',
    description: 'Changed-workspace dead-code scan grouped by package.',
    args: (baseCommit) => [
      'dead-code',
      '--format',
      'json',
      '--quiet',
      '--explain',
      '--changed-workspaces',
      baseCommit,
      '--group-by',
      'package',
    ],
    needsBaseCommit: true,
    summarize: (logger, json) => printDeadCodeFindings(logger, json),
    hasFindings: (json) => (json.total_issues ?? 0) > 0,
  },
  'health:web': {
    header: 'FALLOW HEALTH',
    description: 'Web workspace health score, file scores, and large functions.',
    args: () => [
      'health',
      '--format',
      'json',
      '--quiet',
      '--explain',
      '--workspace',
      'web',
      '--targets',
      '--top',
      '20',
      '--score',
    ],
    needsBaseCommit: false,
    summarize: summarizeHealth,
    hasFindings: (json) => (json.findings?.length ?? 0) > 0,
  },
  'dupes:web': {
    header: 'FALLOW DUPES',
    description: 'Web workspace semantic duplication scan.',
    args: () => [
      'dupes',
      '--format',
      'json',
      '--quiet',
      '--explain',
      '--workspace',
      'web',
      '--mode',
      'semantic',
      '--ignore-imports',
    ],
    needsBaseCommit: false,
    summarize: summarizeDuplication,
    hasFindings: (json) => (json.clone_groups?.length ?? 0) > 0,
  },
}

const selectedCommand = COMMANDS[commandName]

if (!selectedCommand) {
  console.error(
    `Unknown fallow command '${commandName}'. Expected one of: ${Object.keys(COMMANDS).join(', ')}`,
  )
  process.exit(2)
}

const logger = createStructuredLogger(`fallow][${commandName}`)

function resolveBaseCommitOrExit() {
  const candidates = resolveBaseCandidates()

  if (candidates.length === 0) {
    logger.warn('command_skipped', {
      reason: 'missing_base_ref',
      resolution: 'Set up `origin/HEAD`, create `main` or `master`, or make another commit.',
    })
    process.exit(0)
  }

  return candidates
}

function runWithFallbacks(command, prefixArgs, commandConfig, candidates) {
  if (!commandConfig.needsBaseCommit) {
    return run(command, [...prefixArgs, ...commandConfig.args()], { stdio: 'pipe' })
  }

  return runBaseScopedCommand(command, prefixArgs, commandConfig, candidates)
}

function runBaseScopedCommand(command, prefixArgs, commandConfig, candidates) {
  for (const [index, candidate] of candidates.entries()) {
    const attempt = index + 1
    logger.info('command_attempt_start', {
      attempt,
      base_commit: candidate.commit,
      base_ref: candidate.ref,
      command,
    })

    const result = run(command, [...prefixArgs, ...commandConfig.args(candidate.commit)], {
      stdio: 'pipe',
    })
    if (!shouldRetryBaseCandidate(result, index, candidates.length)) {
      return result
    }

    logger.warn('command_attempt_retry', {
      attempt,
      base_ref: candidate.ref,
      reason: 'recoverable_base_ref_error',
    })
  }

  throw new Error(`[fallow][${commandName}][error] unreachable_no_result`)
}

function shouldRetryBaseCandidate(result, index, total) {
  const isLast = index === total - 1
  return isRecoverableBaseRefError(result) && !isLast
}

const runner = resolveRunner()

if (!runner) {
  logger.warn('command_skipped', {
    reason: 'missing_fallow_binary',
    resolution: 'Run `pnpm install` or install `fallow` globally.',
  })
  process.exit(0)
}

const baseCandidates = selectedCommand.needsBaseCommit ? resolveBaseCommitOrExit() : []
const [command, prefixArgs] = runner

printRule()
console.log(cyan(bold(`  ${selectedCommand.header}`)))
console.log(gray(`  ${selectedCommand.description}`))
if (baseCandidates.length > 0) {
  console.log(
    gray(`  Base candidates: ${baseCandidates.map((candidate) => candidate.ref).join(', ')}`),
  )
}
printRule()

logger.info('command_context', {
  base_candidates: baseCandidates.map((candidate) => candidate.ref),
  runner: [command, ...prefixArgs].join(' '),
})

const result = runWithFallbacks(command, prefixArgs, selectedCommand, baseCandidates)
const report = parseJsonResult(result)

if (!report) {
  logger.error('command_parse_failed', {
    reason: 'non_json_output',
    status: result.status,
  })
  writeOutput(result)
  process.exit(result.status ?? 1)
}

writeStderr(result)
if (commandName === 'dead-code:web') {
  logDeadCodeSummary(logger, report)
}
selectedCommand.summarize(logger, report)

if (result.status === 2) {
  process.exit(2)
}

process.exit(selectedCommand.hasFindings(report) ? 1 : 0)

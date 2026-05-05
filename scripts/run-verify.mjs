import { spawn } from 'node:child_process'

import { bold, cyan, green, red, gray, printRule, getStageColor } from './color-utils.mjs'
import { createStructuredLogger, writePrefixedLines } from './log-utils.mjs'

const logger = createStructuredLogger('verify')

const stages = [
  {
    id: 'format',
    description: 'Check repo formatting.',
    command: 'pnpm',
    args: ['run', 'format:check'],
  },
  {
    id: 'typecheck',
    description: 'Type-check Convex and web TypeScript projects.',
    command: 'pnpm',
    args: ['run', 'typecheck'],
  },
  {
    id: 'lint',
    description: 'Run repo lint checks.',
    command: 'pnpm',
    args: ['run', 'lint'],
  },
  {
    id: 'test',
    description: 'Run repo test suites.',
    command: 'pnpm',
    args: ['run', 'test'],
  },
  {
    id: 'fallow:audit',
    description: 'Run changed-scope Fallow audit.',
    command: 'pnpm',
    args: ['run', 'fallow:audit'],
  },
  {
    id: 'fallow:dead-code:web',
    description: 'Run changed-workspace Fallow dead-code scan.',
    command: 'pnpm',
    args: ['run', 'fallow:dead-code:web'],
    parallelGroup: 'fallow:web',
  },
  {
    id: 'fallow:health:web',
    description: 'Run web workspace Fallow health scan.',
    command: 'pnpm',
    args: ['run', 'fallow:health:web'],
    parallelGroup: 'fallow:web',
  },
  {
    id: 'fallow:dupes:web',
    description: 'Run web workspace Fallow duplication scan.',
    command: 'pnpm',
    args: ['run', 'fallow:dupes:web'],
    parallelGroup: 'fallow:web',
  },
]

function buildCommand(stage) {
  return [stage.command, ...stage.args].join(' ')
}

function nowInMs() {
  return Number(process.hrtime.bigint()) / 1_000_000
}

function formatDuration(durationMs) {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`
  }

  if (durationMs < 60_000) {
    return `${(durationMs / 1000).toFixed(2)}s`
  }

  const minutes = Math.floor(durationMs / 60_000)
  const seconds = ((durationMs % 60_000) / 1000).toFixed(2).padStart(5, '0')
  return `${minutes}m ${seconds}s`
}

function runCommand(stage) {
  return new Promise((resolve) => {
    const child = spawn(stage.command, stage.args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'pipe',
    })
    const stdout = []
    const stderr = []

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout.push(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr.push(chunk)
    })
    child.on('error', (error) => {
      resolve({
        error,
        signal: null,
        status: null,
        stderr: stderr.join(''),
        stdout: stdout.join(''),
      })
    })
    child.on('close', (code, signal) => {
      resolve({
        signal,
        status: code,
        stderr: stderr.join(''),
        stdout: stdout.join(''),
      })
    })
  })
}

function printStageOutputs(stage, result) {
  const stageColor = getStageColor(stage.id)
  writePrefixedLines(
    `verify][stage=${stage.id}`,
    'stdout',
    result.stdout ?? '',
    process.stdout,
    stageColor,
  )
  writePrefixedLines(
    `verify][stage=${stage.id}`,
    'stderr',
    result.stderr ?? '',
    process.stderr,
    stageColor,
  )
}

function getStageExitCode(result) {
  return result.status ?? 1
}

function buildStageFailure(stage, result, kind) {
  return {
    durationMs: 0,
    exitCode: getStageExitCode(result),
    kind,
    result,
    stage,
  }
}

function logStageFailure(stage, result) {
  logger.error('stage_spawn_failed', {
    command: buildCommand(stage),
    error: result.error?.message,
    stage: stage.id,
  })
}

function logStageResultFailure(stage, result) {
  logger.error('stage_failed', {
    command: buildCommand(stage),
    exit_code: result.status,
    signal: result.signal,
    stage: stage.id,
  })
}

async function runStage(stage, index, total) {
  const stageColor = getStageColor(stage.id)
  const orderLabel = gray(`[${index + 1}/${total}]`)

  printRule()
  console.log(`${orderLabel} ${stageColor(bold(stage.id))} ${gray(stage.description)}`)
  console.log(`${gray('command:')} ${buildCommand(stage)}`)
  console.log()

  logger.info('stage_start', {
    command: buildCommand(stage),
    description: stage.description,
    order: `${index + 1}/${total}`,
    stage: stage.id,
  })

  const startedAt = nowInMs()
  const result = await runCommand(stage)
  const durationMs = nowInMs() - startedAt
  printStageOutputs(stage, result)

  if (result.error) {
    console.log()
    console.log(
      red(bold(`  ✖ ${stage.id} failed to spawn ${gray(`(${formatDuration(durationMs)})`)}`)),
    )
    logStageFailure(stage, result)
    return { ...buildStageFailure(stage, result, 'spawn'), durationMs }
  }

  if (result.status !== 0) {
    console.log()
    console.log(
      red(
        bold(
          `  ✖ ${stage.id} failed with exit code ${result.status} ${gray(`(${formatDuration(durationMs)})`)}`,
        ),
      ),
    )
    logStageResultFailure(stage, result)
    return { ...buildStageFailure(stage, result, 'result'), durationMs }
  }

  console.log()
  console.log(green(bold(`  ✔ ${stage.id} passed ${gray(`(${formatDuration(durationMs)})`)}`)))

  logger.info('stage_passed', {
    duration_ms: Math.round(durationMs),
    exit_code: result.status ?? 0,
    stage: stage.id,
  })

  return {
    durationMs,
    exitCode: 0,
    kind: 'passed',
    result,
    stage,
  }
}

async function runSequentialStages(queue, results = []) {
  const [nextStage, ...remainingStages] = queue
  if (!nextStage) {
    return results
  }

  return await runSequentialStages(remainingStages, [
    ...results,
    await runStage(nextStage.stage, nextStage.index, stages.length),
  ])
}

async function runStages() {
  const indexedStages = stages.map((stage, index) => ({ index, stage }))
  const sequentialQueue = indexedStages.filter(({ stage }) => stage.parallelGroup !== 'fallow:web')
  const parallelQueue = indexedStages.filter(({ stage }) => stage.parallelGroup === 'fallow:web')

  const results = await runSequentialStages(sequentialQueue)

  if (parallelQueue.length > 0) {
    const parallelResults = await Promise.all(
      parallelQueue.map(({ index, stage }) => runStage(stage, index, stages.length)),
    )
    results.push(...parallelResults)
  }

  return results
}

function printFinalSummary(results, totalDurationMs) {
  const failures = results.filter((result) => result.exitCode !== 0)

  printRule(70)

  if (failures.length === 0) {
    return printPassedSummary(results.length, totalDurationMs, results)
  }

  printFailedSummary(results, failures.length, totalDurationMs)
}

function printPassedSummary(stageCount, totalDurationMs, results) {
  console.log(green(bold('  ✔ ALL STAGES PASSED')))
  console.log(gray(`  ${stageCount} verification stages completed successfully.`))
  console.log()
  for (const result of results) {
    console.log(formatStageResultLine(result))
  }
  console.log()
  console.log(gray(`  Total time: ${formatDuration(totalDurationMs)}`))
  printRule(70)
}

function printFailedSummary(results, failureCount, totalDurationMs) {
  console.log(red(bold('  ✖ VERIFY FAILED')))
  console.log(gray(`  Completed ${results.length} stages with ${failureCount} failure(s).`))
  console.log()

  for (const result of results) {
    console.log(formatStageResultLine(result))
  }

  console.log()
  console.log(gray(`  Total time: ${formatDuration(totalDurationMs)}`))
  printRule(70)
}

function formatStageResultLine(result) {
  const symbol = result.exitCode === 0 ? green('  ✔') : red('  ✖')
  const detail =
    result.exitCode === 0 ? gray('passed') : gray(`failed with exit code ${result.exitCode}`)
  const duration = gray(`(${formatDuration(result.durationMs)})`)

  return `${symbol} ${result.stage.id} ${detail} ${duration}`
}

printRule(70)
console.log(cyan(bold('  VERIFY')))
console.log(gray(`  Running ${stages.length} verification stages...`))
printRule(70)

logger.info('verify_start', {
  stages: stages.map((stage) => stage.id),
})

const verifyStartedAt = nowInMs()
const results = await runStages()
const totalDurationMs = nowInMs() - verifyStartedAt
const failures = results.filter((result) => result.exitCode !== 0)

printFinalSummary(results, totalDurationMs)

if (failures.length === 0) {
  logger.info('verify_passed', {
    duration_ms: Math.round(totalDurationMs),
    stage_count: stages.length,
  })
  process.exit(0)
}

const exitCode = failures[0]?.exitCode ?? 1

logger.error('verify_failed', {
  duration_ms: Math.round(totalDurationMs),
  exit_code: exitCode,
  failed_stages: failures.map((result) => result.stage.id),
  stage_count: stages.length,
})

process.exit(exitCode)

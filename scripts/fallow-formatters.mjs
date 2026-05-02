import { truncateText } from './fallow-core.mjs'

function summarizeActions(logger, event, baseDetails, actions, maxActions = 2) {
  for (const action of actions.slice(0, maxActions)) {
    logger.info(event, {
      ...baseDetails,
      action_type: action.type,
      auto_fixable: action.auto_fixable,
      description: truncateText(action.description),
      note: truncateText(action.note),
      comment: action.comment,
      placement: action.placement,
    })
  }
}

function buildDeadCodeEntries(deadCode, packageKey = null) {
  return Object.entries(deadCode ?? {})
    .filter(([, issues]) => Array.isArray(issues) && issues.length > 0)
    .map(([issueType, issues]) => ({
      issueType,
      issues,
      packageKey,
    }))
}

function getIssueSymbol(issue) {
  const candidates = [
    issue.export_name,
    issue.name,
    issue.dependency,
    issue.package,
    issue.member_name,
  ]

  for (const value of candidates) {
    if (value !== undefined && value !== null) {
      return value
    }
  }

  return undefined
}

function flattenDeadCodeEntries(deadCode) {
  const categories = Array.isArray(deadCode?.groups)
    ? deadCode.groups.flatMap((group) => buildDeadCodeEntries(group, group.key))
    : buildDeadCodeEntries(deadCode)

  return categories.flatMap((entry) =>
    entry.issues.map((issue) => ({
      issue,
      issueType: entry.issueType,
      packageKey: entry.packageKey,
    })),
  )
}

function logDeadCodeIssue(logger, entry) {
  const symbol = getIssueSymbol(entry.issue)

  logger.error('dead_code_issue', {
    package: entry.packageKey,
    issue_type: entry.issueType,
    path: entry.issue.path,
    symbol,
    line: entry.issue.line ?? entry.issue.start_line,
    col: entry.issue.col ?? entry.issue.start_col,
    is_type_only: entry.issue.is_type_only,
    is_re_export: entry.issue.is_re_export,
    severity: entry.issue.severity,
  })

  summarizeActions(
    logger,
    'dead_code_action',
    {
      package: entry.packageKey,
      issue_type: entry.issueType,
      path: entry.issue.path,
      symbol,
    },
    entry.issue.actions ?? [],
  )
}

export function printDeadCodeFindings(logger, deadCode) {
  const groupedEntries = flattenDeadCodeEntries(deadCode)

  if (groupedEntries.length === 0) {
    return 0
  }

  let count = 0
  logger.error('dead_code_findings_start', { categories: groupedEntries.length })

  for (const entry of groupedEntries) {
    count += 1
    logDeadCodeIssue(logger, entry)
  }

  return count
}

export function printComplexityFindings(logger, findings) {
  if (findings.length === 0) {
    return 0
  }

  logger.error('complexity_findings_start', { count: findings.length })

  for (const finding of findings) {
    logger.error('complexity_finding', {
      path: finding.path,
      symbol: finding.name,
      line: finding.line,
      severity: finding.severity,
      exceeded: finding.exceeded,
      cyclomatic: finding.cyclomatic,
      cognitive: finding.cognitive,
      crap: finding.crap,
      coverage_tier: finding.coverage_tier,
      introduced: finding.introduced,
    })

    summarizeActions(
      logger,
      'complexity_action',
      {
        path: finding.path,
        symbol: finding.name,
      },
      finding.actions ?? [],
    )
  }

  return findings.length
}

export function printDuplicationFindings(logger, duplication) {
  const cloneGroups = duplication?.clone_groups ?? []
  if (cloneGroups.length === 0) {
    return 0
  }

  logger.error('duplication_findings_start', { count: cloneGroups.length })

  cloneGroups.forEach((group, index) => printDuplicationGroup(logger, group, index + 1))

  return cloneGroups.length
}

function printDuplicationGroup(logger, group, groupNumber) {
  const instances = getDuplicationInstances(group)

  logger.error('duplication_group', {
    group: groupNumber,
    instances: instances.length,
    line_count: group.line_count,
    token_count: group.token_count,
  })

  for (const instance of instances) {
    logger.error('duplication_instance', {
      group: groupNumber,
      path: instance.file,
      start_line: instance.start_line,
      end_line: instance.end_line,
      start_col: instance.start_col,
      end_col: instance.end_col,
    })
  }

  summarizeActions(
    logger,
    'duplication_action',
    { group: groupNumber },
    getDuplicationActions(group),
  )
}

function getDuplicationInstances(group) {
  return group.instances ?? []
}

function getDuplicationActions(group) {
  return group.actions ?? []
}

function printHealthScore(logger, health) {
  if (!health?.health_score) {
    return
  }

  logger.info('health_score', {
    score: health.health_score.score,
    grade: health.health_score.grade,
  })
}

function printHealthFileScores(logger, fileScores) {
  if (fileScores.length === 0) {
    return
  }

  logger.info('health_file_scores_start', { count: fileScores.length })

  for (const file of fileScores.slice(0, 5)) {
    logger.info('health_file_score', {
      path: file.path,
      maintainability_index: file.maintainability_index,
      dead_code_ratio: file.dead_code_ratio,
      fan_in: file.fan_in,
      fan_out: file.fan_out,
      crap_max: file.crap_max,
      crap_above_threshold: file.crap_above_threshold,
      total_cyclomatic: file.total_cyclomatic,
      lines: file.lines,
    })
  }
}

function printLargeFunctions(logger, largeFunctions) {
  if (largeFunctions.length === 0) {
    return
  }

  logger.info('health_large_functions_start', { count: largeFunctions.length })

  for (const finding of largeFunctions.slice(0, 10)) {
    logger.info('health_large_function', {
      path: finding.path,
      symbol: finding.name,
      line: finding.line,
      line_count: finding.line_count,
    })
  }
}

export function printHealthInsights(logger, health) {
  const findings = getHealthFindings(health)
  const fileScores = getHealthFileScores(health)
  const largeFunctions = getHealthLargeFunctions(health)

  printComplexityFindings(logger, findings)
  printHealthScore(logger, health)
  printHealthFileScores(logger, fileScores)
  printLargeFunctions(logger, largeFunctions)

  return findings.length
}

function getHealthFindings(health) {
  return health?.findings ?? []
}

function getHealthFileScores(health) {
  return health?.file_scores ?? []
}

function getHealthLargeFunctions(health) {
  return health?.large_functions ?? []
}

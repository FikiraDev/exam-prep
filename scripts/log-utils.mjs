import { color, red, yellow, cyan } from './color-utils.mjs'

/**
 * Color map for log levels.
 * Keeps the structured format intact while adding visual cues.
 */
const LEVEL_COLORS = {
  error: red,
  warn: yellow,
  info: cyan,
}

/**
 * Create a structured logger with optional colored output.
 * The underlying `[scope][level] event key=value` format is preserved
 * for machine/AI parsing. Colors are applied only to the bracket tags.
 *
 * @param {string} scope
 * @returns {{error: Function, info: Function, warn: Function}}
 */
export function createStructuredLogger(scope) {
  return {
    error: (event, details) => {
      writeStructuredLog(scope, 'error', event, details)
    },
    info: (event, details) => {
      writeStructuredLog(scope, 'info', event, details)
    },
    warn: (event, details) => {
      writeStructuredLog(scope, 'warn', event, details)
    },
  }
}

/**
 * Write prefixed lines from child process output.
 * Optionally colors the prefix for visual tracing.
 *
 * @param {string} prefix
 * @param {string} streamName
 * @param {string} content
 * @param {NodeJS.WriteStream} target
 * @param {(text: string) => string} [prefixColor] - Optional colorizer for the prefix
 */
export function writePrefixedLines(prefix, streamName, content, target, prefixColor) {
  const trimmed = content.trimEnd()
  if (!trimmed) {
    return
  }

  const tag = prefixColor ? prefixColor(`[${prefix}][${streamName}]`) : `[${prefix}][${streamName}]`

  for (const line of trimmed.split(/\r?\n/)) {
    target.write(`${tag} ${line}\n`)
  }
}

/**
 * Build a key=value suffix string from a details object.
 * @param {Record<string, unknown>} details
 * @returns {string}
 */
function buildSuffix(details) {
  const entries = Object.entries(details).filter(
    ([, value]) => value !== undefined && value !== null,
  )
  if (entries.length === 0) {
    return ''
  }
  return ` ${entries.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(' ')}`
}

/**
 * Build colored scope and level tags.
 * @param {string} scope
 * @param {string} level
 * @returns {{ scopeTag: string, levelTag: string }}
 */
function buildTags(scope, level) {
  const colorizer = LEVEL_COLORS[level] ?? ((t) => t)
  return {
    scopeTag: color(`[${scope}]`, 'dim'),
    levelTag: colorizer(`[${level}]`),
  }
}

function writeStructuredLog(scope, level, event, details = {}) {
  const suffix = buildSuffix(details)
  const { scopeTag, levelTag } = buildTags(scope, level)

  const line = `${scopeTag}${levelTag} ${event}${suffix}\n`
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout
  stream.write(line)
}

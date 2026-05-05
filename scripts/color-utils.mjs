/**
 * Zero-dependency ANSI color utilities with automatic TTY/env detection.
 *
 * Respects standard conventions:
 * - NO_COLOR (non-empty) → disables colors
 * - FORCE_COLOR (0/1/2/3) → forces color level
 * - TERM=dumb → disables colors
 * - Non-TTY stdout → disables colors
 */

import { styleText } from 'node:util'

/**
 * Check if NO_COLOR is set (non-empty value disables colors).
 * @returns {boolean}
 */
function noColorRequested() {
  const noColor = process.env.NO_COLOR
  return noColor !== undefined && noColor !== ''
}

/**
 * Check if FORCE_COLOR requests explicit enable/disable.
 * @returns {boolean | null} true=force on, false=force off, null=not set
 */
function readForceColor() {
  const forceColor = process.env.FORCE_COLOR
  if (forceColor === undefined) {
    return null
  }
  return forceColor !== '0'
}

/** @type {boolean} */
const isColorEnabled = (() => {
  if (noColorRequested()) {
    return false
  }

  const forced = readForceColor()
  if (forced !== null) {
    return forced
  }

  if (process.env.TERM === 'dumb') {
    return false
  }

  return process.stdout.isTTY === true
})()

/**
 * Apply ANSI color/formatting to text.
 * Returns plain text if colors are disabled.
 *
 * @param {string} text
 * @param {string | string[]} format - Single format or array for combined styles
 * @returns {string}
 */
export function color(text, format) {
  if (!isColorEnabled) {
    return text
  }
  return styleText(format, text)
}

/**
 * Make text bold.
 * @param {string} text
 * @returns {string}
 */
export function bold(text) {
  return color(text, 'bold')
}

/**
 * @internal
 * Make text dim/low-intensity.
 * @param {string} text
 * @returns {string}
 */
function dim(text) {
  return color(text, 'dim')
}

/**
 * Color text red (errors, failures).
 * @param {string} text
 * @returns {string}
 */
export function red(text) {
  return color(text, 'red')
}

/**
 * Color text green (success, pass).
 * @param {string} text
 * @returns {string}
 */
export function green(text) {
  return color(text, 'green')
}

/**
 * Color text yellow (warnings, lint).
 * @param {string} text
 * @returns {string}
 */
export function yellow(text) {
  return color(text, 'yellow')
}

/**
 * @internal
 * Color text blue (info, typecheck).
 * @param {string} text
 * @returns {string}
 */
function blue(text) {
  return color(text, 'blue')
}

/**
 * Color text cyan (format, headers).
 * @param {string} text
 * @returns {string}
 */
export function cyan(text) {
  return color(text, 'cyan')
}

/**
 * @internal
 * Color text magenta (fallow, special).
 * @param {string} text
 * @returns {string}
 */
function magenta(text) {
  return color(text, 'magenta')
}

/**
 * Color text gray (muted, dim details).
 * @param {string} text
 * @returns {string}
 */
export function gray(text) {
  return color(text, 'gray')
}

/**
 * @internal
 * Color text white (default).
 * @param {string} text
 * @returns {string}
 */
function white(text) {
  return color(text, 'white')
}

/**
 * A fixed palette of distinct colors for stages/tools.
 * Ensures each stage gets a consistent, recognizable color.
 */
const stageColors = {
  format: cyan,
  typecheck: blue,
  lint: yellow,
  test: green,
  fallow: magenta,
}

/**
 * Get the colorizer function for a given stage ID.
 * Falls back to white if unknown.
 * @param {string} stageId
 * @returns {(text: string) => string}
 */
export function getStageColor(stageId) {
  if (stageId.startsWith('fallow')) {
    return magenta
  }

  return stageColors[stageId] ?? white
}

/**
 * Print a horizontal rule (separator line).
 * @param {number} [width=60]
 */
export function printRule(width = 60) {
  if (!isColorEnabled) {
    console.log('─'.repeat(width))
    return
  }
  console.log(dim('─'.repeat(width)))
}

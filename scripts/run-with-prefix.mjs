import { spawn } from 'node:child_process'

import { cyan } from './color-utils.mjs'

const [, , prefix, command, ...args] = process.argv

if (!prefix || !command) {
  console.error('Usage: node run-with-prefix.mjs <prefix> <command> [...args]')
  process.exit(1)
}

const coloredPrefix = cyan(prefix)

const child = spawn(command, args, {
  detached: process.platform !== 'win32',
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
})

function killChild(signal) {
  try {
    if (process.platform !== 'win32') {
      process.kill(-child.pid, signal)
      return
    }

    child.kill(signal)
  } catch {
    // The child already exited.
  }
}

function pipeWithPrefix(stream, target) {
  let buffer = ''

  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    buffer += chunk

    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      target.write(`${coloredPrefix} ${line}\n`)
    }
  })

  stream.on('end', () => {
    if (buffer.length > 0) {
      target.write(`${coloredPrefix} ${buffer}\n`)
    }
  })
}

pipeWithPrefix(child.stdout, process.stdout)
pipeWithPrefix(child.stderr, process.stderr)

const signalHandlers = new Map()
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  const handler = () => {
    killChild(signal)
  }
  signalHandlers.set(signal, handler)
  process.on(signal, handler)
}

child.on('error', (error) => {
  console.error(`${coloredPrefix} ${error.message}`)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  for (const [name, handler] of signalHandlers) {
    process.off(name, handler)
  }

  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})

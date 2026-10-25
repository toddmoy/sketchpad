import { app } from 'electron'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Plain-text log at ~/Library/Logs/tldraw-menubar/main.log
const dir = app.getPath('logs')
mkdirSync(dir, { recursive: true })
export const logFile = join(dir, 'main.log')

export function log(level: 'info' | 'warn' | 'error', ...parts: unknown[]) {
  const text = parts
    .map((p) => (p instanceof Error ? (p.stack ?? p.message) : typeof p === 'string' ? p : JSON.stringify(p)))
    .join(' ')
  const line = `${new Date().toISOString()} [${level}] ${text}\n`
  try {
    appendFileSync(logFile, line)
  } catch {}
  ;(level === 'error' ? console.error : console.log)(line.trimEnd())
}

process.on('uncaughtException', (err) => log('error', 'uncaughtException', err))
process.on('unhandledRejection', (err) => log('error', 'unhandledRejection', err))

import type { MonitorEvent, NotificationPayload, BotConfig, LogLevel } from './types.js'

// ─── ANSI Colors ────────────────────────────────────────────────────────────

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const

const SEVERITY_COLORS: Record<string, string> = {
  info: COLORS.cyan,
  warn: COLORS.yellow,
  alert: COLORS.magenta,
  critical: COLORS.red,
}

const SEVERITY_ICONS: Record<string, string> = {
  info: '[i]',
  warn: '[!]',
  alert: '[*]',
  critical: '[X]',
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// ─── Notification Dispatcher ────────────────────────────────────────────────

export class NotificationDispatcher {
  private readonly config: BotConfig
  private readonly botVersion = '0.1.0'

  constructor(config: BotConfig) {
    this.config = config
  }

  async dispatch(event: MonitorEvent): Promise<void> {
    // Always log to console
    this.logToConsole(event)

    // Send to webhook if configured
    if (this.config.webhookUrl) {
      await this.sendWebhook(event)
    }

    // Store in Supabase if configured
    if (this.config.supabaseUrl && this.config.supabaseKey) {
      await this.storeInSupabase(event)
    }
  }

  // ── Console Output ──────────────────────────────────────────────────────

  private logToConsole(event: MonitorEvent): void {
    const severityColor = SEVERITY_COLORS[event.severity] ?? COLORS.white
    const icon = SEVERITY_ICONS[event.severity] ?? '[?]'
    const time = new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false })

    const header = [
      `${COLORS.dim}${time}${COLORS.reset}`,
      `${severityColor}${COLORS.bold}${icon}${COLORS.reset}`,
      `${severityColor}${event.type}${COLORS.reset}`,
    ].join(' ')

    console.log(`${header} ${COLORS.white}${event.message}${COLORS.reset}`)

    // Log data details at debug level
    if (this.shouldLog('debug') && Object.keys(event.data).length > 0) {
      const dataStr = JSON.stringify(event.data, null, 2)
      console.log(`${COLORS.dim}  ${dataStr}${COLORS.reset}`)
    }
  }

  // ── Webhook ─────────────────────────────────────────────────────────────

  private async sendWebhook(event: MonitorEvent): Promise<void> {
    const payload: NotificationPayload = {
      event,
      botVersion: this.botVersion,
      programId: this.config.programId,
    }

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5_000),
      })

      if (!response.ok) {
        this.logInternal('warn', `Webhook returned ${response.status}: ${response.statusText}`)
      }
    } catch (err) {
      this.logInternal('warn', `Webhook delivery failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── Supabase Storage ────────────────────────────────────────────────────

  private async storeInSupabase(event: MonitorEvent): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.supabaseUrl}/rest/v1/bot_events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.supabaseKey,
            'Authorization': `Bearer ${this.config.supabaseKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            event_type: event.type,
            severity: event.severity,
            block_height: event.blockHeight,
            message: event.message,
            data: event.data,
            created_at: event.timestamp,
          }),
          signal: AbortSignal.timeout(5_000),
        }
      )

      if (!response.ok) {
        this.logInternal('warn', `Supabase insert failed: ${response.status}`)
      }
    } catch (err) {
      this.logInternal('warn', `Supabase storage failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── Utilities ───────────────────────────────────────────────────────────

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.logLevel]
  }

  private logInternal(level: LogLevel, message: string): void {
    if (!this.shouldLog(level)) return
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    const color = level === 'warn' ? COLORS.yellow : level === 'error' ? COLORS.red : COLORS.dim
    console.log(`${COLORS.dim}${time}${COLORS.reset} ${color}[bot] ${message}${COLORS.reset}`)
  }
}

// ─── Standalone Logger ──────────────────────────────────────────────────────

export function logBanner(programId: string, pollInterval: number, creatorCount: number): void {
  console.log('')
  console.log(`${COLORS.magenta}${COLORS.bold}  VeilSub Monitor Bot v0.1.0${COLORS.reset}`)
  console.log(`${COLORS.dim}  ─────────────────────────────────${COLORS.reset}`)
  console.log(`${COLORS.cyan}  Program:   ${COLORS.white}${programId}${COLORS.reset}`)
  console.log(`${COLORS.cyan}  Network:   ${COLORS.white}Aleo Testnet${COLORS.reset}`)
  console.log(`${COLORS.cyan}  Polling:   ${COLORS.white}every ${pollInterval / 1000}s${COLORS.reset}`)
  console.log(`${COLORS.cyan}  Creators:  ${COLORS.white}${creatorCount} tracked${COLORS.reset}`)
  console.log(`${COLORS.dim}  ─────────────────────────────────${COLORS.reset}`)
  console.log('')
}

export function logInfo(message: string): void {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false })
  console.log(`${COLORS.dim}${time}${COLORS.reset} ${COLORS.cyan}[i]${COLORS.reset} ${message}`)
}

export function logError(message: string): void {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false })
  console.log(`${COLORS.dim}${time}${COLORS.reset} ${COLORS.red}[X]${COLORS.reset} ${message}`)
}

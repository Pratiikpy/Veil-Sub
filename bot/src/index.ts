import { buildConfig } from './config.js'
import { SubscriptionMonitor } from './monitor.js'
import { logBanner, logInfo, logError } from './notifications.js'

// ─── Main Entry Point ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  const config = buildConfig()

  logBanner(
    config.programId,
    config.pollIntervalMs,
    config.trackedCreators.length
  )

  // Log integrations
  if (config.webhookUrl) {
    logInfo(`Webhook: ${config.webhookUrl.substring(0, 40)}...`)
  } else {
    logInfo('Webhook: not configured (console-only mode)')
  }

  if (config.supabaseUrl) {
    logInfo('Supabase: connected for event storage')
  }

  logInfo(`Log level: ${config.logLevel}`)
  logInfo('')

  // Start the monitor
  const monitor = new SubscriptionMonitor(config)

  // Graceful shutdown handlers
  const shutdown = (): void => {
    logInfo('Shutting down gracefully...')
    monitor.stop()
    // Give a moment for final events to dispatch
    setTimeout(() => process.exit(0), 500)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Handle uncaught errors without crashing
  process.on('uncaughtException', (err) => {
    logError(`Uncaught exception: ${err.message}`)
    // Don't crash — the bot should keep running
  })

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason)
    logError(`Unhandled rejection: ${message}`)
    // Don't crash — the bot should keep running
  })

  await monitor.start()

  logInfo('Monitor running. Press Ctrl+C to stop.')
}

// ─── Run ────────────────────────────────────────────────────────────────────

main().catch((err) => {
  logError(`Fatal error: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})

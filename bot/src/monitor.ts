import { AleoClient } from './aleo-client.js'
import { NotificationDispatcher, logInfo, logError } from './notifications.js'
import { MAPPINGS } from './config.js'
import type {
  BotConfig,
  MonitorEvent,
  CreatorSnapshot,
  PlatformSnapshot,
  EventType,
  EventSeverity,
} from './types.js'

// ─── Subscription Monitor ───────────────────────────────────────────────────

export class SubscriptionMonitor {
  private readonly config: BotConfig
  private readonly client: AleoClient
  private readonly dispatcher: NotificationDispatcher

  // State tracking — previous poll snapshots
  private creatorSnapshots: Map<string, CreatorSnapshot> = new Map()
  private platformSnapshot: PlatformSnapshot = { totalCreators: 0, totalContent: 0, blockHeight: 0 }
  private isFirstPoll = true

  // Lifecycle
  private running = false
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private pollCount = 0

  constructor(config: BotConfig) {
    this.config = config
    this.client = new AleoClient(config.apiUrl, config.programId)
    this.dispatcher = new NotificationDispatcher(config)
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  async start(): Promise<void> {
    this.running = true

    // Emit startup event
    await this.emit({
      type: 'bot_started',
      severity: 'info',
      blockHeight: 0,
      data: {
        programId: this.config.programId,
        trackedCreators: this.config.trackedCreators.length,
        pollInterval: this.config.pollIntervalMs,
      },
      message: `Monitor started for ${this.config.programId}`,
    })

    // Initial poll to seed state
    logInfo('Running initial state snapshot...')
    await this.poll()
    this.isFirstPoll = false

    // Start polling loop
    this.scheduleNextPoll()
  }

  stop(): void {
    this.running = false
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }

    this.emit({
      type: 'bot_stopped',
      severity: 'info',
      blockHeight: this.platformSnapshot.blockHeight,
      data: { totalPolls: this.pollCount },
      message: `Monitor stopped after ${this.pollCount} polls`,
    }).catch(() => {
      // Best-effort on shutdown
    })
  }

  // ── Poll Loop ─────────────────────────────────────────────────────────

  private scheduleNextPoll(): void {
    if (!this.running) return
    this.pollTimer = setTimeout(async () => {
      await this.poll()
      this.scheduleNextPoll()
    }, this.config.pollIntervalMs)
  }

  private async poll(): Promise<void> {
    this.pollCount++
    const pollStart = Date.now()

    try {
      // 1. Get current block height
      const blockHeight = await this.client.getLatestBlockHeight()

      // 2. Poll platform stats
      await this.pollPlatformStats(blockHeight)

      // 3. Poll each tracked creator
      for (const creator of this.config.trackedCreators) {
        await this.pollCreator(creator, blockHeight)
      }

      const elapsed = Date.now() - pollStart
      if (this.config.logLevel === 'debug') {
        logInfo(`Poll #${this.pollCount} complete in ${elapsed}ms (block ${blockHeight})`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logError(`Poll #${this.pollCount} failed: ${message}`)

      await this.emit({
        type: 'poll_error',
        severity: 'warn',
        blockHeight: this.platformSnapshot.blockHeight,
        data: { error: message, pollCount: this.pollCount },
        message: `Poll failed: ${message}`,
      })
    }
  }

  // ── Platform Stats ────────────────────────────────────────────────────

  private async pollPlatformStats(blockHeight: number): Promise<void> {
    const [rawCreators, rawContent] = await Promise.all([
      this.client.getMappingValue(MAPPINGS.TOTAL_CREATORS, '0u8'),
      this.client.getMappingValue(MAPPINGS.TOTAL_CONTENT, '0u8'),
    ])

    const totalCreators = AleoClient.parseLeoU64(rawCreators)
    const totalContent = AleoClient.parseLeoU64(rawContent)

    const prev = this.platformSnapshot
    const changed = totalCreators !== prev.totalCreators || totalContent !== prev.totalContent

    if (changed && !this.isFirstPoll) {
      const parts: string[] = []
      if (totalCreators !== prev.totalCreators) {
        const delta = totalCreators - prev.totalCreators
        parts.push(`creators ${prev.totalCreators} -> ${totalCreators} (${delta > 0 ? '+' : ''}${delta})`)
      }
      if (totalContent !== prev.totalContent) {
        const delta = totalContent - prev.totalContent
        parts.push(`content ${prev.totalContent} -> ${totalContent} (${delta > 0 ? '+' : ''}${delta})`)
      }

      await this.emit({
        type: 'platform_stats',
        severity: 'info',
        blockHeight,
        data: { totalCreators, totalContent, prevCreators: prev.totalCreators, prevContent: prev.totalContent },
        message: `Platform update: ${parts.join(', ')}`,
      })
    }

    this.platformSnapshot = { totalCreators, totalContent, blockHeight }
  }

  // ── Creator Polling ───────────────────────────────────────────────────

  private async pollCreator(
    creator: { readonly address: string; readonly hash: string; readonly label: string },
    blockHeight: number
  ): Promise<void> {
    // Query all creator mappings
    const [rawSubCount, rawRevenue, rawContentCount, rawTierCount] = await Promise.all([
      this.client.getMappingValue(MAPPINGS.SUBSCRIBER_COUNT, creator.hash),
      this.client.getMappingValue(MAPPINGS.TOTAL_REVENUE, creator.hash),
      this.client.getMappingValue(MAPPINGS.CONTENT_COUNT, creator.hash),
      this.client.getMappingValue(MAPPINGS.TIER_COUNT, creator.hash),
    ])

    const current: CreatorSnapshot = {
      creatorHash: creator.hash,
      address: creator.address,
      label: creator.label,
      subscriberCount: AleoClient.parseLeoU64(rawSubCount),
      totalRevenue: AleoClient.parseLeoU64(rawRevenue),
      contentCount: AleoClient.parseLeoU64(rawContentCount),
      tierCount: AleoClient.parseLeoU64(rawTierCount),
    }

    const prev = this.creatorSnapshots.get(creator.hash)

    if (prev && !this.isFirstPoll) {
      // Check subscriber count changes
      if (current.subscriberCount !== prev.subscriberCount) {
        const delta = current.subscriberCount - prev.subscriberCount
        const direction = delta > 0 ? 'gained' : 'lost'
        await this.emit({
          type: 'subscriber_change',
          severity: delta > 0 ? 'info' : 'warn',
          blockHeight,
          data: {
            creator: creator.label,
            address: creator.address,
            previous: prev.subscriberCount,
            current: current.subscriberCount,
            delta,
          },
          message: `${creator.label} ${direction} ${Math.abs(delta)} subscriber(s): ${prev.subscriberCount} -> ${current.subscriberCount}`,
        })
      }

      // Check revenue changes
      if (current.totalRevenue !== prev.totalRevenue) {
        const delta = current.totalRevenue - prev.totalRevenue
        const aleoAmount = (delta / 1_000_000).toFixed(2)
        await this.emit({
          type: 'revenue_change',
          severity: 'info',
          blockHeight,
          data: {
            creator: creator.label,
            address: creator.address,
            previousRevenue: prev.totalRevenue,
            currentRevenue: current.totalRevenue,
            deltaMicrocredits: delta,
            deltaAleo: aleoAmount,
          },
          message: `${creator.label} received ${aleoAmount} ALEO in revenue (total: ${(current.totalRevenue / 1_000_000).toFixed(2)} ALEO)`,
        })
      }

      // Check content count changes
      if (current.contentCount !== prev.contentCount) {
        const delta = current.contentCount - prev.contentCount
        if (delta > 0) {
          await this.emit({
            type: 'content_published',
            severity: 'info',
            blockHeight,
            data: {
              creator: creator.label,
              address: creator.address,
              previousCount: prev.contentCount,
              currentCount: current.contentCount,
              newPieces: delta,
            },
            message: `${creator.label} published ${delta} new content piece(s) (total: ${current.contentCount})`,
          })
        }
      }
    }

    // Update snapshot
    this.creatorSnapshots.set(creator.hash, current)

    // Log initial state on first poll
    if (this.isFirstPoll && (current.subscriberCount > 0 || current.totalRevenue > 0)) {
      logInfo(
        `  ${creator.label}: ${current.subscriberCount} subs, ` +
        `${(current.totalRevenue / 1_000_000).toFixed(2)} ALEO rev, ` +
        `${current.contentCount} content, ${current.tierCount} tiers`
      )
    }
  }

  // ── Event Emission ────────────────────────────────────────────────────

  private async emit(
    partial: {
      type: EventType
      severity: EventSeverity
      blockHeight: number
      data: Record<string, unknown>
      message: string
    }
  ): Promise<void> {
    const event: MonitorEvent = {
      ...partial,
      timestamp: new Date().toISOString(),
    }
    await this.dispatcher.dispatch(event)
  }
}

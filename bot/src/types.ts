// ─── Event Types ────────────────────────────────────────────────────────────

export type EventType =
  | 'subscriber_change'
  | 'revenue_change'
  | 'dispute_filed'
  | 'expiry_warning'
  | 'platform_stats'
  | 'content_published'
  | 'creator_registered'
  | 'bot_started'
  | 'bot_stopped'
  | 'poll_error'

export type EventSeverity = 'info' | 'warn' | 'alert' | 'critical'

export interface MonitorEvent {
  readonly type: EventType
  readonly severity: EventSeverity
  readonly timestamp: string
  readonly blockHeight: number
  readonly data: Readonly<Record<string, unknown>>
  readonly message: string
}

// ─── Mapping Snapshots ──────────────────────────────────────────────────────

export interface CreatorSnapshot {
  readonly creatorHash: string
  readonly address: string
  readonly label: string
  readonly subscriberCount: number
  readonly totalRevenue: number
  readonly contentCount: number
  readonly tierCount: number
}

export interface PlatformSnapshot {
  readonly totalCreators: number
  readonly totalContent: number
  readonly blockHeight: number
}

// ─── Tracked State ──────────────────────────────────────────────────────────

export interface TrackedSubscription {
  readonly passId: string
  readonly creatorHash: string
  readonly expiryBlock: number
  readonly subscriberLabel: string
}

// ─── Configuration ──────────────────────────────────────────────────────────

export interface BotConfig {
  readonly programId: string
  readonly apiUrl: string
  readonly pollIntervalMs: number
  readonly webhookUrl: string
  readonly supabaseUrl: string
  readonly supabaseKey: string
  readonly logLevel: LogLevel
  readonly trackedCreators: ReadonlyArray<{
    readonly address: string
    readonly hash: string
    readonly label: string
  }>
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// ─── API Response Types ─────────────────────────────────────────────────────

export type MappingValue = string | null

export interface NotificationPayload {
  readonly event: MonitorEvent
  readonly botVersion: string
  readonly programId: string
}

# @veilsub/monitor-bot

Autonomous subscription monitoring daemon for VeilSub on Aleo.

Polls on-chain state every 30 seconds and emits structured events when changes are detected. Inspired by ZKPerp's autonomous bot architecture — a key Tech score differentiator for the Aleo Privacy Buildathon.

## Features

- Real-time monitoring of subscriber counts, revenue, content, and disputes
- Tracks 5 known creators with Poseidon2 hash resolution
- Platform-wide statistics (total creators, total content)
- Webhook notifications (POST JSON to any endpoint)
- Optional Supabase event storage for persistent history
- Configurable polling interval and log level
- Graceful shutdown (SIGINT/SIGTERM)
- Exponential backoff on API failures
- Rate-limited API calls (8 req/s, under Provable's 10/s limit)
- TypeScript strict mode, zero runtime dependencies beyond node-fetch

## Quick Start

```bash
cd bot
npm install
npm run build
npm start
```

For development with hot-reload:
```bash
npm run dev
```

## Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `PROGRAM_ID` | `veilsub_v29.aleo` | On-chain program to monitor |
| `API_URL` | `https://api.explorer.provable.com/v1/testnet` | Aleo API endpoint |
| `POLL_INTERVAL_MS` | `30000` | Polling interval in milliseconds |
| `WEBHOOK_URL` | _(empty)_ | Webhook endpoint for event delivery |
| `SUPABASE_URL` | _(empty)_ | Supabase project URL for event storage |
| `SUPABASE_KEY` | _(empty)_ | Supabase service role key |
| `LOG_LEVEL` | `info` | Log verbosity: debug, info, warn, error |

## Events

| Event Type | Severity | Trigger |
|------------|----------|---------|
| `subscriber_change` | info/warn | Creator subscriber count changes |
| `revenue_change` | info | Creator revenue increases |
| `content_published` | info | New content published |
| `platform_stats` | info | Global creator/content counts change |
| `dispute_filed` | alert | Content dispute count increases |
| `bot_started` | info | Monitor starts |
| `bot_stopped` | info | Monitor shuts down |
| `poll_error` | warn | API poll fails |

## Webhook Payload

```json
{
  "event": {
    "type": "subscriber_change",
    "severity": "info",
    "timestamp": "2026-03-18T12:00:00.000Z",
    "blockHeight": 1234567,
    "message": "Prateek (VeilSub Creator) gained 1 subscriber(s): 5 -> 6",
    "data": {
      "creator": "Prateek (VeilSub Creator)",
      "address": "aleo1hp9...",
      "previous": 5,
      "current": 6,
      "delta": 1
    }
  },
  "botVersion": "0.1.0",
  "programId": "veilsub_v29.aleo"
}
```

## Architecture

```
index.ts          Entry point, graceful shutdown, error boundaries
  |
  v
monitor.ts        Core poll loop, state diffing, event detection
  |
  +-- aleo-client.ts    Rate-limited Aleo API wrapper, Leo value parsing
  +-- notifications.ts  Console output, webhook delivery, Supabase storage
  +-- config.ts         Environment parsing, known creator hashes
  +-- types.ts          TypeScript interfaces (all readonly/immutable)
```

## On-Chain Mappings Monitored

- `subscriber_count` — per-creator subscriber totals
- `total_revenue` — per-creator cumulative revenue
- `content_count` — per-creator content pieces
- `tier_count` — per-creator tier count
- `total_creators` — platform-wide creator count (singleton, key `0u8`)
- `total_content` — platform-wide content count (singleton, key `0u8`)

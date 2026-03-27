# @veilsub/sdk

TypeScript SDK for **VeilSub** — private creator subscriptions on Aleo.

## Install

```bash
npm install @veilsub/sdk
```

## Quick Start

```typescript
import { VeilSubClient } from '@veilsub/sdk'

const client = new VeilSubClient({ network: 'testnet' })

// Query creator stats (no wallet needed)
const stats = await client.getCreatorStats('7077346389...field')
console.log(stats.subscriberThreshold) // "50+"
console.log(stats.tierPrice) // 10900001 (microcredits)

// Get subscribe transaction parameters
const params = client.getSubscribeParams(
  'aleo1creator...',
  1, // tier
  10900001, // microcredits
  '12345field', // passId
  16000000 // expiresAt block height
)
// params.transition = 'subscribe'
// params.inputs = ['aleo1...', '1u8', '10900001u64', ...]
// params.fee = 300000
```

## API

### `new VeilSubClient(config?)`
- `config.network`: 'testnet' | 'mainnet' (default: 'testnet')
- `config.apiUrl`: Custom API URL
- `config.programId`: Custom program ID (default: 'veilsub_v29.aleo')

### Query Methods
- `getCreatorStats(creatorHash)` — subscriber count, revenue, content count, tier price
- `getSubscriberCount(creatorHash)` — raw subscriber count
- `getTotalRevenue(creatorHash)` — raw total revenue (microcredits)
- `getContentCount(creatorHash)` — published content count
- `getTierPrice(creatorHash)` — base tier price (microcredits)
- `getMapping(name, key)` — query any on-chain mapping

### Transaction Helpers
- `getSubscribeParams(creator, tier, amount, passId, expiresAt)` — returns transition name, inputs, fee
- `getTipParams(creator, amount)` — returns transition name, inputs, fee

### Record Parsing
- `parseAccessPass(plaintext)` — parse AccessPass record from wallet
- `parseCreatorReceipt(plaintext)` — parse CreatorReceipt record

### Constants
- `VeilSubClient.FEES` — fee estimates for each transition
- `VeilSubClient.SUBSCRIPTION_DURATION` — ~30 days in blocks
- `VeilSubClient.TRIAL_DURATION` — ~50 minutes in blocks

## Contract: veilsub_v29.aleo

27 transitions | 29 mappings | 6 record types | Deployed on Aleo testnet

## License

MIT

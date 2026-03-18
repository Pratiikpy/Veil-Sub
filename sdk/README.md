# @veilsub/sdk

[![npm version](https://img.shields.io/npm/v/@veilsub/sdk.svg)](https://www.npmjs.com/package/@veilsub/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Aleo](https://img.shields.io/badge/Aleo-Testnet-purple.svg)](https://aleo.org)

TypeScript SDK for **VeilSub** -- privacy-first creator subscriptions on the Aleo blockchain.

Wraps all 31 on-chain transitions from `veilsub_v28.aleo` into a clean, type-safe API. Query on-chain data without a wallet. Build transactions for any Aleo wallet adapter.

## Features

- **31 Transaction Builders** -- every VeilSub transition, wallet-agnostic
- **On-Chain Queries** -- read mappings via the Provable API (no wallet needed)
- **Full TypeScript Types** -- records, structs, params, responses
- **Stablecoin Support** -- USDCx and USAD subscriptions & tipping (v28)
- **Zero Dependencies** -- only `typescript` as a dev dependency
- **Isomorphic** -- works in Node.js 18+ and modern browsers
- **119 Error Codes** -- mapped to human-readable descriptions

## Installation

```bash
npm install @veilsub/sdk
```

## Quick Start

```typescript
import { VeilSubClient } from '@veilsub/sdk';

// Initialize (defaults to testnet)
const client = new VeilSubClient();

// Query a creator's stats (no wallet needed)
const creatorHash = '5895434346742188517605628668414418785502575139839733911875586046449923524635field';
const stats = await client.getCreatorStats(creatorHash);

console.log(`Subscribers: ${stats.subscriberCount}`);
console.log(`Revenue: ${stats.totalRevenue} microcredits`);
console.log(`Content: ${stats.contentCount} items`);
```

## On-Chain Queries

All queries use the public Provable API -- no wallet connection needed.

```typescript
const client = new VeilSubClient();

// Creator data
const registered = await client.isCreatorRegistered(creatorHash);
const stats = await client.getCreatorStats(creatorHash);
const subCount = await client.getSubscriberCount(creatorHash);

// Content data
const meta = await client.getContentMeta(contentHash);
const disputes = await client.getContentDisputeCount(contentHash);

// Access checks
const revoked = await client.isAccessRevoked(passIdField);
const giftUsed = await client.isGiftRedeemed(giftIdField);
const trialUsed = await client.isTrialUsed(trialKeyHash);

// Platform stats
const platform = await client.getPlatformStats();
console.log(`${platform.totalCreators} creators, ${platform.totalContent} items`);

// Block height
const height = await client.getBlockHeight();

// Raw mapping query
const raw = await client.queryMapping('tier_prices', creatorHash);
```

## Building Transactions

Transaction builders return `TransactionParams` -- pass them to any Aleo wallet adapter.

### Subscribe to a Creator

```typescript
import { VeilSubClient, calculateExpiry } from '@veilsub/sdk';

const client = new VeilSubClient();
const currentBlock = await client.getBlockHeight();

const tx = client.buildSubscribeTransaction({
  paymentRecord: myAleoCreditsRecord, // from wallet
  creatorAddress: 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk',
  tier: 1,
  amount: 5_000_000,        // 5 ALEO in microcredits
  expiresAt: calculateExpiry(currentBlock), // ~30 days
});

// Pass to your wallet adapter
await wallet.executeTransaction({
  program: tx.programId,
  function: tx.functionName,
  inputs: tx.inputs,
  fee: tx.fee,
});
```

### Blind Subscribe (Privacy Mode)

```typescript
import { buildSubscribeBlind, generateFieldId } from '@veilsub/sdk';

const tx = buildSubscribeBlind({
  paymentRecord: myRecord,
  creatorAddress: 'aleo1hp9m08...',
  nonce: generateFieldId(),  // random nonce for identity rotation
  tier: 1,
  amount: 5_000_000,
  expiresAt: 1_500_000,
});
```

### Subscribe with USDCx (Stablecoin)

```typescript
const tx = client.buildSubscribeUsdcxTransaction({
  tokenRecord: myUsdcxTokenRecord,
  creatorAddress: 'aleo1hp9m08...',
  tier: 2,
  amount: '5000000',         // $5 USDC (6 decimals)
  expiresAt: 1_500_000,
  merkleProofs: complianceProofs,
});
```

### Tip a Creator

```typescript
import { buildTip } from '@veilsub/sdk';

const tx = buildTip({
  paymentRecord: myRecord,
  creatorAddress: 'aleo1hp9m08...',
  amount: 1_000_000,  // 1 ALEO tip
});
```

### Commit-Reveal Tip (Privacy)

```typescript
import { buildCommitTip, buildRevealTip, generateFieldId } from '@veilsub/sdk';

const salt = generateFieldId();

// Phase 1: Commit
const commitTx = buildCommitTip({
  creatorAddress: 'aleo1hp9m08...',
  amount: 2_000_000,
  salt,
});

// Phase 2: Reveal (after commit confirms)
const revealTx = buildRevealTip({
  paymentRecord: myRecord,
  creatorAddress: 'aleo1hp9m08...',
  amount: 2_000_000,  // must match commit
  salt,               // must match commit
});
```

### Publish Content

```typescript
import { buildPublishContent } from '@veilsub/sdk';

const tx = buildPublishContent({
  contentId: '123456789',
  minTier: 1,            // minimum tier to access
  contentHash: '987654', // Poseidon2 integrity hash
});
```

### Create Audit Token (Selective Disclosure)

```typescript
import { buildCreateAuditToken, SCOPE_TIER, SCOPE_EXPIRY } from '@veilsub/sdk';

// Only reveal tier and expiry to the verifier
const tx = buildCreateAuditToken({
  accessPass: myAccessPassRecord,
  verifierAddress: 'aleo1verifier...',
  scopeMask: SCOPE_TIER | SCOPE_EXPIRY,  // bits: 0b0110 = 6
});
```

### Register as a Creator

```typescript
import { buildRegisterCreator, creditsToMicro } from '@veilsub/sdk';

const tx = buildRegisterCreator({
  price: creditsToMicro(5), // 5 ALEO base price
});
```

## Standalone Transaction Builders

Use builders directly without instantiating a client:

```typescript
import {
  buildSubscribe,
  buildSubscribeBlind,
  buildSubscribeTrial,
  buildSubscribeUsdcx,
  buildRenew,
  buildRenewBlind,
  buildGiftSubscription,
  buildRedeemGift,
  buildTransferPass,
  buildTip,
  buildCommitTip,
  buildRevealTip,
  buildTipUsdcx,
  buildPublishContent,
  buildPublishEncryptedContent,
  buildUpdateContent,
  buildDeleteContent,
  buildDisputeContent,
  buildRevokeAccess,
  buildVerifyAccess,
  buildVerifyTierAccess,
  buildCreateAuditToken,
  buildProveThreshold,
  buildRegisterCreator,
  buildCreateCustomTier,
  buildUpdateTierPrice,
  buildDeprecateTier,
  buildWithdrawCreatorRev,
  buildWithdrawPlatformFees,
} from '@veilsub/sdk';
```

## Utility Functions

```typescript
import {
  // Leo value parsing
  parseLeoU64,        // "1000000u64" -> 1000000
  parseLeoField,      // "123456field" -> "123456"
  parseLeoBool,       // "true" -> true
  stripLeoSuffix,     // "5u8" -> "5"

  // Leo value formatting
  toU8,               // 5 -> "5u8"
  toU32,              // 864000 -> "864000u32"
  toU64,              // 1000000 -> "1000000u64"
  toField,            // "123" -> "123field"

  // ID generation
  generateFieldId,    // cryptographically random field-safe ID

  // Address validation
  isValidAleoAddress, // "aleo1..." -> true/false
  assertValidAddress, // throws VeilSubError if invalid

  // Unit conversions
  microToCredits,     // 1_000_000 -> 1.0
  creditsToMicro,     // 1.5 -> 1_500_000
  formatCredits,      // 5_000_000 -> "5 ALEO"

  // Block time
  secondsToBlocks,    // 86400 -> 28800
  blocksToSeconds,    // 864000 -> 2592000
  calculateExpiry,    // (currentBlock, duration?) -> expiryBlock

  // Error handling
  parseErrorCode,     // "ERR_004" -> human-readable message
  getErrorDescription,// "ERR_022" -> description or null
} from '@veilsub/sdk';
```

## Constants

```typescript
import {
  DEFAULT_PROGRAM_ID,         // "veilsub_v28.aleo"
  TESTNET_API_URL,            // "https://api.explorer.provable.com/v1/testnet"
  PLATFORM_ADDRESS,           // platform fee recipient
  FEES,                       // fee schedule for all 31 transitions
  TRANSITIONS,                // all 31 transition names
  MAPPING_NAMES,              // all 26 mapping names
  MICROCREDITS_PER_CREDIT,    // 1_000_000
  MAX_TIER,                   // 20
  MIN_PRICE,                  // 100
  SUBSCRIPTION_DURATION_BLOCKS, // 864_000 (~30 days)
  TRIAL_DURATION_BLOCKS,      // 1_000 (~50 min)
  TRIAL_PRICE_DIVISOR,        // 5 (20%)
  TOKEN_CREDITS,              // 0
  TOKEN_USDCX,               // 1
  TOKEN_USAD,                 // 2
  TOKEN_META,                 // symbol, name, decimals per token
  SCOPE_CREATOR,              // 1 (audit token bit)
  SCOPE_TIER,                 // 2
  SCOPE_EXPIRY,               // 4
  SCOPE_SUBSCRIBER,           // 8
  SCOPE_ALL,                  // 15
} from '@veilsub/sdk';
```

## Configuration

```typescript
const client = new VeilSubClient({
  programId: 'veilsub_v28.aleo',   // default
  network: 'testnet',               // 'testnet' | 'mainnet'
  networkUrl: 'https://...',        // override API URL
  timeoutMs: 15_000,                // request timeout
  fetchFn: customFetch,             // custom fetch (for testing)
});
```

## API Reference

### VeilSubClient

| Method | Returns | Description |
|--------|---------|-------------|
| `queryMapping(name, key)` | `Promise<string \| null>` | Raw mapping query |
| `getBlockHeight()` | `Promise<number>` | Current chain height |
| `isCreatorRegistered(hash)` | `Promise<boolean>` | Check registration |
| `getCreatorStats(hash)` | `Promise<CreatorStats>` | Full creator stats |
| `getSubscriberCount(hash)` | `Promise<number>` | Subscriber count |
| `getContentMeta(hash)` | `Promise<ContentMeta \| null>` | Content metadata |
| `getContentDisputeCount(hash)` | `Promise<number>` | Dispute count |
| `isAccessRevoked(passId)` | `Promise<boolean>` | Revocation check |
| `isGiftRedeemed(giftId)` | `Promise<boolean>` | Gift redemption check |
| `isTrialUsed(hash)` | `Promise<boolean>` | Trial usage check |
| `isNonceUsed(hash)` | `Promise<boolean>` | Blind nonce check |
| `hasTipCommitment(hash)` | `Promise<boolean>` | Tip commit check |
| `isTipRevealed(hash)` | `Promise<boolean>` | Tip reveal check |
| `getPlatformStats()` | `Promise<PlatformStats>` | Platform totals |
| `build*Transaction(params)` | `TransactionParams` | 31 tx builders |

### TransactionParams

```typescript
interface TransactionParams {
  programId: string;      // "veilsub_v28.aleo"
  functionName: string;   // e.g., "subscribe"
  inputs: string[];       // Leo-formatted inputs
  fee: number;            // suggested fee in microcredits
}
```

## On-Chain Architecture

VeilSub v28 contains:

- **31 transitions** -- creator management, subscriptions (standard/blind/trial/stablecoin), content, tipping, verification, social, privacy proofs
- **26 mappings** -- all field-keyed (zero raw addresses in finalize)
- **6 record types** -- AccessPass, CreatorReceipt, AuditToken, SubscriptionTier, ContentDeletion, GiftToken
- **5 structs** -- TierKey, BlindKey, TipCommitData, DisputeKey, TrialKey
- **3 token types** -- Aleo credits, USDCx, USAD

## Privacy Architecture

VeilSub implements the **Blind Subscription Protocol (BSP)** with three privacy layers:

1. **Blind Identity Rotation** -- nonce-rotated Poseidon2 hashes prevent subscriber tracking
2. **Zero-Address Finalize** -- all 26 mappings are field-keyed; zero raw addresses in the public layer
3. **Selective Disclosure** -- scoped audit tokens let subscribers prove access without revealing identity

## License

MIT

## Links

- [VeilSub App](https://veil-sub.vercel.app)
- [GitHub](https://github.com/Pratiikpy/Veil-Sub)
- [Aleo](https://aleo.org)

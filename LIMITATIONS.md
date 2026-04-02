# VeilSub -- Known Limitations & Roadmap

This document is an honest accounting of what VeilSub can and cannot do today, what we deliberately chose not to build, and what comes next.

**Current Version:** 10-program ecosystem (veilsub_v30.aleo + 9 companion programs) on Aleo testnet

---

## Known Limitations

### 1. Shield Wallet Transaction Verification

Shield Wallet returns opaque `shield_*` identifiers instead of standard Aleo transaction IDs. The frontend cannot always verify transaction finality immediately after submission. We mitigate this with block scanning -- polling recent blocks for matching transition outputs -- but there is a window (up to ~30 seconds) where a transaction may appear unconfirmed despite having landed on-chain.

### 2. Poseidon2 Cannot Be Computed in JavaScript

Aleo's Poseidon2 hash is a circuit-native operation with no JavaScript implementation. This means the frontend cannot independently compute subscriber identity hashes, auction IDs, or chat room keys. We work around this by extracting computed values from transaction outputs and confirmed blocks, but it creates a dependency on on-chain confirmation before the UI can display certain identifiers.

### 3. In-Memory Rate Limiter Resets on Cold Starts

The serverless API rate limiter (used for dispute throttling and API abuse prevention) stores state in process memory. On Vercel, each cold start resets this state. Under sustained load, a determined attacker could bypass rate limits by waiting for function recycling. This is a known trade-off of serverless simplicity over dedicated infrastructure.

### 4. Polling, Not Real-Time

The frontend polls on-chain state every 30 seconds. There are no WebSocket or SSE connections to the Aleo network. Subscribers may see stale data for up to 30 seconds after a transaction confirms. Supabase Realtime handles off-chain notifications, but on-chain state (subscription status, revenue totals, mapping values) relies on polling.

### 5. Tier Prices Not Verifiable Client-Side

Leo/Aleo programs execute pricing logic inside the ZK circuit. The frontend cannot independently verify that a tier price matches what the contract will enforce -- it reads the `tier_prices` mapping via the Provable API, but the actual enforcement happens in the prover. A mismatch between cached UI prices and on-chain prices would cause a transaction rejection, not a financial loss, but the UX is confusing when it happens.

### 6. Companion Programs Use Structs Instead of Records

Aleo's ConsensusVersion V14 restricts how programs can pass records across program boundaries. Our 9 companion programs (governance, marketplace, social, oracle, identity, access, collab, reviews, login) use structs and public mappings where records would provide stronger privacy. This is a protocol-level constraint, not a design choice -- we will migrate to cross-program records when Aleo enables it.

### 7. Creator Hash Recovery Requires Chain Scanning

If a creator clears localStorage and Supabase state is unavailable, recovering their `creator_hash` requires scanning the chain for their `register_creator` transition. The `/api/creators/recover-hash` endpoint handles this, but it depends on the Provable API being available and the transaction being indexed.

---

## What We Chose Not to Build

### No Backend Indexer Service

We run entirely on serverless functions (Vercel) and direct Provable API queries. A dedicated indexer (like a Subsquid or custom node) would enable faster queries and historical analytics, but adds operational complexity, hosting costs, and a centralized point of failure. For a testnet application, serverless simplicity is the right trade-off.

### No Native Mobile App

VeilSub is a responsive web application that works inside Shield Wallet's built-in browser. A native iOS/Android app would provide better performance and push notifications, but would double the codebase and require app store approval cycles that do not align with buildathon timelines.

### No Multi-Sig Treasury

Platform fee withdrawals currently go to a single admin address. Multi-signature treasury management (requiring N-of-M approvals) is planned for mainnet but adds significant contract complexity. On testnet with no real funds at stake, a single-signer model is acceptable.

### No On-Chain Dispute Resolution

Content disputes are tracked on-chain (with rate limiting), but resolution is off-chain. A full on-chain arbitration system with staking, voting, and slashing was scoped but deprioritized in favor of shipping the core subscription and privacy features.

---

## Security Considerations

| Layer | Implementation |
|-------|---------------|
| **Encryption at rest** | AES-256-GCM with PBKDF2 key derivation (100K iterations) for encrypted announcements |
| **Wallet authentication** | SHA-256 challenge-response with 2-minute validity window on all mutation endpoints |
| **CSRF protection** | Origin/Referer validation on all POST/PUT/DELETE API routes |
| **Content sanitization** | DOMPurify with restrictive config; iframe embeds limited to YouTube and Vimeo origins |
| **API proxy** | `/api/aleo/*` routes proxy Provable API requests, hiding subscriber IP addresses from the RPC layer |
| **Input validation** | Zod schemas on all API request bodies; Leo-level `assert` checks on all contract inputs |
| **RLS enforcement** | Supabase Row Level Security enabled on all 3 tables with explicit policies |

**Not yet implemented:** CSP headers are permissive (required for Shield Wallet injection), and Subresource Integrity is not enforced on third-party scripts.

---

## Roadmap

| Priority | Item | Status |
|----------|------|--------|
| High | Mainnet migration when Aleo mainnet launches | Waiting on Aleo |
| High | Upstash Redis-backed rate limiting (replaces in-memory) | Designed, not deployed |
| High | Cross-program record passing (replace struct workarounds) | Blocked on ConsensusVersion update |
| Medium | Poseidon2 WASM bindings for client-side hash computation | Research phase |
| Medium | WebSocket/SSE for real-time on-chain state updates | Planned |
| Medium | Multi-sig treasury with time-locked withdrawals | Planned for mainnet |
| Low | Full SDK with `@veilsub/sdk` npm package | TypeScript SDK exists, npm publish pending |
| Low | On-chain dispute arbitration with staking | Scoped, not started |

---

## Leo Language Quirks Encountered

For other Aleo developers: Leo evaluates **both branches** of ternary expressions, which causes underflow panics even in unreachable branches. All subtraction in VeilSub uses the safe pattern:

```leo
// UNSAFE -- Leo evaluates `a - b` even when condition is false
let result: u64 = a > b ? a - b : 0u64;

// SAFE -- cap first, then subtract
let safe_b: u64 = b <= a ? b : a;
let result: u64 = a - safe_b;
```

This affects every Aleo program that performs conditional arithmetic.

---

*Last updated: April 2026 | veilsub_v30.aleo | 10 programs, 88 transitions, 101 mappings*

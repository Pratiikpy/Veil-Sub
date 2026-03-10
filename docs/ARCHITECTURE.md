# VeilSub Architecture

## System Overview

VeilSub is a privacy-preserving content subscription platform built on Aleo. It enables creators to monetize content while keeping subscriber identities completely private through zero-knowledge proofs.

**Deployed Contract:** [`veilsub_v27.aleo`](https://testnet.aleoscan.io/program?id=veilsub_v27.aleo) — 27 transitions, 25 mappings, 6 record types, 866 statements

```
+-------------------+       +--------------------+       +------------------+
|   Frontend        |       |   Aleo Testnet     |       |   Off-Chain      |
|   (Next.js 16)    |<----->|   (veilsub_v27)    |       |   Services       |
|                   |       |                    |       |                  |
| - Dashboard       |       | - AccessPass       |       | - Supabase (DB)  |
| - Explore         |       | - CreatorReceipt   |       | - Upstash Redis  |
| - Verify          |       | - AuditToken       |       | - Vercel (CDN)   |
| - Create Tiers    |       | - SubscriptionTier |       |                  |
| - Gated Content   |       | - ContentDeletion  |       |                  |
| - Gift Subs       |       | - GiftToken        |       |                  |
| - Manage Access   |       |                    |       |                  |
| - Creator Pages   |       |                    |       |                  |
| - On-Chain Verify |       | - credits.aleo     |       |                  |
+-------------------+       +--------------------+       +------------------+
        |                           |                           |
        v                           v                           v
+-------------------+       +--------------------+       +------------------+
| Wallet Layer      |       | Privacy Layer      |       | Storage Layer    |
|                   |       |                    |       |                  |
| - Shield Wallet   |       | - ZK Proofs        |       | - Encrypted      |
| - Leo Wallet      |       | - Private Records  |       |   Wallet Addrs   |
| - Fox Wallet      |       | - transfer_private |       | - Content Cache  |
| - Puzzle Wallet   |       | - Poseidon2 Hashing|       | - Creator Profiles|
| - Soter Wallet    |       | - BHP256 Commits   |       |                  |
+-------------------+       +--------------------+       +------------------+
```

## v23 Privacy Architecture: ZERO Addresses in Finalize

The core privacy overhaul introduced in v23: **no raw address ever appears in any finalize function**. All mappings use `field` keys (Poseidon2 hashes of addresses). Auth checks happen in the transition layer where `self.caller` is available — enforced by ZK proofs, never leaked to public state. v24-v27 extends this architecture with 25 mappings while preserving the zero-address finalize guarantee.

```
TRANSITION LAYER (private, ZK-proof-guaranteed)
├── self.caller available → auth checks here
├── BHP256 commitments for tipping (algebraic properties)
├── BlindKey hashing for identity rotation
└── Records created/consumed (AccessPass, CreatorReceipt, etc.)

FINALIZE LAYER (public, on-chain)
├── creator_hash: field ← Poseidon2(creator address)
├── ALL mapping keys: field ← Poseidon2(various keys)
├── ZERO raw addresses
└── Aggregate counters only (subscriber_count, revenue, etc.)
```

## Layer 1: Smart Contract (`veilsub_v27.aleo`)

### Records (Private State — 6 types)
| Record | Owner | Purpose |
|--------|-------|---------|
| `AccessPass` | Subscriber | Proves subscription access (tier, expiry, creator, privacy_level) |
| `CreatorReceipt` | Creator | Private proof of payment received (hashed subscriber ID) |
| `AuditToken` | Verifier | Selective disclosure token for third-party verification |
| `SubscriptionTier` | Creator | Proof of custom tier creation (tier_id, price, name_hash) |
| `ContentDeletion` | Creator | Proof of content deletion (content_id, reason_hash) |
| `GiftToken` | Recipient | Gift subscription pending redemption (creator, tier, expires_at) |

### Mappings (Public State — 25 field-keyed mappings, ZERO raw addresses)
| Mapping | Key Type | Value | Purpose |
|---------|----------|-------|---------|
| `tier_prices` | Poseidon2(creator) | u64 | Base subscription pricing |
| `subscriber_count` | Poseidon2(creator) | u64 | Public subscriber metric |
| `total_revenue` | Poseidon2(creator) | u64 | Public revenue metric |
| `platform_revenue` | u8 (constant key) | u64 | Platform fee accumulator |
| `content_count` | Poseidon2(creator) | u64 | Published content count |
| `content_meta` | Poseidon2(content_id) | u8 | Content tier requirement |
| `content_hashes` | Poseidon2(content_id) | field | Content body integrity hash |
| `content_creator` | Poseidon2(content_id) | field | Content ownership for auth |
| `creator_tiers` | Poseidon2(TierKey) | u64 | Custom tier pricing |
| `tier_count` | Poseidon2(creator) | u64 | Number of tiers per creator |
| `tier_deprecated` | Poseidon2(TierKey) | bool | Deprecated tier flag |
| `content_deleted` | Poseidon2(content_id) | bool | Content deletion flag |
| `gift_redeemed` | gift_id (field) | bool | Gift redemption tracking |
| `nonce_used` | Poseidon2(nonce) | bool | Blind renewal nonce replay prevention |
| `encryption_commits` | Poseidon2(content_id) | field | Encrypted content commitment |
| `access_revoked` | pass_id (field) | bool | Access revocation flag |
| `pass_creator` | pass_id (field) | field | Maps pass to creator HASH (not address) |
| `content_disputes` | Poseidon2(content_id) | u64 | Content dispute counter |
| `tip_commitments` | commitment (field) | bool | Stores tip commitment existence |
| `tip_revealed` | commitment (field) | bool | Tracks revealed tips |
| `dispute_count_by_caller` | Poseidon2(DisputeKey) | u64 | Per-caller dispute rate limiting |
| `subscription_by_tier` | Poseidon2(TierKey) | u64 | Per-tier subscriber count |
| `total_creators` | 0u8 (singleton) | u64 | Platform-wide creator count |
| `total_content` | 0u8 (singleton) | u64 | Platform-wide content count |
| `trial_used` | Poseidon2(TrialKey) | bool | One-trial-per-creator rate limiting |

### Transitions (27 total)
| Transition | Privacy | Finalize? | Purpose |
|------------|---------|-----------|---------|
| `register_creator` | Creator hash only | Yes | Register as content creator |
| `subscribe` | Subscriber = private | Yes | Subscribe + pay (atomic) |
| `verify_access` | Full private | Yes (revocation + expiry check) | Minimal-footprint access verification |
| `create_audit_token` | Full private | **No** | Selective disclosure for verifiers |
| `tip` | Tipper = private | Yes | Send tip to creator |
| `renew` | Subscriber = private | Yes | Renew subscription |
| `publish_content` | Creator hash only | Yes | Publish content metadata + hash |
| `create_custom_tier` | Creator hash only | Yes | Create custom subscription tier |
| `update_tier_price` | Creator hash only | Yes | Update tier price |
| `deprecate_tier` | Creator hash only | Yes | Mark tier as deprecated |
| `update_content` | Creator hash only | Yes | Update content tier/hash |
| `delete_content` | Creator hash only | Yes | Delete content (returns ContentDeletion) |
| `gift_subscription` | Gifter = private | Yes | Gift a subscription to another address |
| `redeem_gift` | Recipient = private | Yes | Redeem GiftToken for AccessPass |
| `withdraw_platform_fees` | Platform admin check in transition | Yes | Withdraw accumulated platform fees |
| `withdraw_creator_rev` | Creator hash only | Yes | Withdraw creator revenue |
| `subscribe_blind` | Subscriber = private (nonce-rotated) | Yes | Subscribe with identity rotation |
| `renew_blind` | Subscriber = private (nonce-rotated) | Yes | Blind renewal (different hash each time) |
| `subscribe_trial` | Subscriber = private | Yes | Trial subscription (20% price, ~12hr) |
| `verify_tier_access` | Full private | Yes (revocation + expiry check) | Minimal-footprint tier-gated verification |
| `publish_encrypted_content` | Creator hash only | Yes | Publish with encryption commitment |
| `revoke_access` | Creator hash verified in transition | Yes | Revoke subscriber access |
| `dispute_content` | Subscriber must have AccessPass | Yes | Dispute content (rate-limited) |
| `transfer_pass` | Subscriber = private | Yes | Transfer subscription to another address |
| `commit_tip` | Tipper = private | Yes | Commit to hidden tip amount (BHP256) |
| `reveal_tip` | Tipper = private | Yes | Reveal committed tip and execute transfer |
| `prove_subscriber_threshold` | Creator hash only | Yes | Prove N+ subscribers without revealing count |

### Layer 2: Frontend (Next.js 16 + React 19)

```
frontend/src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing page
│   ├── dashboard/          # Creator dashboard
│   ├── explore/            # Browse creators
│   ├── verify/             # ZK verification
│   ├── creator/[address]/  # Creator profile
│   ├── docs/               # Documentation (5-tab interface)
│   ├── privacy/            # Privacy model + threat analysis
│   ├── analytics/          # Platform analytics
│   ├── explorer/           # On-chain mapping queries
│   ├── vision/             # Use cases + roadmap
│   └── api/                # API routes (Supabase/Redis proxy)
├── components/             # 62 reusable UI components
├── hooks/                  # 16 custom hooks (useVeilSub, useCreatorStats, etc.)
├── lib/                    # Utilities (config, crypto, Supabase, Redis)
├── providers/              # Context providers (Wallet, Client)
└── types/                  # TypeScript type definitions
```

### Layer 3: Off-Chain Services

| Service | Purpose | Data Stored |
|---------|---------|-------------|
| **Supabase** (PostgreSQL) | Creator profiles, content metadata | Encrypted wallet addresses, content bodies |
| **Upstash Redis** | Fast content caching, rate limiting | Serialized content feeds |
| **Vercel** | Frontend hosting + serverless API | Static assets, API routes |

### Layer 4: Wallet Integration

Five wallet adapters via `@provablehq/aleo-wallet-adaptor-react`:
- **Shield Wallet** (primary) — delegated proving, auto-decrypt
- **Leo Wallet** — community standard
- **Fox Wallet** — multi-chain
- **Puzzle Wallet** — privacy-focused
- **Soter Wallet** — security-focused

## Data Flow: Subscribe

```
1. User clicks "Subscribe" on creator page
2. Frontend → useVeilSub.subscribe(payment_record, creator, tier, amount, pass_id, expiry)
3. Wallet prompts for signature (ZK proof generated client-side)
4. Transition layer:
   - self.caller verified (subscriber identity)
   - credits.aleo/transfer_private sends payment to creator
   - AccessPass record created (owner: subscriber)
   - CreatorReceipt record created (owner: creator)
   - subscriber_hash = Poseidon2(self.caller) [never raw address]
   - creator_hash = Poseidon2(creator) [never raw address]
5. Finalize layer (PUBLIC — zero addresses):
   - subscriber_count[creator_hash] += 1
   - total_revenue[creator_hash] += amount
   - platform_revenue[0u8] += amount / 20  (5% fee)
   - pass_creator[pass_id] = creator_hash
   - subscription_by_tier[Poseidon2(TierKey)] += 1
6. Frontend polls for confirmation → shows AccessPass
7. Content feed unlocks (blur removed for subscribed tiers)
```

## Data Flow: Blind Renewal

```
1. User selects "Blind" privacy mode in SubscribeModal
2. Frontend generates random nonce (unique per renewal)
3. Transition layer:
   - subscriber_hash = Poseidon2(BlindKey { subscriber: self.caller, nonce: random_nonce })
   - This produces a DIFFERENT hash each renewal → creator cannot link renewals
   - Payment, AccessPass, CreatorReceipt same as standard subscribe
4. Finalize layer:
   - nonce_used[Poseidon2(nonce)] = true  (replay prevention)
   - Same mappings updated (subscriber_count, revenue, etc.)
   - No way to correlate this renewal to previous subscriptions
5. Result: Creator sees a "new subscriber" each renewal cycle
```

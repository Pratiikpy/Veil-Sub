# VeilSub Architecture

## System Overview

VeilSub is a privacy-preserving content subscription platform built on Aleo. It enables creators to monetize content while keeping subscriber identities completely private through zero-knowledge proofs.

```
+-------------------+       +--------------------+       +------------------+
|   Frontend        |       |   Aleo Testnet     |       |   Off-Chain      |
|   (Next.js 16)    |<----->|   (veilsub_v20)    |       |   Services       |
|                   |       |                    |       |                  |
| - Dashboard       |       | - AccessPass       |       | - Supabase (DB)  |
| - Explore         |       | - CreatorReceipt   |       | - Upstash Redis  |
| - Verify          |       | - AuditToken       |       | - Vercel (CDN)   |
| - Create Tiers    |       | - SubscriptionTier |       |                  |
| - Gated Content   |       | - ContentDeletion  |       |                  |
| - Gift Subs       |       | - GiftToken        |       |                  |
| - Manage Access   |       | - RefundEscrow     |       |                  |
| - Creator Pages   |       | - credits.aleo     |       |                  |
| - On-Chain Verify |       |                    |       |                  |
+-------------------+       +--------------------+       +------------------+
        |                           |                           |
        v                           v                           v
+-------------------+       +--------------------+       +------------------+
| Wallet Layer      |       | Privacy Layer      |       | Storage Layer    |
|                   |       |                    |       |                  |
| - Shield Wallet   |       | - ZK Proofs        |       | - Encrypted      |
| - Leo Wallet      |       | - Private Records  |       |   Wallet Addrs   |
| - Fox Wallet      |       | - transfer_private |       | - Content Cache  |
| - Puzzle Wallet   |       | - BHP256 Hashing   |       | - Creator Profiles|
| - Soter Wallet    |       |                    |       |                  |
+-------------------+       +--------------------+       +------------------+
```

## Layer Architecture

### Layer 1: Smart Contract (`veilsub_v20.aleo`)

The Leo smart contract is the trust foundation. All financial operations and access control happen on-chain.

**Records (Private State):**
| Record | Owner | Purpose |
|--------|-------|---------|
| `AccessPass` | Subscriber | Proves subscription access (tier, expiry, creator) |
| `CreatorReceipt` | Creator | Private proof of payment received (hashed subscriber ID) |
| `AuditToken` | Verifier | Selective disclosure token for third-party verification |
| `SubscriptionTier` | Creator | Proof of custom tier creation (tier_id, price, name_hash) |
| `ContentDeletion` | Creator | Proof of content deletion (content_id, reason_hash) |
| `GiftToken` | Recipient | Gift subscription pending redemption (creator, tier, expires_at) |
| `RefundEscrow` | Subscriber | Refund claim within escrow window (creator, amount, escrow_expiry) |
| `ReferralReward` | Referrer | Privacy-preserving referral reward proof (creator, amount, referred_hash) |

**Mappings (Public State):**
| Mapping | Key | Value | Purpose |
|---------|-----|-------|---------|
| `tier_prices` | creator address | u64 | Public subscription pricing |
| `subscriber_count` | creator address | u64 | Public subscriber metric |
| `total_revenue` | creator address | u64 | Public revenue metric |
| `platform_revenue` | u8 (constant) | u64 | Platform fee accumulator |
| `content_count` | creator address | u64 | Published content count |
| `content_meta` | BHP256(content_id) | u8 | Content tier requirement |
| `content_hashes` | BHP256(content_id) | field | Content body integrity hash |
| `creator_tiers` | BHP256(TierKey) | u64 | Custom tier pricing |
| `tier_count` | creator address | u64 | Number of tiers per creator |
| `tier_deprecated` | BHP256(TierKey) | bool | Deprecated tier flag |
| `content_deleted` | BHP256(content_id) | bool | Content deletion flag |
| `gift_redeemed` | gift_id (field) | bool | Gift redemption tracking |
| `refund_claimed` | pass_id (field) | bool | Refund claim tracking |
| `escrow_data` | pass_id (field) | u32 | Escrow expiry block height |
| `nonce_used` | BHP256(nonce) | bool | Blind renewal nonce replay prevention |
| `encryption_commits` | BHP256(content_id) | field | Encrypted content commitment |
| `access_revoked` | pass_id (field) | bool | Access revocation flag |
| `content_disputes` | BHP256(content_id) | u64 | Content dispute counter |
| `pass_creator` | pass_id (field) | address | Maps pass to its issuing creator (auth for revocation) |
| `tip_commitments` | commitment (field) | field | Stores tip commitment hashes |
| `tip_revealed` | commitment (field) | bool | Tracks revealed tips |
| `dispute_count_by_caller` | BHP256(caller, content_id) | u64 | Per-caller dispute rate limiting |
| `referral_count` | creator address | u64 | Total referrals received per creator |
| `sub_count_commit` | creator address | group | Homomorphic Pedersen subscriber commitment aggregate |

**Transitions (Functions):**
| Transition | Privacy | Finalize? | Purpose |
|------------|---------|-----------|---------|
| `register_creator` | Creator = public | Yes | Register as content creator |
| `subscribe` | Subscriber = private | Yes | Subscribe + pay (atomic) |
| `verify_access` | Full private | **No** | Zero-footprint access check |
| `create_audit_token` | Full private | **No** | Selective disclosure for verifiers |
| `tip` | Tipper = private | Yes | Send tip to creator |
| `renew` | Subscriber = private | Yes | Renew subscription |
| `publish_content` | Creator = public | Yes | Publish content metadata + hash |
| `create_custom_tier` | Creator = public | Yes | Create custom subscription tier |
| `update_tier_price` | Creator = public | Yes | Update tier price |
| `deprecate_tier` | Creator = public | Yes | Mark tier as deprecated |
| `update_content` | Creator = public | Yes | Update content tier/hash |
| `delete_content` | Creator = public | Yes | Delete content (returns ContentDeletion) |
| `gift_subscription` | Gifter = private | Yes | Gift a subscription to another address |
| `redeem_gift` | Recipient = private | Yes | Redeem a GiftToken for AccessPass |
| `subscribe_with_escrow` | Subscriber = private | Yes | Subscribe with refund window |
| `claim_refund` | Subscriber = private | Yes | Claim refund within escrow window |
| `withdraw_platform_fees` | Platform = public | Yes | Withdraw accumulated platform fees |
| `withdraw_creator_rev` | Creator = public | Yes | Withdraw creator revenue |
| `subscribe_blind` | Subscriber = private | Yes | Subscribe with nonce-based identity rotation |
| `renew_blind` | Subscriber = private | Yes | Blind renewal (different hash each time) |
| `verify_tier_access` | Full private | **No** | Zero-footprint dynamic tier verification |
| `publish_encrypted_content` | Creator = public | Yes | Publish with encryption commitment |
| `revoke_access` | Creator = public | Yes | Revoke subscriber access |
| `dispute_content` | Any = public | Yes | Dispute content integrity |
| `commit_tip` | Tipper = private | Yes | Commit to tip amount (hidden via BHP256 commitment) |
| `reveal_tip` | Tipper = private | Yes | Reveal committed tip and execute transfer |
| `transfer_pass` | Subscriber = private | Yes | Transfer subscription to another address (v15) |
| `subscribe_referral` | Subscriber = private | Yes | Subscribe via referral with reward split (v16) |
| `subscribe_private_count` | Subscriber = private | Yes | Subscribe updating only Pedersen aggregate, NOT public counter (v17) |
| `prove_sub_count` | Full private | **No** | Zero-footprint proof of subscriber count (v17) |
| `prove_revenue_range` | Full private | **No** | Zero-footprint range proof for revenue (v17) |

### Layer 2: Frontend (Next.js 16 + React 19)

```
frontend/src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing page
│   ├── dashboard/          # Creator dashboard
│   ├── explore/            # Browse creators
│   ├── verify/             # ZK verification + on-chain explorer
│   ├── creator/[address]/  # Creator profile
│   ├── docs/               # Documentation
│   ├── privacy/            # Privacy policy
│   ├── vision/             # Project vision
│   └── api/                # API routes (Supabase proxy)
├── components/             # Reusable UI components
├── hooks/                  # React hooks (useVeilSub, etc.)
├── lib/                    # Utilities (config, crypto, Supabase)
├── providers/              # Context providers (Wallet, Client)
└── types/                  # TypeScript type definitions
```

### Layer 3: Off-Chain Services

| Service | Purpose | Data Stored |
|---------|---------|-------------|
| **Supabase** (PostgreSQL) | Creator profiles, content metadata | Encrypted wallet addresses, content bodies |
| **Upstash Redis** | Fast content caching | Serialized content feeds |
| **Vercel** | Frontend hosting + serverless API | Static assets, API routes |

### Layer 4: Wallet Integration

Five wallet adapters via `@provablehq/aleo-wallet-adaptor-react`:
- **Shield Wallet** (primary) — delegated proving, auto-decrypt
- **Leo Wallet** — community standard
- **Fox Wallet** — multi-chain
- **Puzzle Wallet** — privacy-focused
- **Soter Wallet** — security-focused

## Data Flow

### Subscribe Flow
```
1. Subscriber connects wallet (Shield/Leo/Fox/Puzzle/Soter)
2. Frontend fetches credits.aleo records via requestRecords()
3. User selects creator + tier → frontend computes amount
4. executeTransaction() calls veilsub_v20.aleo/subscribe:
   a. credits.aleo/transfer_private sends payment to creator
   b. AccessPass record created (owned by subscriber)
   c. CreatorReceipt record created (owned by creator)
   d. Finalize validates price, updates counters
5. Frontend polls transactionStatus() until confirmed
6. Backend updates Supabase with subscription event (no wallet addresses)
```

### Verify Access Flow (Zero Footprint)
```
1. Subscriber's wallet holds AccessPass record
2. verify_access consumes old pass, creates new identical pass
3. ZK proof proves ownership — NO finalize, NO public state change
4. Creator/service validates the proof output
```

### Audit Token Flow (Selective Disclosure)
```
1. Subscriber holds AccessPass
2. Calls create_audit_token(pass, verifier_address)
3. Old AccessPass consumed, new AccessPass + AuditToken created
4. AuditToken sent to verifier — reveals: creator, tier, expires_at
5. AuditToken does NOT reveal: subscriber address (only BHP256 hash)
6. NO finalize — creating audit tokens is invisible on-chain
```

## Security Model

- **AES-256-GCM** encryption for wallet addresses stored in Supabase
- **CORS/COOP headers** configured in Next.js for cross-origin protection
- **Private fee mode** — all transaction fees paid from private records
- **No raw addresses in logs** — subscriber addresses never written to any log/DB
- **Service role key** restricted to backend-only Supabase operations

## Dependencies

### Smart Contract
- `credits.aleo` — Native Aleo credit transfers (transfer_private)

### Frontend
- Next.js 16.1.6 + React 19.2.3 + TypeScript 5
- Tailwind CSS 4 + Framer Motion
- @provablehq/aleo-wallet-adaptor-react (5 wallet adapters)
- Supabase JS + Upstash Redis
- Recharts (analytics), Sonner (toasts), Lucide React (icons)

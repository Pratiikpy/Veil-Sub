<div align="center">

<img src="assets/logo.png" alt="VeilSub" width="420" />

### Private Subscriptions for Creators and Fans

*Pay privately. Prove access. Nobody sees who you support.*

[![Live](https://img.shields.io/badge/app-live-brightgreen)](https://veil-sub.vercel.app)
[![Contract](https://img.shields.io/badge/contract-v30-8B5CF6)](https://testnet.aleoscan.io/program?id=veilsub_v30.aleo)
[![Tests](https://img.shields.io/badge/tests-341%20passing-brightgreen)](#testing)
[![Transitions](https://img.shields.io/badge/transitions-31-blue)](#smart-contract)
[![Mappings](https://img.shields.io/badge/mappings-30-blue)](#smart-contract)
[![Tokens](https://img.shields.io/badge/tokens-Credits%20%2B%20USDCx%20%2B%20USAD-orange)](#triple-token-payments)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://veil-sub.vercel.app)
[![SDK](https://img.shields.io/badge/npm-%40veilsub%2Fsdk-red)](sdk/)

[Launch App](https://veil-sub.vercel.app) · [Explorer](https://veil-sub.vercel.app/explorer) · [Docs](https://veil-sub.vercel.app/docs) · [Privacy](https://veil-sub.vercel.app/privacy) · [Messages](https://veil-sub.vercel.app/messages)

</div>

---

## What is VeilSub?

VeilSub is a privacy-first creator subscription platform built on the Aleo blockchain. Creators publish content, set pricing tiers, and earn revenue in Credits, USDCx, or USAD stablecoins — while subscribers pay and access content without ever revealing their identity on-chain. Every interaction is protected by zero-knowledge proofs: the subscriber's wallet address never appears in any public state. VeilSub supports blind subscriptions with nonce-rotated Poseidon2 identity, encrypted content delivery, anonymous comments and messaging, commit-reveal tipping, homomorphic Pedersen commitments for aggregate privacy, and a full creator economy with gifting, trials, and dispute resolution — delivering privacy guarantees no Web2 platform can offer.

---

## Key Features

### For Subscribers

| Feature | Description |
|---------|-------------|
| **Private Subscriptions** | Pay with Credits, USDCx, or USAD. Your identity never hits public state. |
| **Blind Renewal** | Each renewal rotates your on-chain identity via nonce-based Poseidon2 hashing. Even your creator cannot tell it is the same subscriber renewing. |
| **Trial Passes** | Try any creator for ~50 minutes (1,000 blocks) at 20% of the tier price. One trial per creator, no commitment. |
| **Anonymous Comments** | Comment on posts with tier-only identity. Threaded replies with likes, anonymous or identified mode. |
| **Private Messaging** | End-to-end encrypted DMs between subscribers and creators. Tier-gated threads, anonymous sender hashes. |
| **Commit-Reveal Tipping** | Tip amounts stay hidden on-chain via BHP256 commitments until you choose to reveal. |
| **Duration Toggle** | Choose ~30-day (864,000 blocks) or trial (~50-minute) subscription durations. |
| **Gift Subscriptions** | Gift access to any creator. The recipient redeems without knowing who sent it. |
| **Privacy Score** | Interactive dashboard showing exactly what is public vs. private for your activity. |
| **Subscription Manager** | View active passes, expiry countdowns, renewal status, and privacy mode from a single dashboard. |

### For Creators

| Feature | Description |
|---------|-------------|
| **Flexible Tiers** | Create up to 20 custom pricing tiers. Update or deprecate at any time. |
| **Rich Text Editor** | Tiptap-based editor with images, video embeds, and full formatting. Publish directly from the dashboard. |
| **Encrypted Announcements** | AES-256-GCM encryption at rest with per-creator keys. On-chain encryption commitments prove integrity. Subscribers-only content with blur-locked previews. |
| **Revenue Analytics** | Real on-chain metrics: subscriber counts (Pedersen-committed), revenue, tier breakdowns, sparkline trends. Ghost-style activity charts. |
| **Content Management** | Edit, delete, encrypt, and tier-gate content. Content dispute tracking with per-caller rate limits. |
| **Withdrawal UI** | Prominent earnings card with one-click withdraw for accumulated revenue. |
| **Creator Onboarding Wizard** | 4-step guided setup: connect wallet, register, create tiers, publish first content. |
| **Revoke Access Panel** | Revoke individual subscriber passes via hashed pass IDs. |
| **Creator Discovery** | Searchable directory with categories, sort options, and a 3-column grid. |
| **Push Notifications** | Real-time alerts via Supabase Realtime for new subscribers, tips, and disputes. |

### For Developers

| Feature | Description |
|---------|-------------|
| **@veilsub/sdk** | TypeScript SDK with full type coverage for all 31 transitions, 6 records, 5 structs, and 30 mapping names. |
| **9 Companion Programs** | Extensions for anonymous reviews, private voting, sealed-bid auctions, USD pricing, Login with VeilSub, paid DMs, revenue splits, and more. |
| **On-Chain Explorer** | Query any mapping value without a wallet. Verify proofs independently. |
| **API Documentation** | Full documentation with tabbed interface covering all transitions, privacy model, and integration guides. |
| **Monitor Bot** | Autonomous daemon that polls on-chain state and fires notifications for subscription events. |

---

## Blind Subscription Protocol (BSP)

VeilSub's three-layer privacy framework ensures subscriber identity is never exposed at any level of the stack.

### Layer 1: Blind Identity Rotation

Each subscription and renewal uses a unique nonce, producing a different `subscriber_hash` via Poseidon2. The creator's receipt shows a "different" subscriber each time — even though it is the same person. Renewals are completely unlinkable.

```leo
subscriber_hash = Poseidon2::hash_to_field(BlindKey { subscriber: caller, nonce: unique_nonce })
// Different nonce each time -> different hash -> unlinkable identity rotation
```

### Layer 2: Zero-Address Finalize

Every finalize function receives `creator_hash: field` instead of `creator: address`. All 30 mappings are field-keyed. No raw address ever appears in any finalize block. `self.caller` is never passed to finalize.

```leo
// Before (v21):  finalize_subscribe(creator: address, ...)
// After  (v23):  finalize_subscribe(creator_hash: field, ...)
// Result: zero raw addresses in ALL public mapping keys
```

### Layer 3: Selective Disclosure

Scoped audit tokens with `scope_mask` bitfields control exactly which fields a third-party verifier can see. Commit-reveal tipping hides amounts until voluntary reveal. Homomorphic Pedersen commitments allow threshold proofs without revealing raw counts.

### What Observers See vs. What Stays Hidden

| Observable (Public Mappings) | Hidden (Private Records) |
|---|---|
| Number of subscribers per creator (hashed key) | **Who** subscribed |
| Pedersen commitment of subscriber count | Exact subscriber count (verifiable via threshold proof) |
| Tier price configuration | Which tier a subscriber chose |
| Content metadata (min tier, hash) | Content body / encrypted payload |
| Pedersen commitment of revenue | Individual payment amounts |
| That a tip commitment exists | Tip amount (until voluntary reveal) |
| That a dispute was filed | Who filed the dispute |
| Stablecoin revenue totals (per token type) | Which token a specific subscriber used |

### Subscription Flow

```mermaid
sequenceDiagram
    participant S as Subscriber
    participant A as Aleo Network
    participant C as Creator

    S->>A: subscribe(creator, tier, payment)
    Note over A: ZK Proof generated locally<br/>subscriber identity NEVER leaves device

    A-->>S: AccessPass (encrypted)<br/>only subscriber can decrypt
    Note over A: finalize:<br/>subscriber_count[hash(creator)]++<br/>total_revenue[hash(creator)] += amount<br/>subscriber_commit += Pedersen(1, blinding)<br/>revenue_commit += Pedersen(amount, blinding)<br/>platform_revenue += 5%<br/>pass_creator[pass_id] = hash(creator)
    A-->>C: CreatorReceipt (encrypted)<br/>sees: tier, amount<br/>CANNOT see: who paid

    S->>A: verify_access(pass)
    Note over A: finalize: check revocation ONLY<br/>NO subscriber identity stored
    A-->>S: verified (zero trace left)
```

<details>
<summary><strong>Additional Privacy Features</strong></summary>

| Feature | How It Works |
|---------|-------------|
| **Zero-Footprint Verification** | `verify_access` and `verify_tier_access` check revocation status but leave no trace of *who* verified |
| **Zero-Footprint Audit** | `create_audit_token` has NO finalize at all — selective disclosure with zero on-chain trace |
| **Subscriber Never in Finalize** | `self.caller` is NEVER passed to any finalize function |
| **Subscription Transfer** | Transfer AccessPass to another address privately |
| **Nonce Replay Prevention** | `nonce_used` mapping prevents blind renewal nonce reuse |
| **Trial Rate-Limiting** | `trial_used` mapping prevents multiple trials per creator per subscriber |
| **Scoped Audit Tokens** | `scope_mask` bitfield controls which fields are disclosed to third parties |
| **Homomorphic Pedersen Commitments** | Subscriber counts and revenue use additively homomorphic commitments (value*G + blinding*H) — same technique as lasagna's Pedersen pool commitments |
| **Poseidon2 Optimization** | Finalize uses Poseidon2 (2-8 constraints vs 256 for BHP256). BHP256 only in transition layer. |

</details>

---

## Triple Token Payments

VeilSub is the first Aleo subscription platform to support multiple token standards. All three tokens are live on v30.

| Token | Symbol | Use Case | Program | Decimals |
|-------|--------|----------|---------|----------|
| **Credits** | ALEO | Native payments (subscribe, renew, tip, gift, trial) | `credits.aleo` | 6 |
| **USDCx** | USDCx | Dollar-pegged subscriptions and tipping | `test_usdcx_stablecoin.aleo` | 6 |
| **USAD** | USAD | Alternative stablecoin subscriptions and tipping | `test_usad_stablecoin.aleo` | 6 |

The frontend includes a **Token Selector** component allowing subscribers to choose their payment token before subscribing or tipping. Stablecoin records are fetched from the Shield Wallet's private record store. The `stablecoin_revenue` mapping tracks per-creator, per-token revenue independently.

---

## Anonymous Social Features

VeilSub goes beyond subscriptions to deliver a full anonymous social layer for creator communities.

| Feature | Description |
|---------|-------------|
| **Anonymous Comments** | Subscribers comment with tier-only identity (`anon_id` hash). Threaded replies, likes, and identified/anonymous mode toggle. Max 280 characters, 50 comments per post. |
| **Private Messaging** | E2E encrypted DMs between subscribers and creators. Thread-based conversations with tier gating. Anonymous sender hashes via `computeWalletHash`. Unread message indicators. |
| **Encrypted Announcements** | Creators publish subscribers-only content with AES-256-GCM encryption. Blur-locked previews for non-subscribers with unlock prompt. |
| **Post Interactions** | Like, comment, share, bookmark, and tip on every post. Reading time estimates. Sound feedback on interactions. |
| **Content Feed** | Filterable feed with tabs (All / Subscribed / Free). Search with Fuse.js fuzzy matching. Article reader mode, image lightbox, video embeds. |
| **Profile Hover Cards** | Hover any creator address to see their profile, bio, category, and quick-subscribe action. |
| **Recommendations** | Content recommendation cards based on subscription history and creator categories. |
| **Note Composer** | Character-counted short-form notes with ring progress indicator. |

---

## System Architecture

```mermaid
graph TD
    subgraph Frontend["Frontend — Next.js 16 + React 19 + Tailwind 4"]
        direction LR
        W1[Shield Wallet]
        W2[Leo Wallet]
        W3[Fox Wallet]
        W4[Puzzle Wallet]
        W5[Soter Wallet]
    end

    Frontend -->|"134 components · 25 hooks · 22 routes · 341 tests"| API

    subgraph API["API Layer — Next.js"]
        direction LR
        A1["/api/creators"]
        A2["/api/posts"]
        A3["/api/aleo/*<br/>IP proxy"]
    end

    A1 --> Supa["Supabase<br/>Encrypted profiles<br/>Notifications"]
    A2 --> Redis["Upstash Redis<br/>Posts · Rate limits"]
    A3 --> Aleo

    subgraph Aleo["Aleo Network — veilsub_v30.aleo"]
        direction LR
        T["31 transitions"]
        M["30 mappings<br/>(field-keyed)"]
        R["6 records · 5 structs"]
        S["Credits + USDCx + USAD"]
        P["Pedersen commitments"]
        Z["ZERO addresses<br/>in finalize"]
    end

    subgraph Companion["9 Companion Programs"]
        direction LR
        E["veilsub_extras_v1<br/>Reviews + Lottery"]
        I["veilsub_identity_v1<br/>Signatures + ECDSA"]
        G["veilsub_governance_v1<br/>Private Voting"]
        MK["veilsub_marketplace_v1<br/>Reputation + Auctions"]
        O["veilsub_oracle_v1<br/>USD Pricing"]
        AC["veilsub_access_v1<br/>Login with VeilSub"]
        SO["veilsub_social_v1<br/>DMs + Chat + Stories"]
        CO["veilsub_collab_v1<br/>Revenue Splits"]
        H["hash_helper<br/>Poseidon2 Utility"]
    end

    subgraph Payments["veilsub_payments_v1<br/>Stablecoin Handler"]
        direction LR
        UX["USDCx transfers"]
        UA["USAD transfers"]
    end

    Aleo --- Companion
    Aleo --- Payments
```

---

## Smart Contract

> **Program:** `veilsub_v30.aleo` — 31 transitions · 30 mappings · 6 records · 5 structs · 1,893 lines of Leo · Credits + USDCx + USAD live

### Records

| Record | Purpose |
|--------|---------|
| `AccessPass` | Subscriber's encrypted credential (creator, tier, expiry, privacy_level) |
| `CreatorReceipt` | Creator's payment proof (subscriber_hash, amount, pass_id) |
| `AuditToken` | Selective disclosure for third-party verification (scope_mask bitfield) |
| `SubscriptionTier` | Creator's tier ownership proof (tier_id, name_hash, price) |
| `ContentDeletion` | Proof of content removal (content_id, reason_hash) |
| `GiftToken` | Transferable subscription gift (recipient, creator, tier, expiry) |

### Structs

| Struct | Purpose |
|--------|---------|
| `TierKey` | Compound key for tier lookups (creator_hash + tier_id) |
| `BlindKey` | Nonce-rotated identity for blind subscriptions (subscriber + nonce) |
| `TipCommitData` | BHP256 commitment data for hidden tips |
| `DisputeKey` | Per-caller dispute rate-limiting key |
| `TrialKey` | Trial rate-limiting key (subscriber + creator) |

### 31 Transitions

<details>
<summary><strong>Creator Management (6)</strong></summary>

| Transition | Description |
|-----------|-------------|
| `register_creator` | Set base price, join platform |
| `create_custom_tier` | Dynamic pricing per tier (up to 20) |
| `update_tier_price` | Modify tier pricing |
| `deprecate_tier` | Sunset a tier |
| `withdraw_platform_fees` | Admin fee withdrawal |
| `withdraw_creator_rev` | Creator revenue withdrawal |

</details>

<details>
<summary><strong>Subscriptions — Credits (5)</strong></summary>

| Transition | Description |
|-----------|-------------|
| `subscribe` | Pay with Credits, receive AccessPass + CreatorReceipt |
| `renew` | Extend existing subscription |
| `subscribe_blind` | Nonce-rotated identity (Blind Renewal) |
| `renew_blind` | Unlinkable blind renewal |
| `subscribe_trial` | Ephemeral trial pass (20% of tier price, ~50 min / 1,000 blocks, one per creator) |

</details>

<details>
<summary><strong>Subscriptions — Stablecoins (4)</strong></summary>

| Transition | Description |
|-----------|-------------|
| `subscribe_usdcx` | Subscribe with USDCx stablecoin + MerkleProof compliance |
| `tip_usdcx` | Tip creator with USDCx |
| `subscribe_usad` | Subscribe with USAD stablecoin + MerkleProof compliance |
| `tip_usad` | Tip creator with USAD |

</details>

<details>
<summary><strong>Verification & Audit (3)</strong></summary>

| Transition | Description |
|-----------|-------------|
| `verify_access` | Prove access with revocation enforcement (zero-footprint) |
| `verify_tier_access` | Tier-gated verification with expiry check |
| `create_audit_token` | Selective disclosure (no finalize — zero on-chain trace) |

</details>

<details>
<summary><strong>Content Lifecycle (4)</strong></summary>

| Transition | Description |
|-----------|-------------|
| `publish_content` | On-chain content metadata with tier gating |
| `publish_encrypted_content` | With AES-256-GCM encryption commitment hash |
| `update_content` | Modify tier requirement or content hash |
| `delete_content` | Remove with ContentDeletion proof |

</details>

<details>
<summary><strong>Gifting & Transfer (3)</strong></summary>

| Transition | Description |
|-----------|-------------|
| `gift_subscription` | Gift AccessPass to another address |
| `redeem_gift` | Recipient claims gift, receives AccessPass |
| `transfer_pass` | Transfer subscription to new owner |

</details>

<details>
<summary><strong>Tipping (3)</strong></summary>

| Transition | Description |
|-----------|-------------|
| `tip` | Direct private tip to creator |
| `commit_tip` | Commit to tip amount (hidden via BHP256) |
| `reveal_tip` | Reveal and execute committed tip |

</details>

<details>
<summary><strong>Moderation & Proofs (3)</strong></summary>

| Transition | Description |
|-----------|-------------|
| `revoke_access` | Creator revokes a pass (checks pass_creator hash) |
| `dispute_content` | Subscriber-only disputes with per-caller rate limiting |
| `prove_subscriber_threshold` | Prove creator has N+ subscribers without revealing exact count — verifiable against Pedersen commitment |

</details>

### 30 Mappings

<details>
<summary><strong>All mappings (field-keyed, zero addresses)</strong></summary>

| Mapping | Type | Purpose |
|---------|------|---------|
| `tier_prices` | field => u64 | Tier pricing per creator |
| `subscriber_count` | field => u64 | Raw subscriber count (backward compat) |
| `total_revenue` | field => u64 | Raw revenue total (backward compat) |
| `platform_revenue` | u8 => u64 | Platform-wide 5% fee pool |
| `content_count` | field => u64 | Per-creator content count |
| `content_meta` | field => u8 | Content metadata (min tier) |
| `content_hashes` | field => field | Content hash commitments |
| `content_creator` | field => field | Content-to-creator mapping |
| `creator_tiers` | field => u64 | Tier configuration |
| `tier_count` | field => u64 | Number of tiers per creator |
| `tier_deprecated` | field => bool | Deprecated tier flags |
| `content_deleted` | field => bool | Deleted content flags |
| `gift_redeemed` | field => bool | Gift token redemption status |
| `nonce_used` | field => bool | Blind renewal nonce replay prevention |
| `encryption_commits` | field => field | AES-256-GCM encryption commitments |
| `access_revoked` | field => bool | Pass revocation status |
| `pass_creator` | field => field | Pass-to-creator hash mapping |
| `content_disputes` | field => u64 | Per-content dispute count |
| `tip_commitments` | field => bool | BHP256 tip commitment existence |
| `tip_revealed` | field => bool | Tip reveal status |
| `dispute_count_by_caller` | field => u64 | Per-caller dispute rate limiting |
| `subscription_by_tier` | field => u64 | Per-tier subscriber tracking |
| `trial_used` | field => bool | Trial rate-limiting (one per creator) |
| `total_creators` | u8 => u64 | Platform-wide creator count |
| `total_content` | u8 => u64 | Platform-wide content count |
| `subscriber_commit` | field => group | Pedersen commitment of subscriber count |
| `revenue_commit` | field => group | Pedersen commitment of total revenue |
| `blind_sum` | field => scalar | Aggregate subscriber blinding factors |
| `revenue_blind_sum` | field => scalar | Aggregate revenue blinding factors |
| `stablecoin_revenue` | field => u64 | Per-token stablecoin revenue tracking |

</details>

### Security Model

| Protection | Implementation |
|-----------|---------------|
| Zero-Address Finalize | No raw address in any finalize function — all 30 mappings field-keyed |
| Auth in Transition Layer | `self.caller` checks enforced by ZK proofs, never leaked to public state |
| Revocation Enforced | `verify_access` and `verify_tier_access` check `access_revoked` mapping |
| Sybil-Resistant Disputes | `dispute_content` requires AccessPass + per-caller rate limiting |
| Transfer Safety | `transfer_pass` checks revocation before allowing transfer |
| Nonce Replay Prevention | `nonce_used` mapping prevents blind renewal nonce reuse |
| Trial Rate-Limiting | `trial_used` mapping prevents multiple trials per creator per subscriber |
| Stablecoin Future Await | Stablecoin payment Futures are awaited before business logic executes |
| Pedersen Commitment Integrity | Blinding factors derived deterministically from pass_id via BHP256::hash_to_scalar |
| Anti-Abuse Constants | `MAX_CONTENT` (1000), `MAX_SUBS` (100K), `MIN_PRICE` (100), `MAX_TIER` (20) |

---

## Frontend

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind 4 · Framer Motion · Tiptap · Supabase · Upstash Redis

**134 components · 25 hooks · 22 routes · 341 tests**

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing — hero, feature showcase, live protocol stats, FAQ |
| `/explore` | Creator discovery — search, categories, sort, 3-column grid |
| `/creator/[address]` | Creator profile — tiers, content feed, subscribe/tip/gift |
| `/dashboard` | Creator dashboard — stats, rich text post creation, tier management, withdrawal |
| `/subscriptions` | Subscription manager — active passes, expiry countdowns, renewal |
| `/feed` | Content feed — All/Subscribed/Free tabs, search, article reader, image lightbox |
| `/messages` | Private messaging — E2E encrypted DMs, thread list, tier-gated conversations |
| `/verify` | Zero-footprint AccessPass verification |
| `/privacy` | Privacy model, threat analysis, comparison table |
| `/privacy-dashboard` | Interactive "What does the chain see?" visualization |
| `/docs` | Full documentation with tabbed interface |
| `/analytics` | Platform analytics and version timeline |
| `/explorer` | On-chain mapping queries (works without wallet) |
| `/developers` | Developer portal, SDK docs, companion program reference |
| `/notifications` | Notification center for subscriber and creator alerts |
| `/settings` | User preferences and wallet configuration |
| `/post/[id]` | Individual post view with comments and interactions |
| `/governance` | Private voting interface (companion program) |
| `/marketplace` | Reputation and sealed-bid auctions (companion program) |
| `/oracle` | USD-pegged pricing dashboard (companion program) |
| `/compare` | Platform comparison and competitive analysis |
| `/vision` | Use cases and roadmap |

### Frontend Highlights

- 5-wallet support (Shield, Leo, Fox, Puzzle, Soter) with 3-layer record fallback
- Rich text editor (Tiptap) with images, YouTube embeds, formatting
- AES-256-GCM content encryption with per-creator keys
- Token selector for Credits/USDCx/USAD payments
- Anonymous commenting with tier-only identity and threaded replies
- E2E encrypted private messaging with unread indicators
- Real-time push notifications via Supabase Realtime
- 4-step creator onboarding wizard
- Privacy mode selector (Standard / Blind / Trial)
- Content feed with Fuse.js search, article reader mode, image lightbox
- Profile hover cards with quick-subscribe action
- Scroll-reveal animations, glassmorphism design, violet accents
- Mobile-first responsive layout with bottom navigation
- Gated content feed with blur-locked posts and unlock prompts
- QR code generation for creator pages
- Real-time 4-step transaction status stepper
- Loading skeletons and route-level error boundaries
- SEO: sitemap, robots.txt, OpenGraph images
- IP-proxied API layer (`/api/aleo/*`) hides subscriber interest from third parties
- Command palette (keyboard shortcuts) for power users
- PWA install prompt for mobile users

---

## Developer Tools

### @veilsub/sdk

TypeScript SDK with full type coverage for building on VeilSub.

```bash
npm install @veilsub/sdk
```

```typescript
import type { AccessPass, CreatorStats, SubscribeParams } from '@veilsub/sdk'
import { MAPPING_NAMES, VeilSubError } from '@veilsub/sdk'
```

Includes typed interfaces for all 6 records, 5 structs, 30 mapping names, and transaction parameter builders for every transition.

### Monitor Bot

Autonomous daemon (`@veilsub/monitor-bot`) that continuously polls on-chain state and delivers notifications for subscription events — new subscribers, expirations, tips, disputes.

```bash
cd bot && npm install && npm run dev
```

### 9 Companion Programs

| Program | Purpose |
|---------|---------|
| `veilsub_extras_v1.aleo` | Anonymous reviews with nullifiers + on-chain lottery with ChaCha randomness |
| `veilsub_identity_v1.aleo` | Signature-verified content authorship + cross-chain ECDSA identity (Ethereum) + content timestamp notarization |
| `veilsub_governance_v1.aleo` | Private voting with homomorphic Pedersen aggregation — vote direction hidden via commitment deltas |
| `veilsub_marketplace_v1.aleo` | Homomorphic Pedersen reputation + sealed-bid content auctions (BHP256) + creator discovery badges |
| `veilsub_oracle_v1.aleo` | USD-pegged subscription pricing via `official_oracle_v2.aleo` — anti-manipulation guards + staleness detection |
| `veilsub_access_v1.aleo` | "Login with VeilSub" protocol — any Aleo app can gate resources behind VeilSub subscriptions |
| `veilsub_social_v1.aleo` | Paid DMs, community chat rooms, ephemeral stories with block-height expiry |
| `veilsub_collab_v1.aleo` | Revenue splits and co-authored content — atomic payment splitting in the ZK circuit |
| `hash_helper.aleo` | Poseidon2 hash utility for address and field hashing |

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Pratiikpy/Veil-Sub.git
cd Veil-Sub

# Frontend
cd frontend && npm install && npm run dev

# Smart contract
cd contracts/veilsub && leo build

# SDK
cd sdk && npm install && npm run build

# Monitor bot
cd bot && npm install && npm run dev
```

<details>
<summary><strong>Environment Variables</strong></summary>

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_PROGRAM_ID=veilsub_v30.aleo
NEXT_PUBLIC_DEPLOYED_PROGRAM_ID=veilsub_v30.aleo
NEXT_PUBLIC_ALEO_API_URL=https://api.explorer.provable.com/v1/testnet
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
UPSTASH_REDIS_REST_URL=<your-redis-url>
UPSTASH_REDIS_REST_TOKEN=<your-redis-token>
```

</details>

---

## Testing

```bash
cd frontend && npm test
```

> **341 tests** across **12 files** — all passing

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `utils.test.ts` | 67 | Core utility functions |
| `utilsEdgeCases.test.ts` | 60 | Edge cases for all utils |
| `configAdvanced.test.ts` | 31 | Cross-validation of creators, tiers, fees |
| `types.test.ts` | 27 | Type guards and validators |
| `contractHelpers.test.ts` | 26 | Contract interaction helpers |
| `errorMessagesAdvanced.test.ts` | 23 | Full error code coverage (137 codes) |
| `aleoUtils.test.ts` | 22 | Aleo-specific utilities |
| `e2eEncryption.test.ts` | 21 | End-to-end encryption (encrypt/decrypt/key derivation) |
| `config.test.ts` | 20 | Program configuration |
| `contentEncryption.test.ts` | 18 | AES-256-GCM content encryption |
| `encryption.test.ts` | 16 | Encryption helpers |
| `errorMessages.test.ts` | 10 | Error code mapping |

---

## Try It

| Step | Link | What You'll See |
|------|------|-----------------|
| Browse the app | [veil-sub.vercel.app](https://veil-sub.vercel.app) | Landing page with privacy architecture, live stats, creator discovery |
| Explore creators | [/explore](https://veil-sub.vercel.app/explore) | Search, filter, and discover creators across categories |
| Browse the feed | [/feed](https://veil-sub.vercel.app/feed) | Content feed with All/Subscribed/Free tabs, search, article reader |
| Send a message | [/messages](https://veil-sub.vercel.app/messages) | E2E encrypted private messaging with tier-gated threads |
| Query on-chain data | [/explorer](https://veil-sub.vercel.app/explorer) | Read live mapping values — no wallet needed |
| Verify an AccessPass | [/verify](https://veil-sub.vercel.app/verify) | Zero-footprint verification flow |
| Review the privacy model | [/privacy](https://veil-sub.vercel.app/privacy) | What the chain sees vs. what stays hidden |
| Read the docs | [/docs](https://veil-sub.vercel.app/docs) | All 31 transitions documented with privacy levels |

---

## Version History

<details>
<summary><strong>Full changelog (v4 — v30)</strong></summary>

| Version | Key Changes |
|---------|------------|
| v4-v8 | Core subscriptions, AccessPass records, content publishing, audit tokens |
| v9 | Dynamic creator tiers, content CRUD lifecycle |
| v10 | Subscription gifting (GiftToken), refund escrow, fee withdrawal |
| v11 | **Blind Renewal** — nonce-rotated subscriber identity (novel privacy technique) |
| v12 | Encrypted content delivery, access revocation, content disputes |
| v13 | Ternary safety fixes, get_or_use pattern |
| v14 | **BHP256 commit-reveal tipping** — hidden tip amounts until reveal |
| v15 | **Security hardening** — revocation enforcement, Sybil-resistant disputes, subscription transfer |
| v16-v21 | Referral system, Pedersen commitments, Poseidon2 optimization, analytics epochs |
| v23 | **Privacy overhaul** — zero addresses in finalize, all field-keyed mappings |
| v24 | Content auth fix, on-chain expiry enforcement |
| v25 | Threshold proofs (`prove_subscriber_threshold`), platform-wide stats mappings |
| v26 | Trial passes — ephemeral ~50 min (1,000 blocks) access at 20% of tier price |
| v27 | Scoped audit tokens, trial rate-limiting, gift revocation fix |
| v28 | Triple token support (Credits + USDCx + USAD). 4 stablecoin transitions, MerkleProof compliance. 9 companion programs. TypeScript SDK. Monitor bot. Content encryption (AES-256-GCM). Rich text editor. Privacy dashboard. Creator onboarding wizard. Push notifications. |
| v29 | **Deployed to testnet.** Homomorphic Pedersen commitment mappings (`subscriber_commit`, `revenue_commit`, `blind_sum`, `revenue_blind_sum`). Additively homomorphic commitments for aggregate privacy. Error codes ERR_120-137. |
| **v30** | **Full stablecoin deployment.** USDCx and USAD transitions live on testnet. `veilsub_payments_v1.aleo` companion for stablecoin transfers. Anonymous comments and threaded replies. E2E encrypted private messaging with tier-gated threads. Content feed with search, tabs, article reader. Profile hover cards. Post interactions (like/comment/share/tip/bookmark). Note composer. Token selector UI. Recommendations engine. **31 transitions, 30 mappings, 3 token standards, 134 components, 25 hooks, 22 routes.** |

</details>

---

## Quick Verification

| What to Verify | How |
|---------------|-----|
| Contract compiles | `cd contracts/veilsub && leo build` |
| Zero addresses in finalize | Search `main.leo` for `address` in any finalize block — you will find none |
| On-chain state | [AleoScan](https://testnet.aleoscan.io/program?id=veilsub_v30.aleo) |
| 31 transitions | `grep "transition " contracts/veilsub/src/main.leo \| wc -l` |
| 30 mappings | `grep "mapping " contracts/veilsub/src/main.leo \| wc -l` |
| 6 record types | Search `record` in `main.leo` |
| Blind Subscription Protocol | Search `BlindKey` in `main.leo` |
| Pedersen commitments | Search `subscriber_commit` or `revenue_commit` in `main.leo` |
| Commit-reveal tipping | Search `BHP256::commit_to_field` in `main.leo` |
| Stablecoin transitions | Search `subscribe_usdcx` or `subscribe_usad` in `main.leo` |
| SDK types | `sdk/src/types.ts` — full typed interface for all transitions |
| Frontend live | [veil-sub.vercel.app](https://veil-sub.vercel.app) |
| Privacy dashboard | [/privacy-dashboard](https://veil-sub.vercel.app/privacy-dashboard) |
| Message system | [/messages](https://veil-sub.vercel.app/messages) |

---

## Deployment

| Field | Value |
|-------|-------|
| **Program** | `veilsub_v30.aleo` |
| **Network** | Aleo Testnet |
| **Deployment TX** | `at1h8x9mkezahddgclxwull20an02kkcf7e87yv2haul9kksnm5yggszdksct` |
| **Deployment Cost** | 46.575 ALEO |
| **Frontend URL** | [https://veil-sub.vercel.app](https://veil-sub.vercel.app) |
| **Deployer Address** | `aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk` |
| **Leo Version** | 3.4.0 |
| **Aleo SDK** | 0.16.0 |
| **Dependencies** | `credits.aleo`, `test_usdcx_stablecoin.aleo`, `test_usad_stablecoin.aleo` |

---

<div align="center">

**MIT License**

Built with zero-knowledge proofs on [Aleo](https://aleo.org)

</div>

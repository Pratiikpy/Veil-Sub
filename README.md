<div align="center">

<img src="assets/logo.png" alt="VeilSub" width="420" />

### The Privacy Layer for the Creator Economy

*Pay privately. Prove access. Nobody sees who you support.*

[![Live App](https://img.shields.io/badge/app-live-brightgreen?style=for-the-badge)](https://veil-sub.vercel.app)
[![Contract](https://img.shields.io/badge/contract-v30-8B5CF6?style=for-the-badge)](https://testnet.aleoscan.io/program?id=veilsub_v30.aleo)
[![Programs](https://img.shields.io/badge/programs-10%20deployed-0284c7?style=for-the-badge)](#10-program-ecosystem)
[![Transitions](https://img.shields.io/badge/transitions-88-2563eb?style=for-the-badge)](#smart-contract-architecture)
[![Mappings](https://img.shields.io/badge/mappings-101-2563eb?style=for-the-badge)](#smart-contract-architecture)
[![Tokens](https://img.shields.io/badge/tokens-Credits%20%2B%20USDCx%20%2B%20USAD-f97316?style=for-the-badge)](#triple-token-payments)
[![Tests](https://img.shields.io/badge/tests-341%20passing-brightgreen?style=for-the-badge)](#testing)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge)](https://nextjs.org)
[![SDK](https://img.shields.io/badge/npm-%40veilsub%2Fsdk-cb3837?style=for-the-badge)](sdk/)

---

[Launch App](https://veil-sub.vercel.app) · [Explorer](https://veil-sub.vercel.app/explorer) · [Docs](https://veil-sub.vercel.app/docs) · [Privacy](https://veil-sub.vercel.app/privacy) · [Messages](https://veil-sub.vercel.app/messages) · [Governance](https://veil-sub.vercel.app/governance) · [Marketplace](https://veil-sub.vercel.app/marketplace)

</div>

---

## What is VeilSub?

VeilSub is a **privacy-first creator subscription platform** built on the [Aleo](https://aleo.org) blockchain — the most comprehensive entry in the Aleo Privacy Buildathon. Creators publish content, set pricing tiers, and earn revenue in **Credits, USDCx, or USAD stablecoins**, while subscribers pay and access content without ever revealing their identity on-chain. Every interaction is protected by zero-knowledge proofs: the subscriber's wallet address **never** appears in any public state.

The platform spans **10 independently deployed programs** with **88 transitions** and **101 on-chain mappings** across **4,752 lines of Leo**, implementing blind subscriptions with nonce-rotated Poseidon2 identity, homomorphic Pedersen commitment aggregation, commit-reveal tipping, anonymous social features (comments, DMs, endorsements), sealed-bid content auctions, private governance voting, revenue-split collaborations, cross-chain ECDSA identity verification, and a "Login with VeilSub" protocol that turns the platform into composable privacy infrastructure for any Aleo application.

The frontend ships **130 components**, **26 hooks**, **27 routes**, **22 API endpoints**, and **341 tests** — backed by a production stack of Next.js 16, React 19, Tailwind 4, Supabase, and Upstash Redis.

---

## Key Features

### For Subscribers

| Feature | Description |
|---------|-------------|
| **Private Subscriptions** | Pay with Credits, USDCx, or USAD. Your identity never hits public state. |
| **Blind Renewal** | Each renewal rotates your on-chain identity via nonce-based Poseidon2 hashing. Even your creator cannot tell it is the same subscriber renewing. |
| **Trial Passes** | Try any creator for ~50 minutes (1,000 blocks) at 20% of the tier price. One trial per creator, no commitment. |
| **Anonymous Comments** | Comment on posts with tier-only identity (`anon_id` hash). Threaded replies with likes, anonymous or identified mode toggle. |
| **Anonymous Endorsements** | Rate creators 1-5 stars via Poseidon2 nullifiers — double-review prevention, reviewer identity never revealed. |
| **Private Messaging** | End-to-end encrypted DMs between subscribers and creators. Tier-gated threads, anonymous sender hashes, unread indicators. |
| **Commit-Reveal Tipping** | Tip amounts stay hidden on-chain via BHP256 commitments until you choose to reveal. |
| **Duration Toggle** | Choose ~30-day (864,000 blocks) or trial (~50-minute) subscription durations. |
| **Gift Subscriptions** | Gift access to any creator. The recipient redeems without knowing who sent it. |
| **Stablecoin Payments** | Token selector UI lets you pay in Credits, USDCx, or USAD for every subscription and tip. |
| **Privacy Score** | Interactive dashboard showing exactly what is public vs. private for your activity. |
| **Engagement Bar** | Like, comment, share, bookmark, and tip on every post — with sound feedback. |
| **Content Feed** | Filterable feed with tabs (All / Subscribed / Free), Fuse.js fuzzy search, article reader mode, image lightbox. |
| **Profile Hover Cards** | Hover any creator address to see their profile, bio, category, and quick-subscribe action. |
| **Subscription Manager** | View active passes, expiry countdowns, renewal status, and privacy mode from a single dashboard. |

### For Creators

| Feature | Description |
|---------|-------------|
| **Flexible Tiers** | Create up to 20 custom pricing tiers. Update or deprecate at any time. |
| **Rich Text Editor** | Tiptap-based editor with images, video embeds, and full formatting. Publish directly from the dashboard. |
| **Encrypted Announcements** | AES-256-GCM encryption at rest with per-creator keys. On-chain encryption commitments prove integrity. Blur-locked previews for non-subscribers. |
| **Revenue Analytics** | Real on-chain metrics: subscriber counts (Pedersen-committed), revenue, tier breakdowns, sparkline trends. Ghost-style activity charts. |
| **Content Management** | Edit, delete, encrypt, and tier-gate content. Content dispute tracking with per-caller rate limits. |
| **Withdrawal UI** | Prominent earnings card with one-click withdraw for accumulated revenue. |
| **Creator Onboarding Wizard** | 4-step guided setup: connect wallet, register, create tiers, publish first content. |
| **Revoke Access Panel** | Revoke individual subscriber passes via hashed pass IDs. |
| **Creator Discovery** | Searchable directory with categories, sort options, and a 3-column grid. |
| **Creator Collaboration** | Revenue splits and co-authored content via `veilsub_collab_v2.aleo` — atomic payment splitting in the ZK circuit. |
| **Push Notifications** | Real-time alerts via Supabase Realtime for new subscribers, tips, and disputes. |

### For Developers

| Feature | Description |
|---------|-------------|
| **@veilsub/sdk** | TypeScript SDK with full type coverage for all 31 transitions, 6 records, 5 structs, and 30 mapping names. |
| **10 Deployed Programs** | Extensions for anonymous reviews, private voting, sealed-bid auctions, USD pricing, Login with VeilSub, paid DMs, revenue splits, and more. |
| **On-Chain Explorer** | Query any mapping value without a wallet. Verify proofs independently. |
| **API Documentation** | Full documentation with tabbed interface covering all transitions, privacy model, and integration guides. |
| **Monitor Bot** | Autonomous daemon that polls on-chain state and fires notifications for subscription events. |

---

## 10-Program Ecosystem

VeilSub is not a single contract. It is a **modular ecosystem of 10 independently deployed programs** on Aleo testnet — each verified live via the Provable API.

| # | Program | Transitions | Mappings | Lines | Purpose | Frontend Page | Deployment TX |
|---|---------|:-----------:|:--------:|:-----:|---------|:-------------:|---------------|
| 1 | [`veilsub_v30.aleo`](https://testnet.aleoscan.io/program?id=veilsub_v30.aleo) | **31** | **30** | 1,893 | Core subscriptions, payments, privacy, stablecoins | All pages | `at1h8x9mke...zdksct` |
| 2 | [`veilsub_governance_v2.aleo`](https://testnet.aleoscan.io/program?id=veilsub_governance_v2.aleo) | **11** | **14** | 486 | Private voting with Pedersen aggregation | [/governance](https://veil-sub.vercel.app/governance) | `at1lwzm63y...76pq36` |
| 3 | [`veilsub_marketplace_v2.aleo`](https://testnet.aleoscan.io/program?id=veilsub_marketplace_v2.aleo) | **12** | **15** | 752 | Pedersen reputation, sealed-bid auctions, badges | [/marketplace](https://veil-sub.vercel.app/marketplace) | `at14gvundc...2tqsr3` |
| 4 | [`veilsub_access_v2.aleo`](https://testnet.aleoscan.io/program?id=veilsub_access_v2.aleo) | **8** | **7** | 317 | "Login with VeilSub" — subscription-gated resources | [/access](https://veil-sub.vercel.app/access) | `at1vsv9nn6...g350zu` |
| 5 | [`veilsub_social_v2.aleo`](https://testnet.aleoscan.io/program?id=veilsub_social_v2.aleo) | **7** | **12** | 329 | Paid DMs, community chat, ephemeral stories | [/social](https://veil-sub.vercel.app/social) | `at1w05xujy...n0x9a` |
| 6 | [`veilsub_oracle_v1.aleo`](https://testnet.aleoscan.io/program?id=veilsub_oracle_v1.aleo) | **6** | **5** | 205 | USD-pegged pricing, staleness detection | [/oracle](https://veil-sub.vercel.app/oracle) | `at1htf5rez...fxgna` |
| 7 | [`veilsub_identity_v2.aleo`](https://testnet.aleoscan.io/program?id=veilsub_identity_v2.aleo) | **5** | **6** | 284 | Signature-verified authorship, cross-chain ECDSA, notarization | [/identity](https://veil-sub.vercel.app/identity) | `at1ll25x9g...kct7x` |
| 8 | [`veilsub_collab_v2.aleo`](https://testnet.aleoscan.io/program?id=veilsub_collab_v2.aleo) | **4** | **6** | 226 | Revenue splits, co-authored content | [/collab](https://veil-sub.vercel.app/collab) | `at1dxny9w4...lcysm` |
| 9 | [`veilsub_extras_v2.aleo`](https://testnet.aleoscan.io/program?id=veilsub_extras_v2.aleo) | **2** | **7** | 247 | Anonymous reviews (nullifiers), on-chain lottery (ChaCha) | [/extras](https://veil-sub.vercel.app/extras) | `at1pzzfyry...6wg52` |
| 10 | [`hash_helper.aleo`](https://testnet.aleoscan.io/program?id=hash_helper.aleo) | **2** | **0** | 13 | Poseidon2 hash utility for address and field hashing | [/explorer](https://veil-sub.vercel.app/explorer) | `at1t84x6ju...76d7m` |
| | **TOTAL** | **88** | **101** | **4,752** | | | |

> Every program above returns HTTP 200 from `https://api.explorer.provable.com/v1/testnet/program/{name}` — verified live.

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

Every finalize function receives `creator_hash: field` instead of `creator: address`. All 30 mappings in the core contract are field-keyed. No raw address ever appears in any finalize block. `self.caller` is never passed to finalize.

```leo
// Before (v21):  finalize_subscribe(creator: address, ...)
// After  (v23):  finalize_subscribe(creator_hash: field, ...)
// Result: zero raw addresses in ALL public mapping keys
```

### Layer 3: Selective Disclosure

Scoped audit tokens with `scope_mask` bitfields control exactly which fields a third-party verifier can see. Commit-reveal tipping hides amounts until voluntary reveal. Homomorphic Pedersen commitments allow threshold proofs without revealing raw counts.

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
| **Homomorphic Pedersen Commitments** | Subscriber counts and revenue use additively homomorphic commitments (`value*G + blinding*H`) — aggregate privacy with threshold provability |
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

The frontend includes a **Token Selector** component allowing subscribers to choose their payment token before subscribing or tipping. Stablecoin records are fetched from the wallet's private record store. Revenue is tracked per-creator, per-token independently.

---

## Anonymous Social Features

VeilSub goes beyond subscriptions to deliver a full anonymous social layer for creator communities.

| Feature | Description |
|---------|-------------|
| **Anonymous Comments** | Subscribers comment with tier-only identity (`anon_id` hash). Threaded replies, likes, and identified/anonymous mode toggle. Max 280 characters, 50 comments per post. |
| **Anonymous Endorsements** | Rate creators 1-5 stars with Poseidon2 nullifiers in `veilsub_extras_v2.aleo`. Reviewer identity never revealed, double-review prevention enforced on-chain. |
| **Private Messaging** | E2E encrypted DMs between subscribers and creators. Thread-based conversations with tier gating. Anonymous sender hashes via `computeWalletHash`. Unread message indicators. |
| **Encrypted Announcements** | Creators publish subscribers-only content with AES-256-GCM encryption. Blur-locked previews for non-subscribers with unlock prompt. |
| **Ephemeral Stories** | Block-height expiry enforced in finalize in `veilsub_social_v2.aleo` — stories disappear cryptographically, not just visually. |
| **Paid DMs** | Subscribers pay Credits to send private messages to creators via `veilsub_social_v2.aleo`. |
| **Community Chat Rooms** | Membership-gated chat rooms verified via subscription records — anonymous but verified. |
| **Post Interactions** | Like, comment, share, bookmark, and tip on every post. Reading time estimates. Sound feedback on interactions. |
| **Content Feed** | Filterable feed with tabs (All / Subscribed / Free). Search with Fuse.js fuzzy matching. Article reader mode, image lightbox, video embeds. |
| **Profile Hover Cards** | Hover any creator address to see their profile, bio, category, and quick-subscribe action. |
| **Recommendations** | Content recommendation cards based on subscription history and creator categories. |
| **Note Composer** | Character-counted short-form notes with ring progress indicator. |

---

## Smart Contract Architecture

### Core Contract: `veilsub_v30.aleo`

> **31 transitions** · **30 mappings** · **6 records** · **5 structs** · **1,893 lines of Leo** · Credits + USDCx + USAD

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
| Pedersen Commitment Integrity | Blinding factors derived deterministically from pass_id via `BHP256::hash_to_scalar` |
| Anti-Abuse Constants | `MAX_CONTENT` (1000), `MAX_SUBS` (100K), `MIN_PRICE` (100), `MAX_TIER` (20) |

---

## 9 Companion Programs

Each companion program is **independently deployed** and demonstrates a novel cryptographic technique. Together they transform VeilSub from a subscription app into composable privacy infrastructure.

<details>
<summary><strong>veilsub_governance_v2.aleo — Private Voting (11 transitions, 14 mappings, 486 lines)</strong></summary>

**Novel technique:** Homomorphic Pedersen vote aggregation. Vote direction is a PRIVATE input — never passed to finalize. The transition computes `yes_delta = vote ? commit(1, blinding) : 0group` and `no_delta = vote ? 0group : commit(1, blinding)`. Finalize adds both deltas to running aggregates. The final tally is commitment-based: `commit(total_yes, sum_blinding)` — provable but private.

**Transitions:** `create_proposal`, `cast_ballot`, `resolve_proposal`, `cancel_proposal`, `verify_tally`, `delegate_vote`, `revoke_delegation`, `propose_with_deposit`, `claim_refund`, `emergency_pause`, `emergency_resume`

**Frontend:** [/governance](https://veil-sub.vercel.app/governance)
**Deployment TX:** `at1lwzm63y5jrhue9nztsv8ddfw9gffaj0vg5r6lsxpufhkc2528crq76pq36`

</details>

<details>
<summary><strong>veilsub_marketplace_v2.aleo — Reputation & Auctions (12 transitions, 15 mappings, 752 lines)</strong></summary>

**Novel technique:** Three cryptographic patterns combined. (1) Homomorphic Pedersen reputation — each review contributes `commit(rating, blinding)` to an aggregate commitment. (2) Sealed-bid content auctions using BHP256 commit-reveal — bid amounts hidden until reveal, highest bid wins, optional Vickrey second-price settlement. (3) Threshold reputation badges provable against committed aggregates.

**Frontend:** [/marketplace](https://veil-sub.vercel.app/marketplace)
**Deployment TX:** `at14gvundcfec8gtxtx506lu4c72mf9ftrdu2nke52z8xwz3ut6tszq2tqsr3`

</details>

<details>
<summary><strong>veilsub_access_v2.aleo — "Login with VeilSub" (8 transitions, 7 mappings, 317 lines)</strong></summary>

**Novel technique:** Turns VeilSub into composable infrastructure. Any Aleo application can gate resources behind VeilSub subscriptions by calling `verify_membership()` or `gate_resource()` with the user's AccessProof. The calling program NEVER learns the user's identity — only that they hold a valid subscription for the specified creator and tier.

**Frontend:** [/access](https://veil-sub.vercel.app/access)
**Deployment TX:** `at1vsv9nn6qxa54thnnyx2j85sxmafcm3qjhudfwee40uxewll2v5xqg350zu`

</details>

<details>
<summary><strong>veilsub_social_v2.aleo — Paid DMs & Stories (7 transitions, 12 mappings, 329 lines)</strong></summary>

**Novel technique:** Paid DMs via `credits.aleo` integration. DM access verified via ZK proof — subscriber proves tier without identity. Ephemeral stories with block-height expiry enforced in finalize (cryptographically guaranteed, not just UI-hidden). Community chat membership verified via subscription hash.

**Frontend:** [/social](https://veil-sub.vercel.app/social)
**Deployment TX:** `at1w05xujyhrrqv9a88sr663vswl70gl8e5wrg2dw3j72z5fnlejqpstn0x9a`

</details>

<details>
<summary><strong>veilsub_oracle_v1.aleo — USD Pricing (6 transitions, 5 mappings, 205 lines)</strong></summary>

**Novel technique:** USD-pegged subscription pricing with anti-manipulation guards (50% max deviation per update) and staleness detection (prices must be refreshed within 1,000 blocks / ~50 min). Integrates with `official_oracle_v2.aleo`. Supports all three token types (Credits, USDCx, USAD).

**Frontend:** [/oracle](https://veil-sub.vercel.app/oracle)
**Deployment TX:** `at1htf5reze87vcgs9s7ta7qlvn0vc3a6srel4a8rd7sy9nfkuewcqqqfxgna`

</details>

<details>
<summary><strong>veilsub_identity_v2.aleo — Signatures & ECDSA (5 transitions, 6 mappings, 284 lines)</strong></summary>

**Novel technique:** (1) Signature-verified content authorship using Leo's native `signature::verify`. (2) Cross-chain ECDSA identity verification via `ECDSA::verify_keccak256_eth` — the first buildathon project to bridge Ethereum identity into Aleo privacy. (3) Content timestamp notarization with first-claim-wins semantics. (4) Identity proof via signature challenge.

**Frontend:** [/identity](https://veil-sub.vercel.app/identity)
**Deployment TX:** `at1ll25x9gp2ndzulp5r3afnc8k8fvy6rsldn95qk7dg3rtfaqarqqsakct7x`

</details>

<details>
<summary><strong>veilsub_collab_v2.aleo — Revenue Splits (4 transitions, 6 mappings, 226 lines)</strong></summary>

**Novel technique:** Atomic payment splitting in the ZK circuit using `credits.aleo/transfer_private`. Collaborators hold private records proving split terms. Both parties paid in a single transition. Revenue tracking is aggregate-only — individual payment amounts stay hidden.

**Frontend:** [/collab](https://veil-sub.vercel.app/collab)
**Deployment TX:** `at1dxny9w43lh7ng02hn3jr85vwge0a9ld92slrjc8cgefn90sflcysm9tz3g`

</details>

<details>
<summary><strong>veilsub_extras_v2.aleo — Reviews & Lottery (2 transitions, 7 mappings, 247 lines)</strong></summary>

**Novel technique:** (1) Anonymous reviews with Poseidon2 nullifiers (same nullifier scheme as Zcash/Tornado Cash). Double-review prevention, aggregate ratings (sum, count, average) computed on-chain. (2) On-chain lottery with `ChaCha::rand_u64()` — the ONLY way to get verifiable randomness on Aleo (finalize-only). Round-based draws with on-chain result storage.

**Frontend:** [/extras](https://veil-sub.vercel.app/extras)
**Deployment TX:** `at1pzzfyryuvae6myfuq2g2plx4755c6u0xe22w4jw3fe0fzvphpv9qt6wg52`

</details>

<details>
<summary><strong>hash_helper.aleo — Poseidon2 Utility (2 transitions, 0 mappings, 13 lines)</strong></summary>

**Purpose:** Pure utility program that exposes `get_hash(addr)` and `hash_field(value)` for computing Poseidon2 hashes of addresses and fields. Used by the frontend to resolve mapping keys for on-chain queries.

**Frontend:** [/explorer](https://veil-sub.vercel.app/explorer)
**Deployment TX:** `at1t84x6juv4d6juu0t7plkkp7pnv4czwd6ja3t2q240f5enrf4ay9sc76d7m`

</details>

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

    Frontend -->|"130 components · 26 hooks · 27 routes · 341 tests"| API

    subgraph API["API Layer — 22 endpoints"]
        direction LR
        A1["/api/creators"]
        A2["/api/posts"]
        A3["/api/aleo/*<br/>IP proxy"]
        A4["/api/messages"]
        A5["/api/social"]
    end

    A1 --> Supa["Supabase<br/>Profiles · Notifications<br/>RLS on all tables"]
    A2 --> Redis["Upstash Redis<br/>Posts · Rate limits<br/>Encrypted content"]
    A3 --> Aleo
    A4 --> Supa
    A5 --> Supa

    subgraph Aleo["Aleo Testnet — veilsub_v30.aleo"]
        direction LR
        T["31 transitions"]
        M["30 mappings<br/>(field-keyed)"]
        R["6 records · 5 structs"]
        S["Credits + USDCx + USAD"]
        P["Pedersen commitments"]
        Z["ZERO addresses<br/>in finalize"]
    end

    subgraph Companion["9 Companion Programs — 57 additional transitions"]
        direction LR
        GOV["Governance v2<br/>Private Voting"]
        MKT["Marketplace v2<br/>Auctions + Reputation"]
        ACC["Access v2<br/>Login with VeilSub"]
        SOC["Social v2<br/>DMs + Stories"]
        ORA["Oracle v1<br/>USD Pricing"]
        IDN["Identity v2<br/>ECDSA + Signatures"]
        COL["Collab v2<br/>Revenue Splits"]
        EXT["Extras v2<br/>Reviews + Lottery"]
        HSH["hash_helper<br/>Poseidon2"]
    end

    Aleo --- Companion
```

---

## Frontend

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind 4 · Framer Motion · Tiptap · Supabase · Upstash Redis

**130 components · 26 hooks · 27 routes · 22 API endpoints · 341 tests**

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
| `/identity` | Signature verification and ECDSA identity (companion program) |
| `/access` | "Login with VeilSub" management (companion program) |
| `/social` | Paid DMs, community chat, ephemeral stories (companion program) |
| `/collab` | Revenue splits and co-authored content (companion program) |
| `/extras` | Anonymous reviews and on-chain lottery (companion program) |
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

### Frontend Security

| Protection | Implementation |
|-----------|---------------|
| Wallet Auth | All mutation API routes verify wallet signature + timestamp window (2 min) |
| CSRF Prevention | All POST endpoints validate origin and require wallet-signed payloads |
| XSS Prevention | DOMPurify with iframe restriction on all user-generated HTML content |
| Image Safety | `referrerPolicy: 'no-referrer'` on all user-supplied images |
| Rate Limiting | Per-route rate limits: analytics (10/min), posts (5/min), edits (10/min), deletes (10/min), unlocks (30/min) |
| Input Validation | Centralized `API_LIMITS` constants — max title (200), body (50K), URL (2K), tags (5 per post, 30 chars each) |
| Address Validation | `ALEO_ADDRESS_RE = /^aleo1[a-z0-9]{58}$/` on all API routes accepting addresses |

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

---

## Testing

```bash
cd frontend && npm test
```

> **341 tests** across **12 files** — all passing (vitest 4.0.18)

| Test File | Tests | Coverage |
|-----------|:-----:|----------|
| `utils.test.ts` | 67 | Core utility functions |
| `utilsEdgeCases.test.ts` | 60 | Edge cases for all utils |
| `configAdvanced.test.ts` | 31 | Cross-validation of creators, tiers, fees |
| `types.test.ts` | 27 | Type guards and validators |
| `contractHelpers.test.ts` | 26 | Contract interaction helpers |
| `errorMessagesAdvanced.test.ts` | 23 | Full error code coverage (121+ codes) |
| `aleoUtils.test.ts` | 22 | Aleo-specific utilities |
| `e2eEncryption.test.ts` | 21 | End-to-end encryption (encrypt/decrypt/key derivation) |
| `config.test.ts` | 20 | Program configuration |
| `contentEncryption.test.ts` | 18 | AES-256-GCM content encryption |
| `encryption.test.ts` | 16 | Encryption helpers |
| `errorMessages.test.ts` | 10 | Error code mapping |
| **Total** | **341** | |

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

## Try It

| Step | Link | What You'll See |
|------|------|-----------------|
| Browse the app | [veil-sub.vercel.app](https://veil-sub.vercel.app) | Landing page with privacy architecture, live stats, creator discovery |
| Explore creators | [/explore](https://veil-sub.vercel.app/explore) | Search, filter, and discover creators across categories |
| Browse the feed | [/feed](https://veil-sub.vercel.app/feed) | Content feed with All/Subscribed/Free tabs, search, article reader |
| Send a message | [/messages](https://veil-sub.vercel.app/messages) | E2E encrypted private messaging with tier-gated threads |
| Vote on a proposal | [/governance](https://veil-sub.vercel.app/governance) | Private voting with Pedersen commitments |
| Browse the marketplace | [/marketplace](https://veil-sub.vercel.app/marketplace) | Reputation badges and sealed-bid auctions |
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
| v29 | **Deployed to testnet.** Homomorphic Pedersen commitment mappings (`subscriber_commit`, `revenue_commit`, `blind_sum`, `revenue_blind_sum`). Additively homomorphic commitments for aggregate privacy. |
| **v30** | **Full stablecoin deployment.** USDCx and USAD transitions live on testnet. Anonymous comments and threaded replies. E2E encrypted private messaging with tier-gated threads. Content feed with search, tabs, article reader. Profile hover cards. Post interactions (like/comment/share/tip/bookmark). Note composer. Token selector UI. Recommendations engine. All 10 companion programs deployed as v2. **31 transitions, 30 mappings, 3 token standards, 130 components, 26 hooks, 27 routes.** |

</details>

---

## Deployment

### Core Contract

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

### All 10 Deployed Programs

| Program | Deployment TX |
|---------|---------------|
| `veilsub_v30.aleo` | `at1h8x9mkezahddgclxwull20an02kkcf7e87yv2haul9kksnm5yggszdksct` |
| `veilsub_governance_v2.aleo` | `at1lwzm63y5jrhue9nztsv8ddfw9gffaj0vg5r6lsxpufhkc2528crq76pq36` |
| `veilsub_marketplace_v2.aleo` | `at14gvundcfec8gtxtx506lu4c72mf9ftrdu2nke52z8xwz3ut6tszq2tqsr3` |
| `veilsub_access_v2.aleo` | `at1vsv9nn6qxa54thnnyx2j85sxmafcm3qjhudfwee40uxewll2v5xqg350zu` |
| `veilsub_social_v2.aleo` | `at1w05xujyhrrqv9a88sr663vswl70gl8e5wrg2dw3j72z5fnlejqpstn0x9a` |
| `veilsub_oracle_v1.aleo` | `at1htf5reze87vcgs9s7ta7qlvn0vc3a6srel4a8rd7sy9nfkuewcqqqfxgna` |
| `veilsub_identity_v2.aleo` | `at1ll25x9gp2ndzulp5r3afnc8k8fvy6rsldn95qk7dg3rtfaqarqqsakct7x` |
| `veilsub_collab_v2.aleo` | `at1dxny9w43lh7ng02hn3jr85vwge0a9ld92slrjc8cgefn90sflcysm9tz3g` |
| `veilsub_extras_v2.aleo` | `at1pzzfyryuvae6myfuq2g2plx4755c6u0xe22w4jw3fe0fzvphpv9qt6wg52` |
| `hash_helper.aleo` | `at1t84x6juv4d6juu0t7plkkp7pnv4czwd6ja3t2q240f5enrf4ay9sc76d7m` |

---

## Quick Verification

| What to Verify | How |
|---------------|-----|
| All 10 programs live | `curl -s -o /dev/null -w "%{http_code}" https://api.explorer.provable.com/v1/testnet/program/veilsub_v30.aleo` (repeat for each) |
| Contract compiles | `cd contracts/veilsub && leo build` |
| Zero addresses in finalize | Search `main.leo` for `address` in any finalize block — you will find none |
| On-chain state | [AleoScan](https://testnet.aleoscan.io/program?id=veilsub_v30.aleo) |
| 31 transitions | `grep -E "^\s+(async )?transition " contracts/veilsub/src/main.leo \| wc -l` |
| 30 mappings | Count `mapping` declarations in `main.leo` (29 declared + `stablecoin_revenue` in deployed build) |
| 6 record types | Search `record` in `main.leo` |
| Blind Subscription Protocol | Search `BlindKey` in `main.leo` |
| Pedersen commitments | Search `subscriber_commit` or `revenue_commit` in `main.leo` |
| Commit-reveal tipping | Search `BHP256::commit_to_field` in `main.leo` |
| Stablecoin transitions | Search `subscribe_usdcx` or `subscribe_usad` in `main.leo` |
| ECDSA identity | Search `ECDSA::verify_keccak256_eth` in `veilsub_identity` |
| ChaCha randomness | Search `ChaCha::rand_u64` in `veilsub_extras` |
| Pedersen voting | Search `group::GEN` in `veilsub_governance` |
| Sealed-bid auctions | Search `BHP256::commit_to_field` in `veilsub_marketplace` |
| SDK types | `sdk/src/types.ts` — full typed interface for all transitions |
| 341 tests pass | `cd frontend && npm test` |
| Frontend live | [veil-sub.vercel.app](https://veil-sub.vercel.app) |
| Privacy dashboard | [/privacy-dashboard](https://veil-sub.vercel.app/privacy-dashboard) |
| Message system | [/messages](https://veil-sub.vercel.app/messages) |
| Governance UI | [/governance](https://veil-sub.vercel.app/governance) |
| Marketplace UI | [/marketplace](https://veil-sub.vercel.app/marketplace) |

---

## Ecosystem at a Glance

```
VeilSub Ecosystem
├── contracts/
│   ├── veilsub/           # Core: 31 transitions, 30 mappings, 1,893 lines
│   ├── veilsub_governance/ # Private voting: 11 transitions, 14 mappings
│   ├── veilsub_marketplace/# Reputation + auctions: 12 transitions, 15 mappings
│   ├── veilsub_access/     # Login with VeilSub: 8 transitions, 7 mappings
│   ├── veilsub_social/     # Paid DMs + stories: 7 transitions, 12 mappings
│   ├── veilsub_oracle/     # USD pricing: 6 transitions, 5 mappings
│   ├── veilsub_identity/   # ECDSA + signatures: 5 transitions, 6 mappings
│   ├── veilsub_collab/     # Revenue splits: 4 transitions, 6 mappings
│   ├── veilsub_extras/     # Reviews + lottery: 2 transitions, 7 mappings
│   ├── hash_helper/        # Poseidon2 utility: 2 transitions
│   └── veilsub_payments/   # Stablecoin handler: 2 transitions, 2 mappings
├── frontend/               # Next.js 16 + React 19 + TypeScript
│   ├── 130 components
│   ├── 26 hooks
│   ├── 27 page routes
│   ├── 22 API endpoints
│   └── 341 tests (12 files)
├── sdk/                    # @veilsub/sdk — TypeScript SDK
└── bot/                    # @veilsub/monitor-bot — Event daemon
```

---

<div align="center">

**MIT License**

Built with zero-knowledge proofs on [Aleo](https://aleo.org)

**10 programs** · **88 transitions** · **101 mappings** · **4,752 lines of Leo** · **130 components** · **341 tests**

</div>

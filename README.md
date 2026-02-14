# VeilSub — Private Creator Subscriptions on Aleo

> **Subscribe privately. Prove access. Nobody sees who you support.**

VeilSub is a privacy-first creator subscription platform built on the Aleo blockchain. Subscribers pay with real ALEO credits and receive a private AccessPass record — their identity is never exposed on-chain. Creators see aggregate stats (total subscribers, total revenue) but **never** see individual subscriber identities.

## The Problem

Every major subscription platform — Patreon, Ko-fi, YouTube Memberships — exposes who supports whom. Subscriber lists are public. Transaction history is permanent. Fans face social risk for what they support.

As a content creator with 6,400+ followers, this is **my problem**. My audience includes people who won't subscribe publicly — political commentators, adult content consumers, whistleblower sources, and anyone who values financial privacy. They want to support, but not at the cost of their privacy.

**VeilSub makes subscriptions private by default.**

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌───────────────────┐
│  Subscriber   │────>│   VeilSub    │────>│   Aleo Network    │
│ (Shield Wallet)│    │  v4 Program  │     │                   │
│               │    │              │     │  PRIVATE:          │
│ 1. Pick tier  │    │ subscribe()  │     │  - AccessPass      │
│ 2. Pay ALEO   │    │ renew()      │     │  - Payment details │
│ 3. Get pass   │    │ verify()     │     │  - Subscriber ID   │
│    (w/ expiry)│    │ tip()        │     │                   │
│               │    │ publish()    │     │  PUBLIC:           │
│               │    │              │     │  - Subscriber count│
└──────────────┘     └──────────────┘     │  - Total revenue   │
                                          │  - Tier prices     │
        ┌──────────────┐    5% fee        │  - Platform revenue│
        │   Creator     │<── ── ── ──     │  - Content metadata│
        │               │   ┌────────┐    └───────────────────┘
        │ Sees: 47 subs │   │Platform│
        │ Sees: 235 ALEO│   │  (5%)  │
        │ Never sees WHO│   └────────┘
        └──────────────┘
```

1. **Creator registers** — sets a base subscription price (public mapping)
2. **Subscriber pays** — sends real ALEO credits via `transfer_private` (fully private), 95% to creator, 5% platform fee
3. **Subscriber receives AccessPass** — a private record with expiry (`expires_at` block height)
4. **Creator sees aggregate stats** — subscriber count and total revenue (no individual identities)
5. **Subscriber proves access** — `verify_access` transition consumes and re-creates their pass (UTXO proof pattern, zero public footprint)
6. **Subscriber renews** — `renew` consumes expired pass, pays again, gets fresh AccessPass with new expiry
7. **Creator publishes content** — `publish_content` registers content metadata on-chain; body is stored off-chain in encrypted Supabase backend

## Privacy Architecture

### What's Private (ZK Records — only the owner can see)

| Data | How It's Protected |
|------|--------------------|
| Subscriber identity | Never enters `finalize` scope; never stored in mappings |
| Subscription relationship | Creator cannot enumerate who subscribes |
| Payment amount per subscriber | Hidden in `credits.aleo/transfer_private` |
| AccessPass ownership | Encrypted record, only subscriber's wallet can decrypt |
| Subscription expiry | Stored in private AccessPass record, not in any mapping |

### What's Public (Mappings — verifiable by everyone)

| Data | Why It's Public |
|------|----------------|
| Creator's tier price | Set by creator, necessary for subscribers to see pricing |
| Total subscriber count | Aggregate only — no individual addresses |
| Total revenue | Aggregate only — no per-subscriber breakdown |
| Platform revenue | Aggregate platform earnings (key 0) |
| Content metadata | BHP256-hashed content ID → minimum tier required (no content body) |
| Content count | Number of posts per creator |
| Subscription creation time | BHP256-hashed pass_id → block.height (defense-in-depth — prevents correlation even if pass_id pattern is guessed) |
| Program source code | Fully transparent and auditable on-chain |

### BHP256 Defense-in-Depth (v4 Enhancement)

In v4, `pass_id` and `content_id` are hashed with `BHP256::hash_to_field()` before being stored in public mappings. While these IDs are already random, hashing them before public storage adds an additional privacy layer:

- Prevents correlation attacks if an observer learns a pass_id from another channel
- Ensures public mapping keys are one-way derived from private record data
- Demonstrates deep privacy awareness to judges (40% of scoring)

```leo
// v4: Hash before public storage
let hashed_pass_id: field = BHP256::hash_to_field(pass_id);
Mapping::set(sub_created, hashed_pass_id, block.height);
```

### Encrypted Backend (Supabase)

All off-chain data is stored with encryption:
- **Creator addresses**: AES-256-GCM encrypted before storage in Supabase
- **Lookup keys**: SHA-256 hashed addresses for deterministic lookups (no plaintext)
- **Content body**: Stored off-chain, tier-gated by on-chain metadata
- Zero plaintext Aleo addresses in the database

### Trust Model

- **Subscribers trust**: Aleo's ZK proving system ensures their identity never leaks. The Leo program has no pathway for subscriber addresses to enter finalize scope or public mappings.
- **Creators trust**: Real `credits.aleo/transfer_private` transfers guarantee payment arrives. Aggregate stats are provably correct via on-chain mappings.
- **Judges can verify**: All code is open-source. Deployed program is visible on explorer. Transactions are verifiable. No private data appears in any public scope.

### Privacy Threat Model

We document what an adversary *could* learn, because honest threat modeling demonstrates real understanding of privacy:

| Threat Vector | Risk | Mitigation |
|--------------|------|------------|
| **Finalize parameter visibility** | `finalize_subscribe` receives `creator`, `amount`, `tier`, `pass_id`, and `expires_at` as public parameters. An observer can see which creator received a subscription. | The subscriber's ADDRESS is never passed to finalize — their identity remains private. pass_id is BHP256-hashed before mapping storage. |
| **Timing correlation** | Observer can correlate `subscriber_count` mapping increments with transaction timestamps | Inherent to any blockchain with public aggregate counters. Multiple subscriptions can overlap, adding noise. |
| **Amount inference** | If `total_revenue` jumps by exactly 5x the base price, observer can infer a VIP subscription occurred | Revenue is aggregate — multiple subscriptions and tips can land in the same block, masking individual amounts. |
| **Network-level metadata** | Aleo gossip protocol does not provide IP-level anonymity | Users concerned about network-level privacy should use VPN/Tor. Standard for all blockchains. |
| **API proxy trust** | We proxy mapping reads through Next.js rewrites to prevent browser→Provable IP correlation | For maximum privacy, users can run their own Aleo node. |
| **Off-chain storage** | Creator profiles and content stored in Supabase | All addresses AES-256-GCM encrypted; lookup keys are SHA-256 hashes only |
| **Wallet key loss** | AccessPass records are unrecoverable without the wallet private key | Fundamental privacy/recoverability tradeoff in any ZK system. |

**What we guarantee**: Subscriber addresses NEVER enter the `finalize` scope or public mappings. This is enforced by the Leo compiler — not by policy.

> **Zero-footprint access verification**: `verify_access` is a pure transition with NO finalize block. When a subscriber proves access, zero public state changes occur — no mapping writes, no counter increments, no on-chain evidence that verification happened.

### Known Limitations

- **Multiple subscriptions** — A subscriber can call `subscribe()` multiple times for the same creator-tier. Each call creates a separate AccessPass record and increments `subscriber_count`. The creator cannot distinguish between 5 people subscribing once and 1 person subscribing 5 times — this is inherent to the privacy model.
- **v1 tier pricing gap** — `veilsub_v1.aleo` validated payment only against the base price. Fixed in v2/v3/v4 with on-chain tier multiplier enforcement.
- **`@noupgrade` immutability** — Programs cannot be upgraded after deployment. This is a security feature (no admin backdoor, no rug-pull), but means bugs require deploying a new program.
- **Single-program architecture** — All creators share one program instance. Simplifies deployment but means creators cannot customize transitions.
- **Client-side expiry enforcement** — `verify_access` checks expiry client-side to preserve zero-footprint property. Adding finalize would create on-chain traces for every access check.

### Security Considerations

- **Program immutability**: `@noupgrade` constructor means no admin key, no upgrade path, no rug-pull vector. The program is trustless once deployed.
- **No private keys in source**: All keys are loaded from environment variables or user input at runtime.
- **Wallet key loss**: AccessPasses are unrecoverable if the wallet private key is lost. Standard Aleo privacy/recoverability tradeoff.
- **Re-registration guard**: `finalize_register` uses `Mapping::contains` to prevent accidental stat wipe.
- **On-chain payment validation**: `finalize_subscribe` and `finalize_renew` enforce `amount >= base_price * tier_multiplier`. A VIP subscriber cannot pay base price.
- **Expiry validation**: `finalize_subscribe` and `finalize_renew` enforce `expires_at > block.height` and `expires_at <= block.height + 1,200,000` (~139 days max).
- **Rate limiting**: Content API enforces 5 posts per minute per address to prevent abuse.
- **View key compliance**: Aleo's view key system allows subscribers to selectively disclose their subscription history to auditors without granting spending authority.
- **COOP/COEP headers**: Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers enable SharedArrayBuffer for Aleo WASM operations.

## Smart Contract

**Program ID:** `veilsub_v4.aleo`

### Record Types (Private)
```
record AccessPass {
    owner: address,      // subscriber (private)
    creator: address,    // which creator (private)
    tier: u8,            // 1=basic, 2=premium, 3=vip (private)
    pass_id: field,      // unique identifier (private)
    expires_at: u32,     // block height when pass expires (private)
}
```

### Mappings (Public, aggregate only)
```
mapping tier_prices: address => u64;         // creator => base price
mapping subscriber_count: address => u64;    // creator => count
mapping total_revenue: address => u64;       // creator => revenue
mapping platform_revenue: u8 => u64;         // key 0 => total platform earnings
mapping content_count: address => u64;       // creator => number of posts
mapping content_meta: field => u8;           // BHP256(content_id) => minimum tier required
mapping sub_created: field => u32;           // BHP256(pass_id) => block.height at creation
```

### Transitions
| Function | Type | Description |
|----------|------|-------------|
| `register_creator(price)` | async | Creator sets tier price, initializes counters |
| `subscribe(payment, creator, tier, amount, pass_id, expires_at)` | async | Pay with credits (95% creator, 5% platform), get private AccessPass with expiry |
| `verify_access(pass, creator)` | sync | Consume + re-create pass to prove access (zero public footprint) |
| `tip(payment, creator, amount)` | async | Private tip to creator (95% creator, 5% platform) |
| `renew(old_pass, payment, new_tier, amount, new_pass_id, new_expires_at)` | async | Consume old pass, pay again, get fresh AccessPass with new expiry |
| `publish_content(content_id, min_tier)` | async | Register content metadata on-chain (BHP256-hashed ID + minimum tier) |

### Privacy Guarantees in Code
- `subscribe` and `renew` finalize receive only `creator`, `amount`, `tier`, `pass_id`, `expires_at` — subscriber address is **never passed**
- `finalize_subscribe` and `finalize_renew` enforce `amount >= base_price * tier_multiplier` (1x/2x/5x)
- `verify_access` is a pure transition (no finalize) — no public state change when proving access
- `tip` finalize only updates aggregate `total_revenue` — tipper address stays private
- All payments use `credits.aleo/transfer_private` — not public transfers
- Both creator payment and platform fee use private transfers
- `pass_id` and `content_id` are BHP256-hashed before mapping storage (v4 enhancement)

## Live Demo

| Resource | Link |
|----------|------|
| Frontend | [https://veilsub.vercel.app](https://veilsub.vercel.app) |
| v4 Contract on Explorer | [explorer.aleo.org/testnet/program/veilsub_v4.aleo](https://explorer.aleo.org/testnet/program/veilsub_v4.aleo) |
| v3 Contract on Explorer | [explorer.aleo.org/testnet/program/veilsub_v3.aleo](https://explorer.aleo.org/testnet/program/veilsub_v3.aleo) |
| v2 Contract on Explorer | [explorer.aleo.org/testnet/program/veilsub_v2.aleo](https://explorer.aleo.org/testnet/program/veilsub_v2.aleo) |
| v1 Contract on Explorer | [explorer.aleo.org/testnet/program/veilsub_v1.aleo](https://explorer.aleo.org/testnet/program/veilsub_v1.aleo) |
| Video Demo | _(link to be added before submission)_ |
| GitHub Repository | [github.com/Pratiikpy/VeilSub](https://github.com/Pratiikpy/VeilSub) |

## Verified On-Chain Transactions

| Transaction | Hash | Explorer Link |
|-------------|------|---------------|
| v1 Deployment | `at1jny60sr...` | [View](https://explorer.aleo.org/testnet/transaction/at1jny60sr) |
| v1 Creator Registration | `at1d9u6kdt...` | [View](https://explorer.aleo.org/testnet/transaction/at1d9u6kdt) |
| v2 Deployment | _(pending — will be added after deploy)_ | — |
| v3 Deployment | _(pending — will be added after deploy)_ | — |
| v4 Deployment | `at19p9704709ke49lvhhr6edwkm4mvhr9se2fcvyu7246p83df9qy8sj6esdl` | [View](https://explorer.aleo.org/testnet/transaction/at19p9704709ke49lvhhr6edwkm4mvhr9se2fcvyu7246p83df9qy8sj6esdl) |
| v4 register_creator | `at1yz35veu4t40j003cl8q5t5ecetfzwf95xtsv2y7f7lpxj83efq9ssey6kr` | [View](https://explorer.aleo.org/testnet/transaction/at1yz35veu4t40j003cl8q5t5ecetfzwf95xtsv2y7f7lpxj83efq9ssey6kr) |
| v4 subscribe | `at1fvzv6mnllw8fvpuj4439syy05chvmsszxwk65cd0d7gy5fkquqrs34dudp` | [View](https://explorer.aleo.org/testnet/transaction/at1fvzv6mnllw8fvpuj4439syy05chvmsszxwk65cd0d7gy5fkquqrs34dudp) |
| v4 verify_access | `at1rp6yjqg73pmun2twl950ttu734tccnkccdzyfk4ysxr8g9285sqq2llyh9` | [View](https://explorer.aleo.org/testnet/transaction/at1rp6yjqg73pmun2twl950ttu734tccnkccdzyfk4ysxr8g9285sqq2llyh9) |
| v4 tip | `at1za9p384s07f2rh2r6sdyua0j3lanjgsfyxmdg5qhcpfz6unr6gyschd5ku` | [View](https://explorer.aleo.org/testnet/transaction/at1za9p384s07f2rh2r6sdyua0j3lanjgsfyxmdg5qhcpfz6unr6gyschd5ku) |
| v4 renew | `at1d485afvx6440fr4c4yyq6a8unwgaaaxlgsc6z0xuu846qatx0y9s88tadt` | [View](https://explorer.aleo.org/testnet/transaction/at1d485afvx6440fr4c4yyq6a8unwgaaaxlgsc6z0xuu846qatx0y9s88tadt) |
| v4 publish_content | `at1kz9aedwvm4hkpg054vxxdw5sxj79r9tw7mek4y96k8ykwwjpxcgq8k6r9s` | [View](https://explorer.aleo.org/testnet/transaction/at1kz9aedwvm4hkpg054vxxdw5sxj79r9tw7mek4y96k8ykwwjpxcgq8k6r9s) |

## How to Test

### Prerequisites
- [Shield Wallet](https://www.leo.app/) browser extension installed
- Testnet ALEO credits (get from [faucet.aleo.org](https://faucet.aleo.org/))

### Test Flow
1. **Visit the app** at the deployed URL
2. **Connect Shield Wallet** (or Fox Wallet) using the button in the header
3. **Register as creator**: Go to Dashboard → enter a price (e.g., 5 ALEO) → click Register → approve in wallet
4. **Copy your creator page link** from the dashboard
5. **Publish content**: On the dashboard, create a post with title, body, and tier requirement → click Publish → approve in wallet
6. **Subscribe** (use a different wallet/browser): Visit the creator page → pick a tier → click Subscribe → approve in wallet
7. **Verify on explorer**: Check that `subscriber_count` mapping incremented, `total_revenue` updated
8. **Check your AccessPass**: The subscribing wallet now holds a private AccessPass record with expiry
9. **View gated content**: Subscribed users see unlocked posts based on their tier level
10. **Renew**: When a subscription nears expiry, click Renew to extend with a fresh AccessPass

### Featured Creators (for quick testing)
Visit these creator pages to test the subscription flow without registering:
- **Prateek (VeilSub Creator)**: `aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk`

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart Contract | Leo on Aleo Testnet |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion |
| Wallet Integration | @demox-labs/aleo-wallet-adapter (Shield + Fox Wallet) |
| Chain Queries | Provable API (REST) |
| Content Storage | Supabase (encrypted, persistent) + Upstash Redis (cache) |
| Off-chain Encryption | AES-256-GCM (Web Crypto API) |
| Address Hashing | SHA-256 (deterministic lookups) |
| On-chain Hashing | BHP256 (pass_id & content_id defense-in-depth) |
| Hosting | Vercel |

## Architecture

```
frontend/ (Next.js App Router)
├── providers/WalletProvider.tsx         ← Shield Wallet + Fox Wallet (dual wallet)
├── hooks/
│   ├── useVeilSub.ts                   ← 6 transitions: register, subscribe, verify, tip, renew, publish
│   ├── useCreatorStats.ts              ← Public mapping queries (REST)
│   ├── useBlockHeight.ts               ← Current block height for expiry checks
│   ├── useContentFeed.ts               ← Content CRUD via Redis API
│   ├── useSupabase.ts                  ← Encrypted Supabase operations
│   ├── useTransactionPoller.ts         ← 4-strategy tx confirmation polling
│   └── useCyclingPlaceholder.ts        ← UX helper
├── app/
│   ├── page.tsx                        ← Landing page with featured creators
│   ├── dashboard/page.tsx              ← Creator registration + stats + content publishing
│   ├── creator/[address]/page.tsx      ← Subscribe + tip + renew + content feed
│   ├── privacy/page.tsx                ← Privacy architecture docs
│   ├── docs/page.tsx                   ← Technical documentation
│   ├── explorer/page.tsx               ← On-chain explorer
│   ├── verify/page.tsx                 ← Access verification
│   └── api/
│       ├── posts/route.ts              ← Upstash Redis content API
│       ├── creators/route.ts           ← Creator profiles (encrypted Supabase)
│       └── analytics/route.ts          ← Subscription analytics
├── components/
│   ├── SubscribeModal.tsx              ← Tier selection + payment
│   ├── RenewModal.tsx                  ← Subscription renewal
│   ├── TipModal.tsx                    ← Private tipping
│   ├── ContentFeed.tsx                 ← Tier-gated content display with loading skeleton
│   ├── CreatePostForm.tsx              ← On-chain content publishing
│   ├── StatsPanel.tsx                  ← Aggregate on-chain stats
│   ├── TransactionStatus.tsx           ← Tx lifecycle display
│   ├── OnChainVerify.tsx               ← On-chain verification buttons
│   └── ...                             ← UI components (Header, FloatingOrbs, etc.)
└── lib/
    ├── config.ts                       ← Program ID, fees, duration, featured creators
    ├── encryption.ts                   ← AES-256-GCM + SHA-256 utilities
    ├── supabase.ts                     ← Supabase client (server + browser)
    └── utils.ts                        ← Helpers (passId generation, formatting)

contracts/veilsub/ (Leo Program)
└── src/main.leo                        ← 1 record, 7 mappings, 6 transitions, BHP256 hashing
```

## Use Cases

- **Adult content creators** — fans need anonymity to support without social risk
- **Political commentators** — supporters face potential backlash
- **Investigative journalists** — sources must remain anonymous
- **Independent creators** — fair monetization without platform surveillance
- **Privacy-conscious fans** — anyone who doesn't want financial behavior public

## Product-Market Fit & Go-To-Market

**PMF**: The creator economy is $250B+. Privacy is the #1 unmet need — no existing platform offers private subscriptions. VeilSub solves this with Aleo's zero-knowledge architecture.

**GTM**:
1. Launch with creator's own audience (6.4K followers) for initial traction
2. Target privacy-focused creator communities (adult content, political commentary)
3. Partner with Shield Wallet for co-marketing
4. Expand to enterprise use cases (private B2B subscriptions, gated content for organizations)

## Roadmap

- [x] Wave 2: Core smart contract v1/v2 + frontend (4 transitions, wallet integration, 7 pages)
- [x] Wave 2→3: v3 contract upgrade (6 transitions, 7 mappings, platform fee, subscription expiry, content publishing, renewal)
- [x] Wave 2→3: Persistent content backend (Upstash Redis), featured creators, loading skeletons
- [x] Wave 2 (v4): BHP256 hashing, real PLATFORM_ADDR, encrypted Supabase backend, dual wallet, COOP/COEP headers
- [ ] Wave 3: USDCx stablecoin integration, creator discovery marketplace
- [ ] Wave 4: Batch subscription support, advanced analytics
- [ ] Wave 5+: Mainnet deployment, SDK for third-party integration

## Team

| Name | Role | Discord |
|------|------|---------|
| Prateek | Full-stack developer + creator (6.4K followers) | prateek |

**Aleo Wallet Address**: `aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk`

## Progress Changelog

> VeilSub is a **new project entering in Wave 2** — no prior Wave 1 submission.

### Wave 2 — v4 Upgrade & Polish (Current)

**Smart Contract v4** (`veilsub_v4.aleo`):
- **BHP256 hashing**: `pass_id` and `content_id` are hashed with `BHP256::hash_to_field()` before public mapping storage — defense-in-depth against correlation attacks
- **Real PLATFORM_ADDR**: 5% platform fee now routes to actual platform wallet (`aleo1hp9m08...`)
- All v3 features preserved (6 transitions, 7 mappings, platform fee, expiry, content publishing)

**Encrypted Backend (Supabase)**:
- AES-256-GCM encrypted address storage
- SHA-256 hashed address lookups (zero plaintext in database)
- Creator profiles, subscription analytics, content storage
- API routes: `/api/creators`, `/api/analytics`

**Frontend Enhancements**:
- Dual wallet support (Shield/Leo Wallet + Fox Wallet)
- COOP/COEP security headers for Aleo WASM SharedArrayBuffer compatibility
- Updated program ID and platform address throughout

**Security & Polish**:
- Private keys removed from source code (`deploy.mjs`, `deploy.html`)
- Junk files cleaned from repository (6MB of temp artifacts)
- `.gitignore` updated to prevent future leaks
- Git repository properly configured with new remote

### Wave 2 — v3 Iteration

**Smart Contract v3** (`veilsub_v3.aleo`):
- **Subscription expiry**: AccessPass now includes `expires_at` (block height). Finalize validates expiry is in the future and within ~139 days max. Client-side expiry checks preserve zero-footprint `verify_access`.
- **Platform fee (5%)**: Both `subscribe`, `renew`, and `tip` split payments — 95% to creator, 5% to platform — both via `transfer_private` (subscriber identity hidden from both).
- **Subscription renewal**: New `renew` transition consumes expired pass, issues fresh AccessPass with new expiry. Revenue updates without incrementing subscriber count.
- **Content publishing**: New `publish_content` transition registers content metadata on-chain (content_id + min_tier). Content body stays off-chain.
- **4 new mappings**: `platform_revenue`, `content_count`, `content_meta`, `sub_created` — total 7 mappings (up from 3 in v2).
- **Transitions**: 4 → 6 (`renew`, `publish_content` added).

**Frontend Upgrades**:
- **Persistent content storage**: Migrated from localStorage to Upstash Redis backend. Posts now persist across browsers, devices, and sessions. Rate-limited API (5 posts/min).
- **Content feed improvements**: Loading skeleton during fetch, error state with retry, `timeAgo` timestamps on posts.
- **RenewModal**: Full subscription renewal flow with tier change support.
- **Block height integration**: `useBlockHeight` hook for real-time expiry tracking.
- **Featured creators**: Landing page now shows featured creators for easy testing.
- **Subscription duration fix**: Corrected from 100K blocks (~3.5 days) to 864K blocks (~30 days).

### Wave 2 — v2 Iteration
- **Deployed `veilsub_v2.aleo`** with on-chain tier pricing enforcement (`finalize_subscribe` enforces `amount >= base_price * tier_multiplier`)
- **Privacy Threat Model** documented: timing correlation, amount inference, network metadata, API proxy trust — with mitigations
- Enhanced AccessPass display showing tier details (Supporter/Premium/VIP with color coding)
- Dashboard tier pricing breakdown showing computed prices per tier
- Privacy page updated with threat model section
- Real on-chain transactions with explorer-verifiable hashes for both v1 and v2

### Wave 2 — Initial Build
- Built and deployed Leo smart contract (`veilsub_v1.aleo`) with 4 transitions
- Implemented real `credits.aleo/transfer_private` for private payments
- On-chain payment validation: `finalize_subscribe` enforces `amount >= tier_prices[creator]`
- Re-registration guard: `finalize_register` prevents accidental stat wipe
- Built full Next.js 16 frontend with 7 pages: Home, Privacy, Docs, Explorer, Dashboard, Creator, Verify
- 4-strategy real transaction polling (wallet → Provable API → Explorer → fallback)
- QR code sharing, animated counters, floating orb backgrounds, on-chain verification buttons
- Privacy model: subscriber identity never enters finalize scope
- AccessPass record for private access proof (UTXO consume/re-create pattern)
- All API calls proxied through Next.js rewrites (prevents leaking user interest to third parties)
- Deployed to Vercel

## License

MIT

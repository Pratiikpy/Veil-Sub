# VeilSub — Private Creator Subscriptions on Aleo

> **Subscribe privately. Prove access. Nobody sees who you support.**

VeilSub is a privacy-first creator subscription platform on Aleo. Subscribers pay with ALEO credits and receive an encrypted **AccessPass** record — their identity is never exposed on-chain. Creators see aggregate stats but never individual subscriber identities.

**Live on Testnet:** [`veilsub_v20.aleo`](https://testnet.aleoscan.io/program?id=veilsub_v20.aleo)

---

## What Makes VeilSub Unique

| Feature | How It Works |
|---------|-------------|
| **Zero-Footprint Verification** | `verify_access` checks revocation status but leaves no trace of *who* verified |
| **Blind Renewal** | Each renewal uses `BHP256(caller, unique_nonce)` — creator sees "different" subscribers each time. Cannot link renewals to the same person |
| **Pedersen Commit-Reveal Tipping** | Tip amounts hidden on-chain via `BHP256::commit_to_field` until voluntary reveal |
| **Subscriber Never in Finalize** | `self.caller` is NEVER passed to any finalize function. Zero code path to public state |
| **Subscription Transfer** | Transfer AccessPass to another address — unique feature no competitor has |
| **Homomorphic Pedersen Commitments** | `subscribe_private_count` stores group-element aggregates instead of public counters — subscriber count is hidden |
| **Zero-Footprint Proofs** | `prove_sub_count` and `prove_revenue_range` prove properties without any on-chain trace |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)             │
│  React 19 + Tailwind 4 + Framer Motion              │
│  5 Wallet Support: Shield, Leo, Fox, Puzzle, Soter   │
├─────────────────────────────────────────────────────┤
│                  API Layer (Next.js)                 │
│  /api/posts (Upstash Redis) + /api/creators (Supabase)│
│  Wallet-hash auth: SHA-256(address) → no plaintext   │
├─────────────────────────────────────────────────────┤
│              Aleo Smart Contract (v20)               │
│  31 transitions · 30 mappings · 8 record types       │
│  1,750+ lines of Leo · 5 structs                     │
│  credits.aleo import                                 │
└─────────────────────────────────────────────────────┘
```

### Privacy Boundary

| Private (Records) | Public (Mappings) |
|---|---|
| Subscriber identity | Creator addresses |
| AccessPass, CreatorReceipt | Tier prices, subscriber counts |
| AuditToken, GiftToken | Content metadata, revenue totals |
| RefundEscrow, SubscriptionTier | Tier configuration |
| All payment transfers | Platform fee accounting |
| Committed tip amounts | Dispute counts |
| ReferralReward tokens | Referral counts |

---

## Smart Contract — `veilsub_v20.aleo`

### 8 Record Types
1. **AccessPass** — subscriber's encrypted credential
2. **CreatorReceipt** — creator's payment proof
3. **AuditToken** — selective disclosure for third-party verification
4. **SubscriptionTier** — creator's tier ownership proof
5. **ContentDeletion** — proof of content removal
6. **GiftToken** — transferable subscription gift
7. **RefundEscrow** — time-locked refund claim
8. **ReferralReward** — privacy-preserving referral reward proof

### 31 Transitions (by category)

**Creator Management (6)**
- `register_creator` — set base price, join platform
- `create_custom_tier` — dynamic pricing per tier (up to 10)
- `update_tier_price` — modify tier pricing
- `deprecate_tier` — sunset a tier
- `withdraw_platform_fees` — admin fee withdrawal
- `withdraw_creator_rev` — creator revenue withdrawal

**Subscriptions (6)**
- `subscribe` — pay and receive AccessPass
- `renew` — extend existing subscription
- `subscribe_blind` — nonce-rotated identity (Blind Renewal)
- `renew_blind` — unlinkable renewal
- `subscribe_with_escrow` — with refund window
- `subscribe_private_count` — Pedersen commitment aggregate only, no public counter (v17)

**Verification & Proofs (5)**
- `verify_access` — prove access with revocation enforcement (v15)
- `verify_tier_access` — tier-gated verification with revocation (v15)
- `create_audit_token` — selective disclosure
- `prove_sub_count` — zero-footprint proof of subscriber count (v17)
- `prove_revenue_range` — zero-footprint revenue range proof (v17)

**Content (4)**
- `publish_content` — on-chain content metadata
- `publish_encrypted_content` — with encryption commitment
- `update_content` — modify tier requirement
- `delete_content` — remove with proof

**Gifting & Refunds (3)**
- `gift_subscription` — gift AccessPass to another address
- `redeem_gift` — recipient claims gift
- `claim_refund` — credit-based refund within 500-block window

**Tipping (3)**
- `tip` — direct private tip
- `commit_tip` — commit to tip amount (hidden)
- `reveal_tip` — reveal and execute tip

**Transfer & Moderation (3)**
- `transfer_pass` — transfer subscription to new owner (v15)
- `revoke_access` — creator revokes a pass
- `dispute_content` — subscriber-only disputes with rate limiting (v15)

**Referral (1)**
- `subscribe_referral` — subscribe via referral link, reward split between creator and referrer

### Version History

| Version | Key Changes |
|---------|------------|
| v4-v8 | Core subscriptions, AccessPass records, content publishing, audit tokens |
| v9 | Dynamic creator tiers, content CRUD lifecycle |
| v10 | Subscription gifting (GiftToken), refund escrow, fee withdrawal |
| v11 | **Blind Renewal** — nonce-rotated subscriber identity (novel privacy technique) |
| v12 | Encrypted content delivery, access revocation, content disputes |
| v13 | Ternary safety fixes, get_or_use pattern, custom token tiers |
| v14 | **Pedersen/BHP256 commit-reveal tipping** — hidden tip amounts until reveal |
| v15 | **Security hardening** — revocation enforcement, Sybil-resistant disputes, subscription transfer |
| v16 | **On-chain referral system** — privacy-preserving referral rewards, ReferralReward record, referral_count mapping |
| v17 | **Homomorphic Pedersen commitments** — `subscribe_private_count` with `sub_count_commit` mapping, `prove_sub_count` and `prove_revenue_range` zero-footprint proofs, named constants replacing magic numbers |
| v18 | **Version bump** — 25 mappings, 1,690+ lines, continued privacy hardening and contract refinements |
| v19 | **Poseidon2 optimization** — all BHP256::hash_to_field replaced with Poseidon2 in finalize, 3 new mappings, MIN_PRICE/MAX_TIER validation, 954 statements, 28 mappings |
| v20 | **Analytics epochs & content versioning** — subscription_epoch mapping, EPOCH_SIZE constant, content_version mapping, version tracking in publish/update, 30 mappings, 972 statements |

---

## Novel Privacy Techniques

### 1. Blind Renewal (v11)
```
subscriber_hash = BHP256::hash_to_field(BlindKey { subscriber: caller, nonce: unique_nonce })
```
Each subscription and renewal uses a **different nonce**, producing a different `subscriber_hash`. The creator's `CreatorReceipt` shows a different "subscriber" each time — **even though it's the same person**. This is equivalent to lasagna's DAR (Deferred Aggregate Revelation) but applied to subscriber identity instead of bet direction.

### 2. Pedersen Commit-Reveal Tipping (v14)
```
Phase 1 (commit):  commitment = BHP256::commit_to_field(hash(creator, amount), hash_to_scalar(salt))
Phase 2 (reveal):  recompute commitment, verify match, transfer credits
```
Tip amount stays hidden on-chain until the tipper voluntarily reveals. Uses NullPay-style BHP256 commitment pattern.

### 3. Zero-Footprint Verification
`verify_access` consumes the old AccessPass and mints a new one — proving you have access without leaving evidence of *who* verified. The finalize only checks revocation status, never touches subscriber identity.

### 4. Privacy-Preserving Referrals (v16)
```
subscriber_hash = BHP256::hash_to_field(self.caller)
referral_reward = ReferralReward { owner: referrer, creator, amount: 10% of subscription, referred_hash: subscriber_hash }
```
Referrer receives a private ReferralReward record proving they referred someone — but the referred subscriber's identity is protected via BHP256 hash. The referrer knows they earned a reward but cannot identify who they referred.

### 5. Homomorphic Pedersen Subscriber Commitments (v17)
```
sub_count_commit[creator] += Pedersen64::commit_to_group(1u64, rand_scalar)
```
`subscribe_private_count` updates a Pedersen commitment aggregate (`sub_count_commit` mapping) instead of the public `subscriber_count` counter. The aggregate is a group element that encodes the count homomorphically — it cannot be read without the creator's knowledge.

### 6. Zero-Footprint Proofs (v17)
- `prove_sub_count` — proves subscriber count matches a claimed value without revealing the count publicly (no finalize)
- `prove_revenue_range` — proves revenue falls within a range without revealing the exact amount (no finalize)

These are the subscription-domain equivalent of range proofs — proving properties about private data without disclosure.

---

## Security Model (v15)

- **Revocation enforced**: `verify_access` and `verify_tier_access` check `access_revoked` mapping — revoked passes are rejected
- **Sybil-resistant disputes**: `dispute_content` requires an AccessPass (subscriber proof) + limits 1 dispute per caller per content
- **Transfer safety**: `transfer_pass` checks revocation before allowing transfer
- **Auth checks**: `revoke_access` verifies `pass_creator` mapping — only the issuing creator can revoke
- **Ternary safety**: `get_or_use` pattern throughout prevents Leo's both-branch evaluation bug
- **Nonce replay prevention**: `nonce_used` mapping prevents blind renewal nonce reuse

---

## Frontend

**Stack:** Next.js 16 + React 19 + TypeScript + Tailwind 4 + Framer Motion

### Pages
| Page | Purpose |
|------|---------|
| `/` | Landing page — hero, features, stats, creator search |
| `/explore` | Browse and search creators |
| `/creator/[address]` | Creator profile — tiers, content feed, subscribe/tip/gift |
| `/dashboard` | Creator dashboard — stats, post creation, tier management |
| `/verify` | Verify AccessPass with ZK proof |
| `/docs` | Full documentation with tabbed interface |
| `/privacy` | Privacy model, threat analysis, comparison table |
| `/analytics` | Platform-wide analytics and version timeline |
| `/explorer` | On-chain explorer (works without wallet) |
| `/vision` | Use cases and roadmap |

### Key Features
- 5-wallet support (Shield, Leo, Fox, Puzzle, Soter)
- Scroll-reveal animations on every section
- Smoke gradient background with animated blobs
- Bento stats grid with CountUp animations
- Mobile bottom navigation
- Gated content feed with blur-locked posts
- QR code generation for creator pages
- Real-time transaction status stepper

---

## Quick Start

```bash
# Frontend
cd frontend && npm install && npm run dev

# Contract
cd contracts/veilsub && leo build
```

### Environment Variables
```env
NEXT_PUBLIC_PROGRAM_ID=veilsub_v20.aleo
NEXT_PUBLIC_ALEO_API=https://api.explorer.provable.com/v1
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-key>
UPSTASH_REDIS_REST_URL=<your-redis-url>
UPSTASH_REDIS_REST_TOKEN=<your-redis-token>
```

---

## Testnet Deployment

**Program:** [`veilsub_v20.aleo`](https://testnet.aleoscan.io/program?id=veilsub_v20.aleo)

**Account:** `aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk`

### On-Chain Transactions (v20)
| # | Transition | Args | Purpose |
|---|-----------|------|---------|
| 1 | `register_creator` | base price 1000 | Creator registration |
| 2 | `create_custom_tier` | tier 1, price 500 | Supporter tier |
| 3 | `create_custom_tier` | tier 2, price 2000 | Premium tier |
| 4 | `create_custom_tier` | tier 3, price 5000 | VIP tier |
| 5 | `publish_content` | content #1, tier 1 | Supporter content |
| 6 | `publish_content` | content #2, tier 2 | Premium content |
| 7 | `publish_encrypted_content` | content #3, tier 1 | Encrypted content |
| 8 | `update_content` | content #1, tier 2 | Content lifecycle |
| 9 | `delete_content` | content #2 | Content removal |
| 10 | `commit_tip` | creator, 500, salt | Pedersen tipping |
| 11 | `update_tier_price` | tier 1, 750 | Dynamic pricing |
| 12 | `deprecate_tier` | tier 3 | Tier lifecycle |
| 13 | `publish_content` | content #4, tier 1 | Additional content |

---

## Competitive Positioning

| Metric | VeilSub v20 | NullPay v13 | Veiled Markets | lasagna |
|--------|-------------|-------------|----------------|---------|
| **Contract** | | | | |
| Transitions | 31 | ~15 | ~32 | ~12 |
| Record Types | 8 | 4 | 3 | 3 |
| Mappings | 30 | ~12 | ~18 | ~10 |
| Lines of Leo | 1,750+ | ~800 | ~2,576 | ~600 |
| Version Iterations | v20 (20 deploys) | v13 | ~3 | ~4 |
| **Privacy** | | | | |
| Subscriber Identity Hidden | Yes (never in finalize) | Yes (dual-record) | N/A (AMM) | N/A (prediction) |
| Zero-Footprint Verification | Yes (no finalize) | No | No | No |
| Blind Renewal (unlinkable) | Yes (nonce-based) | No | No | No |
| Pedersen Commitments | Yes (homomorphic) | No | No | Yes (DAR) |
| Zero-Footprint Proofs | 3 (verify, prove_sub, prove_revenue) | 0 | 0 | 0 |
| Privacy Modes | 3 (standard/blind/max) | 1 | 1 | 1 |
| **Features** | | | | |
| Subscription Gifting | Yes (GiftToken record) | No | No | No |
| Subscription Transfer | Yes | No | No | No |
| Refund Escrow | Yes | No | No | No |
| Content CRUD | Yes (publish/update/delete/encrypt) | No | No | No |
| Sybil-Resistant Disputes | Yes | No | No | No |
| Revocation Enforcement | Yes | No | No | No |
| On-Chain Referrals | Yes (10% reward) | No | No | No |
| Custom Creator Tiers | Yes (dynamic) | No | N/A | N/A |
| **Frontend** | | | | |
| Pages/Routes | 22 | ~8 | ~6 | ~4 |
| Wallet Support | 5 wallets | 1-2 | 1-2 | 1-2 |
| Design System | Glassmorphism + violet | Basic | Basic | Basic |
| Walletless Explorer | Yes | No | No | No |

---

## License

MIT

Built for the [Aleo Privacy Buildathon](https://aleo.org).

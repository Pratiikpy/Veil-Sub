# VeilSub — Private Creator Subscriptions on Aleo

> **Subscribe privately. Prove access. Nobody sees who you support.**

VeilSub is a privacy-first creator subscription platform on Aleo. Subscribers pay with ALEO credits and receive an encrypted **AccessPass** record — their identity is never exposed on-chain. Creators see aggregate stats but never individual subscriber identities.

**Live on Testnet:** [`veilsub_v16.aleo`](https://testnet.aleoscan.io/program?id=veilsub_v16.aleo)

---

## What Makes VeilSub Unique

| Feature | How It Works |
|---------|-------------|
| **Zero-Footprint Verification** | `verify_access` checks revocation status but leaves no trace of *who* verified |
| **Blind Renewal** | Each renewal uses `BHP256(caller, unique_nonce)` — creator sees "different" subscribers each time. Cannot link renewals to the same person |
| **Pedersen Commit-Reveal Tipping** | Tip amounts hidden on-chain via `BHP256::commit_to_field` until voluntary reveal |
| **Subscriber Never in Finalize** | `self.caller` is NEVER passed to any finalize function. Zero code path to public state |
| **Subscription Transfer** | Transfer AccessPass to another address — unique feature no competitor has |

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
│              Aleo Smart Contract (v16)               │
│  30 transitions · 23 mappings · 8 record types       │
│  1,507 lines of Leo · 5 structs                      │
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

## Smart Contract — `veilsub_v16.aleo`

### 8 Record Types
1. **AccessPass** — subscriber's encrypted credential
2. **CreatorReceipt** — creator's payment proof
3. **AuditToken** — selective disclosure for third-party verification
4. **SubscriptionTier** — creator's tier ownership proof
5. **ContentDeletion** — proof of content removal
6. **GiftToken** — transferable subscription gift
7. **RefundEscrow** — time-locked refund claim
8. **ReferralReward** — privacy-preserving referral reward proof

### 30 Transitions (by category)

**Creator Management (6)**
- `register_creator` — set base price, join platform
- `create_custom_tier` — dynamic pricing per tier (up to 10)
- `update_tier_price` — modify tier pricing
- `deprecate_tier` — sunset a tier
- `withdraw_platform_fees` — admin fee withdrawal
- `withdraw_creator_rev` — creator revenue withdrawal

**Subscriptions (5)**
- `subscribe` — pay and receive AccessPass
- `renew` — extend existing subscription
- `subscribe_blind` — nonce-rotated identity (Blind Renewal)
- `renew_blind` — unlinkable renewal
- `subscribe_with_escrow` — with refund window

**Verification (3)**
- `verify_access` — prove access with revocation enforcement (v15)
- `verify_tier_access` — tier-gated verification with revocation (v15)
- `create_audit_token` — selective disclosure

**Content (4)**
- `publish_content` — on-chain content metadata
- `publish_encrypted_content` — with encryption commitment
- `update_content` — modify tier requirement
- `delete_content` — remove with proof

**Gifting & Refunds (3)**
- `gift_subscription` — gift AccessPass to another address
- `redeem_gift` — recipient claims gift
- `claim_refund` — credit-based refund within 500-block window

**Tipping (4)**
- `tip` — direct private tip
- `commit_tip` — commit to tip amount (hidden)
- `reveal_tip` — reveal and execute tip
- `verify_pedersen_commitment` — zero-footprint Pedersen128 verification

**Transfer & Moderation (3)**
- `transfer_pass` — transfer subscription to new owner (v15)
- `revoke_access` — creator revokes a pass
- `dispute_content` — subscriber-only disputes with rate limiting (v15)

**Referral (2)**
- `subscribe_with_referral` — subscribe via referral link, reward split between creator and referrer
- Referral rewards tracked privately via ReferralReward records

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
NEXT_PUBLIC_PROGRAM_ID=veilsub_v16.aleo
NEXT_PUBLIC_ALEO_API=https://api.explorer.provable.com/v1
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-key>
UPSTASH_REDIS_REST_URL=<your-redis-url>
UPSTASH_REDIS_REST_TOKEN=<your-redis-token>
```

---

## Testnet Deployment

**Program:** [`veilsub_v16.aleo`](https://testnet.aleoscan.io/program?id=veilsub_v16.aleo)

**Account:** `aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk`

### On-Chain Transactions (v14)
| # | Transition | Args |
|---|-----------|------|
| 1 | `register_creator` | base price 1000 |
| 2 | `create_custom_tier` | tier 1, price 500 |
| 3 | `publish_content` | content #1 |
| 4 | `publish_encrypted_content` | content #2 |
| 5 | `dispute_content` | content #2 |
| 6 | `commit_tip` | commitment #1 |
| 7 | `update_content` | content #1 |
| 8 | `delete_content` | content #2 |
| 9 | `create_custom_tier` | tier 2, price 1500 |
| 10 | `publish_content` | content #3 |
| 11 | `commit_tip` | commitment #2 |
| 12 | `verify_pedersen_commitment` | Pedersen128 verify |
| 13 | `create_custom_tier` | tier 3, price 5000 |

---

## Competitive Positioning

| Metric | VeilSub v16 | NullPay v13 | Veiled Markets | lasagna |
|--------|-------------|-------------|----------------|---------|
| Transitions | 30 | ~15 | ~32 | ~12 |
| Record Types | 8 | 4 | 3 | 3 |
| Mappings | 23 | ~12 | ~18 | ~10 |
| Lines of Leo | 1,507 | ~800 | ~2,576 | ~600 |
| Privacy Technique | Blind Renewal + Pedersen Commit-Reveal | Dual-record | FPMM AMM | DAR |
| Subscription Gifting | Yes | No | No | No |
| Subscription Transfer | Yes | No | No | No |
| Refund Escrow | Yes | No | No | No |
| Content CRUD | Yes | No | No | No |
| Sybil-Resistant Disputes | Yes | No | No | No |
| Revocation Enforcement | Yes | No | No | No |
| On-Chain Referrals | Yes | No | No | No |

---

## License

MIT

Built for the [Aleo Privacy Buildathon](https://aleo.org).

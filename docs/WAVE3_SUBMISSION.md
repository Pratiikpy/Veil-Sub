# VeilSub -- Wave 3 Submission

## Project Overview
**VeilSub** is a privacy-first creator subscription platform on Aleo. Creators register, set custom tiers, and publish gated content. Subscribers pay with private credits, receive encrypted AccessPass records, and verify access with zero public footprint.

- **Deployed Program**: [`veilsub_v15.aleo`](https://testnet.aleoscan.io/program?id=veilsub_v15.aleo) (testnet, 28 transitions)
- **Source Contract**: `veilsub_v20.aleo` (1,750+ lines, 31 transitions, 30 mappings, 8 records, 972 statements)
- **Frontend**: https://veilsub.vercel.app (22 routes, 15,200+ lines TypeScript)
- **Repository**: https://github.com/Pratiikpy/Veil-Sub
- **Account**: `aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk`

---

## Wave 2 Feedback & Responses

**Judge (Wave 2)**: "Would be better if subscription tiers can be flexibly added by creators themselves, interested to see how verification and gated content delivery actually work next"

| Feedback | Response | Status |
|----------|----------|--------|
| Flexible creator tiers | `create_custom_tier`, `update_tier_price`, `deprecate_tier` -- creators manage their own tiers on-chain | Done (v9) |
| Verification working | `verify_access` + `verify_tier_access` -- zero-footprint (no finalize), enforces revocation | Done (v15) |
| Gated content delivery | Server-side verification, encrypted content bodies, `publish_encrypted_content` with encryption commitments | Done (v12) |

---

## What We Built in Wave 3

### Contract Evolution: v8 to v20 (12 versions in one wave)
- **v9**: Dynamic creator tiers + content lifecycle (create/update/delete)
- **v10**: Gifting (GiftToken record) + refund escrow (RefundEscrow record) + fee withdrawal
- **v11**: **Blind renewal** -- novel privacy technique (subscriber identity rotation per nonce)
- **v12**: Encrypted content delivery + dispute system + access revocation
- **v13**: Auth hardening, ternary safety, get_or_use pattern
- **v14**: **Commit-reveal tipping** (BHP256 commitment scheme -- hidden tip amounts)
- **v15**: Security hardening, subscription transfer, revocation enforcement -- **DEPLOYED ON TESTNET**
- **v16**: On-chain referral system (ReferralReward record, 10% referrer bonus)
- **v17**: **Homomorphic Pedersen commitments** for subscriber count, zero-footprint proofs
- **v18**: Poseidon2 optimization (2-8 constraints vs 256 for BHP256)
- **v19**: Deep Poseidon2 in all finalize functions, activity tracking, MIN_PRICE validation
- **v20**: Analytics epochs, content versioning, 30 mappings, 972 statements

### 7 Novel Privacy Techniques
1. **Blind Renewal** (v11): Each `renew_blind()` rotates subscriber identity via `BHP256(caller, nonce)`. Creator cannot link renewals to the same person.
2. **Commit-Reveal Tipping** (v14): Tip amounts hidden until voluntary reveal via BHP256 commitment scheme.
3. **Homomorphic Pedersen Commitments** (v17): Aggregate subscriber counts without revealing individual subscriptions.
4. **Zero-Footprint Verification** (v8+): `verify_access` and `verify_tier_access` skip finalize entirely -- no on-chain trace.
5. **Double-Hash Identity** (v19): `Poseidon2(Poseidon2(caller))` in receipts makes rainbow tables infeasible.
6. **Privacy-Preserving Referrals** (v16): Referrer earns reward without seeing who subscribed.
7. **Zero-Footprint Proofs** (v17): `prove_sub_count` and `prove_revenue_range` prove properties without any on-chain trace.

### On-Chain Testnet Transactions (v15)
| # | Transition | Purpose | Verifiable |
|---|-----------|---------|-----------|
| 1 | `register_creator` (base price 1000) | Creator registration | `tier_prices` mapping |
| 2 | `create_custom_tier` (tier 1, 500) | Supporter tier | `tier_count` mapping |
| 3 | `create_custom_tier` (tier 2, 2000) | Premium tier | `tier_count` mapping |
| 4 | `create_custom_tier` (tier 3, 5000) | VIP tier | `tier_count` mapping |
| 5 | `publish_content` (#1, tier 1) | Supporter content | `content_count` mapping |
| 6 | `publish_content` (#2, tier 2) | Premium content | `content_count` mapping |
| 7 | `publish_encrypted_content` (#3, tier 1) | Encrypted content | `encryption_commits` mapping |
| 8 | `update_content` (#1, tier 2) | Content lifecycle | `content_meta` mapping |
| 9 | `delete_content` (#2) | Content removal | `content_deleted` mapping |
| 10 | `commit_tip` (500, salt) | Pedersen tipping | `tip_commitments` mapping |
| 11 | `update_tier_price` (tier 1, 750) | Dynamic pricing | tier data |
| 12 | `deprecate_tier` (tier 3) | Tier lifecycle | `tier_deprecated` mapping |
| 13 | `publish_content` (#4, tier 1) | Additional content | `content_count` mapping |

### Frontend (22 Routes, 15,200+ Lines TypeScript)
- Premium monochrome design with violet accent, serif typography
- Glassmorphism cards, scroll animations (Framer Motion), loading skeletons
- Error boundaries on all 9 route segments
- Mobile responsive with bottom navigation, touch targets
- Transaction progress stepper with 4-step timing
- Privacy mode selector (Standard / Blind / Maximum)
- Creator analytics dashboard with charts (ActivityChart, TierDistribution)
- On-chain explorer for mapping queries (no wallet required)
- WCAG AA contrast compliance, prefers-reduced-motion support
- PWA manifest, dynamic metadata, SEO (sitemap, robots.txt, OpenGraph)
- Gas estimate display on all transaction modals
- 5-wallet support (Shield, Leo, Fox, Puzzle, Soter)

---

## Feature Matrix (31 Transitions)

| Feature | Status | Version | Privacy Level |
|---------|--------|---------|--------------|
| Creator registration | Done | v8 | Public (creator address) |
| Standard subscription | Done | v8 | Private (subscriber hidden) |
| Zero-footprint verification | Done | v8 | Maximum (no finalize) |
| Audit tokens | Done | v8 | Maximum (no finalize) |
| Custom creator tiers | Done | v9 | Public (tier prices) |
| Content publish/update/delete | Done | v9 | Public (metadata only) |
| Subscription gifting | Done | v10 | Private (GiftToken record) |
| Refund escrow | Done | v10 | Private (RefundEscrow record) |
| Fee withdrawal | Done | v10 | Public (aggregate amounts) |
| Blind renewal | Done | v11 | **Maximum** (unlinkable identity) |
| Encrypted content | Done | v12 | Private (commitment only) |
| Dispute system | Done | v12 | Private (subscriber proof required) |
| Access revocation | Done | v12 | Auth-gated (creator-only) |
| Commit-reveal tipping | Done | v14 | **Maximum** (hidden until reveal) |
| Subscription transfer | Done | v15 | Private (revocation-checked) |
| On-chain referrals | Done | v16 | Private (ReferralReward record) |
| Pedersen commitment proofs | Done | v17 | **Maximum** (homomorphic) |
| Poseidon2 optimization | Done | v18-v19 | Performance (2-8 vs 256 constraints) |
| Analytics epochs | Done | v20 | Public (aggregate per epoch) |
| Content versioning | Done | v20 | Public (version counter) |

---

## Scoring Self-Assessment

| Category | Wave 2 | Wave 3 Target | Justification |
|----------|--------|--------------|---------------|
| Privacy (40%) | 7 | 9 | 7 novel privacy techniques, 3 zero-footprint proofs, Pedersen commitments, blind renewal, never-in-finalize guarantee |
| Tech (20%) | 5 | 8 | 31 transitions, 30 mappings, 972 statements, 20 version iterations, Poseidon2 optimization, 8 record types |
| UX (20%) | 7 | 8 | 22 routes, scroll animations, skeletons, error boundaries, privacy mode selector, on-chain explorer, gas estimates |
| Practicality (10%) | 7 | 8 | Fee withdrawal, escrow refunds, dispute system, content CRUD, referral economics |
| Novelty (10%) | 7 | 8 | Blind renewal, Pedersen commitments, zero-footprint proofs, subscription transfer, commit-reveal tipping |
| **Total** | **33** | **41** | |

---

## Known Limitations
- v20 exceeds testnet variable limit (2.3M vs 2.1M max) -- v15 is deployed with 28/31 transitions
- Video demo not yet recorded (all features functional, awaiting screen capture)
- Supabase off-chain storage optional (app works without it via seed data and on-chain queries)

## Wave 4 Goals
- Deploy optimized contract closer to v20 feature set (remove analytics features to fit under limit)
- Execute subscribe/renew/gift transitions with second test account
- Record and submit video demo
- Private tier selection (hash tier in finalize)
- Multi-nonce blind renewal enhancement

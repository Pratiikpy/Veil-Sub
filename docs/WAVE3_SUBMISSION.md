# VeilSub — Wave 3 Submission

## Project Overview
**VeilSub** is a privacy-first creator subscription platform on Aleo. Creators register, set custom tiers, and publish gated content. Subscribers pay with private credits, receive encrypted AccessPass records, and verify access with zero public footprint.

- **Deployed Program**: `veilsub_v15.aleo` (testnet)
- **Source Contract**: `veilsub_v20.aleo` (1,750+ lines, 31 transitions, 30 mappings, 8 records)
- **Frontend**: https://veilsub.vercel.app
- **Repository**: https://github.com/Pratiikpy/Veil-Sub

---

## Wave 2 Feedback & Responses

**Judge (Wave 2)**: "Would be better if subscription tiers can be flexibly added by creators themselves, interested to see how verification and gated content delivery actually work next"

| Feedback | Response | Status |
|----------|----------|--------|
| Flexible creator tiers | `create_custom_tier`, `update_tier_price`, `deprecate_tier` — creators manage their own tiers on-chain | Done |
| Verification working | `verify_access` + `verify_tier_access` — zero-footprint (no finalize), enforces revocation | Done |
| Gated content delivery | Server-side verification, encrypted content bodies, `publish_encrypted_content` with encryption commitments | Done |

---

## What We Built in Wave 3

### Contract Evolution: v8 to v20 (12 versions)
- **v9**: Dynamic creator tiers + content lifecycle
- **v10**: Gifting (GiftToken record) + refund escrow (RefundEscrow record) + fee withdrawal
- **v11**: Blind renewal — novel privacy technique (subscriber identity rotation per nonce)
- **v12**: Encrypted content delivery + dispute system + access revocation
- **v13**: Auth hardening, ternary safety, get_or_use pattern
- **v14**: Commit-reveal tipping (BHP256 commitment scheme)
- **v15**: Security hardening, subscription transfer, revocation enforcement
- **v16**: On-chain referral system (ReferralReward record, 10% referrer bonus)
- **v17**: Homomorphic Pedersen commitments for subscriber count
- **v18**: Poseidon2 optimization (2-8 constraints vs 256 for BHP256)
- **v19**: Deep Poseidon2 in all finalize functions, activity tracking, MIN_PRICE
- **v20**: Analytics epochs, content versioning, double-hash identity

### Novel Privacy Techniques
1. **Blind Renewal**: Each `renew_blind()` rotates subscriber identity via `BHP256(caller, nonce)`. Creator cannot link renewals to the same person.
2. **Commit-Reveal Tipping**: Tip amounts hidden until voluntary reveal via BHP256 commitment scheme.
3. **Homomorphic Pedersen Commitments**: Aggregate subscriber counts without revealing individual subscriptions.
4. **Zero-Footprint Verification**: `verify_access` and `verify_tier_access` skip finalize entirely — no on-chain trace.
5. **Double-Hash Identity**: `Poseidon2(Poseidon2(caller))` in receipts makes rainbow tables infeasible.

### Frontend (22 Routes)
- Premium monochrome design with violet accent
- Glassmorphism cards, scroll animations, loading skeletons
- Error boundaries on all routes
- Mobile responsive with bottom navigation
- Transaction progress stepper with timing
- Privacy mode selector (Standard / Blind / Maximum)
- Creator analytics dashboard with charts
- On-chain explorer for mapping queries
- WCAG AA contrast compliance

---

## Feature Status

| Feature | Status | Contract Version |
|---------|--------|-----------------|
| Creator registration | Done | v8 |
| Standard subscription | Done | v8 |
| Zero-footprint verification | Done | v8 |
| Audit tokens | Done | v8 |
| Custom creator tiers | Done | v9 |
| Content publish/update/delete | Done | v9 |
| Subscription gifting | Done | v10 |
| Refund escrow (500-block window) | Done | v10 |
| Platform + creator fee withdrawal | Done | v10 |
| Blind renewal (identity rotation) | Done | v11 |
| Encrypted content delivery | Done | v12 |
| Dispute system | Done | v12 |
| Access revocation | Done | v12 |
| Commit-reveal tipping | Done | v14 |
| Subscription transfer | Done | v15 |
| On-chain referrals | Done | v16 |
| Pedersen commitment proofs | Done | v17 |
| Poseidon2 optimization | Done | v18-v19 |
| Analytics epochs | Done | v20 |
| Content versioning | Done | v20 |
| Testnet deployment | Done | v15 |
| 13+ transitions executed | Done | v15 |
| Video demo | Pending | — |

---

## Known Limitations
- v20 exceeds testnet variable limit (2.3M vs 2.1M max) — v15 is deployed with 28/31 transitions
- Video demo not yet recorded (all features functional, awaiting screen capture)

## Wave 4 Goals
- Deploy optimized contract closer to v20 feature set
- Execute subscribe/renew/gift transitions with second test account
- Record and submit video demo
- Add more pre-populated test creators with on-chain data

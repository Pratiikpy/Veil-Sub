# VeilSub Progress Changelog

## v20 Changes
- Analytics epochs: subscription_epoch mapping, EPOCH_SIZE constant for time-bucketed analytics
- Content versioning: content_version mapping, version tracking in publish_content and update_content
- Activity tracking in publish_content and update_content finalize
- 972 statements, 30 mappings (up from 954/28 in v19)

## v19 Changes
- Deep Poseidon2 optimization: ALL BHP256::hash_to_field replaced with Poseidon2 in finalize functions (~15 occurrences)
- Blind subscription hashes also migrated to Poseidon2
- New mappings: subscription_by_tier, creator_last_active, total_subscriptions
- MIN_PRICE constant: anti-dust price validation
- MAX_TIER validation added to create_custom_tier
- 954 statements, 28 mappings (up from 940/25 in v18)

---

## Wave 3 (v20) — March 2026

### Smart Contract: veilsub_v20.aleo
**1,750+ lines | 31 transitions | 30 mappings | 8 record types**

#### New Privacy Features
- **Homomorphic Pedersen Commitments**: Subscriber counts can be hidden behind group-element commitments via `subscribe_private_count`. Uses manual `(value as scalar) * G + blinding * H` for additive homomorphism (not Leo's built-in Pedersen which lacks this property).
- **Zero-Footprint Proofs**: `prove_sub_count` and `prove_revenue_range` have NO finalize block — proofs generate zero on-chain trace. Creators can prove "50+ subscribers" or "revenue above 100 ALEO" without revealing exact values.
- **Referral System**: `subscribe_referral` with 10% reward to referrer via private `ReferralReward` record. Referrer identity stays private.
- **Three Privacy Modes**: Standard (public counters), Blind (nonce-based identity hiding), Maximum (Pedersen commitments — no public counter increment at all).

#### Contract Improvements
- Named constants: `PLATFORM_FEE_DIV`, `ESCROW_BLOCKS`, `MAX_EXPIRY`, `MAX_DISPUTE_PER_CALLER`, `REFERRAL_DIV`
- Inline Pedersen helper functions: `get_g()`, `get_h()`, `pedersen_commit()`
- New mapping: `sub_count_commit` for aggregate Pedersen commitments per creator
- New record: `ReferralReward` (owner, creator, amount, referral_id)
- Consolidated redundant proof transitions (removed `verify_pedersen_commitment` and `verify_group_commit`, replaced by `prove_revenue_range` and `prove_sub_count`)

### Frontend
- **Privacy Mode Selector**: SubscribeModal now offers Standard/Blind/Maximum privacy modes with clear descriptions
- **v17/v19 Hooks**: `subscribePrivateCount`, `proveSubCount`, `proveRevenueRange`, `subscribeReferral`
- **Glassmorphism + Violet Accent**: Applied across landing, explore, verify, privacy, vision, and docs pages
- **GlassCard accent variant**: `border-violet-500/[0.12]` with hover glow effect
- **Landing Page**: Updated ticker stats, evolution badge, hero footer, and explorer links for v20
- **Docs Page**: Added v17 Pedersen section in Privacy tab, updated transitions list (all 31), all 30 mappings documented, violet tab selector
- **Explorer Page**: Quick Mapping Queries section with one-click on-chain lookups (no wallet needed)
- **Vision Page**: Updated stats (30 mappings), roadmap reflects Wave 3 completion
- **Analytics Page**: Updated version timeline (v4-v8 through v19-v20), protocol stats (30 mappings, 1,750+ lines)
- **Optimistic UI**: Toast loading states in SubscribeModal, TipModal, CreatePostForm
- **Featured Creators**: 5 demo creators with fallback display on explore page

### Documentation
- **Privacy Threat Model**: 12 attack vectors with severity/mitigation/residual risk analysis
- **Formal Privacy Guarantees**: Per-transition table (31 transitions) documenting what observers learn vs. cannot learn
- **Architecture Docs**: Updated for v20 transitions, mappings, and record types
- **README**: Updated competitive positioning, version history, architecture diagram

---

## Wave 2 (v8) — February 2026

### Smart Contract: veilsub_v8.aleo
**~800 lines | 12 transitions | 8 mappings | 3 record types**

#### Features
- Multi-token support (credits.aleo + token_registry.aleo)
- `CreatorReceipt` record for creator-side payment proof
- `AuditToken` record for zero-footprint audit capability
- Content hash publishing (`publish_content`)
- Tier-based pricing (1x/2x/5x hardcoded tiers)

### Frontend
- Walletless blockchain explorer
- Mobile-responsive navigation
- Verify page for on-chain mapping queries
- Creator page with tier cards and subscribe modal

### Scores
Privacy: 7 | Tech: 5 | UX: 7 | Practicality: 7 | Novelty: 7 = **33/50**

---

## Wave 2 → Wave 3 Delta

| Metric | Wave 2 (v8) | Wave 3 (v20) | Change |
|--------|-------------|--------------|--------|
| Contract lines | ~800 | 1,750+ | +119% |
| Transitions | 12 | 31 | +158% |
| Mappings | 8 | 30 | +275% |
| Record types | 3 | 8 | +167% |
| Version iterations | v8 | v20 | +12 versions |
| Privacy modes | 1 (standard) | 3 (standard/blind/max) | +2 |
| Zero-footprint proofs | 1 (verify_access) | 4 (+prove_sub_count, prove_revenue_range, create_audit_token) | +3 |
| Custom tiers | Hardcoded 1x/2x/5x | Dynamic creator-defined | Flexible |
| Subscription gifting | No | Yes (GiftToken record) | New |
| Escrow/refund | No | Yes (RefundEscrow record) | New |
| Blind renewal | No | Yes (nonce-based) | New |
| Referral system | No | Yes (10% reward) | New |
| Pedersen commitments | No | Yes (homomorphic) | New |
| Content management | Publish only | Publish + update + delete + encrypt | Full CRUD |
| Subscription transfer | No | Yes (transfer_pass) | New |
| Access revocation | No | Yes (revoke_access + verify enforcement) | New |
| Dispute system | No | Yes (dispute_content) | New |
| Frontend pages | 8 | 22 routes | +175% |
| Design system | Basic dark | Glassmorphism + violet accent | Premium |

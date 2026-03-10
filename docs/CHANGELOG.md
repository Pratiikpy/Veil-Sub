# VeilSub Progress Changelog

## Wave 3 (v27 — DEPLOYED) — March 2026

### Smart Contract: veilsub_v27.aleo (deployed)
**v27 deployed: 27 transitions | 25 mappings | 6 record types | 5 structs | 866 statements**

**DEPLOYED ON TESTNET**: [`veilsub_v27.aleo`](https://testnet.aleoscan.io/program?id=veilsub_v27.aleo)

#### v27: Scoped Audit Tokens + Trial Rate-Limiting — DEPLOYED
- `scope_mask` field added to AuditToken record for selective field disclosure
- `trial_used` mapping with TrialKey struct — one trial per creator per subscriber
- `redeem_gift` now writes `pass_creator` mapping (gift revocation fix)
- New error codes: ERR_118 (scope must include at least one field), ERR_119 (already used trial for this creator)
- 27 transitions, 25 mappings, 866 statements

#### v26: Trial Passes — DEPLOYED
- `subscribe_trial` — ephemeral trial subscription at 20% of tier price, ~12hr block duration
- TRIAL_DURATION constant (1000 blocks), TRIAL_PRICE_DIV constant (5)
- Error codes ERR_111-117 for trial validation
- 27 transitions, 24 mappings, 846 statements, 1,879,536 variables (89.6% of limit)

#### v25: Threshold Proofs + Platform Stats — DEPLOYED
- `prove_subscriber_threshold` — privacy-preserving reputation proof (ERR_108-110)
- `total_creators` and `total_content` platform-wide singleton mappings
- subscriber_count fix in finalize_renew/finalize_renew_blind
- Removed unused RefundEscrow and ReferralReward record types

#### v24: Content Auth + Expiry Enforcement — DEPLOYED
- Added `content_creator` mapping (22nd mapping) for ownership auth on update/delete
- On-chain expiry enforcement: `verify_access` and `verify_tier_access` now check `expires_at > block.height` in finalize
- `subscription_by_tier` consistency: all subscribe variants (subscribe_blind, renew, renew_blind, gift_subscription) now update tier tracking
- v24 deployed: 25 transitions, 22 mappings, 1,734,009 variables. v25 local: 26 transitions, 24 mappings, 779 statements

#### v23: Privacy Overhaul — ZERO Addresses in Finalize
Core privacy improvement in v23:
- **ALL finalize functions** now receive `creator_hash: field` instead of `creator: address`
- **ALL 25 mappings** are field-keyed — no raw address appears in any public mapping key
- **pass_creator mapping** stores creator HASH (not raw address) for revocation auth
- **Auth checks** (platform admin, creator ownership) moved to transition layer where `self.caller` is available — still cryptographically enforced via ZK proofs
- Matches NullPay's privacy discipline (Privacy 8) while retaining VeilSub's full feature set

#### Removed for Testnet Variable Limit (v21 → v23)
To fit within the 2,097,152 testnet variable limit (v21 was 2,327,864):
- Pedersen proof transitions (`subscribe_private_count`, `prove_sub_count`, `prove_revenue_range`) — group math too variable-expensive
- `subscribe_referral` — 2x `transfer_private` calls = ~130K additional variables
- `subscribe_with_escrow`, `claim_refund` — escrow transitions reserved for future
- Analytics-only mappings (`content_version`, `subscription_epoch`, `creator_last_active`, `total_subscriptions`, `creator_privacy_mode`, `creator_verified`, `sub_count_commit`)
- Result: 1,734,009 variables (82% of limit) — safely deployable

#### On-Chain Transactions Confirmed
1. `register_creator(1000)` — creator registration with base price
2. `create_custom_tier` x3 — Supporter (500), Premium (2000), VIP (5000)
3. `publish_content` x5 — content across all 3 tiers
4. `publish_encrypted_content` — encrypted content with commitment hash
5. `update_content` — content lifecycle (tier change)
6. `delete_content` — content removal with ContentDeletion proof
7. `commit_tip` — phase 1 of commit-reveal tipping (BHP256 commitment)
8. `withdraw_platform_fees` — platform fee business model
9. `withdraw_creator_rev` — creator revenue withdrawal

---

### Source-Only Iterations (v16-v21)
These versions added features that were later trimmed in v23 for deployment:

#### v21: Error Codes & Security Hardening
- 113 error codes (ERR_001-ERR_113) on all assert statements (84 remain in v23 after pruning)
- `creator_verified` mapping, EpochKey/DisputeKey structs
- Anti-abuse constants: MAX_CONTENT_PER_CREATOR, MAX_SUBS_PER_CREATOR

#### v20: Analytics Epochs & Content Versioning
- subscription_epoch mapping, content_version mapping
- 972 statements, 30 mappings

#### v19: Deep Poseidon2 Optimization
- ALL BHP256::hash_to_field replaced with Poseidon2 in finalize (~15 occurrences)
- New mappings: subscription_by_tier, creator_last_active, total_subscriptions
- 954 statements, 28 mappings

#### v18: Version Bump
- 25 mappings, continued privacy hardening

#### v17: Homomorphic Pedersen Commitments
- `subscribe_private_count` with `sub_count_commit` mapping
- `prove_sub_count` and `prove_revenue_range` zero-footprint proofs
- Named constants replacing magic numbers

#### v16: On-Chain Referral System
- `subscribe_referral` with 10% reward, ReferralReward record
- Privacy-preserving referral tracking

---

### Frontend (Wave 3)
- **62 components**, 10 routes, 16 custom hooks
- **Privacy Mode Selector**: Standard/Blind in SubscribeModal
- **Glassmorphism + Violet Accent**: Design system across all pages
- **Landing Page**: FAQ accordion, competitor comparison table, hero stats
- **Docs Page**: 5-tab interface (Overview, Contract, Privacy, API, FAQ)
- **Explorer Page**: Walletless on-chain mapping queries
- **Privacy Page**: 12-vector threat model, formal privacy guarantees
- **Optimistic UI**: Toast loading states, 4-step transaction stepper
- **Accessibility**: Skip-to-content link, :focus-visible rings, ARIA labels, prefers-reduced-motion
- **Header**: Auto-hide on scroll down, reveal on scroll up
- **Loading skeletons**: Every route has loading.tsx
- **Error boundaries**: Every route has error.tsx
- **5 wallet support**: Shield, Leo, Fox, Puzzle, Soter

### Documentation
- **README**: Complete rewrite with privacy deep-dive, competitor analysis, accurate v27 stats
- **ARCHITECTURE.md**: System architecture, privacy boundary, data flow
- **PRIVACY_MODEL.md**: 12 attack vectors, severity/mitigation analysis
- **VIDEO_DEMO_SCRIPT.md**: 3-5 minute recording guide

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

| Metric | Wave 2 (v8) | Wave 3 (v27) | Change |
|--------|-------------|--------------|--------|
| Transitions | 12 | 27 | +15 |
| Mappings | 8 | 25 | +17 |
| Record types | 3 | 6 | +100% |
| Structs | 1 | 5 | +4 |
| Version iterations | v8 | v27 | +19 versions |
| Privacy modes | 1 (standard) | 2 (standard/blind) | +1 |
| Zero-footprint proofs | 1 (verify_access) | 3 (verify_access, verify_tier, audit_token) | +2 |
| Custom tiers | Hardcoded 1x/2x/5x | Dynamic creator-defined (up to 20) | Flexible |
| Addresses in finalize | Present | **ZERO** | Complete elimination |
| On-chain transactions | 0 | 15+ | From zero to tested |
| Subscription gifting | No | Yes (GiftToken record) | New |
| Blind renewal | No | Yes (nonce-based identity rotation) | New |
| Content management | Publish only | Publish + update + delete + encrypt | Full CRUD |
| Subscription transfer | No | Yes (transfer_pass) | New |
| Access revocation | No | Yes (revoke_access + verify enforcement) | New |
| Dispute system | No | Yes (dispute_content + rate limiting) | New |
| Commit-reveal tipping | No | Yes (BHP256 commitment scheme) | New |
| Frontend components | ~20 | 62 | +42 |
| Design system | Basic dark | Glassmorphism + violet accent | Premium |

# VeilSub -- Wave 3 Submission

## Project Overview
**VeilSub** is a privacy-first creator subscription platform on Aleo. Creators register, set custom tiers, and publish gated content. Subscribers pay with private credits, receive encrypted AccessPass records, and verify access with zero public footprint.

- **Deployed Program**: [`veilsub_v27.aleo`](https://testnet.aleoscan.io/program?id=veilsub_v27.aleo) (testnet, 27 transitions, 25 mappings, 866 statements)
- **Frontend**: https://veilsub.vercel.app
- **Repository**: https://github.com/Pratiikpy/Veil-Sub
- **Account**: `aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk`

---

## Wave 2 Feedback & Responses

**Judge (Wave 2)**: "Would be better if subscription tiers can be flexibly added by creators themselves, interested to see how verification and gated content delivery actually work next"

| Feedback | Response | Status |
|----------|----------|--------|
| Flexible creator tiers | `create_custom_tier`, `update_tier_price`, `deprecate_tier` -- creators manage their own tiers on-chain | Done (v9) |
| Verification working | `verify_access` + `verify_tier_access` -- minimal-footprint (revocation + expiry check, subscriber never in finalize) | Done (v15), deployed on v27 |
| Gated content delivery | Server-side verification, encrypted content bodies, `publish_encrypted_content` with encryption commitments | Done (v12), deployed on v27 |

---

## What We Built in Wave 3

### Contract Evolution: v8 to v27 (19 versions in one wave)
- **v9**: Dynamic creator tiers + content lifecycle (create/update/delete)
- **v10**: Gifting (GiftToken record) + refund escrow (RefundEscrow record) + fee withdrawal
- **v11**: Blind renewal -- subscriber identity rotation per nonce
- **v12**: Encrypted content delivery + dispute system + access revocation
- **v13**: Auth hardening, ternary safety, get_or_use pattern
- **v14**: Commit-reveal tipping (BHP256 commitment scheme)
- **v15**: Security hardening, subscription transfer -- **first testnet deploy**
- **v16-v21**: Source-only iterations (referrals, Pedersen, analytics, error codes)
- **v23**: **Privacy overhaul -- ZERO addresses in finalize.** All finalize functions receive Poseidon2 hashes instead of raw addresses. Removed variable-expensive features (Pedersen proofs, referrals, escrow) to fit testnet limit.
- **v24**: Incremental improvements on v23 privacy overhaul. 22 mappings, 1,734,009 variables. Deployed on testnet.
- **v25**: prove_subscriber_threshold, platform analytics mappings. 26 transitions, 24 mappings, 779 statements, 1,751,818 variables. **Deployed and verified on testnet.**
- **v26**: `subscribe_trial` — ephemeral trial passes at 20% of tier price for ~12 hours. 27 transitions, 24 mappings, 846 statements, 1,879,536 variables. Deployed on testnet.
- **v27**: Scoped audit tokens (`scope_mask` on AuditToken), trial rate-limiting (`trial_used` mapping + TrialKey struct), `redeem_gift` now writes `pass_creator` for revocation. 27 transitions, 25 mappings, 866 statements. **Deployed on testnet.**

### 3 Novel Privacy Techniques (deployed on v27)
1. **Zero-Address Finalize** (v23+): Every finalize function receives `creator_hash: field` (Poseidon2) instead of `creator: address`. All 25 mappings are field-keyed. No raw address ever appears in the public execution layer.
2. **Blind Renewal** (v11+): Each `renew_blind()` rotates subscriber identity via `Poseidon2(BlindKey{caller, nonce})`. Creator cannot link renewals to the same person.
3. **Commit-Reveal Tipping** (v14+): `commit_tip` stores `BHP256::commit_to_field(amount, blinding_factor)`. Tip amounts stay hidden until the tipper voluntarily calls `reveal_tip` with the preimage.

### Additional Privacy Features
- **Zero-Footprint Verification**: `verify_access` and `verify_tier_access` check only revocation status in finalize -- subscriber identity never touches public state.
- **Trial Passes**: `subscribe_trial` creates ephemeral AccessPass at 20% of tier price with ~12hr block duration
- **Private Payments**: All subscription payments use `credits.aleo/transfer_private` -- amounts and sender addresses are never public.
- **One-Way Identity Hashing**: Subscriber hashes in receipts use `Poseidon2(caller)` — a one-way hash preventing reverse lookups.
- **Zero-Trace Audit Tokens**: `create_audit_token` has NO finalize at all — creates a selective-disclosure AuditToken record with absolutely zero on-chain trace.

### On-Chain Testnet Transactions
| # | Transition | Purpose | Verified |
|---|-----------|---------|----------|
| 1 | `register_creator` (base price 1000) | Creator registration | `tier_prices` mapping |
| 2 | `create_custom_tier` (tier 1, 500) | Supporter tier | `tier_count` mapping |
| 3 | `create_custom_tier` (tier 2, 2000) | Premium tier | `tier_count` mapping |
| 4 | `create_custom_tier` (tier 3, 5000) | VIP tier | `tier_count` mapping |
| 5 | `publish_content` (#1, tier 1) | Supporter content | `content_count` mapping |
| 6 | `publish_content` (#2, tier 2) | Premium content | `content_count` mapping |
| 7 | `publish_content` (#3, tier 1) | Additional content | `content_count` mapping |
| 8 | `publish_content` (#4, tier 2) | More content | `content_count` mapping |
| 9 | `publish_content` (#5, tier 1) | Content variety | `content_count` mapping |
| 10 | `publish_encrypted_content` (#6, tier 1) | Encrypted content | `encryption_commits` mapping |
| 11 | `update_content` (#1 -> tier 2) | Content lifecycle | `content_meta` mapping |
| 12 | `delete_content` (#2) | Content removal | `content_deleted` mapping |
| 13 | `commit_tip` (500, salt) | Commitment tipping | `tip_commitments` mapping |

---

## Feature Matrix (27 Transitions, deployed on v27)

| Feature | Status | Version | Privacy Level |
|---------|--------|---------|--------------|
| Creator registration | Deployed | v8+ | Semi-public (creator hash only) |
| Standard subscription | Deployed | v8+ | Private (subscriber hidden) |
| Access verification | Deployed | v8+ | Maximum (finalize checks revocation + expiry — no subscriber identity) |
| Tier-gated verification | Deployed | v15+ | Maximum (finalize checks revocation + expiry only) |
| Audit tokens | Deployed | v8+ | Maximum (no finalize — zero on-chain trace) |
| Custom creator tiers | Deployed | v9+ | Public (tier prices) |
| Content publish/update/delete | Deployed | v9+ | Public (metadata only) |
| Subscription gifting | Deployed | v10+ | Private (GiftToken record) |
| Fee withdrawal (platform + creator) | Deployed | v10+ | Public (aggregate amounts) |
| Blind renewal | Deployed | v11+ | **Maximum** (unlinkable identity) |
| Encrypted content | Deployed | v12+ | Private (commitment only) |
| Dispute system | Deployed | v12+ | Private (subscriber proof) |
| Access revocation | Deployed | v12+ | Auth-gated (creator-only) |
| Commit-reveal tipping | Deployed | v14+ | **Maximum** (hidden until reveal) |
| Subscription transfer | Deployed | v15+ | Private (revocation-checked) |
| Trial subscriptions | Deployed | v26+ | Private (subscriber hidden, short duration) |
| Threshold reputation proof | Deployed | v25+ | Public (proves N+ subs without exact count) |

---

## Known Limitations
- Some features from v16-v21 (Pedersen proofs, referrals, escrow/refund) were removed in v23 to fit under the testnet variable limit (2,097,152). The source code for these versions is in the repository history.
- `withdraw_platform_fees` and `withdraw_creator_rev` track revenue as accounting ledgers -- actual payments go directly to creators via `transfer_private` at subscription time.
- Subscription expiry is enforced on-chain via `block.height` comparison in `verify_access` and `verify_tier_access` (added in v24).

## Next Steps
- Execute remaining transitions (subscribe, verify_access, renew, gift, tip) with test subscriber account
- Record video demo showing end-to-end flow
- Explore re-adding referral system with optimized variable usage

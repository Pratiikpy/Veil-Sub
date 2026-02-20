# Wave 2 Changelog (v7 → v8)

## Summary

Wave 2 focused on three themes identified from Wave 1 judge feedback analysis:
1. **Deeper privacy patterns** — CreatorReceipt, AuditToken, content integrity hashes
2. **Better documentation** — Architecture docs, privacy model explanation, video demo
3. **Walletless verification** — On-chain explorer that works without connecting a wallet

## Smart Contract Changes (veilsub_v7 → veilsub_v8)

### New: CreatorReceipt Record
- **What**: Every `subscribe`, `tip`, and `renew` now returns a private `CreatorReceipt` record to the creator
- **Why**: Creators previously had no on-chain proof of individual payments — only aggregate counters. Now they have cryptographic receipts.
- **Privacy**: The subscriber's address is stored as `BHP256::hash_to_field(self.caller)` — the creator can identify returning subscribers by their hash without knowing their actual address
- **Fields**: owner (creator), subscriber_hash, tier, amount, pass_id

### New: AuditToken Record + create_audit_token Transition
- **What**: Subscribers can generate selective-disclosure tokens for third-party verifiers
- **Why**: Enables privacy-preserving proof of subscription without revealing subscriber identity. A verifier learns "this person has a VIP subscription to creator X that expires at block Y" without knowing WHO they are
- **Privacy**: Zero finalize footprint — creating audit tokens leaves no trace on-chain
- **Fields**: owner (verifier), creator, subscriber_hash, tier, expires_at

### New: Content Integrity Hashes
- **What**: `publish_content` now accepts a `content_hash` field stored on-chain
- **Why**: Enables tamper-proof verification of off-chain content. Anyone can compare the off-chain body hash to the on-chain commitment
- **Mapping**: `content_hashes: field => field`

### Updated: Tip Transition
- **What**: `tip` now returns a `CreatorReceipt` (tier=0, pass_id=0 to signal "tip")
- **Why**: Consistent receipt model across all payment types

### Enhanced: Privacy Architecture Documentation
- Comprehensive header comment block documenting what's private vs. public and WHY
- Clear explanation of finalize parameter visibility as intentional design tradeoff

## Frontend Changes

### New: Walletless On-Chain Explorer
- **Location**: `/verify` page (bottom section)
- **Features**:
  - Creator Lookup: Query any creator's registration, pricing, subscriber count, revenue, content count — no wallet needed
  - Content Verification: Check content tier requirements and integrity hashes
  - Program Deployment: Verify `veilsub_v8.aleo` is deployed on testnet
- **Why**: Judges can verify on-chain state without needing a wallet installed

### Updated: useVeilSub Hook
- `createAuditToken(passPlaintext, verifierAddress)` — new function
- `publishContent(contentId, minTier, contentHash)` — now accepts content hash
- `getCreatorReceipts()` — fetch receipt records for creator dashboard
- `getAuditTokens()` — fetch audit tokens

### Updated: Configuration
- Program ID updated to `veilsub_v8.aleo`
- New fee estimate: `AUDIT_TOKEN: 100_000` (0.1 ALEO, no finalize)

## Documentation Added

| File | Purpose |
|------|---------|
| `docs/ARCHITECTURE.md` | Full system architecture: layers, data flow, components, dependencies |
| `docs/PRIVACY_MODEL.md` | Comprehensive privacy model: what's private/public, why, comparison with competitors |
| `docs/WAVE2_CHANGELOG.md` | This file — Wave 1→2 improvements |
| `docs/VIDEO_DEMO_SCRIPT.md` | Step-by-step guide for recording the demo video |

## Test Suite

### Leo Tests (10 tests)
- `test_tier_multipliers` — 1x/2x/5x pricing verification
- `test_fee_split` — 5% platform / 95% creator fee math
- `test_hash_consistency` — BHP256 deterministic output
- `test_subscriber_hash` — Address hashing for privacy
- `test_expiry_bounds` — Block height duration limits
- `test_token_fee_split` — u128 ARC-20 fee calculations
- `test_content_hash_integrity` — Content ID hashing and integrity
- `test_access_pass_fields` — Record field validation
- `test_audit_token_hash_linkage` — Cross-record hash consistency
- `test_token_key_hashing` — Composite key hashing for token mappings

## Mobile Improvements
- Bottom navigation bar for mobile viewports
- Responsive layouts across all pages
- Touch-friendly button sizes

## What's Still In Progress (Wave 3 Goals)
- [ ] Record a video demo (script is in `docs/VIDEO_DEMO_SCRIPT.md`)
- [ ] Deploy veilsub_v8.aleo to testnet and update .env
- [ ] Generate real testnet transactions for all transitions
- [ ] Add end-to-end Playwright tests
- [ ] Integrate AuditToken into creator dashboard UI
- [ ] Add content hash computation in CreatePostForm
- [ ] Explore on-chain content access NFTs

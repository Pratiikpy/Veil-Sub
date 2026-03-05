# VeilSub Privacy Model

## Executive Summary

VeilSub draws a clear privacy boundary: **creators are public entities; subscribers are anonymous**. This mirrors the real world — a bookstore's catalog and sales figures are public, but the customer list is private.

## Privacy Classification

### PRIVATE (Records — Zero Knowledge)

| Data | How Protected | Record type |
|------|--------------|-------------|
| Subscriber wallet address | `self.caller` NEVER passed to finalize | AccessPass |
| Subscription details (tier, expiry) | Encrypted in AccessPass record | AccessPass |
| Payment records | `credits.aleo/transfer_private` (encrypted transfer) | credits |
| Creator payment proofs | Encrypted in CreatorReceipt | CreatorReceipt |
| Subscriber identity in receipts | `BHP256::hash_to_field(self.caller)` — irreversible | CreatorReceipt |
| Audit disclosure tokens | Private record, subscriber = hashed | AuditToken |
| Access verification | `verify_access` has NO finalize — zero on-chain footprint | AccessPass |
| Audit token creation | `create_audit_token` has NO finalize — invisible | AuditToken |
| Custom tier records | Private SubscriptionTier record | SubscriptionTier |
| Content deletion proof | Private deletion record with reason_hash | ContentDeletion |
| Gift subscription tokens | GiftToken visible only to recipient, gifter identity is hashed | GiftToken |
| Refund escrow records | Private escrow with amount + expiry, subscriber = private | RefundEscrow |
| Blind subscriber identity | Nonce-based identity rotation: `BHP256(caller + nonce)` creates different hash per renewal | AccessPass + CreatorReceipt |
| Referral reward proofs | ReferralReward private record, referred subscriber = BHP256 hashed | ReferralReward |

### PUBLIC (Mappings — Intentionally Discoverable)

| Data | Why Public | Mapping |
|------|-----------|---------|
| Creator base price | Creators set prices publicly for discoverability | `tier_prices` |
| Subscriber count per creator | Public metric (like YouTube subscriber count) | `subscriber_count` |
| Total revenue per creator | Public metric (like Patreon earnings display) | `total_revenue` |
| Platform total revenue | Protocol transparency | `platform_revenue` |
| Content count per creator | Public metric | `content_count` |
| Content tier requirements | Users need to see what tier unlocks what | `content_meta` |
| Content integrity hashes | Enables tamper-proof verification | `content_hashes` |
| Custom tier prices | Creators set custom tiers publicly | `creator_tiers` |
| Tier count per creator | Public metadata | `tier_count` |
| Gift redemption status | Prevents double-redemption | `gift_redeemed` |
| Refund claim status | Prevents double-refund | `refund_claimed` |
| Nonce replay prevention | Prevents nonce reuse in blind renewal | `nonce_used` |
| Encryption commitments | Verifies content decryption keys | `encryption_commits` |
| Access revocation | Creator can revoke access | `access_revoked` |
| Content disputes | Community dispute counter | `content_disputes` |
| Pass-to-creator mapping | Auth for revocation — only issuing creator can revoke | `pass_creator` |
| Tip commitments | Commit-reveal tipping — amount hidden until reveal | `tip_commitments` |
| Tip reveal status | Tracks which tips have been revealed | `tip_revealed` |
| Per-caller dispute limit | Sybil-resistant: 1 dispute per caller per content | `dispute_count_by_caller` |
| Referral count per creator | Public metric for referral activity | `referral_count` |

### VISIBLE IN FINALIZE PARAMETERS (Transaction-Level)

These values appear in transaction data because Aleo's finalize scope is public:

| Parameter | In Which Finalize | Why Necessary |
|-----------|------------------|---------------|
| `creator` address | subscribe, tip, renew | Required for mapping lookups and price validation |
| `amount` (u64) | subscribe, tip, renew | Validated against `tier_prices * multiplier` |
| `tier` (u8) | subscribe, renew | Determines price multiplier (1x/2x/5x) |
| `expires_at` (u32) | subscribe, renew | Validated against `block.height` bounds |
| `tier_id` (u8) | create_custom_tier, subscribe | Custom tier identification |
| `nonce` (field) | subscribe_blind, renew_blind | Identity rotation (NEVER reveals subscriber) |
| `gift_id` (field) | gift_subscription, redeem_gift | Gift tracking |
| `pass_id` (field) | claim_refund, revoke_access | Access/refund tracking |

**Critical invariant:** While `amount`, `tier`, and `creator` appear in finalize parameters, `self.caller` (the subscriber's address) NEVER appears. An observer can see "someone paid 2 ALEO for tier 2 to creator X" but CANNOT determine WHO paid.

## Privacy Comparison with Competitors

| Feature | VeilSub v16 | NullPay | Alpaca Invoice |
|---------|---------|---------|----------------|
| User identity in finalize | NEVER | NEVER | Seller address leaks |
| Payment method | credits.aleo/transfer_private (atomic) | credits.aleo/transfer_private (atomic) | credits.aleo NOT called (trust-based mark_as_paid) |
| Multi-token (ARC-20) | token_registry.aleo | test_usdcx only | No |
| Zero-footprint verification | verify_access (no finalize) | get_invoice_status (mapping read) | No equivalent |
| Selective disclosure | AuditToken record | No | Field-level commitments |
| Creator receipts | CreatorReceipt (private record) | MerchantReceipt (private record) | Dual InvoiceRecord |
| Blind renewal (nonce-based) | BHP256(caller + nonce) per renewal | No | No |
| Subscription gifting | GiftToken (recipient-only) | No | No |
| Access revocation | Creator can revoke, prevents double-access | No | No |
| Refund escrow | Private escrow with expiry | No | No |
| On-chain referrals | ReferralReward (private) | No | No |

## Blind Renewal — Novel Privacy Technique

VeilSub v11 introduces **Blind Renewal**, a privacy technique unique in the Aleo ecosystem.

**The Problem:** In standard renewals, the subscriber hash `BHP256(self.caller)` is deterministic. A creator receiving CreatorReceipts can track renewal patterns — same hash = same subscriber.

**The Solution:** Blind Renewal uses a caller-supplied nonce:
```
subscriber_hash = BHP256(self.caller as field + nonce)
```
Each renewal generates a DIFFERENT hash. The creator sees what looks like a brand new subscriber every time. Nonces are tracked on-chain (`nonce_used` mapping) to prevent replay.

**Comparison:**
| Project | Privacy Technique | What It Hides |
|---------|-------------------|---------------|
| VeilSub | Blind Renewal (nonce-based identity rotation) | Subscriber renewal patterns |
| lasagna | Delayed Attribute Reveal (DAR) | Bet direction in prediction markets |
| NullPay | Dual-record invoice system | Invoice linkability |

This is the subscription-domain equivalent of lasagna's DAR — hiding temporal patterns that would otherwise allow behavioral profiling.

## Why Creator Addresses Are Public

Creators are **public entities** in a subscription platform. This is an intentional design choice, not a privacy leak:

1. **Discoverability**: Users browse and discover creators. Hiding creator addresses would make the platform unusable.
2. **Trust signals**: Public subscriber count and revenue build trust (like Patreon showing "$X/month from Y patrons").
3. **Content gating**: Content tier requirements must be queryable for the UI to show locked/unlocked states.
4. **Real-world analogy**: A restaurant's menu and Yelp rating are public. The customer list is private. VeilSub follows this model.

## Why Amount/Tier Appear in Finalize

The amount and tier MUST be in finalize because:

1. **Price validation**: Finalize checks `amount >= base_price * tier_multiplier`. Without this, users could pay 0 and get a subscription.
2. **Revenue tracking**: `total_revenue` mapping requires the actual amount.
3. **Tier enforcement**: The multiplier (1x/2x/5x) depends on the tier value.

**Mitigation**: The subscriber's identity is NOT linked to these values. An observer sees the payment but not the payer. This is equivalent to seeing a cash register receipt without knowing who paid.

## Selective Disclosure via AuditToken

The `create_audit_token` transition enables privacy-preserving verification for third parties:

```
Subscriber                    Verifier
    |                             |
    |  create_audit_token(pass,   |
    |    verifier_address)        |
    |                             |
    |  AccessPass consumed        |
    |  New AccessPass created     |
    |                             |
    |  AuditToken ───────────────>|
    |                             |
    |  Token reveals:             |
    |  - creator address          |
    |  - tier (1/2/3)             |
    |  - expires_at               |
    |  - subscriber_hash (BHP256) |
    |                             |
    |  Token does NOT reveal:     |
    |  - subscriber address       |
    |  - payment amount           |
    |  - pass_id                  |
```

**Properties:**
- Zero finalize footprint (no on-chain trace of audit token creation)
- Verifier learns subscription status but not subscriber identity
- BHP256 hash is consistent — same subscriber always produces same hash, enabling repeat verification
- Multiple audit tokens can be created for different verifiers

## Content Integrity Hashes

Published content stores a `content_hash` on-chain:
- Content body is stored off-chain (Supabase/Redis)
- `BHP256::hash_to_field(content_body)` is stored on-chain in `content_hashes` mapping
- Anyone can verify content hasn't been tampered with by comparing the off-chain hash to the on-chain hash
- This provides tamper-proof content integrity without revealing content to the blockchain

## Pedersen Commit-Reveal Tipping (v14)

VeilSub uses BHP256 commitment schemes for private tipping:

```
Phase 1 — Commit:  commitment = BHP256::commit_to_field(hash(creator, amount), hash_to_scalar(salt))
Phase 2 — Reveal:  recompute commitment from original inputs, verify match, execute transfer
```

The tip amount remains hidden on-chain until the tipper voluntarily reveals it. This prevents creators from seeing individual tip amounts in real-time — they only see aggregate tips. Uses the same commitment pattern as NullPay's BHP256 approach.

## Subscription Transfer (v15)

`transfer_pass` allows a subscriber to transfer their AccessPass to another address. The transition checks the `access_revoked` mapping before allowing transfer — revoked passes cannot be transferred. The new owner receives a fresh AccessPass with their address, while the original is consumed.

## Privacy-Preserving Referrals (v16)

When a subscriber joins via referral (`subscribe_with_referral`), the referrer receives a `ReferralReward` private record. The referred subscriber's identity is protected via `BHP256::hash_to_field(subscriber_address)` — the referrer can prove they earned a reward but cannot identify who they referred. The `referral_count` public mapping only tracks aggregate referral counts per creator.

## Security Hardening (v15)

- **Revocation enforcement**: `verify_access` and `verify_tier_access` check `access_revoked` mapping — revoked passes are rejected
- **Sybil-resistant disputes**: `dispute_content` requires an AccessPass (subscriber-only) + `dispute_count_by_caller` limits 1 dispute per caller per content
- **Revocation auth**: `revoke_access` validates via `pass_creator` mapping — only the issuing creator can revoke
- **Transfer safety**: `transfer_pass` checks revocation status before allowing transfer

## Aleo-Specific Privacy Features Used

1. **Records (UTXO model)**: AccessPass, CreatorReceipt, AuditToken are encrypted records. Only the owner can decrypt.
2. **transfer_private**: All payments use `credits.aleo/transfer_private` — sender and amount are encrypted.
3. **BHP256 hashing**: Subscriber addresses are hashed before any storage/transmission.
4. **No finalize for verification**: `verify_access` and `create_audit_token` have no finalize scope — zero public footprint.
5. **Automatic encryption**: Aleo encrypts all transition inputs automatically. Record fields marked as private are never visible.
6. **Nullifiers**: Records are consumed (nullified) when spent. The nullifier system prevents double-use without revealing which record was spent.

## What We Do NOT Do (Anti-Patterns Avoided)

- We do NOT store private data in public mappings
- We do NOT leak `self.caller` in any finalize function
- We do NOT send records to program addresses (they'd be lost)
- We do NOT modify records in finalize scope (impossible in Leo)
- We do NOT manually implement ZK proof verification (Aleo handles this)
- We do NOT reimplement nullifiers or encryption (Aleo provides these natively)
- We do NOT use `transfer_public` for payments (always `transfer_private`)

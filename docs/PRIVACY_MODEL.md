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
| Subscriber identity in receipts | `Poseidon2::hash_to_field(self.caller)` — irreversible | CreatorReceipt |
| Audit disclosure tokens | Private record, subscriber = hashed | AuditToken |
| Access verification | `verify_access` finalize only checks revocation via pass_id — subscriber identity never exposed | AccessPass |
| Audit token creation | `create_audit_token` has NO finalize — invisible | AuditToken |
| Custom tier records | Private SubscriptionTier record | SubscriptionTier |
| Content deletion proof | Private deletion record with reason_hash | ContentDeletion |
| Gift subscription tokens | GiftToken visible only to recipient, gifter identity is hashed | GiftToken |
| Blind subscriber identity | Nonce-based identity rotation: `Poseidon2(caller + nonce)` creates different hash per renewal | AccessPass + CreatorReceipt |

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
| Nonce replay prevention | Prevents nonce reuse in blind renewal | `nonce_used` |
| Encryption commitments | Verifies content decryption keys | `encryption_commits` |
| Access revocation | Creator can revoke access | `access_revoked` |
| Content disputes | Community dispute counter | `content_disputes` |
| Pass-to-creator mapping | Auth for revocation — only issuing creator can revoke | `pass_creator` |
| Tip commitments | Commit-reveal tipping — amount hidden until reveal | `tip_commitments` |
| Tip reveal status | Tracks which tips have been revealed | `tip_revealed` |
| Per-caller dispute limit | Sybil-resistant: 1 dispute per caller per content | `dispute_count_by_caller` |
| Per-tier subscriber count | Tier distribution analytics | `subscription_by_tier` |
| Content ownership | Auth for update/delete (creator hash) | `content_creator` |
| Tier deprecation flag | Prevents subscribing to deprecated tiers | `tier_deprecated` |
| Content deletion flag | Prevents accessing deleted content | `content_deleted` |

### VISIBLE IN FINALIZE PARAMETERS (Transaction-Level)

These values appear in transaction data because Aleo's finalize scope is public. **In v23, all raw addresses have been eliminated from finalize parameters:**

| Parameter | In Which Finalize | Why Necessary |
|-----------|------------------|---------------|
| `creator_hash` (field) | ALL transitions | Poseidon2 hash of creator address — cannot be reversed to address |
| `amount` (u64) | subscribe, tip, renew | Validated against tier prices |
| `tier` (u8) | subscribe, renew | Determines which tier pricing to apply |
| `expires_at` (u32) | subscribe, renew | Validated against `block.height` bounds |
| `tier_id` (u8) | create_custom_tier, subscribe | Custom tier identification |
| `nonce` (field) | subscribe_blind, renew_blind | Identity rotation (NEVER reveals subscriber) |
| `gift_id` (field) | gift_subscription, redeem_gift | Gift tracking |
| `pass_id` (field) | revoke_access, transfer_pass | Access tracking |

**Critical invariant (v23):** ZERO raw addresses appear in ANY finalize function. Both `self.caller` AND `creator` address are hashed to `field` values via Poseidon2 before passing to finalize. An observer sees only hashed keys — they cannot determine WHO paid or WHO received payment.

## Privacy Comparison with Competitors

| Feature | VeilSub v27 | NullPay v18 | Veiled Markets v18 | lasagna |
|---------|-------------|-------------|---------------------|---------|
| Raw addresses in finalize | **ZERO** (all Poseidon2 hashed) | Zero | Some | Some |
| User identity in finalize | NEVER | NEVER | N/A | N/A |
| Payment method | credits.aleo/transfer_private | credits.aleo/transfer_private | USDCx/ALEO | ALEO |
| Zero-footprint verification | verify_access + create_audit_token | No | No | No |
| Selective disclosure | AuditToken record | No | No | No |
| Creator receipts | CreatorReceipt (private record) | MerchantReceipt (private) | No | No |
| Blind renewal (nonce-based) | Poseidon2(caller + nonce) per renewal | No | No | No |
| Commit-reveal tipping | BHP256 commitment scheme | BHP256 invoices | No | Pedersen (DAR) |
| Subscription gifting | GiftToken (recipient-only) | No | No | No |
| Subscription transfer | transfer_pass (unique) | No | No | No |
| Access revocation | Creator can revoke + enforcement in verify | No | No | No |
| Sybil-resistant disputes | AccessPass required + rate limit | No | Bond-based | Threshold |

## Blind Subscription Protocol (BSP) — Novel Privacy Technique

VeilSub introduces the **Blind Subscription Protocol (BSP)**, a three-layer privacy framework that makes subscription relationships unlinkable, untrackable, and selectively disclosable.

### Layer 1: Blind Identity Rotation

The core BSP innovation uses a caller-supplied nonce to rotate subscriber identity on every transaction:
```
subscriber_hash = Poseidon2(BlindKey { subscriber: self.caller, nonce: unique_nonce })
```

**The Problem:** In standard subscriptions, `Poseidon2(self.caller)` is deterministic. A creator receiving CreatorReceipts can track renewal patterns — same hash = same subscriber. Over time, they build a behavioral profile: "this subscriber renews every 28 days, always picks tier 2."

**The Solution:** BSP's nonce rotation generates a DIFFERENT identity hash per transaction. The creator sees what looks like a brand new subscriber every renewal. Nonces are tracked on-chain (`nonce_used` mapping) to prevent replay attacks while maintaining unlinkability.

**Privacy guarantee:** Even if a creator collects every CreatorReceipt they've ever received, they CANNOT determine:
- How many unique subscribers they have (vs. renewals)
- Which subscriber renewed vs. which is new
- Temporal patterns in any individual subscriber's behavior

### Layer 2: Zero-Address Finalize

Every finalize function receives only Poseidon2 field hashes — never raw addresses. An on-chain observer cannot link any mapping entry to a real wallet address. This applies to ALL 27 deployed transitions (v27).

### Layer 3: Selective Disclosure via AuditToken

Subscribers can prove subscription status to third parties via `create_audit_token` — which has ZERO finalize footprint (no on-chain trace). The verifier learns tier and expiry but never the subscriber's address.

### Comparison with Competing Privacy Techniques

| Project | Privacy Technique | What It Hides | Novel Element |
|---------|-------------------|---------------|---------------|
| **VeilSub** | **Blind Subscription Protocol (BSP)** | Subscriber identity + renewal patterns + payment linkability | Nonce-rotated identity hash per transaction |
| lasagna | Delayed Attribute Reveal (DAR) | Bet direction in prediction markets | Commitment reveals after market close |
| NullPay | Dual-record invoice system | Invoice linkability | Merchant + customer each get private record |
| Veiled Markets | FPMM AMM privacy | Trade amounts | Zero-knowledge order matching |

BSP is the subscription-domain equivalent of lasagna's DAR — hiding temporal patterns that would otherwise allow behavioral profiling. While DAR focuses on hiding a single attribute (bet direction), BSP hides the entire subscriber lifecycle (subscription, renewal, cancellation patterns).

## Why Creator Identities Are Semi-Public

Creators are **semi-public entities** in VeilSub v27. Their addresses are known to the frontend (for routing and display), but on-chain mapping keys are Poseidon2 hashes — not raw addresses:

1. **Discoverability**: Users browse creators via the frontend. The frontend knows creator addresses for routing.
2. **On-chain privacy**: All mapping keys use `Poseidon2(creator_address)`. An on-chain observer cannot reverse the hash to discover which address a mapping entry belongs to.
3. **Trust signals**: Subscriber counts and revenue are publicly queryable — but only if you know the creator's address (to compute the hash key).
4. **Real-world analogy**: A restaurant's menu is posted on the door (public to visitors), but the restaurant's tax records are filed under an opaque ID (not their street address).

## Why Amount/Tier Appear in Finalize

The amount and tier MUST be in finalize because:

1. **Price validation**: Finalize checks `amount >= tier_price` from the `creator_tiers` mapping. Without this, users could pay 0 and get a subscription.
2. **Revenue tracking**: `total_revenue[creator_hash]` mapping requires the actual amount.
3. **Tier enforcement**: Dynamic tier prices are stored in `creator_tiers[Poseidon2(TierKey)]`.

**Mitigation (v23)**: Neither the subscriber's identity NOR the creator's raw address is linked to these values. An observer sees a hash key, an amount, and a tier — but cannot determine who paid or who received. This is equivalent to seeing a coded receipt where both the customer and merchant are anonymous.

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
    |  - subscriber_hash (Poseidon2) |
    |                             |
    |  Token does NOT reveal:     |
    |  - subscriber address       |
    |  - payment amount           |
    |  - pass_id                  |
```

**Properties:**
- Zero finalize footprint (no on-chain trace of audit token creation)
- Verifier learns subscription status but not subscriber identity
- Poseidon2 hash is consistent — same subscriber always produces same hash, enabling repeat verification
- Multiple audit tokens can be created for different verifiers

## Content Integrity Hashes

Published content stores a `content_hash` on-chain:
- Content body is stored off-chain (Supabase/Redis)
- `Poseidon2::hash_to_field(content_id)` is stored on-chain in `content_hashes` mapping
- Anyone can verify content hasn't been tampered with by comparing the off-chain hash to the on-chain hash
- This provides tamper-proof content integrity without revealing content to the blockchain

## BHP256 Commit-Reveal Tipping (v14)

VeilSub uses BHP256 commitment schemes for private tipping:

```
Phase 1 — Commit:  commitment = BHP256::commit_to_field(hash(creator, amount), hash_to_scalar(salt))
Phase 2 — Reveal:  recompute commitment from original inputs, verify match, execute transfer
```

The tip amount remains hidden on-chain until the tipper voluntarily reveals it. This prevents creators from seeing individual tip amounts in real-time — they only see aggregate tips. Uses the same commitment pattern as NullPay's BHP256 approach.

## Subscription Transfer (v15)

`transfer_pass` allows a subscriber to transfer their AccessPass to another address. The transition checks the `access_revoked` mapping before allowing transfer — revoked passes cannot be transferred. The new owner receives a fresh AccessPass with their address, while the original is consumed.

## Privacy-Preserving Referrals (v16)

When a subscriber joins via referral (`subscribe_referral`), the referrer receives a `ReferralReward` private record. The referred subscriber's identity is protected via `Poseidon2::hash_to_field(subscriber_address)` — the referrer can prove they earned a reward but cannot identify who they referred. Note: `subscribe_referral` was removed in v23 for variable limit reasons, but the privacy pattern is retained for future use.

## Homomorphic Pedersen Subscriber Commitments (v17, removed in v23)

VeilSub v17 introduced **homomorphic Pedersen commitments** for subscriber counting. This feature was removed in v23 because the Pedersen group math operations (`subscribe_private_count`, `prove_sub_count`, `prove_revenue_range`) added ~300K+ variables, pushing the contract above the testnet limit of 2,097,152.

The technique worked by updating a Pedersen commitment aggregate instead of the public `subscriber_count` counter, and the zero-footprint proof transitions enabled proving properties without on-chain trace. These remain viable for future mainnet deployment where variable limits are higher.

## v23 Privacy Overhaul: Zero-Address Finalize

The v23 privacy overhaul replaced all raw addresses in the finalize layer. Instead of passing raw `creator: address` to finalize functions, ALL transitions now compute `creator_hash: field = Poseidon2::hash_to_field(self.caller)` in the transition layer and pass only the hash to finalize. This means:

- An on-chain observer cannot determine which creator is associated with any mapping entry
- The `pass_creator` mapping stores `creator_hash` (not the raw address), preventing address leaks even in revocation flows
- Auth checks for platform admin and creator ownership happen in the transition layer where `self.caller` is available, enforced by ZK proofs

## Security Hardening (v15)

- **Revocation enforcement**: `verify_access` and `verify_tier_access` check `access_revoked` mapping — revoked passes are rejected
- **Sybil-resistant disputes**: `dispute_content` requires an AccessPass (subscriber-only) + `dispute_count_by_caller` limits 1 dispute per caller per content
- **Revocation auth**: `revoke_access` validates via `pass_creator` mapping — only the issuing creator can revoke
- **Transfer safety**: `transfer_pass` checks revocation status before allowing transfer

## Aleo-Specific Privacy Features Used

1. **Records (UTXO model)**: AccessPass, CreatorReceipt, AuditToken are encrypted records. Only the owner can decrypt.
2. **transfer_private**: All payments use `credits.aleo/transfer_private` — sender and amount are encrypted.
3. **Poseidon2 hashing**: Subscriber addresses are hashed via Poseidon2 before any storage/transmission. BHP256 is used only for tip commitments.
4. **Minimal finalize for verification**: `verify_access` finalize only checks revocation via pass_id (no subscriber identity). `create_audit_token` has no finalize at all — zero public footprint.
5. **Automatic encryption**: Aleo encrypts all transition inputs automatically. Record fields marked as private are never visible.
6. **Nullifiers**: Records are consumed (nullified) when spent. The nullifier system prevents double-use without revealing which record was spent.

## Threat Model Matrix

| Attack Vector | Severity | Mitigation | Residual Risk |
|---------------|----------|------------|---------------|
| **Timing correlation** (subscribe at same time as content unlock) | Medium | Blind renewal (nonce rotation), Pedersen count mode | Minimal — subscription time ≠ access time |
| **Amount analysis** (infer tier from payment amount) | Low | Tier prices are intentionally public; amount ≠ identity | None — this is by design |
| **Finalize parameter observation** (see creator + amount + tier) | Medium | `self.caller` NEVER in finalize; observer sees payment but not payer | Equivalent to seeing a cash register receipt |
| **Graph analysis** (link credit records to subscribers) | Medium | `transfer_private` encrypts sender; blind renewal rotates hashes | UTXO model breaks simple graph analysis |
| **Creator-side tracking** (CreatorReceipts link subscriber hashes) | Low | Blind renewal: each receipt has a DIFFERENT hash (Poseidon2(caller,nonce)) | Creator cannot link renewals |
| **Metadata leaks** (IP, user-agent in API calls) | Medium | Content proxied through API routes; no direct Supabase calls from client | Backend logs minimized |
| **Database compromise** (Supabase breach) | High | No subscriber addresses stored; all auth via SHA-256(address) with rotation | Attacker sees hashed addresses only |
| **Mapping inference** (observe subscriber_count changes) | Medium | Mapping keys are Poseidon2 hashes — cannot link to specific creator without knowing their address | Reduced — counts visible but creator identity obscured |
| **Double-verification attack** (verify_access replay) | None | Record consumed+recreated per verification (UTXO model) | Zero — Aleo's nullifier system |
| **Sybil dispute spam** | Low | AccessPass required + per-caller rate limit (1/content) | Full mitigation |
| **Unauthorized revocation** | None | `pass_creator` mapping + `assert_eq(owner, creator)` | Zero — only issuing creator |
| **Nonce replay** (reuse blind renewal nonce) | None | `nonce_used` mapping prevents reuse | Zero |

## Formal Privacy Guarantees Per Transition

| Transition | Observer Learns | Observer CANNOT Learn | Finalize? |
|------------|----------------|----------------------|-----------|
| `register_creator` | Creator hash + base price | Creator address (only hash visible) | Yes |
| `subscribe` | Creator hash, amount, tier, expiry | Subscriber identity; creator address | Yes |
| `subscribe_blind` | Creator hash, amount, tier, expiry, nonce_hash | Subscriber identity; creator address; cannot link to previous subscriptions | Yes |
| ~~`subscribe_private_count`~~ | *(Removed in v23 — Pedersen group math exceeded variable limit)* | | |
| ~~`subscribe_with_escrow`~~ | *(Removed in v23 — escrow transitions reserved for future)* | | |
| ~~`subscribe_referral`~~ | *(Removed in v23 — 2x transfer_private exceeded variable limit)* | | |
| `verify_access` | Pass was verified (revocation check) | Who verified, which pass, which creator | Yes (minimal) |
| `verify_tier_access` | Pass was verified for a tier (revocation + expiry check) | Who verified, which tier, which pass | Yes (minimal) |
| `create_audit_token` | Nothing | Everything (zero footprint) | No |
| `tip` | Creator, amount | Tipper identity | Yes |
| `commit_tip` | Commitment hash exists | Creator, amount, tipper | Yes |
| `reveal_tip` | Creator, amount, commitment opened | Tipper identity | Yes |
| `renew` | Creator, amount, tier, expiry | Subscriber identity | Yes |
| `renew_blind` | Creator, amount, tier, nonce_hash | Subscriber identity; renewal pattern | Yes |
| `publish_content` | Creator, content_id, min_tier, hash | — | Yes |
| `publish_encrypted_content` | Creator, content_id, min_tier, hash, encryption commitment | — | Yes |
| `gift_subscription` | Creator, amount, tier, expiry, gift_id | Gifter identity; recipient identity | Yes |
| `redeem_gift` | Gift_id was redeemed | Who redeemed it | Yes |
| `create_custom_tier` | Creator, tier_id, price | — | Yes |
| `update_tier_price` | Creator, tier_id, new price | — | Yes |
| `deprecate_tier` | Creator, tier_id deprecated | — | Yes |
| `update_content` | Content_id, new tier/hash | Who updated | Yes |
| `delete_content` | Content_id deleted | Who deleted | Yes |
| ~~`claim_refund`~~ | *(Removed in v23)* | | |
| `withdraw_platform_fees` | Amount withdrawn | — | Yes |
| `withdraw_creator_rev` | Creator, amount | — | Yes |
| `revoke_access` | Pass_id revoked | Subscriber identity | Yes |
| `dispute_content` | Content_id, caller_hash | Disputer identity (hashed) | Yes |
| `transfer_pass` | Pass_id transferred | Original owner; new owner | Yes |
| `prove_subscriber_threshold` | Creator hash, threshold value | Creator address; exact subscriber count (only proves count >= threshold) | Yes |
| `subscribe_trial` | Creator hash, amount (20% of tier), tier, trial expiry | Subscriber identity; that it's a trial vs regular subscription (both return AccessPass) | Yes |
| ~~`prove_sub_count`~~ | *(Removed in v23 — Pedersen group math exceeded variable limit)* | | |
| ~~`prove_revenue_range`~~ | *(Removed in v23 — Pedersen group math exceeded variable limit)* | | |

## What We Do NOT Do (Anti-Patterns Avoided)

- We do NOT store private data in public mappings
- We do NOT leak `self.caller` in any finalize function
- We do NOT send records to program addresses (they'd be lost)
- We do NOT modify records in finalize scope (impossible in Leo)
- We do NOT manually implement ZK proof verification (Aleo handles this)
- We do NOT reimplement nullifiers or encryption (Aleo provides these natively)
- We do NOT use `transfer_public` for payments (always `transfer_private`)

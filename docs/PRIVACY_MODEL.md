# VeilSub Privacy Model

## Executive Summary

VeilSub draws a clear privacy boundary: **creators are public entities; subscribers are anonymous**. This mirrors the real world — a bookstore's catalog and sales figures are public, but the customer list is private.

## Privacy Classification

### PRIVATE (Records — Zero Knowledge)

| Data | How Protected | Record Type |
|------|--------------|-------------|
| Subscriber wallet address | `self.caller` NEVER passed to finalize | AccessPass |
| Subscription details (tier, expiry) | Encrypted in AccessPass record | AccessPass |
| Payment records | `credits.aleo/transfer_private` (encrypted transfer) | credits |
| Creator payment proofs | Encrypted in CreatorReceipt | CreatorReceipt |
| Subscriber identity in receipts | `BHP256::hash_to_field(self.caller)` — irreversible | CreatorReceipt |
| Audit disclosure tokens | Private record, subscriber = hashed | AuditToken |
| Access verification | `verify_access` has NO finalize — zero on-chain footprint | AccessPass |
| Audit token creation | `create_audit_token` has NO finalize — invisible | AuditToken |

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

### VISIBLE IN FINALIZE PARAMETERS (Transaction-Level)

These values appear in transaction data because Aleo's finalize scope is public:

| Parameter | In Which Finalize | Why Necessary |
|-----------|------------------|---------------|
| `creator` address | subscribe, tip, renew | Required for mapping lookups and price validation |
| `amount` (u64) | subscribe, tip, renew | Validated against `tier_prices * multiplier` |
| `tier` (u8) | subscribe, renew | Determines price multiplier (1x/2x/5x) |
| `expires_at` (u32) | subscribe, renew | Validated against `block.height` bounds |

**Critical invariant:** While `amount`, `tier`, and `creator` appear in finalize parameters, `self.caller` (the subscriber's address) NEVER appears. An observer can see "someone paid 2 ALEO for tier 2 to creator X" but CANNOT determine WHO paid.

## Privacy Comparison with Competitors

| Feature | VeilSub | NullPay | Alpaca Invoice |
|---------|---------|---------|----------------|
| User identity in finalize | NEVER | NEVER | Seller address leaks |
| Payment method | credits.aleo/transfer_private (atomic) | credits.aleo/transfer_private (atomic) | credits.aleo NOT called (trust-based mark_as_paid) |
| Multi-token (ARC-20) | token_registry.aleo | test_usdcx only | No |
| Zero-footprint verification | verify_access (no finalize) | get_invoice_status (mapping read) | No equivalent |
| Selective disclosure | AuditToken record | No | Field-level commitments |
| Creator receipts | CreatorReceipt (private record) | MerchantReceipt (private record) | Dual InvoiceRecord |

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

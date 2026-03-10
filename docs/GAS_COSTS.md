# VeilSub Gas Cost Analysis

All fees are in microcredits (1 ALEO = 1,000,000 microcredits). Estimates based on v27 deployed contract.

## Transition Fee Table

| Transition | Fee (microcredits) | Fee (ALEO) | Has Finalize | Records Created | Cost Driver |
|-----------|-------------------|------------|-------------|-----------------|-------------|
| `register_creator` | 150,000 | 0.15 | Yes | 0 | Finalize writes 4 mappings |
| `create_custom_tier` | 200,000 | 0.20 | Yes | 0 | + tier count increment |
| `update_tier_price` | 150,000 | 0.15 | Yes | 0 | Single mapping update |
| `deprecate_tier` | 150,000 | 0.15 | Yes | 0 | Single mapping update |
| `publish_content` | 150,000 | 0.15 | Yes | 0 | Finalize-only mapping write |
| `publish_encrypted_content` | 200,000 | 0.20 | Yes | 0 | + encryption commitment write |
| `update_content` | 150,000 | 0.15 | Yes | 0 | Single mapping update |
| `delete_content` | 150,000 | 0.15 | Yes | 0 | Mark deleted in mapping |
| `subscribe` | 300,000 | 0.30 | Yes | 2 (AccessPass + CreatorReceipt) | transfer_private + 2 records + finalize |
| `subscribe_blind` | 350,000 | 0.35 | Yes | 2 | + nonce hash computation |
| `renew` | 300,000 | 0.30 | Yes | 2 | Consumes old pass + new pass + finalize |
| `renew_blind` | 350,000 | 0.35 | Yes | 2 | + nonce uniqueness check |
| `verify_access` | 100,000 | 0.10 | Yes | 1 (re-created AccessPass) | Minimal finalize: revocation + expiry check |
| `verify_tier_access` | 100,000 | 0.10 | Yes | 1 (re-created AccessPass) | Minimal finalize: revocation + expiry check |
| `create_audit_token` | 100,000 | 0.10 | **No** | 1 (AuditToken) | Zero-footprint |
| `tip` | 250,000 | 0.25 | Yes | 1 (CreatorReceipt) | transfer_private + finalize |
| `commit_tip` | 150,000 | 0.15 | Yes | 0 | BHP256 commitment write to mapping |
| `reveal_tip` | 300,000 | 0.30 | Yes | 1 (CreatorReceipt) | Verify commitment + transfer_private |
| `gift_subscription` | 400,000 | 0.40 | Yes | 2 (GiftToken + CreatorReceipt) | transfer_private + 2 records + finalize |
| `redeem_gift` | 200,000 | 0.20 | Yes | 1 (AccessPass) | Consumes GiftToken + mapping update |
| `withdraw_platform_fees` | 200,000 | 0.20 | Yes | 0 | Accounting ledger decrement |
| `withdraw_creator_rev` | 200,000 | 0.20 | Yes | 0 | Accounting ledger decrement |
| `transfer_pass` | 300,000 | 0.30 | Yes | 1 (new AccessPass) | Consumes old pass + revocation check |
| `revoke_access` | 150,000 | 0.15 | Yes | 0 | Single mapping write (creator auth) |
| `dispute_content` | 150,000 | 0.15 | Yes | 0 | Dispute counter increment |
| `subscribe_trial` | 300,000 | 0.30 | Yes | 2 (AccessPass + CreatorReceipt) | 20% of tier price, ~12hr pass |
| `prove_subscriber_threshold` | 150,000 | 0.15 | Yes | 0 | Compare count ≥ threshold |

## Cost Distribution by Category

| Category | Fee Range | Count | Notes |
|----------|-----------|-------|-------|
| Zero-footprint (no finalize) | 100,000 | 1 | Cheapest -- no state writes (create_audit_token only) |
| Finalize-only (no records) | 150,000-200,000 | 14 | Moderate -- mapping writes only |
| Record-creating (1-2 records) | 100,000-400,000 | 12 | Standard -- ZK proof + records |

## Key Observations

1. **Zero-footprint transitions are cheapest** (100K microcredits / 0.1 ALEO) because they skip finalize entirely -- no state writes, no validator consensus overhead. Only `create_audit_token` is truly zero-footprint (verify_tier_access gained finalize in v24 for expiry enforcement).

2. **Most expensive is `gift_subscription`** (400K / 0.4 ALEO) because it creates 2 records AND performs a private credit transfer.

3. **Cost scales with: (a) number of credit transfers, (b) number of records created, (c) number of mapping writes in finalize**. The ZK proof generation cost is roughly constant per transition.

4. **A full subscription lifecycle** (register + subscribe + verify + tip + renew) costs ~1.1 ALEO total in fees.

5. **Actual deployment cost for v27**: Approximately same as v26 (41.26 ALEO). Individual transition executions cost ~1.5 ALEO each on testnet.

6. **Trial subscription** (`subscribe_trial`): 300K microcredits / 0.3 ALEO — same as standard subscribe but with 20% tier price and ~12hr duration cap.

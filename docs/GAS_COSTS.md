# VeilSub Gas Cost Analysis

All fees are in microcredits (1 ALEO = 1,000,000 microcredits).

## Transition Fee Table

| Transition | Fee (microcredits) | Fee (ALEO) | Has Finalize | Records Created | Cost Driver |
|-----------|-------------------|------------|-------------|-----------------|-------------|
| `register_creator` | 150,000 | 0.15 | Yes | 0 | Finalize writes 3 mappings |
| `subscribe` | 300,000 | 0.30 | Yes | 2 (AccessPass + CreatorReceipt) | transfer_private + 2 records + finalize |
| `subscribe_blind` | 350,000 | 0.35 | Yes | 2 | + nonce hash computation |
| `subscribe_private_count` | 350,000 | 0.35 | Yes | 2 | + Pedersen commitment aggregation |
| `subscribe_with_escrow` | 350,000 | 0.35 | Yes | 2 (AccessPass + RefundEscrow) | + escrow mapping write |
| `subscribe_referral` | 500,000 | 0.50 | Yes | 3 (AccessPass + CreatorReceipt + ReferralReward) | 2x transfer_private + 3 records |
| `verify_access` | 100,000 | 0.10 | **No** | 1 (re-created AccessPass) | Zero-footprint: no finalize overhead |
| `verify_tier_access` | 100,000 | 0.10 | **No** | 1 | Zero-footprint |
| `tip` | 250,000 | 0.25 | Yes | 1 (CreatorReceipt) | transfer_private + finalize |
| `commit_tip` | 150,000 | 0.15 | Yes | 0 | BHP256 commitment write to mapping |
| `reveal_tip` | 300,000 | 0.30 | Yes | 1 (CreatorReceipt) | Verify commitment + transfer_private |
| `renew` | 300,000 | 0.30 | Yes | 2 | Consumes old pass + new pass + finalize |
| `renew_blind` | 350,000 | 0.35 | Yes | 2 | + nonce uniqueness check |
| `publish_content` | 150,000 | 0.15 | Yes | 0 | Finalize-only mapping write |
| `publish_encrypted_content` | 200,000 | 0.20 | Yes | 0 | + encryption commitment write |
| `update_content` | 150,000 | 0.15 | Yes | 0 | Single mapping update |
| `delete_content` | 150,000 | 0.15 | Yes | 0 | Mark deleted in mapping |
| `create_custom_tier` | 200,000 | 0.20 | Yes | 0 | + tier count increment |
| `update_tier_price` | 150,000 | 0.15 | Yes | 0 | Single mapping update |
| `deprecate_tier` | 150,000 | 0.15 | Yes | 0 | Single mapping update |
| `gift_subscription` | 400,000 | 0.40 | Yes | 2 (AccessPass + GiftToken) | transfer_private + 2 records + finalize |
| `redeem_gift` | 200,000 | 0.20 | Yes | 1 (AccessPass) | Consumes GiftToken + mapping update |
| `claim_refund` | 250,000 | 0.25 | Yes | 1 (credits) | Consumes escrow + refund transfer |
| `withdraw_platform_fees` | 200,000 | 0.20 | Yes | 1 (credits) | Platform fee transfer |
| `withdraw_creator_revenue` | 200,000 | 0.20 | Yes | 1 (credits) | Creator revenue transfer |
| `transfer_pass` | 300,000 | 0.30 | Yes | 1 (new AccessPass) | Consumes old pass + revocation check + new pass |
| `revoke_access` | 150,000 | 0.15 | Yes | 0 | Single mapping write (creator auth check) |
| `dispute_content` | 150,000 | 0.15 | Yes | 0 | Dispute counter increment |
| `create_audit_token` | 100,000 | 0.10 | **No** | 1 (AuditToken) | Zero-footprint |
| `prove_sub_count` | 100,000 | 0.10 | **No** | 0 | Zero-footprint Pedersen proof |
| `prove_revenue_range` | 100,000 | 0.10 | **No** | 0 | Zero-footprint range proof |

## Cost Distribution by Category

| Category | Fee Range | Count | Notes |
|----------|-----------|-------|-------|
| Zero-footprint (no finalize) | 100,000 | 5 | Cheapest — no state writes |
| Finalize-only (no records) | 150,000-200,000 | 11 | Moderate — mapping writes only |
| Record-creating (1-2 records) | 200,000-350,000 | 12 | Standard — ZK proof + records |
| Multi-transfer (2+ transfers) | 400,000-500,000 | 3 | Most expensive — multiple credit transfers |

## Key Observations

1. **Zero-footprint transitions are cheapest** (100K microcredits / 0.1 ALEO) because they skip finalize entirely — no state writes, no validator consensus overhead for mapping updates.

2. **Most expensive is `subscribe_referral`** (500K / 0.5 ALEO) because it creates 3 records AND performs 2 private credit transfers (one to creator, one to referrer).

3. **Cost scales with: (a) number of credit transfers, (b) number of records created, (c) number of mapping writes in finalize**. The ZK proof generation cost is roughly constant per transition.

4. **A full subscription lifecycle** (register + subscribe + verify + tip + renew) costs ~1.1 ALEO total in fees — dominated by subscribe and renew.

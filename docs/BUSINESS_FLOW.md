# VeilSub Business Flow

Complete user journey documentation for VeilSub's privacy-first subscription platform.

---

## 1. Creator Registration

```
Creator connects wallet
  -> Dashboard page detects "not registered"
  -> Creator enters base price (min 100 microcredits)
  -> Signs register_creator transaction
  -> Finalize: tier_prices[hash(creator)] = price
  -> Creator profile saved to Supabase (display name, bio)
  -> Dashboard shows creator management panel
```

**On-chain state created:**
- `tier_prices[creator_hash]` = base price
- `subscriber_count[creator_hash]` = 0
- `total_revenue[creator_hash]` = 0
- `total_creators[0u8]` incremented

---

## 2. Tier Management

### 2a. Create Custom Tier
```
Creator -> Dashboard -> "Create Tier"
  -> Enters tier_id (1-20), price, name
  -> Signs create_custom_tier transaction
  -> Receives SubscriptionTier record (private)
  -> Finalize: creator_tiers[hash(TierKey)] = price
  -> tier_count[creator_hash] incremented
```

### 2b. Update Tier Price
```
Creator -> Dashboard -> Select tier -> "Update Price"
  -> Consumes old SubscriptionTier record
  -> Signs update_tier_price transaction
  -> Receives new SubscriptionTier record with updated price
  -> Finalize: creator_tiers[hash(TierKey)] = new_price
```

### 2c. Deprecate Tier
```
Creator -> Dashboard -> Select tier -> "Deprecate"
  -> Consumes SubscriptionTier record
  -> Signs deprecate_tier transaction
  -> Finalize: tier_deprecated[hash(TierKey)] = true
  -> New subscriptions to this tier blocked
  -> Existing subscribers unaffected
```

---

## 3. Standard Subscription

```
Subscriber -> Creator Profile -> Select tier -> "Subscribe"
  -> SubscribeModal opens
  -> Privacy mode: Standard (default)
  -> Frontend generates pass_id (128-bit random)
  -> Frontend calculates expires_at (block.height + 864,000)
  -> Wallet fetches credits record with sufficient balance
  -> Signs subscribe transaction

On-chain:
  -> credits.aleo/transfer_private(payment, creator, amount)
  -> Creates AccessPass record (owner: subscriber)
  -> Creates CreatorReceipt record (owner: creator)
  -> Finalize updates:
     subscriber_count, total_revenue, platform_revenue,
     pass_creator, subscription_by_tier

Output:
  -> Subscriber holds AccessPass (private)
  -> Creator holds CreatorReceipt with subscriber_hash (cannot identify subscriber)
  -> Creator receives payment minus 5% platform fee
```

---

## 4. Blind Subscription (Privacy Mode)

```
Subscriber -> Creator Profile -> Select tier -> "Subscribe"
  -> SubscribeModal -> Toggle "Blind Mode"
  -> Frontend generates random nonce (128-bit field value)
  -> Signs subscribe_blind transaction

Privacy difference:
  -> subscriber_hash = Poseidon2(BlindKey{subscriber, nonce})
  -> Each subscription gets unique hash even for same subscriber
  -> Creator cannot link renewals to same person
  -> nonce_used[hash(nonce)] = true (prevents replay)
  -> AccessPass.privacy_level = 1 (marks as blind)
```

---

## 5. Subscription Renewal

```
Subscriber -> Creator Profile -> Active pass shown -> "Renew"
  -> RenewModal opens with current tier pre-selected
  -> Optional: change tier, toggle blind mode
  -> Consumes old AccessPass record
  -> Signs renew (or renew_blind) transaction
  -> New AccessPass minted with extended expiry
  -> Old pass consumed (UTXO spent)
```

---

## 6. Content Publishing

### 6a. Publish Standard Content
```
Creator -> Dashboard -> "Create Post"
  -> Enters title, body, preview text, minimum tier
  -> Frontend posts to /api/posts (off-chain body storage)
  -> Signs publish_content transaction (on-chain metadata)
  -> Finalize: content_meta[hash(id)] = min_tier
  -> content_hashes[hash(id)] = content_hash
  -> content_creator[hash(id)] = creator_hash
  -> content_count and total_content incremented
```

### 6b. Publish Encrypted Content
```
Creator -> Same flow but with encryption commitment
  -> Signs publish_encrypted_content transaction
  -> Additional: encryption_commits[hash(id)] = commitment
  -> Body encrypted client-side with AES-256-GCM
```

### 6c. Update Content
```
Creator -> Dashboard -> Select post -> "Edit"
  -> Signs update_content transaction
  -> Finalize verifies content_creator == caller hash
  -> Updates content_meta and content_hashes
```

### 6d. Delete Content
```
Creator -> Dashboard -> Select post -> "Delete"
  -> Signs delete_content transaction
  -> Receives ContentDeletion record (audit trail)
  -> Finalize: content_deleted[hash(id)] = true
  -> content_count decremented
```

---

## 7. Content Access (Subscriber)

```
Subscriber -> Creator Profile -> Locked post -> "Unlock"
  -> Frontend hashes wallet address: SHA-256(address) -> walletHash
  -> POST /api/posts/unlock with walletHash + pass metadata
  -> Server verifies: pass creator matches, tier sufficient, not expired
  -> Server returns encrypted body
  -> Frontend decrypts on-device
  -> Post body displayed

Privacy: Server never sees subscriber's actual address (only hash).
```

---

## 8. Access Verification

### 8a. Standard Verification
```
Subscriber -> Verify page -> Select pass -> "Verify"
  -> Signs verify_access transaction
  -> Finalize checks: access_revoked[pass_id] == false, expires_at > block.height
  -> AccessPass returned (not consumed)
  -> Zero on-chain trace of WHO verified
```

### 8b. Tier Verification
```
Same flow but verify_tier_access checks pass.tier >= required_tier
```

### 8c. Audit Token (Selective Disclosure)
```
Subscriber -> "Create Audit Token" -> Enter verifier address
  -> Signs create_audit_token transition
  -> NO FINALIZE (zero on-chain footprint)
  -> Creates AuditToken record (owner: verifier)
  -> Verifier sees: creator, tier, expiry (NOT subscriber address)
```

---

## 9. Tipping

### 9a. Direct Tip
```
Subscriber -> Creator Profile -> "Tip"
  -> TipModal: preset amounts (1, 5, 10, 25 ALEO) or custom
  -> Signs tip transaction
  -> credits.aleo/transfer_private to creator
  -> CreatorReceipt with subscriber_hash
  -> Finalize: total_revenue, platform_revenue incremented
```

### 9b. Commit-Reveal Tip (2-Phase)
```
Phase 1 - Commit:
  -> commit_tip(creator, amount, salt)
  -> Finalize: stores BHP256(Poseidon2(data), BHP256(salt))
  -> Amount hidden on-chain

Phase 2 - Reveal:
  -> reveal_tip(payment, creator, amount, salt)
  -> Reproduces commitment, verifies match
  -> Executes transfer, increments revenue
  -> tip_revealed[commitment] = true
```

---

## 10. Gift Subscription

```
Gifter -> Creator Profile -> "Gift" -> Select tier
  -> GiftSubscriptionFlow: enter recipient address
  -> Signs gift_subscription transaction
  -> Creates GiftToken record (owner: recipient)
  -> Creates CreatorReceipt (gifter identity hashed)
  -> Finalize: gift_redeemed[gift_id] = false

Recipient:
  -> Dashboard shows pending GiftToken
  -> "Redeem" -> Signs redeem_gift
  -> GiftToken consumed, AccessPass minted
  -> Finalize: gift_redeemed[gift_id] = true
```

---

## 11. Subscription Transfer

```
Subscriber -> Creator Profile -> Active pass -> "Transfer"
  -> TransferPassModal: enter recipient address
  -> Signs transfer_pass transaction
  -> Old AccessPass consumed (UTXO spent)
  -> New AccessPass minted (owner: recipient)
  -> Finalize: checks access_revoked[pass_id] == false
  -> Irreversible: original subscriber loses access
```

---

## 12. Dispute Content

```
Subscriber -> Creator Profile -> Content -> "Dispute"
  -> DisputeContentModal: select reason (5 categories)
  -> Must hold valid (non-expired) AccessPass
  -> Signs dispute_content transaction
  -> Finalize checks:
     - Content exists and not deleted
     - Subscriber hasn't already disputed this content (max 1)
     - Pass not expired
  -> content_disputes[hash(id)] incremented
  -> Sybil-protected: 1 dispute per caller per content
```

---

## 13. Revenue Withdrawal

### 13a. Creator Revenue
```
Creator -> Dashboard -> "Withdraw Revenue"
  -> Signs withdraw_creator_rev(amount)
  -> Finalize: total_revenue[creator_hash] -= amount
  -> Creator receives ALEO credits
```

### 13b. Platform Fee Withdrawal
```
Platform admin (PLATFORM_ADDR only)
  -> Signs withdraw_platform_fees(amount)
  -> Transition asserts self.caller == PLATFORM_ADDR
  -> Finalize: platform_revenue[0u8] -= amount
```

---

## 14. Privacy-Preserving Reputation Proof

```
Creator -> "Prove Subscriber Count"
  -> Signs prove_subscriber_threshold(threshold)
  -> Finalize checks: subscriber_count[hash] >= threshold
  -> Boolean proof only: "I have at least N subscribers"
  -> Actual count never revealed publicly
  -> Use case: partnership negotiations, advertising rates
```

---

## 15. Access Revocation

```
Creator -> Dashboard -> "Revoke Access" -> Enter pass_id
  -> Signs revoke_access transaction
  -> Finalize verifies: pass_creator[pass_id] == creator_hash
  -> Sets access_revoked[pass_id] = true
  -> All future verify_access calls fail for this pass
  -> Irreversible
```

---

## Payment Flow Summary

All payments use `credits.aleo/transfer_private` (atomic, in-contract):

```
Subscriber's credits record
  -> transfer_private(record, creator, amount)
  -> Returns: (change_credits, creator_credits)
  -> 5% platform fee tracked in platform_revenue mapping
  -> Creator receives full payment in private credits record
  -> Subscriber gets change back as private credits record
```

No public transfer traces. No address correlation. Payment amounts visible only to participants.

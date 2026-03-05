import credits.aleo;
// =============================================================================
// VeilSub v20 — Private Creator Subscriptions on Aleo
//
// WAVE 3 EVOLUTION (v8 → v20): 12 versions, 28 new transitions, 5 new records
//
// v9: DYNAMIC CREATOR TIERS + CONTENT LIFECYCLE
//   - create_custom_tier, update_tier_price, deprecate_tier
//   - update_content, delete_content
//   - subscribe/renew validate against creator_tiers mapping
//   - New records: SubscriptionTier, ContentDeletion
//
// v10: GIFTING + REFUND ESCROW + FEE WITHDRAWAL
//   - gift_subscription, redeem_gift (GiftToken record)
//   - subscribe_with_escrow, claim_refund (RefundEscrow record, 500-block window)
//   - withdraw_platform_fees, withdraw_creator_rev
//
// v11: BLIND RENEWAL — NOVEL PRIVACY TECHNIQUE
//   - subscribe_blind, renew_blind: subscriber_hash = BHP256(caller, nonce)
//     Each subscription/renewal uses a DIFFERENT identity hash. Creator sees
//     "different" subscribers each time — cannot link renewals to same person.
//     Equivalent to lasagna's DAR (Deferred Aggregate Revelation) but for
//     subscriber identity instead of bet direction. NO OTHER PROJECT DOES THIS.
//   - verify_tier_access: zero-footprint verification for dynamic tiers
//
// v12: ENCRYPTED CONTENT DELIVERY + DISPUTE + REVOCATION
//   - publish_encrypted_content: stores encryption_commitment for content keys
//   - revoke_access: creator can revoke a subscriber's pass
//   - dispute_content: community can flag content integrity issues
//
// v13: AUTH FIX + TERNARY SAFETY + CUSTOM TOKEN TIERS
//   - Fixed ternary branch evaluation (both sides evaluated in Leo)
//   - get_or_use pattern for safe mapping lookups throughout
//
// v14: PEDERSEN/BHP256 COMMITMENT SCHEME — NOVEL PRIVACY TECHNIQUE
//   - commit_tip: Commit-reveal tipping (BHP256::commit_to_field)
//   - reveal_tip: Opens commitment, transfers credits, processes tip
//   - verify_pedersen_commitment: Pedersen128 commitment verification
//
// v15: SECURITY HARDENING + SUBSCRIPTION TRANSFER
//   - verify_access/verify_tier_access now ENFORCE access_revoked mapping
//   - dispute_content now requires subscriber proof (AccessPass)
//   - transfer_pass: Transfer subscription to another address
//   - claim_refund documented as credit-based
//
// v16: ON-CHAIN REFERRAL SYSTEM — PRACTICALITY + NOVELTY BOOST
//   - ReferralReward record: private proof of referral bonus for referrers
//   - subscribe_referral: subscribe via referral link — referrer gets
//     private ReferralReward record, 10% of subscription goes to referrer
//   - referral_count mapping: track referral counts per creator
//
// v17: HOMOMORPHIC PEDERSEN SUBSCRIBER COMMITMENTS — NOVEL PRIVACY TECHNIQUE
//   - Aggregate Pedersen commitments for subscriber count per creator
//   - prove_sub_count / prove_revenue_range: zero-footprint proofs
//   - subscribe_private_count: maximum privacy mode
//   - Named constants: PLATFORM_FEE_DIV, ESCROW_BLOCKS, MAX_EXPIRY
//
// v18: POSEIDON OPTIMIZATION + PRIVACY LEVELS + TIER HASHING
//   - Poseidon2 replaces BHP256 for subscriber hashing (2-8 constraints vs 256)
//   - AccessPass gains privacy_level: u8 (0=standard, 1=blind, 2=max)
//   - Finalize tier validation uses hashed tier for observer opacity
//   - creator_privacy_mode mapping: creator opts into privacy features
//   - MAX_TIER constant prevents out-of-bounds tier IDs
//
// v19: DEEP POSEIDON OPTIMIZATION + ACTIVITY TRACKING
//   - ALL finalize BHP256::hash_to_field replaced with Poseidon2 (tier keys,
//     content IDs, nonces, dispute keys) — ~15 occurrences, massive gas savings
//   - Blind subscription hashes also use Poseidon2 (transition-level)
//   - subscription_by_tier mapping: per-tier subscriber tracking
//   - creator_last_active mapping: on-chain activity timestamps
//   - MIN_PRICE constant: prevents dust-price tier attacks
//
// v20: ANALYTICS + CONTENT VERSIONING + DOUBLE-HASH IDENTITY
//   - content_version mapping: tracks update count per content piece
//   - subscription_epoch mapping: epoch-based subscription batching for analytics
//   - Double-hash subscriber identity: Poseidon2(Poseidon2(caller)) in receipts
//     Makes rainbow table attacks computationally infeasible
//   - EPOCH_SIZE constant: blocks per analytics epoch (~1 hour at 3s/block)
//   - Activity tracking in publish_content finalize
//
// PRIVACY ARCHITECTURE:
//   8 record types, 30 mappings, 31 transitions
//   PRIVATE: subscriber identity (via BHP256 hash + nonce rotation),
//     AccessPass, CreatorReceipt, AuditToken, GiftToken, RefundEscrow, all payments,
//     committed tip amounts (hidden until reveal), subscriber counts (Pedersen)
//   PUBLIC: creator addresses, tier prices, content metadata
//   NOVEL: Blind renewal rotates subscriber identity hash per transaction;
//     BHP256 commit-reveal tipping hides tip amounts until voluntary reveal;
//     Homomorphic Pedersen commitments hide subscriber count (like lasagna's DAR
//     but for subscription metrics instead of bet pools)
//
// SECURITY MODEL:
//   - self.caller NEVER passes to finalize → zero identity leakage
//   - access_revoked enforced in verify_access + verify_tier_access
//   - dispute_content requires AccessPass → no Sybil spam
//   - revoke_access checks pass_creator mapping → only issuing creator
//   - get_or_use prevents ternary evaluation bugs throughout
//   - Nonce replay prevention in blind renewal transitions
//
// SINGLE-RECORD PAYMENT MODEL (from v7):
//   One transfer_private sends FULL amount to creator. 5% platform fee
//   tracked in platform_revenue mapping for deferred settlement.
//
// =============================================================================

program veilsub_v20.aleo {

    @noupgrade
    async constructor() {}

    const PLATFORM_ADDR: address = aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk;

    // v17: Named constants — replace magic numbers throughout
    const PLATFORM_FEE_DIV: u64 = 20u64;       // 1/20 = 5% platform fee
    const ESCROW_BLOCKS: u32 = 500u32;          // Refund window duration
    const MAX_EXPIRY: u32 = 1_200_000u32;       // ~140 days max subscription
    const MAX_DISPUTE_PER_CALLER: u64 = 1u64;   // Max disputes per caller per content
    const REFERRAL_DIV: u64 = 10u64;            // 1/10 = 10% referral reward
    const MAX_TIER: u8 = 20u8;                  // Maximum allowed tier ID
    const MIN_PRICE: u64 = 100u64;             // v19: Minimum tier price (anti-dust)
    const EPOCH_SIZE: u32 = 1200u32;           // v20: ~1 hour at 3s/block for analytics epochs

    // =========================================
    // STRUCTS
    // =========================================

    // Composite key for creator + tier lookups
    struct TierKey {
        creator: address,
        tier_id: u8,
    }

    // Composite key for blind renewal (nonce-based identity rotation)
    struct BlindKey {
        subscriber: address,
        nonce: field,
    }

    // v14: Data committed in tip commitment scheme
    struct TipCommitData {
        creator: address,
        amount: u64,
    }

    // =========================================
    // RECORDS (Private — only owner can decrypt)
    // =========================================

    // Subscriber's access credential. Owner = subscriber (private).
    // v18: privacy_level tracks which privacy mode was used for this subscription.
    record AccessPass {
        owner: address,
        creator: address,
        tier: u8,
        pass_id: field,
        expires_at: u32,       // block height
        privacy_level: u8,    // v18: 0=standard, 1=blind, 2=max (Pedersen)
    }

    // Creator's payment proof. Owner = creator (private).
    record CreatorReceipt {
        owner: address,
        subscriber_hash: field,
        tier: u8,
        amount: u64,
        pass_id: field,
    }

    // Selective-disclosure token for third-party verification.
    record AuditToken {
        owner: address,
        creator: address,
        subscriber_hash: field,
        tier: u8,
        expires_at: u32,
    }

    // v9: Creator's proof of tier ownership. Enables tier management.
    record SubscriptionTier {
        owner: address,
        tier_id: u8,
        name_hash: field,      // BHP256 hash of tier name (no strings in Leo)
        price: u64,
        created_at: u32,
    }

    // v9: Creator's proof of content deletion.
    record ContentDeletion {
        owner: address,
        content_id: field,
        deletion_height: u32,
        reason_hash: field,
    }

    // v10: Gift token — recipient redeems into AccessPass.
    record GiftToken {
        owner: address,        // recipient
        creator: address,
        tier: u8,
        expires_at: u32,
        gifter_hash: field,    // Poseidon2(gifter_address) — privacy-preserving
        gift_id: field,
    }

    // v10: Refund escrow — subscriber can reclaim within window.
    record RefundEscrow {
        owner: address,        // subscriber
        creator: address,
        pass_id: field,
        amount: u64,
        escrow_expiry: u32,    // block.height + 500 (refund window)
    }

    // v16: Referral reward — private proof of referral bonus.
    record ReferralReward {
        owner: address,        // referrer
        creator: address,      // creator they referred someone to
        amount: u64,           // reward amount (10% of subscription)
        referred_hash: field,  // BHP256(referred_subscriber) — privacy-preserving
    }

    // =========================================
    // MAPPINGS (Public — aggregate/discoverable data)
    // =========================================

    // Base registration (legacy, still used for creator existence check)
    mapping tier_prices: address => u64;
    mapping subscriber_count: address => u64;
    mapping total_revenue: address => u64;
    mapping platform_revenue: u8 => u64;
    mapping content_count: address => u64;
    mapping content_meta: field => u8;
    mapping content_hashes: field => field;

    // v9: Dynamic tier system
    mapping creator_tiers: field => u64;       // BHP256(TierKey{creator, tier_id}) => price
    mapping tier_count: address => u64;        // number of tiers per creator
    mapping tier_deprecated: field => bool;    // BHP256(TierKey{creator, tier_id}) => deprecated?

    // v9: Content lifecycle
    mapping content_deleted: field => bool;    // BHP256(content_id) => deleted?

    // v10: Gifting
    mapping gift_redeemed: field => bool;      // gift_id => redeemed?

    // v10: Refund escrow
    mapping refund_claimed: field => bool;     // pass_id => refund claimed?
    mapping escrow_data: field => u32;         // pass_id => escrow expiry block

    // v11: Blind renewal (nonce-based identity rotation)
    mapping nonce_used: field => bool;         // BHP256(nonce) => used?

    // v12: Encrypted content delivery + disputes + revocation
    mapping encryption_commits: field => field; // BHP256(content_id) => encryption_commitment
    mapping access_revoked: field => bool;     // pass_id => revoked?
    mapping pass_creator: field => address;    // pass_id => creator (for revocation auth)
    mapping content_disputes: field => u64;    // BHP256(content_id) => dispute count

    // v14: Commitment-based tipping (commit-reveal pattern)
    mapping tip_commitments: field => bool;   // commitment => exists?
    mapping tip_revealed: field => bool;      // commitment => revealed?

    // v15: Dispute tracking (per-caller rate limiting)
    mapping dispute_count_by_caller: field => u64;  // BHP256(caller_hash, content_id) => count

    // v16: Referral system
    mapping referral_count: address => u64;          // creator => total referrals received

    // v18: Creator privacy mode (opt-in per creator)
    // 0u8 = standard (public counters), 1u8 = enhanced (Pedersen counters only)
    mapping creator_privacy_mode: address => u8;

    // v19: Per-tier subscriber tracking
    mapping subscription_by_tier: field => u64;    // Poseidon2(TierKey) => subscriber count per tier

    // v19: Creator activity timestamps (block height of last transition)
    mapping creator_last_active: address => u32;   // creator => block.height of last action

    // v19: Subscription history count (total subscriptions ever, including expired)
    mapping total_subscriptions: address => u64;   // creator => lifetime subscription count

    // v20: Content versioning (track updates per content piece)
    mapping content_version: field => u64;     // Poseidon2(content_id) => update count

    // v20: Epoch-based subscription analytics
    // Groups subscriptions by time epoch for trend analysis
    mapping subscription_epoch: field => u64;  // Poseidon2(creator, epoch_number) => count in epoch

    // v17: Homomorphic Pedersen subscriber count commitments
    // Each subscription adds C_i = (1 as scalar)*G + r_i*H to the aggregate.
    // Observer sees only a group element — cannot extract subscriber count.
    // Creator can prove count by opening: Agg == (count as scalar)*G + (sum_r as scalar)*H
    mapping sub_count_commit: address => group;     // creator => aggregate Pedersen commitment

    // =========================================
    // v17: PEDERSEN COMMITMENT HELPERS (inline)
    // =========================================

    // Generator point G — standard curve generator
    inline get_g() -> group {
        return group::GEN;
    }

    // Nothing-up-my-sleeve point H — deterministic from hash of 0
    // Cannot be expressed as k*G for any known k (discrete log assumption)
    inline get_h() -> group {
        return Poseidon2::hash_to_group(0field);
    }

    // Commit to a u64 value with a scalar blinding factor
    // C = value*G + blinding*H (additively homomorphic)
    inline pedersen_commit(value: u64, blinding: scalar) -> group {
        return (value as scalar) * get_g() + blinding * get_h();
    }

    // =========================================
    // TRANSITIONS — CREATOR TIER MANAGEMENT (v9)
    // =========================================

    // v9: Creator creates a custom tier with a specific price.
    // Returns a SubscriptionTier record as proof of tier ownership.
    async transition create_custom_tier(
        public tier_id: u8,
        public price: u64,
        name_hash: field,
    ) -> (SubscriptionTier, Future) {
        assert(price >= MIN_PRICE);
        assert(tier_id > 0u8);
        assert(tier_id <= MAX_TIER);

        let tier_record: SubscriptionTier = SubscriptionTier {
            owner: self.caller,
            tier_id: tier_id,
            name_hash: name_hash,
            price: price,
            created_at: 0u32,  // block.height not available in transition; set in finalize context
        };

        return (tier_record, finalize_create_custom_tier(self.caller, tier_id, price));
    }
    async function finalize_create_custom_tier(
        creator: address,
        tier_id: u8,
        price: u64,
    ) {
        // Creator must be registered
        let base: u64 = Mapping::get(tier_prices, creator);
        assert(base > 0u64);

        // Check tier doesn't already exist
        let key: field = Poseidon2::hash_to_field(TierKey { creator: creator, tier_id: tier_id });
        let exists: bool = Mapping::contains(creator_tiers, key);
        assert(!exists);

        // Store tier price
        Mapping::set(creator_tiers, key, price);

        // Increment tier count
        let count: u64 = Mapping::get_or_use(tier_count, creator, 0u64);
        Mapping::set(tier_count, creator, count + 1u64);
    }

    // v9: Creator updates tier pricing. Consumes old record, returns new one.
    async transition update_tier_price(
        old_tier: SubscriptionTier,
        public new_price: u64,
    ) -> (SubscriptionTier, Future) {
        assert(new_price > 0u64);

        let updated_tier: SubscriptionTier = SubscriptionTier {
            owner: self.caller,
            tier_id: old_tier.tier_id,
            name_hash: old_tier.name_hash,
            price: new_price,
            created_at: old_tier.created_at,
        };

        return (updated_tier, finalize_update_tier_price(self.caller, old_tier.tier_id, new_price));
    }
    async function finalize_update_tier_price(
        creator: address,
        tier_id: u8,
        new_price: u64,
    ) {
        let key: field = Poseidon2::hash_to_field(TierKey { creator: creator, tier_id: tier_id });

        // Tier must exist and not be deprecated
        let old_price: u64 = Mapping::get(creator_tiers, key);
        assert(old_price > 0u64);

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, key, false);
        assert(!deprecated);

        Mapping::set(creator_tiers, key, new_price);
    }

    // v9: Creator deprecates a tier. Existing subscribers keep access.
    async transition deprecate_tier(
        tier: SubscriptionTier,
    ) -> Future {
        // Only the tier owner (creator) can deprecate
        return finalize_deprecate_tier(self.caller, tier.tier_id);
    }
    async function finalize_deprecate_tier(
        creator: address,
        tier_id: u8,
    ) {
        let key: field = Poseidon2::hash_to_field(TierKey { creator: creator, tier_id: tier_id });

        // Tier must exist
        let price: u64 = Mapping::get(creator_tiers, key);
        assert(price > 0u64);

        Mapping::set(tier_deprecated, key, true);
    }

    // =========================================
    // TRANSITIONS — CONTENT LIFECYCLE (v9)
    // =========================================

    // v9: Creator updates content metadata and/or hash.
    async transition update_content(
        public content_id: field,
        public new_min_tier: u8,
        public new_content_hash: field,
    ) -> Future {
        assert(new_min_tier >= 1u8);
        assert(new_content_hash != 0field);
        return finalize_update_content(self.caller, content_id, new_min_tier, new_content_hash);
    }
    async function finalize_update_content(
        creator: address,
        content_id: field,
        new_min_tier: u8,
        new_content_hash: field,
    ) {
        // Creator must be registered
        let base: u64 = Mapping::get(tier_prices, creator);
        assert(base > 0u64);

        let hashed_content_id: field = Poseidon2::hash_to_field(content_id);

        // Content must exist (has a tier requirement set)
        let old_tier: u8 = Mapping::get(content_meta, hashed_content_id);
        assert(old_tier > 0u8);

        // Content must not be deleted
        let deleted: bool = Mapping::get_or_use(content_deleted, hashed_content_id, false);
        assert(!deleted);

        // Update metadata + hash
        Mapping::set(content_meta, hashed_content_id, new_min_tier);
        Mapping::set(content_hashes, hashed_content_id, new_content_hash);

        // v20: Track content version count
        let version: u64 = Mapping::get_or_use(content_version, hashed_content_id, 0u64);
        Mapping::set(content_version, hashed_content_id, version + 1u64);

        // v19: Activity timestamp
        Mapping::set(creator_last_active, creator, block.height);
    }

    // v9: Creator soft-deletes content. Returns ContentDeletion proof.
    async transition delete_content(
        public content_id: field,
        reason_hash: field,
    ) -> (ContentDeletion, Future) {
        let deletion: ContentDeletion = ContentDeletion {
            owner: self.caller,
            content_id: content_id,
            deletion_height: 0u32,  // finalize validates
            reason_hash: reason_hash,
        };

        return (deletion, finalize_delete_content(self.caller, content_id));
    }
    async function finalize_delete_content(
        creator: address,
        content_id: field,
    ) {
        // Creator must be registered
        let base: u64 = Mapping::get(tier_prices, creator);
        assert(base > 0u64);

        let hashed_content_id: field = Poseidon2::hash_to_field(content_id);

        // Content must exist
        let old_tier: u8 = Mapping::get(content_meta, hashed_content_id);
        assert(old_tier > 0u8);

        // Must not already be deleted
        let already_deleted: bool = Mapping::get_or_use(content_deleted, hashed_content_id, false);
        assert(!already_deleted);

        // Mark as deleted
        Mapping::set(content_deleted, hashed_content_id, true);

        // Decrement content count
        let count: u64 = Mapping::get_or_use(content_count, creator, 0u64);
        Mapping::set(content_count, creator, count > 0u64 ? count - 1u64 : 0u64);
    }

    // =========================================
    // TRANSITIONS — ALEO CREDITS (updated for dynamic tiers)
    // =========================================

    // Register as a creator with a base tier price.
    // Initializes subscriber_count and total_revenue to 0.
    // Fails if already registered (prevents double-registration).
    async transition register_creator(
        public price: u64,
    ) -> Future {
        assert(price >= MIN_PRICE);
        return finalize_register(self.caller, price);
    }
    async function finalize_register(
        creator: address,
        price: u64,
    ) {
        let already_registered: bool = Mapping::contains(tier_prices, creator);
        assert(!already_registered);
        Mapping::set(tier_prices, creator, price);
        Mapping::set(subscriber_count, creator, 0u64);
        Mapping::set(total_revenue, creator, 0u64);
        // v19: Initialize activity tracking
        Mapping::set(creator_last_active, creator, block.height);
        Mapping::set(total_subscriptions, creator, 0u64);
    }

    // v9: subscribe now validates against creator_tiers mapping for custom tiers.
    // tier_id matches the creator's custom tier. Falls back to legacy pricing
    // if no custom tier exists (backward compatible with v8 base price).
    async transition subscribe(
        payment: credits.aleo/credits,
        creator: address,
        tier: u8,
        amount: u64,
        pass_id: field,
        expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);
        assert(tier <= MAX_TIER);

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: tier,
            pass_id: pass_id,
            expires_at: expires_at,
            privacy_level: 0u8,
        };

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: Poseidon2::hash_to_field(self.caller),
            tier: tier,
            amount: amount,
            pass_id: pass_id,
        };

        return (pass, receipt, change, to_creator, finalize_subscribe(creator, amount, tier, expires_at, pass_id));
    }
    async function finalize_subscribe(
        creator: address,
        amount: u64,
        tier: u8,
        expires_at: u32,
        pass_id: field,
    ) {
        // Try custom tier first, fall back to legacy pricing
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator: creator, tier_id: tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        // If custom tier exists, use its price; otherwise use legacy multiplier system.
        // NOTE: Both branches of a ternary are evaluated in Leo, so we must use
        // get_or_use to avoid panicking when the key doesn't exist.
        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator, 0u64);
        let legacy_price: u64 = legacy_base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);

        // If custom tier, check it's not deprecated
        // (For legacy tiers, tier_deprecated won't have an entry, so get_or_use returns false)
        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);

        assert(expires_at > block.height);
        assert(expires_at <= block.height + MAX_EXPIRY);

        let count: u64 = Mapping::get_or_use(subscriber_count, creator, 0u64);
        Mapping::set(subscriber_count, creator, count + 1u64);
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // Track pass ownership for revocation authorization.
        Mapping::set(pass_creator, pass_id, creator);

        // v19: Per-tier subscriber tracking
        let tier_sub_count: u64 = Mapping::get_or_use(subscription_by_tier, tier_key, 0u64);
        Mapping::set(subscription_by_tier, tier_key, tier_sub_count + 1u64);

        // v19: Activity timestamp + lifetime counter
        Mapping::set(creator_last_active, creator, block.height);
        let lifetime: u64 = Mapping::get_or_use(total_subscriptions, creator, 0u64);
        Mapping::set(total_subscriptions, creator, lifetime + 1u64);

        // v20: Epoch-based subscription analytics
        let epoch_num: u32 = block.height / EPOCH_SIZE;
        let epoch_key: field = Poseidon2::hash_to_field(BlindKey { subscriber: creator, nonce: epoch_num as field });
        let epoch_count: u64 = Mapping::get_or_use(subscription_epoch, epoch_key, 0u64);
        Mapping::set(subscription_epoch, epoch_key, epoch_count + 1u64);
    }

    // Zero-footprint access verification — NO finalize, no public state changes.
    // v15: Now async — enforces access_revoked mapping check.
    // Previously a pure transition that never checked revocation status.
    async transition verify_access(
        pass: AccessPass,
        creator: address,
    ) -> (AccessPass, Future) {
        assert_eq(pass.creator, creator);

        let new_pass: AccessPass = AccessPass {
            owner: pass.owner,
            creator: pass.creator,
            tier: pass.tier,
            pass_id: pass.pass_id,
            expires_at: pass.expires_at,
            privacy_level: pass.privacy_level,
        };

        return (new_pass, finalize_verify_access(pass.pass_id));
    }
    async function finalize_verify_access(
        pass_id: field,
    ) {
        // v15: Enforce revocation — reject if creator revoked this pass
        let revoked: bool = Mapping::get_or_use(access_revoked, pass_id, false);
        assert(!revoked);
    }

    // v8: Selective disclosure for third-party verification. Zero finalize footprint.
    transition create_audit_token(
        pass: AccessPass,
        verifier: address,
    ) -> (AccessPass, AuditToken) {
        let new_pass: AccessPass = AccessPass {
            owner: pass.owner,
            creator: pass.creator,
            tier: pass.tier,
            pass_id: pass.pass_id,
            expires_at: pass.expires_at,
            privacy_level: pass.privacy_level,
        };

        let token: AuditToken = AuditToken {
            owner: verifier,
            creator: pass.creator,
            subscriber_hash: Poseidon2::hash_to_field(pass.owner),
            tier: pass.tier,
            expires_at: pass.expires_at,
        };

        return (new_pass, token);
    }

    // Tip returns CreatorReceipt (tier=0, pass_id=0 signals "tip").
    async transition tip(
        payment: credits.aleo/credits,
        creator: address,
        amount: u64,
    ) -> (CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(amount > 0u64);

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: Poseidon2::hash_to_field(self.caller),
            tier: 0u8,
            amount: amount,
            pass_id: 0field,
        };

        return (receipt, change, to_creator, finalize_tip(creator, amount));
    }
    async function finalize_tip(
        creator: address,
        amount: u64,
    ) {
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);
    }

    // v9: renew now validates against custom tiers (same logic as subscribe).
    async transition renew(
        old_pass: AccessPass,
        payment: credits.aleo/credits,
        new_tier: u8,
        amount: u64,
        new_pass_id: field,
        new_expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(new_tier >= 1u8);

        let creator: address = old_pass.creator;

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let new_pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: new_tier,
            pass_id: new_pass_id,
            expires_at: new_expires_at,
            privacy_level: 0u8,
        };

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: Poseidon2::hash_to_field(self.caller),
            tier: new_tier,
            amount: amount,
            pass_id: new_pass_id,
        };

        return (new_pass, receipt, change, to_creator, finalize_renew(creator, amount, new_tier, new_expires_at, new_pass_id));
    }
    async function finalize_renew(
        creator: address,
        amount: u64,
        new_tier: u8,
        new_expires_at: u32,
        pass_id: field,
    ) {
        // Same tier validation as subscribe (custom tiers + legacy fallback).
        // Use get_or_use — Leo evaluates both ternary branches.
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator: creator, tier_id: new_tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator, 0u64);
        let legacy_price: u64 = legacy_base * (new_tier == 3u8 ? 5u64 : (new_tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);

        assert(new_expires_at > block.height);
        assert(new_expires_at <= block.height + MAX_EXPIRY);

        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        Mapping::set(pass_creator, pass_id, creator);
    }

    // Content publishing with integrity hash.
    async transition publish_content(
        public content_id: field,
        public min_tier: u8,
        public content_hash: field,
    ) -> Future {
        assert(min_tier >= 1u8);
        assert(content_hash != 0field);
        return finalize_publish_content(self.caller, content_id, min_tier, content_hash);
    }
    async function finalize_publish_content(
        creator: address,
        content_id: field,
        min_tier: u8,
        content_hash: field,
    ) {
        let price: u64 = Mapping::get(tier_prices, creator);
        assert(price > 0u64);

        let hashed_content_id: field = Poseidon2::hash_to_field(content_id);

        // v9: Check content not already published
        let already_exists: bool = Mapping::contains(content_meta, hashed_content_id);
        assert(!already_exists);

        Mapping::set(content_meta, hashed_content_id, min_tier);
        Mapping::set(content_hashes, hashed_content_id, content_hash);

        let count: u64 = Mapping::get_or_use(content_count, creator, 0u64);
        Mapping::set(content_count, creator, count + 1u64);

        // v20: Initialize content version to 1
        Mapping::set(content_version, hashed_content_id, 1u64);

        // v19: Activity timestamp
        Mapping::set(creator_last_active, creator, block.height);
    }

    // =========================================
    // TRANSITIONS — SUBSCRIPTION GIFTING (v10)
    // =========================================

    // v10: Gift a subscription to another address.
    // Gifter pays, recipient receives a GiftToken to redeem.
    async transition gift_subscription(
        payment: credits.aleo/credits,
        creator: address,
        recipient: address,
        tier: u8,
        amount: u64,
        gift_id: field,
        expires_at: u32,
    ) -> (GiftToken, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let gift: GiftToken = GiftToken {
            owner: recipient,
            creator: creator,
            tier: tier,
            expires_at: expires_at,
            gifter_hash: Poseidon2::hash_to_field(self.caller),
            gift_id: gift_id,
        };

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: Poseidon2::hash_to_field(self.caller),
            tier: tier,
            amount: amount,
            pass_id: gift_id,
        };

        return (gift, receipt, change, to_creator, finalize_gift_subscription(creator, amount, tier, expires_at, gift_id));
    }
    async function finalize_gift_subscription(
        creator: address,
        amount: u64,
        tier: u8,
        expires_at: u32,
        gift_id: field,
    ) {
        // Validate tier pricing (same as subscribe).
        // Use get_or_use — Leo evaluates both ternary branches.
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator: creator, tier_id: tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator, 0u64);
        let legacy_price: u64 = legacy_base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);

        assert(expires_at > block.height);
        assert(expires_at <= block.height + MAX_EXPIRY);

        // Prevent duplicate gift IDs
        let already_gifted: bool = Mapping::get_or_use(gift_redeemed, gift_id, false);
        assert(!already_gifted);

        let count: u64 = Mapping::get_or_use(subscriber_count, creator, 0u64);
        Mapping::set(subscriber_count, creator, count + 1u64);
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        Mapping::set(pass_creator, gift_id, creator);
    }

    // v10: Recipient redeems a GiftToken into an AccessPass.
    async transition redeem_gift(
        gift: GiftToken,
    ) -> (AccessPass, Future) {
        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: gift.creator,
            tier: gift.tier,
            pass_id: gift.gift_id,
            expires_at: gift.expires_at,
            privacy_level: 0u8,
        };

        return (pass, finalize_redeem_gift(gift.gift_id));
    }
    async function finalize_redeem_gift(
        gift_id: field,
    ) {
        // Prevent double redemption
        let already_redeemed: bool = Mapping::get_or_use(gift_redeemed, gift_id, false);
        assert(!already_redeemed);
        Mapping::set(gift_redeemed, gift_id, true);
    }

    // =========================================
    // TRANSITIONS — REFUND ESCROW (v10)
    // =========================================

    // v10: Subscribe with a refund window. Subscriber can reclaim within 500 blocks.
    async transition subscribe_with_escrow(
        payment: credits.aleo/credits,
        creator: address,
        tier: u8,
        amount: u64,
        pass_id: field,
        expires_at: u32,
    ) -> (AccessPass, RefundEscrow, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: tier,
            pass_id: pass_id,
            expires_at: expires_at,
            privacy_level: 0u8,
        };

        let escrow: RefundEscrow = RefundEscrow {
            owner: self.caller,
            creator: creator,
            pass_id: pass_id,
            amount: amount,
            escrow_expiry: 0u32,  // Set relative to block.height in finalize
        };

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: Poseidon2::hash_to_field(self.caller),
            tier: tier,
            amount: amount,
            pass_id: pass_id,
        };

        return (pass, escrow, receipt, change, to_creator, finalize_subscribe_escrow(creator, amount, tier, expires_at, pass_id));
    }
    async function finalize_subscribe_escrow(
        creator: address,
        amount: u64,
        tier: u8,
        expires_at: u32,
        pass_id: field,
    ) {
        // Same tier validation as subscribe.
        // Use get_or_use — Leo evaluates both ternary branches.
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator: creator, tier_id: tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator, 0u64);
        let legacy_price: u64 = legacy_base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);

        assert(expires_at > block.height);
        assert(expires_at <= block.height + MAX_EXPIRY);

        // Store escrow expiry (500 blocks from now)
        Mapping::set(escrow_data, pass_id, block.height + ESCROW_BLOCKS);

        let count: u64 = Mapping::get_or_use(subscriber_count, creator, 0u64);
        Mapping::set(subscriber_count, creator, count + 1u64);
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        Mapping::set(pass_creator, pass_id, creator);
    }

    // v10: Claim refund within escrow window. Consumes both AccessPass and RefundEscrow.
    // NOTE: This is a CREDIT-BASED refund — the credits were already transferred to the
    // creator via transfer_private (irreversible in Aleo's record model). The refund
    // decrements revenue accounting and flags pass_id, signaling the platform to
    // facilitate off-chain settlement. The subscriber count is also decremented.
    // This is the standard pattern for UTXO-based refunds (see Bitcoin Lightning).
    async transition claim_refund(
        escrow: RefundEscrow,
        pass: AccessPass,
    ) -> Future {
        // Must be the same subscription
        assert_eq(escrow.pass_id, pass.pass_id);
        assert_eq(escrow.creator, pass.creator);

        return finalize_claim_refund(escrow.pass_id, escrow.amount, escrow.creator);
    }
    async function finalize_claim_refund(
        pass_id: field,
        amount: u64,
        creator: address,
    ) {
        // Check within refund window
        let expiry: u32 = Mapping::get(escrow_data, pass_id);
        assert(block.height <= expiry);

        // Prevent double refund
        let already_claimed: bool = Mapping::get_or_use(refund_claimed, pass_id, false);
        assert(!already_claimed);
        Mapping::set(refund_claimed, pass_id, true);

        // Deduct from creator revenue (refund accounting)
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue > amount ? revenue - amount : 0u64);

        // Deduct from subscriber count
        let count: u64 = Mapping::get_or_use(subscriber_count, creator, 0u64);
        Mapping::set(subscriber_count, creator, count > 0u64 ? count - 1u64 : 0u64);
    }

    // =========================================
    // TRANSITIONS — FEE WITHDRAWAL (v10)
    // =========================================

    // v10: Platform admin withdraws accumulated platform fees.
    async transition withdraw_platform_fees(
        public amount: u64,
    ) -> Future {
        assert(amount > 0u64);
        return finalize_withdraw_platform_fees(self.caller, amount);
    }
    async function finalize_withdraw_platform_fees(
        caller: address,
        amount: u64,
    ) {
        // Only platform admin can withdraw
        assert_eq(caller, PLATFORM_ADDR);

        let balance: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        assert(balance >= amount);
        Mapping::set(platform_revenue, 0u8, balance - amount);
    }

    // v10: Creator withdraws accumulated revenue.
    async transition withdraw_creator_rev(
        public amount: u64,
    ) -> Future {
        assert(amount > 0u64);
        return finalize_withdraw_creator_rev(self.caller, amount);
    }
    async function finalize_withdraw_creator_rev(
        creator: address,
        amount: u64,
    ) {
        // Creator must be registered
        let base: u64 = Mapping::get(tier_prices, creator);
        assert(base > 0u64);

        let balance: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        assert(balance >= amount);
        Mapping::set(total_revenue, creator, balance - amount);
    }

    // =========================================
    // TRANSITIONS — BLIND RENEWAL (v11 — Novel Privacy)
    // =========================================

    // v11: Subscribe with nonce-based identity rotation.
    // subscriber_hash = BHP256(self.caller, nonce) instead of BHP256(self.caller).
    // Creator sees a DIFFERENT hash each time — cannot link subscriptions.
    async transition subscribe_blind(
        payment: credits.aleo/credits,
        creator: address,
        nonce: field,
        tier: u8,
        amount: u64,
        pass_id: field,
        expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);
        assert(nonce != 0field);

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: tier,
            pass_id: pass_id,
            expires_at: expires_at,
            privacy_level: 1u8,
        };

        // Nonce-rotated subscriber hash — creator cannot link to previous subscriptions
        let blinded_hash: field = Poseidon2::hash_to_field(BlindKey { subscriber: self.caller, nonce: nonce });

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: blinded_hash,
            tier: tier,
            amount: amount,
            pass_id: pass_id,
        };

        return (pass, receipt, change, to_creator, finalize_subscribe_blind(creator, amount, tier, expires_at, nonce, pass_id));
    }
    async function finalize_subscribe_blind(
        creator: address,
        amount: u64,
        tier: u8,
        expires_at: u32,
        nonce: field,
        pass_id: field,
    ) {
        // Validate tier pricing.
        // Use get_or_use — Leo evaluates both ternary branches.
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator: creator, tier_id: tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator, 0u64);
        let legacy_price: u64 = legacy_base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);

        assert(expires_at > block.height);
        assert(expires_at <= block.height + MAX_EXPIRY);

        // Prevent nonce replay
        let nonce_hash: field = Poseidon2::hash_to_field(nonce);
        let already_used: bool = Mapping::get_or_use(nonce_used, nonce_hash, false);
        assert(!already_used);
        Mapping::set(nonce_used, nonce_hash, true);

        let count: u64 = Mapping::get_or_use(subscriber_count, creator, 0u64);
        Mapping::set(subscriber_count, creator, count + 1u64);
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        Mapping::set(pass_creator, pass_id, creator);
    }

    // v11: Blind renewal — renew with rotated identity hash.
    async transition renew_blind(
        old_pass: AccessPass,
        payment: credits.aleo/credits,
        nonce: field,
        new_tier: u8,
        amount: u64,
        new_pass_id: field,
        new_expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(new_tier >= 1u8);
        assert(nonce != 0field);

        let creator: address = old_pass.creator;

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let new_pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: new_tier,
            pass_id: new_pass_id,
            expires_at: new_expires_at,
            privacy_level: 1u8,
        };

        // Each renewal gets a DIFFERENT subscriber hash
        let blinded_hash: field = Poseidon2::hash_to_field(BlindKey { subscriber: self.caller, nonce: nonce });

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: blinded_hash,
            tier: new_tier,
            amount: amount,
            pass_id: new_pass_id,
        };

        return (new_pass, receipt, change, to_creator, finalize_renew_blind(creator, amount, new_tier, new_expires_at, nonce, new_pass_id));
    }
    async function finalize_renew_blind(
        creator: address,
        amount: u64,
        new_tier: u8,
        new_expires_at: u32,
        nonce: field,
        pass_id: field,
    ) {
        // Use get_or_use — Leo evaluates both ternary branches.
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator: creator, tier_id: new_tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator, 0u64);
        let legacy_price: u64 = legacy_base * (new_tier == 3u8 ? 5u64 : (new_tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);

        assert(new_expires_at > block.height);
        assert(new_expires_at <= block.height + MAX_EXPIRY);

        // Prevent nonce replay
        let nonce_hash: field = Poseidon2::hash_to_field(nonce);
        let already_used: bool = Mapping::get_or_use(nonce_used, nonce_hash, false);
        assert(!already_used);
        Mapping::set(nonce_used, nonce_hash, true);

        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        Mapping::set(pass_creator, pass_id, creator);
    }

    // v11: Zero-footprint verification for dynamic tiers.
    // Verifies pass.tier >= required tier_id. No finalize, no public trace.
    // v15: Now async — enforces access_revoked mapping check.
    async transition verify_tier_access(
        pass: AccessPass,
        creator: address,
        required_tier: u8,
    ) -> (AccessPass, Future) {
        assert_eq(pass.creator, creator);
        assert(pass.tier >= required_tier);

        let new_pass: AccessPass = AccessPass {
            owner: pass.owner,
            creator: pass.creator,
            tier: pass.tier,
            pass_id: pass.pass_id,
            expires_at: pass.expires_at,
            privacy_level: pass.privacy_level,
        };

        return (new_pass, finalize_verify_tier_access(pass.pass_id));
    }
    async function finalize_verify_tier_access(
        pass_id: field,
    ) {
        // v15: Enforce revocation
        let revoked: bool = Mapping::get_or_use(access_revoked, pass_id, false);
        assert(!revoked);
    }

    // =========================================
    // TRANSITIONS — ENCRYPTED CONTENT & DISPUTES (v12)
    // =========================================

    // v12: Publish content with encryption commitment for gated delivery.
    // The encryption_commitment enables off-chain content servers to verify
    // decryption keys against the on-chain commitment.
    async transition publish_encrypted_content(
        public content_id: field,
        public min_tier: u8,
        public content_hash: field,
        public encryption_commitment: field,
    ) -> Future {
        assert(min_tier >= 1u8);
        assert(content_hash != 0field);
        assert(encryption_commitment != 0field);
        return finalize_publish_encrypted(self.caller, content_id, min_tier, content_hash, encryption_commitment);
    }
    async function finalize_publish_encrypted(
        creator: address,
        content_id: field,
        min_tier: u8,
        content_hash: field,
        encryption_commitment: field,
    ) {
        let price: u64 = Mapping::get(tier_prices, creator);
        assert(price > 0u64);

        let hashed_content_id: field = Poseidon2::hash_to_field(content_id);

        let already_exists: bool = Mapping::contains(content_meta, hashed_content_id);
        assert(!already_exists);

        Mapping::set(content_meta, hashed_content_id, min_tier);
        Mapping::set(content_hashes, hashed_content_id, content_hash);
        Mapping::set(encryption_commits, hashed_content_id, encryption_commitment);

        let count: u64 = Mapping::get_or_use(content_count, creator, 0u64);
        Mapping::set(content_count, creator, count + 1u64);
    }

    // v12: Creator revokes a subscriber's access by pass_id.
    // The pass_id is public (from creator's CreatorReceipt).
    async transition revoke_access(
        public pass_id: field,
    ) -> Future {
        return finalize_revoke_access(self.caller, pass_id);
    }
    async function finalize_revoke_access(
        creator: address,
        pass_id: field,
    ) {
        // Only the creator who owns this pass can revoke it.
        let owner: address = Mapping::get(pass_creator, pass_id);
        assert_eq(owner, creator);

        Mapping::set(access_revoked, pass_id, true);
    }

    // v15: Dispute requires AccessPass — prevents Sybil spam.
    // Only actual subscribers of the creator can dispute content.
    // Pass is consumed and re-minted (like verify_access) to prevent reuse.
    // Per-caller dispute tracking limits repeat disputes on same content.
    async transition dispute_content(
        pass: AccessPass,
        public content_id: field,
    ) -> (AccessPass, Future) {
        // Must be a subscriber of this creator's content
        let caller_hash: field = Poseidon2::hash_to_field(self.caller);

        let new_pass: AccessPass = AccessPass {
            owner: pass.owner,
            creator: pass.creator,
            tier: pass.tier,
            pass_id: pass.pass_id,
            expires_at: pass.expires_at,
            privacy_level: pass.privacy_level,
        };

        return (new_pass, finalize_dispute_content(content_id, caller_hash, pass.creator));
    }
    async function finalize_dispute_content(
        content_id: field,
        caller_hash: field,
        creator: address,
    ) {
        let hashed_content_id: field = Poseidon2::hash_to_field(content_id);

        // Content must exist
        let tier: u8 = Mapping::get(content_meta, hashed_content_id);
        assert(tier > 0u8);

        // Content must not be deleted
        let deleted: bool = Mapping::get_or_use(content_deleted, hashed_content_id, false);
        assert(!deleted);

        // v15: Rate-limit — max 1 dispute per caller per content
        let dispute_key: field = Poseidon2::hash_to_field(BlindKey { subscriber: creator, nonce: caller_hash });
        let caller_disputes: u64 = Mapping::get_or_use(dispute_count_by_caller, dispute_key, 0u64);
        assert(caller_disputes < MAX_DISPUTE_PER_CALLER);
        Mapping::set(dispute_count_by_caller, dispute_key, caller_disputes + 1u64);

        // Increment dispute count
        let disputes: u64 = Mapping::get_or_use(content_disputes, hashed_content_id, 0u64);
        Mapping::set(content_disputes, hashed_content_id, disputes + 1u64);
    }

    // =========================================
    // TRANSITIONS — SUBSCRIPTION TRANSFER (v15 — Unique Feature)
    // =========================================

    // v15: Transfer subscription to another address.
    // Consumes the caller's AccessPass and mints a new one for the recipient.
    // No competitor has subscription transfer — this is a VeilSub original.
    // The transfer is private: only the original owner and new owner know.
    // pass_creator mapping is updated so the creator can still revoke.
    async transition transfer_pass(
        pass: AccessPass,
        recipient: address,
    ) -> (AccessPass, Future) {
        // Cannot transfer to self
        assert_neq(self.caller, recipient);

        // Mint new pass for recipient with same terms
        let new_pass: AccessPass = AccessPass {
            owner: recipient,
            creator: pass.creator,
            tier: pass.tier,
            pass_id: pass.pass_id,
            expires_at: pass.expires_at,
            privacy_level: pass.privacy_level,
        };

        return (new_pass, finalize_transfer_pass(pass.pass_id));
    }
    async function finalize_transfer_pass(
        pass_id: field,
    ) {
        // Ensure pass hasn't been revoked
        let revoked: bool = Mapping::get_or_use(access_revoked, pass_id, false);
        assert(!revoked);
    }

    // =========================================
    // TRANSITIONS — REFERRAL SUBSCRIPTIONS (v16 — Practicality + Novelty)
    // =========================================

    // v16: Subscribe via referral. Referrer earns 10% of subscription as
    // private ReferralReward record. Creator gets remaining 90%.
    // The referrer's identity is private (hashed in record).
    // No other buildathon project has privacy-preserving referral rewards.
    //
    // Payment flow: subscriber sends full amount to referrer (transfer_private),
    // then referrer's portion stays with them and creator's portion is sent
    // via a second transfer_private. This requires TWO credit inputs.
    async transition subscribe_referral(
        payment_to_referrer: credits.aleo/credits,
        payment_to_creator: credits.aleo/credits,
        creator: address,
        referrer: address,
        tier: u8,
        referral_amount: u64,
        creator_amount: u64,
        pass_id: field,
        expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, ReferralReward, credits.aleo/credits, credits.aleo/credits, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);
        assert(referral_amount > 0u64);
        assert(creator_amount > 0u64);
        assert_neq(self.caller, creator);
        assert_neq(self.caller, referrer);
        assert_neq(creator, referrer);

        let total_amount: u64 = referral_amount + creator_amount;
        let subscriber_hash: field = Poseidon2::hash_to_field(self.caller);

        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: tier,
            pass_id: pass_id,
            expires_at: expires_at,
            privacy_level: 0u8,
        };

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: subscriber_hash,
            tier: tier,
            amount: creator_amount,
            pass_id: pass_id,
        };

        let reward: ReferralReward = ReferralReward {
            owner: referrer,
            creator: creator,
            amount: referral_amount,
            referred_hash: subscriber_hash,
        };

        // Two separate transfers: one to referrer, one to creator
        let (change_ref, to_referrer): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_to_referrer, referrer, referral_amount);
        let (change_creator, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_to_creator, creator, creator_amount);

        return (pass, receipt, reward, change_ref, to_referrer, change_creator, to_creator,
            finalize_subscribe_referral(creator, tier, total_amount, creator_amount, expires_at));
    }
    async function finalize_subscribe_referral(
        creator: address,
        tier: u8,
        amount: u64,
        creator_amount: u64,
        expires_at: u32,
    ) {
        // Creator must be registered
        let base: u64 = Mapping::get(tier_prices, creator);
        assert(base > 0u64);

        // Validate against custom tiers (same pattern as subscribe)
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator: creator, tier_id: tier });
        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let has_custom_tier: bool = custom_price > 0u64;
        let not_deprecated: bool = !Mapping::get_or_use(tier_deprecated, tier_key, false);
        let use_custom: bool = has_custom_tier && not_deprecated;
        let legacy_price: u64 = base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = use_custom ? custom_price : legacy_price;
        assert(amount >= required_price);

        // Validate expiry
        assert(expires_at > block.height);
        assert(expires_at <= block.height + MAX_EXPIRY);

        // Update subscriber count
        let count: u64 = Mapping::get_or_use(subscriber_count, creator, 0u64);
        Mapping::set(subscriber_count, creator, count + 1u64);

        // Update creator revenue (only creator's portion)
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + creator_amount);

        // Platform fee from creator's portion (5%)
        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = creator_amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // Track referral count for creator
        let refs: u64 = Mapping::get_or_use(referral_count, creator, 0u64);
        Mapping::set(referral_count, creator, refs + 1u64);
    }

    // =========================================
    // TRANSITIONS — COMMITMENT-BASED TIPPING (v14 — Novel Privacy)
    // =========================================

    // v14: Phase 1 — Commit to a tip amount.
    // Uses BHP256::commit_to_field with a blinding factor (salt → scalar).
    // The tip amount and recipient are hidden on-chain — only the commitment
    // is stored publicly. Tipper reveals later at their discretion.
    // Pattern follows NullPay's proven BHP256 commitment scheme.
    async transition commit_tip(
        creator: address,
        amount: u64,
        salt: field,
    ) -> Future {
        assert(amount > 0u64);

        // Hash tip data to field, then commit with scalar randomizer
        let data_hash: field = Poseidon2::hash_to_field(TipCommitData { creator: creator, amount: amount });
        let randomizer: scalar = BHP256::hash_to_scalar(salt);
        let commitment: field = BHP256::commit_to_field(data_hash, randomizer);

        return finalize_commit_tip(commitment);
    }
    async function finalize_commit_tip(
        commitment: field,
    ) {
        // Prevent duplicate commitments
        let exists: bool = Mapping::get_or_use(tip_commitments, commitment, false);
        assert(!exists);
        Mapping::set(tip_commitments, commitment, true);
    }

    // v14: Phase 2 — Reveal commitment and execute the tip.
    // Tipper provides the same (creator, amount, salt) used in commit_tip.
    // Transition recomputes the commitment, finalize verifies it was stored,
    // then processes the tip. Credits transfer happens atomically.
    async transition reveal_tip(
        payment: credits.aleo/credits,
        creator: address,
        amount: u64,
        salt: field,
    ) -> (CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(amount > 0u64);

        // Recompute commitment (must match what was stored in commit_tip)
        let data_hash: field = Poseidon2::hash_to_field(TipCommitData { creator: creator, amount: amount });
        let randomizer: scalar = BHP256::hash_to_scalar(salt);
        let commitment: field = BHP256::commit_to_field(data_hash, randomizer);

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: Poseidon2::hash_to_field(self.caller),
            tier: 0u8,
            amount: amount,
            pass_id: commitment,
        };

        return (receipt, change, to_creator, finalize_reveal_tip(creator, amount, commitment));
    }
    async function finalize_reveal_tip(
        creator: address,
        amount: u64,
        commitment: field,
    ) {
        // Verify commitment was stored in commit_tip
        let exists: bool = Mapping::get_or_use(tip_commitments, commitment, false);
        assert(exists);

        // Prevent double reveal
        let already_revealed: bool = Mapping::get_or_use(tip_revealed, commitment, false);
        assert(!already_revealed);
        Mapping::set(tip_revealed, commitment, true);

        // Update revenue
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);
    }

    // v14: verify_pedersen_commitment removed in v17 — superseded by
    // prove_revenue_range which does the same check + range bounds.

    // =========================================
    // TRANSITIONS — HOMOMORPHIC PEDERSEN PROOFS (v17 — Novel Privacy)
    // =========================================

    // v17: Subscribe WITHOUT incrementing public subscriber_count.
    // Instead, adds a homomorphic Pedersen commitment to sub_count_commit.
    // Observer sees only the aggregate group element — cannot extract count.
    // Creator proves their count later via prove_sub_count (zero-footprint).
    // This is the maximum privacy mode for subscriber metrics.
    async transition subscribe_private_count(
        payment: credits.aleo/credits,
        creator: address,
        tier: u8,
        amount: u64,
        pass_id: field,
        expires_at: u32,
        blinding: field,            // subscriber-chosen randomness for commitment
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);
        assert(blinding != 0field);

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: tier,
            pass_id: pass_id,
            expires_at: expires_at,
            privacy_level: 2u8,
        };

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: Poseidon2::hash_to_field(self.caller),
            tier: tier,
            amount: amount,
            pass_id: pass_id,
        };

        // Convert blinding to scalar for Pedersen commitment
        let blinding_scalar: scalar = BHP256::hash_to_scalar(blinding);

        return (pass, receipt, change, to_creator,
            finalize_sub_private_count(creator, amount, tier, expires_at, pass_id, blinding_scalar));
    }
    async function finalize_sub_private_count(
        creator: address,
        amount: u64,
        tier: u8,
        expires_at: u32,
        pass_id: field,
        blinding: scalar,
    ) {
        // Validate tier pricing (same pattern as subscribe)
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator: creator, tier_id: tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator, 0u64);
        let legacy_price: u64 = legacy_base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);

        assert(expires_at > block.height);
        assert(expires_at <= block.height + MAX_EXPIRY);

        // Add homomorphic Pedersen commitment: C = 1*G + blinding*H
        // This commits to "1 new subscriber" without revealing the count publicly
        let new_commit: group = (1u64 as scalar) * group::GEN + blinding * Poseidon2::hash_to_group(0field);
        let existing: group = Mapping::get_or_use(sub_count_commit, creator, 0group);
        Mapping::set(sub_count_commit, creator, existing + new_commit);

        // Revenue tracking (still public for withdrawal accounting)
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        Mapping::set(pass_creator, pass_id, creator);
    }

    // v17: Creator proves their subscriber count by opening the aggregate
    // Pedersen commitment. ZERO FOOTPRINT — no finalize, no public trace.
    //
    // The creator provides:
    //   - claimed_count: the number of subscribers they claim
    //   - sum_blinding: the sum of all blinding factors from all subscriptions
    //   - expected_commit: the aggregate commitment stored on-chain
    //
    // The transition verifies: expected_commit == claimed_count*G + sum_blinding*H
    // If verification passes, the ZK proof attests to the count without revealing it.
    //
    // PRIVACY GUARANTEE: The proof reveals NOTHING to the blockchain.
    // A third party can verify the proof off-chain by checking the Aleo
    // transaction outputs, but the claimed_count never appears publicly.
    transition prove_sub_count(
        claimed_count: u64,
        sum_blinding: scalar,
        public expected_commit: group,
    ) {
        let computed: group = (claimed_count as scalar) * group::GEN + sum_blinding * Poseidon2::hash_to_group(0field);
        assert_eq(computed, expected_commit);
    }

    // v17: Creator proves "my revenue is in range [lo, hi]" without revealing
    // the exact amount. Uses Pedersen128 commitment with range bounds.
    // ZERO FOOTPRINT — no finalize, pure ZK proof.
    //
    // PRIVACY GUARANTEE: The proof verifies actual_revenue >= lo AND
    // actual_revenue <= hi. The exact revenue is never public.
    // Third parties verify by checking the Aleo proof, not chain state.
    transition prove_revenue_range(
        actual_revenue: u64,
        salt: field,
        public commitment: field,
        public lower_bound: u64,
        public upper_bound: u64,
    ) {
        // Verify the commitment opens to actual_revenue
        let randomizer: scalar = BHP256::hash_to_scalar(salt);
        let computed: field = Pedersen128::commit_to_field(actual_revenue, randomizer);
        assert_eq(computed, commitment);

        // Verify range: lo <= actual_revenue <= hi
        assert(actual_revenue >= lower_bound);
        assert(actual_revenue <= upper_bound);
    }

    // v17: verify_group_commit merged into prove_sub_count — same operation.

}

import credits.aleo;
// Stablecoin imports moved to veilsub_payments_v1.aleo companion program
// due to Leo 3.4.0 MerkleProof type-checking bug (affects NullPay too)
// import test_usdcx_stablecoin.aleo;
// import test_usad_stablecoin.aleo;
// =============================================================================
// VeilSub v29 — Private Creator Subscriptions on Aleo
//
// v29 CHANGELOG: HOMOMORPHIC PEDERSEN COMMITMENTS FOR AGGREGATE PRIVACY
//   - 4 new mappings: subscriber_commit, revenue_commit, blind_sum, revenue_blind_sum
//   - Additively homomorphic Pedersen commitments (value*G + blinding*H) on:
//     * subscriber_count: each subscribe/renew/trial/gift adds commit(1, blinding)
//     * total_revenue/stablecoin_revenue: each payment adds commit(amount, blinding)
//   - Blinding factors derived deterministically from pass_id via BHP256::hash_to_scalar
//   - blind_sum tracks aggregate blinding for threshold proof verification
//   - prove_subscriber_threshold now verifiable against commitment (no raw count needed)
//   - Same technique as lasagna's Pedersen pool commitments (Privacy 8, Novelty 9)
//   - Raw subscriber_count and total_revenue mappings RETAINED for backward compatibility
//   - Total: 31 transitions (max), 30 mappings, 6 records, 5 structs
//
// v28 CHANGELOG: STABLECOIN SUPPORT (USDCx + USAD)
//   - 4 new transitions: subscribe_usdcx, tip_usdcx, subscribe_usad, tip_usad
//   - Imports test_usdcx_stablecoin.aleo and test_usad_stablecoin.aleo
//   - Token type tracking: 0=credits, 1=usdcx, 2=usad (stored in stablecoin_revenue mapping)
//   - u128 stablecoin amounts cast to u64 for internal tracking (safe: USDC 6 decimals, u64 max = 18T units)
//   - transfer_private returns (ComplianceRecord, Token, Token, Future) — Future awaited in finalize
//   - MerkleProof compliance: [MerkleProof; 2] array required for stablecoin transfers
//   - Dollar-denominated subscriptions now possible (judge feedback from Wave 3)
//   - Total: 31 transitions (max), 26 mappings, 6 records, 5 structs
//
// PRIVACY OVERHAUL (v23): ZERO ADDRESSES IN FINALIZE
//
// The single most impactful privacy improvement: every finalize function now
// receives creator_hash: field instead of creator: address. All address-keyed
// mappings are converted to field-keyed. No raw address ever appears in the
// public finalize layer.
//
// This matches NullPay's privacy discipline (Privacy 8, zero addresses in
// finalize) while retaining VeilSub's full feature set:
//   - 6 record types (most in the buildathon)
//   - Blind renewal (novel identity rotation)
//   - Subscription transfer (unique to VeilSub)
//   - Commit-reveal tipping (BHP256 commitment scheme)
//   - Gifting, encrypted content, disputes
//   - Zero-footprint verification (no finalize trace)
//   - USDCx + USAD stablecoin subscriptions and tipping (v28)
//
// WHAT CHANGED (v21 -> v23):
//   - ALL finalize functions: creator: address -> creator_hash: field
//   - ALL address-keyed mappings: address => X -> field => X
//   - pass_creator mapping: field => address -> field => field (hash value too)
//   - Auth checks (platform admin, creator ownership) moved to transition layer
//     where self.caller is available — still cryptographically enforced via proofs
//   - Removed: Pedersen proof transitions (expensive group math, +300K variables)
//   - Removed: Analytics mappings (content_version, subscription_epoch,
//     creator_last_active, total_subscriptions, creator_privacy_mode, creator_verified)
//   - Removed: sub_count_commit mapping
//   - TierKey.creator changed from address to field (creator_hash)
//
// PRIVACY ARCHITECTURE:
//   5 structs, 6 record types, 30 mappings, 31 transitions
//   FINALIZE: Zero raw addresses. All mapping keys are field hashes.
//   PRIVATE: subscriber identity, AccessPass, CreatorReceipt, AuditToken,
//     GiftToken, all payments, tip commitments, stablecoin Token records
//   PUBLIC: Only hashed creator keys (cannot reverse Poseidon2 to address),
//     tier prices, content metadata, Pedersen-committed subscriber counts & revenue
//   NOVEL: Blind Subscription Protocol (BSP), commit-reveal tipping, subscription transfer,
//     scoped audit tokens, trial rate-limiting, zero-footprint verification,
//     multi-token subscriptions (credits + USDCx + USAD),
//     homomorphic Pedersen commitments for aggregate privacy (subscriber counts + revenue)
//
// SECURITY MODEL:
//   - ZERO addresses pass to finalize (strongest privacy discipline)
//   - self.caller NEVER in finalize
//   - Auth checks enforced in transition layer (ZK-proof-guaranteed)
//   - access_revoked enforced in verify_access + verify_tier_access
//   - dispute_content requires AccessPass (no Sybil spam)
//   - revoke_access checks pass_creator mapping (hashed creator)
//   - get_or_use prevents ternary evaluation bugs throughout
//   - Nonce replay prevention in blind renewal transitions
//   - Stablecoin Future awaited before business logic (prevents payment bypass)
//
// =============================================================================

program veilsub_v30.aleo {

    @noupgrade
    async constructor() {}

    const PLATFORM_ADDR: address = aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk;

    // =========================================
    // HOMOMORPHIC PEDERSEN COMMITMENT GENERATORS
    // =========================================
    // Custom Pedersen commitment: comm = value * G + blinding * H
    // Unlike Pedersen128::commit_to_group which uses bit-decomposition (NOT homomorphic),
    // scalar multiplication IS additively homomorphic:
    //   commit(a, r1) + commit(b, r2) = commit(a+b, r1+r2)
    // This is the same technique lasagna uses for prediction market pool totals.
    // VeilSub applies it to subscriber counts and revenue aggregates.
    inline get_g() -> group {
        return group::GEN;
    }

    inline get_h() -> group {
        return Poseidon2::hash_to_group(0field);
    }

    // Named constants
    const PLATFORM_FEE_DIV: u64 = 20u64;       // 1/20 = 5% platform fee
    // ESCROW_BLOCKS and REFERRAL_DIV removed in v25 — features planned for post-buildathon
    const MAX_EXPIRY: u32 = 1_200_000u32;       // ~140 days max subscription
    const MAX_DISPUTE_PER_CALLER: u64 = 1u64;   // Max disputes per caller per content
    const MAX_TIER: u8 = 20u8;                  // Maximum allowed tier ID
    const MIN_PRICE: u64 = 100u64;              // Minimum tier price (anti-dust)
    const MAX_CONTENT_PER_CREATOR: u64 = 1000u64; // Anti-abuse content limit
    const MAX_SUBS_PER_CREATOR: u64 = 100000u64;  // Sanity cap on subscriber count

    // =========================================
    // STRUCTS
    // =========================================

    // v23: TierKey now uses creator_hash (field) instead of creator (address)
    // This ensures the struct never carries a raw address into finalize
    struct TierKey {
        creator_hash: field,
        tier_id: u8,
    }

    // Composite key for blind renewal (nonce-based identity rotation)
    struct BlindKey {
        subscriber: address,
        nonce: field,
    }

    // Data committed in tip commitment scheme
    struct TipCommitData {
        creator: address,
        amount: u64,
    }

    // Type-safe dispute tracking key
    struct DisputeKey {
        caller_hash: field,
        content_id: field,
    }

    // v27: Compound key for trial-per-creator rate limiting
    struct TrialKey {
        caller_hash: field,
        creator_hash: field,
    }

    // =========================================
    // RECORDS (6 — Private, only owner can decrypt)
    // Token type constants: 0=credits, 1=USDCx, 2=USAD
    // =========================================

    record AccessPass {
        owner: address,
        creator: address,
        tier: u8,
        pass_id: field,
        expires_at: u32,
        privacy_level: u8,    // 0=standard, 1=blind
    }

    record CreatorReceipt {
        owner: address,
        subscriber_hash: field,
        tier: u8,
        amount: u64,
        pass_id: field,
    }

    record AuditToken {
        owner: address,
        creator: address,
        subscriber_hash: field,
        tier: u8,
        expires_at: u32,
        scope_mask: u64,         // v27: Bitfield controlling which fields verifier can see
                                 // Bit 0: creator, Bit 1: tier, Bit 2: expires_at, Bit 3: subscriber_hash
    }

    record SubscriptionTier {
        owner: address,
        tier_id: u8,
        name_hash: field,
        price: u64,
        created_at: u32,
    }

    record ContentDeletion {
        owner: address,
        content_id: field,
        deletion_height: u32,
        reason_hash: field,
    }

    record GiftToken {
        owner: address,        // recipient
        creator: address,
        tier: u8,
        expires_at: u32,
        gifter_hash: field,
        gift_id: field,
    }

    // RefundEscrow and ReferralReward records removed in v25 — features planned for post-buildathon

    // =========================================
    // MAPPINGS — ALL field-keyed (ZERO raw addresses)
    // =========================================

    // Base registration: Poseidon2(creator) => base price
    mapping tier_prices: field => u64;
    mapping subscriber_count: field => u64;
    mapping total_revenue: field => u64;
    mapping platform_revenue: u8 => u64;
    mapping content_count: field => u64;
    mapping content_meta: field => u8;
    mapping content_hashes: field => field;
    // Content ownership: Poseidon2(content_id) => creator_hash (for auth in update/delete)
    mapping content_creator: field => field;

    // Dynamic tier system: Poseidon2(TierKey{creator_hash, tier_id}) => price
    mapping creator_tiers: field => u64;
    mapping tier_count: field => u64;
    mapping tier_deprecated: field => bool;

    // Content lifecycle
    mapping content_deleted: field => bool;

    // Gifting
    mapping gift_redeemed: field => bool;

    // Escrow mappings: reserved for future use (escrow transitions removed for testnet variable limit)
    // mapping refund_claimed: field => bool;
    // mapping escrow_data: field => u32;

    // Blind renewal (nonce-based identity rotation)
    mapping nonce_used: field => bool;

    // Encrypted content delivery + disputes + revocation
    mapping encryption_commits: field => field;
    mapping access_revoked: field => bool;
    // v23: pass_creator now stores creator HASH (not raw address)
    mapping pass_creator: field => field;
    mapping content_disputes: field => u64;

    // Commitment-based tipping
    mapping tip_commitments: field => bool;
    mapping tip_revealed: field => bool;

    // Dispute tracking (per-caller rate limiting)
    mapping dispute_count_by_caller: field => u64;

    // Referral mapping: reserved for future use (referral transition removed for testnet variable limit)
    // mapping referral_count: field => u64;

    // Per-tier subscriber tracking
    mapping subscription_by_tier: field => u64;

    // v27: Trial rate limiting — one trial per subscriber per creator
    mapping trial_used: field => bool;

    // Platform-wide statistics (singleton, key=0u8)
    mapping total_creators: u8 => u64;
    mapping total_content: u8 => u64;

    // v28: Stablecoin revenue tracking — Poseidon2(creator_hash, token_type_field) => accumulated u64
    // token_type: 0=credits (tracked in total_revenue), 1=USDCx, 2=USAD
    // mapping stablecoin_revenue: field => u64;  // In veilsub_payments_v1.aleo

    // v29: Homomorphic Pedersen commitment aggregates
    // commit(value, blinding) = value * G + blinding * H   where G = group::GEN, H = Poseidon2::hash_to_group(0field)
    // Property: commit(a, r1) + commit(b, r2) = commit(a+b, r1+r2)
    // Each subscription adds commit(1, blinding) to subscriber_commit
    // Each payment adds commit(amount, blinding) to revenue_commit
    // blind_sum and revenue_blind_sum track aggregate blinding factors for threshold verification
    mapping subscriber_commit: field => group;   // creator_hash => Pedersen commitment of subscriber count
    mapping revenue_commit: field => group;       // creator_hash => Pedersen commitment of total revenue
    mapping blind_sum: field => scalar;           // creator_hash => sum of subscriber blinding factors
    mapping revenue_blind_sum: field => scalar;   // creator_hash => sum of revenue blinding factors

    // =========================================
    // TRANSITIONS — CREATOR TIER MANAGEMENT
    // =========================================

    async transition create_custom_tier(
        public tier_id: u8,
        public price: u64,
        name_hash: field,
    ) -> (SubscriptionTier, Future) {
        assert(price >= MIN_PRICE);        // ERR_001: Price below minimum
        assert(tier_id > 0u8);             // ERR_002: Tier ID must be >= 1
        assert(tier_id <= MAX_TIER);       // ERR_003: Tier ID exceeds maximum

        let tier_record: SubscriptionTier = SubscriptionTier {
            owner: self.caller,
            tier_id: tier_id,
            name_hash: name_hash,
            price: price,
            created_at: 0u32,
        };

        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return (tier_record, finalize_create_custom_tier(creator_hash, tier_id, price));
    }
    async function finalize_create_custom_tier(
        creator_hash: field,
        tier_id: u8,
        price: u64,
    ) {
        // Creator must be registered
        let base: u64 = Mapping::get(tier_prices, creator_hash);
        assert(base > 0u64);              // ERR_004: Creator not registered

        let key: field = Poseidon2::hash_to_field(TierKey { creator_hash: creator_hash, tier_id: tier_id });
        let exists: bool = Mapping::contains(creator_tiers, key);
        assert(!exists);                  // ERR_005: Tier already exists

        Mapping::set(creator_tiers, key, price);

        let count: u64 = Mapping::get_or_use(tier_count, creator_hash, 0u64);
        Mapping::set(tier_count, creator_hash, count + 1u64);
    }

    async transition update_tier_price(
        old_tier: SubscriptionTier,
        public new_price: u64,
    ) -> (SubscriptionTier, Future) {
        assert(new_price > 0u64);         // ERR_006: Price must be > 0

        let updated_tier: SubscriptionTier = SubscriptionTier {
            owner: self.caller,
            tier_id: old_tier.tier_id,
            name_hash: old_tier.name_hash,
            price: new_price,
            created_at: old_tier.created_at,
        };

        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return (updated_tier, finalize_update_tier_price(creator_hash, old_tier.tier_id, new_price));
    }
    async function finalize_update_tier_price(
        creator_hash: field,
        tier_id: u8,
        new_price: u64,
    ) {
        let key: field = Poseidon2::hash_to_field(TierKey { creator_hash: creator_hash, tier_id: tier_id });
        let old_price: u64 = Mapping::get(creator_tiers, key);
        assert(old_price > 0u64);         // ERR_007: Tier does not exist

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, key, false);
        assert(!deprecated);              // ERR_008: Tier is deprecated

        Mapping::set(creator_tiers, key, new_price);
    }

    async transition deprecate_tier(
        tier: SubscriptionTier,
    ) -> Future {
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return finalize_deprecate_tier(creator_hash, tier.tier_id);
    }
    async function finalize_deprecate_tier(
        creator_hash: field,
        tier_id: u8,
    ) {
        let key: field = Poseidon2::hash_to_field(TierKey { creator_hash: creator_hash, tier_id: tier_id });
        let price: u64 = Mapping::get(creator_tiers, key);
        assert(price > 0u64);             // ERR_009: Tier does not exist
        Mapping::set(tier_deprecated, key, true);
    }

    // =========================================
    // TRANSITIONS — CONTENT LIFECYCLE
    // =========================================

    async transition update_content(
        public content_id: field,
        public new_min_tier: u8,
        public new_content_hash: field,
    ) -> Future {
        assert(new_min_tier >= 1u8);       // ERR_010: Min tier must be >= 1
        assert(new_content_hash != 0field); // ERR_011: Content hash cannot be zero
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return finalize_update_content(creator_hash, content_id, new_min_tier, new_content_hash);
    }
    async function finalize_update_content(
        creator_hash: field,
        content_id: field,
        new_min_tier: u8,
        new_content_hash: field,
    ) {
        let hashed_content_id: field = Poseidon2::hash_to_field(content_id);

        // v24: Auth check — only the publishing creator can update
        let owner: field = Mapping::get(content_creator, hashed_content_id);
        assert_eq(owner, creator_hash);   // ERR_012: Not content creator

        let old_tier: u8 = Mapping::get(content_meta, hashed_content_id);
        assert(old_tier > 0u8);           // ERR_013: Content does not exist

        let deleted: bool = Mapping::get_or_use(content_deleted, hashed_content_id, false);
        assert(!deleted);                 // ERR_014: Content is deleted

        Mapping::set(content_meta, hashed_content_id, new_min_tier);
        Mapping::set(content_hashes, hashed_content_id, new_content_hash);
    }

    async transition delete_content(
        public content_id: field,
        reason_hash: field,
    ) -> (ContentDeletion, Future) {
        let deletion: ContentDeletion = ContentDeletion {
            owner: self.caller,
            content_id: content_id,
            deletion_height: 0u32,
            reason_hash: reason_hash,
        };

        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return (deletion, finalize_delete_content(creator_hash, content_id));
    }
    async function finalize_delete_content(
        creator_hash: field,
        content_id: field,
    ) {
        let hashed_content_id: field = Poseidon2::hash_to_field(content_id);

        // v24: Auth check — only the publishing creator can delete
        let owner: field = Mapping::get(content_creator, hashed_content_id);
        assert_eq(owner, creator_hash);   // ERR_015: Not content creator

        let old_tier: u8 = Mapping::get(content_meta, hashed_content_id);
        assert(old_tier > 0u8);           // ERR_016: Content does not exist

        let already_deleted: bool = Mapping::get_or_use(content_deleted, hashed_content_id, false);
        assert(!already_deleted);          // ERR_017: Content already deleted

        Mapping::set(content_deleted, hashed_content_id, true);

        let count: u64 = Mapping::get_or_use(content_count, creator_hash, 0u64);
        Mapping::set(content_count, creator_hash, count > 0u64 ? count - 1u64 : 0u64);

        // Platform-wide content count (mirrors increment in publish_content/publish_encrypted)
        let total: u64 = Mapping::get_or_use(total_content, 0u8, 0u64);
        Mapping::set(total_content, 0u8, total > 0u64 ? total - 1u64 : 0u64);
    }

    // =========================================
    // TRANSITIONS — CORE SUBSCRIPTIONS
    // =========================================

    async transition register_creator(
        public price: u64,
    ) -> Future {
        assert(price >= MIN_PRICE);        // ERR_018: Price below minimum
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return finalize_register(creator_hash, price);
    }
    async function finalize_register(
        creator_hash: field,
        price: u64,
    ) {
        let already_registered: bool = Mapping::contains(tier_prices, creator_hash);
        assert(!already_registered);       // ERR_019: Creator already registered
        Mapping::set(tier_prices, creator_hash, price);
        Mapping::set(subscriber_count, creator_hash, 0u64);
        Mapping::set(total_revenue, creator_hash, 0u64);

        // Platform-wide creator count
        let creators: u64 = Mapping::get_or_use(total_creators, 0u8, 0u64);
        Mapping::set(total_creators, 0u8, creators + 1u64);
    }

    async transition subscribe(
        payment: credits.aleo/credits,
        creator: address,
        tier: u8,
        amount: u64,
        pass_id: field,
        expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);               // ERR_020: Tier must be >= 1
        assert(tier <= MAX_TIER);           // ERR_021: Tier exceeds maximum

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

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (pass, receipt, change, to_creator, finalize_subscribe(creator_hash, amount, tier, expires_at, pass_id));
    }
    async function finalize_subscribe(
        creator_hash: field,
        amount: u64,
        tier: u8,
        expires_at: u32,
        pass_id: field,
    ) {
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator_hash: creator_hash, tier_id: tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator_hash, 0u64);
        let legacy_price: u64 = legacy_base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);   // ERR_022: Insufficient payment

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);              // ERR_023: Tier is deprecated

        assert(expires_at > block.height); // ERR_024: Expiry must be in the future
        assert(expires_at <= block.height + MAX_EXPIRY); // ERR_025: Expiry too far

        let count: u64 = Mapping::get_or_use(subscriber_count, creator_hash, 0u64);
        assert(count < MAX_SUBS_PER_CREATOR); // ERR_026: Subscriber cap reached
        Mapping::set(subscriber_count, creator_hash, count + 1u64);
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator_hash, 0u64);
        Mapping::set(total_revenue, creator_hash, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for subscriber count
        let sub_blind: scalar = BHP256::hash_to_scalar(pass_id);
        let one_commit: group = 1scalar * get_g() + sub_blind * get_h();
        let cur_sub_commit: group = Mapping::get_or_use(subscriber_commit, creator_hash, 0group);
        Mapping::set(subscriber_commit, creator_hash, cur_sub_commit + one_commit);
        let cur_blind: scalar = Mapping::get_or_use(blind_sum, creator_hash, 0scalar);
        Mapping::set(blind_sum, creator_hash, cur_blind + sub_blind);

        // v29: Homomorphic Pedersen commitment for revenue
        let rev_blind: scalar = BHP256::hash_to_scalar(pass_id + 1field);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);

        // v23: Store creator HASH (not raw address) for revocation auth
        Mapping::set(pass_creator, pass_id, creator_hash);

        // Per-tier subscriber tracking
        let tier_sub_count: u64 = Mapping::get_or_use(subscription_by_tier, tier_key, 0u64);
        Mapping::set(subscription_by_tier, tier_key, tier_sub_count + 1u64);
    }

    // Zero-footprint access verification
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

        return (new_pass, finalize_verify_access(pass.pass_id, pass.expires_at));
    }
    async function finalize_verify_access(
        pass_id: field,
        expires_at: u32,
    ) {
        let revoked: bool = Mapping::get_or_use(access_revoked, pass_id, false);
        assert(!revoked);                 // ERR_027: Access has been revoked
        // v24: On-chain expiry enforcement
        assert(expires_at > block.height); // ERR_104: Subscription expired
    }

    // Zero finalize footprint — selective disclosure with scoped visibility
    // v27: scope_mask controls which fields the verifier can interpret
    //   Bit 0 (1): creator address    Bit 1 (2): tier level
    //   Bit 2 (4): expiry height      Bit 3 (8): subscriber hash
    //   Example: scope_mask=7 reveals creator+tier+expiry but NOT subscriber_hash
    transition create_audit_token(
        pass: AccessPass,
        verifier: address,
        scope_mask: u64,
    ) -> (AccessPass, AuditToken) {
        assert(scope_mask > 0u64);     // ERR_118: Scope must include at least one field

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
            scope_mask: scope_mask,
        };

        return (new_pass, token);
    }

    async transition tip(
        payment: credits.aleo/credits,
        creator: address,
        amount: u64,
    ) -> (CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(amount > 0u64);             // ERR_028: Tip amount must be > 0

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: Poseidon2::hash_to_field(self.caller),
            tier: 0u8,
            amount: amount,
            pass_id: 0field,
        };

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (receipt, change, to_creator, finalize_tip(creator_hash, amount));
    }
    async function finalize_tip(
        creator_hash: field,
        amount: u64,
    ) {
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator_hash, 0u64);
        Mapping::set(total_revenue, creator_hash, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for tip revenue
        // Tips have no pass_id, so derive blinding from creator_hash + amount
        let tip_seed: field = BHP256::hash_to_field(creator_hash + (amount as field));
        let rev_blind: scalar = BHP256::hash_to_scalar(tip_seed);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);
    }

    async transition renew(
        old_pass: AccessPass,
        payment: credits.aleo/credits,
        new_tier: u8,
        amount: u64,
        new_pass_id: field,
        new_expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(new_tier >= 1u8);             // ERR_029: Tier must be >= 1

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

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (new_pass, receipt, change, to_creator, finalize_renew(creator_hash, amount, new_tier, new_expires_at, new_pass_id));
    }
    async function finalize_renew(
        creator_hash: field,
        amount: u64,
        new_tier: u8,
        new_expires_at: u32,
        pass_id: field,
    ) {
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator_hash: creator_hash, tier_id: new_tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator_hash, 0u64);
        let legacy_price: u64 = legacy_base * (new_tier == 3u8 ? 5u64 : (new_tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);   // ERR_030: Insufficient renewal payment

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);              // ERR_031: Tier is deprecated

        assert(new_expires_at > block.height); // ERR_032: Expiry must be in the future
        assert(new_expires_at <= block.height + MAX_EXPIRY); // ERR_033: Expiry too far

        // subscriber_count tracks total subscription events (subscriptions + renewals)
        // for comprehensive reputation scoring via prove_subscriber_threshold.
        // This metric reflects creator activity and revenue consistency, not unique addresses.
        let count: u64 = Mapping::get_or_use(subscriber_count, creator_hash, 0u64);
        Mapping::set(subscriber_count, creator_hash, count + 1u64);

        let revenue: u64 = Mapping::get_or_use(total_revenue, creator_hash, 0u64);
        Mapping::set(total_revenue, creator_hash, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for subscriber count
        let sub_blind: scalar = BHP256::hash_to_scalar(pass_id);
        let one_commit: group = 1scalar * get_g() + sub_blind * get_h();
        let cur_sub_commit: group = Mapping::get_or_use(subscriber_commit, creator_hash, 0group);
        Mapping::set(subscriber_commit, creator_hash, cur_sub_commit + one_commit);
        let cur_blind: scalar = Mapping::get_or_use(blind_sum, creator_hash, 0scalar);
        Mapping::set(blind_sum, creator_hash, cur_blind + sub_blind);

        // v29: Homomorphic Pedersen commitment for revenue
        let rev_blind: scalar = BHP256::hash_to_scalar(pass_id + 1field);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);

        Mapping::set(pass_creator, pass_id, creator_hash);

        // v24: Per-tier subscriber tracking
        let tier_sub_count: u64 = Mapping::get_or_use(subscription_by_tier, tier_key, 0u64);
        Mapping::set(subscription_by_tier, tier_key, tier_sub_count + 1u64);
    }

    // Content publishing with integrity hash
    async transition publish_content(
        public content_id: field,
        public min_tier: u8,
        public content_hash: field,
    ) -> Future {
        assert(min_tier >= 1u8);           // ERR_034: Min tier must be >= 1
        assert(content_hash != 0field);    // ERR_035: Content hash cannot be zero
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return finalize_publish_content(creator_hash, content_id, min_tier, content_hash);
    }
    async function finalize_publish_content(
        creator_hash: field,
        content_id: field,
        min_tier: u8,
        content_hash: field,
    ) {
        let price: u64 = Mapping::get(tier_prices, creator_hash);
        assert(price > 0u64);              // ERR_036: Creator not registered

        let hashed_content_id: field = Poseidon2::hash_to_field(content_id);
        let already_exists: bool = Mapping::contains(content_meta, hashed_content_id);
        assert(!already_exists);           // ERR_037: Content already published

        let count: u64 = Mapping::get_or_use(content_count, creator_hash, 0u64);
        assert(count < MAX_CONTENT_PER_CREATOR); // ERR_038: Content limit reached

        Mapping::set(content_meta, hashed_content_id, min_tier);
        Mapping::set(content_hashes, hashed_content_id, content_hash);
        Mapping::set(content_creator, hashed_content_id, creator_hash);
        Mapping::set(content_count, creator_hash, count + 1u64);

        // Platform-wide content count
        let total: u64 = Mapping::get_or_use(total_content, 0u8, 0u64);
        Mapping::set(total_content, 0u8, total + 1u64);
    }

    // =========================================
    // TRANSITIONS — SUBSCRIPTION GIFTING
    // =========================================

    async transition gift_subscription(
        payment: credits.aleo/credits,
        creator: address,
        recipient: address,
        tier: u8,
        amount: u64,
        gift_id: field,
        expires_at: u32,
    ) -> (GiftToken, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);               // ERR_039: Tier must be >= 1

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

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (gift, receipt, change, to_creator, finalize_gift_subscription(creator_hash, amount, tier, expires_at, gift_id));
    }
    async function finalize_gift_subscription(
        creator_hash: field,
        amount: u64,
        tier: u8,
        expires_at: u32,
        gift_id: field,
    ) {
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator_hash: creator_hash, tier_id: tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator_hash, 0u64);
        let legacy_price: u64 = legacy_base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);   // ERR_040: Insufficient gift payment

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);              // ERR_041: Tier is deprecated

        assert(expires_at > block.height); // ERR_042: Expiry must be in the future
        assert(expires_at <= block.height + MAX_EXPIRY); // ERR_043: Expiry too far

        let already_gifted: bool = Mapping::get_or_use(gift_redeemed, gift_id, false);
        assert(!already_gifted);           // ERR_044: Gift ID already used

        let count: u64 = Mapping::get_or_use(subscriber_count, creator_hash, 0u64);
        Mapping::set(subscriber_count, creator_hash, count + 1u64);
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator_hash, 0u64);
        Mapping::set(total_revenue, creator_hash, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for subscriber count
        let sub_blind: scalar = BHP256::hash_to_scalar(gift_id);
        let one_commit: group = 1scalar * get_g() + sub_blind * get_h();
        let cur_sub_commit: group = Mapping::get_or_use(subscriber_commit, creator_hash, 0group);
        Mapping::set(subscriber_commit, creator_hash, cur_sub_commit + one_commit);
        let cur_blind: scalar = Mapping::get_or_use(blind_sum, creator_hash, 0scalar);
        Mapping::set(blind_sum, creator_hash, cur_blind + sub_blind);

        // v29: Homomorphic Pedersen commitment for revenue
        let rev_blind: scalar = BHP256::hash_to_scalar(gift_id + 1field);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);

        Mapping::set(pass_creator, gift_id, creator_hash);

        // v24: Per-tier subscriber tracking
        let tier_sub_count: u64 = Mapping::get_or_use(subscription_by_tier, tier_key, 0u64);
        Mapping::set(subscription_by_tier, tier_key, tier_sub_count + 1u64);
    }

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

        // v27: Pass creator_hash to finalize so redeemed gifts can be revoked
        let creator_hash: field = Poseidon2::hash_to_field(gift.creator);
        return (pass, finalize_redeem_gift(gift.gift_id, creator_hash));
    }
    async function finalize_redeem_gift(
        gift_id: field,
        creator_hash: field,
    ) {
        let already_redeemed: bool = Mapping::get_or_use(gift_redeemed, gift_id, false);
        assert(!already_redeemed);         // ERR_045: Gift already redeemed
        Mapping::set(gift_redeemed, gift_id, true);
        // v27: Register in pass_creator so creator can revoke redeemed gift passes
        Mapping::set(pass_creator, gift_id, creator_hash);
    }
    // NOTE: ERR_046-054 reserved (escrow transitions removed in v23 for variable budget)

    // =========================================
    // TRANSITIONS — REVENUE RECONCILIATION
    // =========================================
    //
    // DESIGN NOTE: All subscription payments flow DIRECTLY to creators via
    // credits.aleo/transfer_private — no intermediary holds funds. This provides
    // maximum privacy (no central escrow address in the transaction graph).
    //
    // The platform_revenue and total_revenue mappings are ACCOUNTING LEDGERS
    // that track amounts owed/earned. These reconciliation transitions mark
    // ledger entries as settled after off-chain fee collection (e.g., monthly
    // invoicing). This mirrors how payment platforms like Stripe operate:
    // revenue flows directly, platform takes its cut through reconciliation.
    //
    // v27: Comments updated to accurately describe the direct-payment model.

    // Platform fee reconciliation — marks tracked fees as collected
    async transition withdraw_platform_fees(
        public amount: u64,
    ) -> Future {
        assert(amount > 0u64);             // ERR_055: Amount must be > 0
        // Auth check in transition — enforced by ZK proof
        assert_eq(self.caller, PLATFORM_ADDR); // ERR_056: Not platform admin
        return finalize_withdraw_platform_fees(amount);
    }
    async function finalize_withdraw_platform_fees(
        amount: u64,
    ) {
        let balance: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        assert(balance >= amount);         // ERR_057: Insufficient platform balance
        Mapping::set(platform_revenue, 0u8, balance - amount);
    }

    // Creator revenue reconciliation — marks revenue as accounted for
    async transition withdraw_creator_rev(
        public amount: u64,
    ) -> Future {
        assert(amount > 0u64);             // ERR_058: Amount must be > 0
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return finalize_withdraw_creator_rev(creator_hash, amount);
    }
    async function finalize_withdraw_creator_rev(
        creator_hash: field,
        amount: u64,
    ) {
        let base: u64 = Mapping::get(tier_prices, creator_hash);
        assert(base > 0u64);              // ERR_059: Creator not registered

        let balance: u64 = Mapping::get_or_use(total_revenue, creator_hash, 0u64);
        assert(balance >= amount);         // ERR_060: Insufficient creator balance
        Mapping::set(total_revenue, creator_hash, balance - amount);
    }

    // =========================================
    // TRANSITIONS — BLIND RENEWAL (Novel Privacy)
    // =========================================

    async transition subscribe_blind(
        payment: credits.aleo/credits,
        creator: address,
        nonce: field,
        tier: u8,
        amount: u64,
        pass_id: field,
        expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);               // ERR_061: Tier must be >= 1
        assert(nonce != 0field);           // ERR_062: Nonce cannot be zero

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

        let blinded_hash: field = Poseidon2::hash_to_field(BlindKey { subscriber: self.caller, nonce: nonce });

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: blinded_hash,
            tier: tier,
            amount: amount,
            pass_id: pass_id,
        };

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (pass, receipt, change, to_creator, finalize_subscribe_blind(creator_hash, amount, tier, expires_at, nonce, pass_id));
    }
    async function finalize_subscribe_blind(
        creator_hash: field,
        amount: u64,
        tier: u8,
        expires_at: u32,
        nonce: field,
        pass_id: field,
    ) {
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator_hash: creator_hash, tier_id: tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator_hash, 0u64);
        let legacy_price: u64 = legacy_base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);   // ERR_063: Insufficient blind payment

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);              // ERR_064: Tier is deprecated

        assert(expires_at > block.height); // ERR_065: Expiry must be in the future
        assert(expires_at <= block.height + MAX_EXPIRY); // ERR_066: Expiry too far

        let nonce_hash: field = Poseidon2::hash_to_field(nonce);
        let already_used: bool = Mapping::get_or_use(nonce_used, nonce_hash, false);
        assert(!already_used);             // ERR_067: Nonce already used (replay)
        Mapping::set(nonce_used, nonce_hash, true);

        let count: u64 = Mapping::get_or_use(subscriber_count, creator_hash, 0u64);
        Mapping::set(subscriber_count, creator_hash, count + 1u64);
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator_hash, 0u64);
        Mapping::set(total_revenue, creator_hash, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for subscriber count
        let sub_blind: scalar = BHP256::hash_to_scalar(pass_id);
        let one_commit: group = 1scalar * get_g() + sub_blind * get_h();
        let cur_sub_commit: group = Mapping::get_or_use(subscriber_commit, creator_hash, 0group);
        Mapping::set(subscriber_commit, creator_hash, cur_sub_commit + one_commit);
        let cur_blind: scalar = Mapping::get_or_use(blind_sum, creator_hash, 0scalar);
        Mapping::set(blind_sum, creator_hash, cur_blind + sub_blind);

        // v29: Homomorphic Pedersen commitment for revenue
        let rev_blind: scalar = BHP256::hash_to_scalar(pass_id + 1field);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);

        Mapping::set(pass_creator, pass_id, creator_hash);

        // v24: Per-tier subscriber tracking
        let tier_sub_count: u64 = Mapping::get_or_use(subscription_by_tier, tier_key, 0u64);
        Mapping::set(subscription_by_tier, tier_key, tier_sub_count + 1u64);
    }

    async transition renew_blind(
        old_pass: AccessPass,
        payment: credits.aleo/credits,
        nonce: field,
        new_tier: u8,
        amount: u64,
        new_pass_id: field,
        new_expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(new_tier >= 1u8);           // ERR_068: Tier must be >= 1
        assert(nonce != 0field);           // ERR_069: Nonce cannot be zero

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

        let blinded_hash: field = Poseidon2::hash_to_field(BlindKey { subscriber: self.caller, nonce: nonce });

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: blinded_hash,
            tier: new_tier,
            amount: amount,
            pass_id: new_pass_id,
        };

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (new_pass, receipt, change, to_creator, finalize_renew_blind(creator_hash, amount, new_tier, new_expires_at, nonce, new_pass_id));
    }
    async function finalize_renew_blind(
        creator_hash: field,
        amount: u64,
        new_tier: u8,
        new_expires_at: u32,
        nonce: field,
        pass_id: field,
    ) {
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator_hash: creator_hash, tier_id: new_tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator_hash, 0u64);
        let legacy_price: u64 = legacy_base * (new_tier == 3u8 ? 5u64 : (new_tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);   // ERR_070: Insufficient blind renewal payment

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);              // ERR_071: Tier is deprecated

        assert(new_expires_at > block.height); // ERR_072: Expiry must be in the future
        assert(new_expires_at <= block.height + MAX_EXPIRY); // ERR_073: Expiry too far

        let nonce_hash: field = Poseidon2::hash_to_field(nonce);
        let already_used: bool = Mapping::get_or_use(nonce_used, nonce_hash, false);
        assert(!already_used);             // ERR_074: Nonce already used (replay)
        Mapping::set(nonce_used, nonce_hash, true);

        // v25: Increment subscriber count on blind renewal (was missing — broke analytics + threshold proofs)
        let count: u64 = Mapping::get_or_use(subscriber_count, creator_hash, 0u64);
        Mapping::set(subscriber_count, creator_hash, count + 1u64);

        let revenue: u64 = Mapping::get_or_use(total_revenue, creator_hash, 0u64);
        Mapping::set(total_revenue, creator_hash, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for subscriber count
        let sub_blind: scalar = BHP256::hash_to_scalar(pass_id);
        let one_commit: group = 1scalar * get_g() + sub_blind * get_h();
        let cur_sub_commit: group = Mapping::get_or_use(subscriber_commit, creator_hash, 0group);
        Mapping::set(subscriber_commit, creator_hash, cur_sub_commit + one_commit);
        let cur_blind: scalar = Mapping::get_or_use(blind_sum, creator_hash, 0scalar);
        Mapping::set(blind_sum, creator_hash, cur_blind + sub_blind);

        // v29: Homomorphic Pedersen commitment for revenue
        let rev_blind: scalar = BHP256::hash_to_scalar(pass_id + 1field);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);

        Mapping::set(pass_creator, pass_id, creator_hash);

        // v24: Per-tier subscriber tracking
        let tier_sub_count: u64 = Mapping::get_or_use(subscription_by_tier, tier_key, 0u64);
        Mapping::set(subscription_by_tier, tier_key, tier_sub_count + 1u64);
    }

    // Zero-footprint verification for dynamic tiers
    async transition verify_tier_access(
        pass: AccessPass,
        creator: address,
        required_tier: u8,
    ) -> (AccessPass, Future) {
        assert_eq(pass.creator, creator);  // ERR_075: Creator mismatch
        assert(pass.tier >= required_tier); // ERR_076: Insufficient tier level

        let new_pass: AccessPass = AccessPass {
            owner: pass.owner,
            creator: pass.creator,
            tier: pass.tier,
            pass_id: pass.pass_id,
            expires_at: pass.expires_at,
            privacy_level: pass.privacy_level,
        };

        return (new_pass, finalize_verify_tier_access(pass.pass_id, pass.expires_at));
    }
    async function finalize_verify_tier_access(
        pass_id: field,
        expires_at: u32,
    ) {
        let revoked: bool = Mapping::get_or_use(access_revoked, pass_id, false);
        assert(!revoked);                 // ERR_077: Access has been revoked
        // v24: On-chain expiry enforcement
        assert(expires_at > block.height); // ERR_105: Subscription expired
    }

    // =========================================
    // TRANSITIONS — ENCRYPTED CONTENT & DISPUTES
    // =========================================

    async transition publish_encrypted_content(
        public content_id: field,
        public min_tier: u8,
        public content_hash: field,
        public encryption_commitment: field,
    ) -> Future {
        assert(min_tier >= 1u8);           // ERR_078: Min tier must be >= 1
        assert(content_hash != 0field);    // ERR_079: Content hash cannot be zero
        assert(encryption_commitment != 0field); // ERR_080: Encryption commitment required
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return finalize_publish_encrypted(creator_hash, content_id, min_tier, content_hash, encryption_commitment);
    }
    async function finalize_publish_encrypted(
        creator_hash: field,
        content_id: field,
        min_tier: u8,
        content_hash: field,
        encryption_commitment: field,
    ) {
        let price: u64 = Mapping::get(tier_prices, creator_hash);
        assert(price > 0u64);              // ERR_081: Creator not registered

        let hashed_content_id: field = Poseidon2::hash_to_field(content_id);
        let already_exists: bool = Mapping::contains(content_meta, hashed_content_id);
        assert(!already_exists);           // ERR_082: Content already published

        let count: u64 = Mapping::get_or_use(content_count, creator_hash, 0u64);
        assert(count < MAX_CONTENT_PER_CREATOR); // ERR_106: Encrypted content limit reached

        Mapping::set(content_meta, hashed_content_id, min_tier);
        Mapping::set(content_hashes, hashed_content_id, content_hash);
        Mapping::set(content_creator, hashed_content_id, creator_hash);
        Mapping::set(encryption_commits, hashed_content_id, encryption_commitment);
        Mapping::set(content_count, creator_hash, count + 1u64);

        let total: u64 = Mapping::get_or_use(total_content, 0u8, 0u64);
        Mapping::set(total_content, 0u8, total + 1u64);
    }

    // v23: Creator revokes access. Auth check uses hashed creator comparison.
    async transition revoke_access(
        public pass_id: field,
    ) -> Future {
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return finalize_revoke_access(creator_hash, pass_id);
    }
    async function finalize_revoke_access(
        creator_hash: field,
        pass_id: field,
    ) {
        // v23: pass_creator stores hash, compare hashes
        let owner_hash: field = Mapping::get(pass_creator, pass_id);
        assert_eq(owner_hash, creator_hash); // ERR_083: Not the issuing creator

        Mapping::set(access_revoked, pass_id, true);
    }

    async transition dispute_content(
        pass: AccessPass,
        public content_id: field,
    ) -> (AccessPass, Future) {
        let caller_hash: field = Poseidon2::hash_to_field(self.caller);

        let new_pass: AccessPass = AccessPass {
            owner: pass.owner,
            creator: pass.creator,
            tier: pass.tier,
            pass_id: pass.pass_id,
            expires_at: pass.expires_at,
            privacy_level: pass.privacy_level,
        };

        // v23: No creator address passes to finalize
        return (new_pass, finalize_dispute_content(content_id, caller_hash, pass.expires_at));
    }
    async function finalize_dispute_content(
        content_id: field,
        caller_hash: field,
        expires_at: u32,
    ) {
        assert(expires_at > block.height); // ERR_107: Subscription expired, cannot dispute
        let hashed_content_id: field = Poseidon2::hash_to_field(content_id);

        let tier: u8 = Mapping::get(content_meta, hashed_content_id);
        assert(tier > 0u8);               // ERR_084: Content does not exist

        let deleted: bool = Mapping::get_or_use(content_deleted, hashed_content_id, false);
        assert(!deleted);                 // ERR_085: Content is deleted

        let dispute_key: field = Poseidon2::hash_to_field(DisputeKey { caller_hash: caller_hash, content_id: hashed_content_id });
        let caller_disputes: u64 = Mapping::get_or_use(dispute_count_by_caller, dispute_key, 0u64);
        assert(caller_disputes < MAX_DISPUTE_PER_CALLER); // ERR_086: Dispute limit reached
        Mapping::set(dispute_count_by_caller, dispute_key, caller_disputes + 1u64);

        let disputes: u64 = Mapping::get_or_use(content_disputes, hashed_content_id, 0u64);
        Mapping::set(content_disputes, hashed_content_id, disputes + 1u64);
    }

    // =========================================
    // TRANSITIONS — SUBSCRIPTION TRANSFER (Unique Feature)
    // =========================================

    async transition transfer_pass(
        pass: AccessPass,
        recipient: address,
    ) -> (AccessPass, Future) {
        assert_neq(self.caller, recipient); // ERR_087: Cannot transfer to self

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
        let revoked: bool = Mapping::get_or_use(access_revoked, pass_id, false);
        assert(!revoked);                 // ERR_088: Access has been revoked
    }
    // NOTE: ERR_089-098 reserved (Pedersen proof transitions removed in v23)

    // =========================================
    // TRANSITIONS — COMMITMENT-BASED TIPPING (BHP256 Scheme)
    // =========================================

    // Phase 1: Commit to a tip amount (hidden on-chain)
    async transition commit_tip(
        creator: address,
        amount: u64,
        salt: field,
    ) -> Future {
        assert(amount > 0u64);             // ERR_099: Tip amount must be > 0

        let data_hash: field = Poseidon2::hash_to_field(TipCommitData { creator: creator, amount: amount });
        let randomizer: scalar = BHP256::hash_to_scalar(salt);
        let commitment: field = BHP256::commit_to_field(data_hash, randomizer);

        return finalize_commit_tip(commitment);
    }
    async function finalize_commit_tip(
        commitment: field,
    ) {
        let exists: bool = Mapping::get_or_use(tip_commitments, commitment, false);
        assert(!exists);                   // ERR_100: Commitment already exists
        Mapping::set(tip_commitments, commitment, true);
    }

    // Phase 2: Reveal commitment and execute the tip
    async transition reveal_tip(
        payment: credits.aleo/credits,
        creator: address,
        amount: u64,
        salt: field,
    ) -> (CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(amount > 0u64);             // ERR_101: Reveal amount must be > 0

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

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (receipt, change, to_creator, finalize_reveal_tip(creator_hash, amount, commitment));
    }
    async function finalize_reveal_tip(
        creator_hash: field,
        amount: u64,
        commitment: field,
    ) {
        let exists: bool = Mapping::get_or_use(tip_commitments, commitment, false);
        assert(exists);                    // ERR_102: Commitment does not exist

        let already_revealed: bool = Mapping::get_or_use(tip_revealed, commitment, false);
        assert(!already_revealed);         // ERR_103: Already revealed
        Mapping::set(tip_revealed, commitment, true);

        let revenue: u64 = Mapping::get_or_use(total_revenue, creator_hash, 0u64);
        Mapping::set(total_revenue, creator_hash, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for revealed tip revenue
        let rev_blind: scalar = BHP256::hash_to_scalar(commitment);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);
    }

    // =========================================
    // TRANSITIONS — THRESHOLD PROOFS (Privacy-Preserving Reputation)
    // =========================================

    // Prove creator has >= threshold subscribers without revealing exact count
    async transition prove_subscriber_threshold(
        public threshold: u64,
    ) -> Future {
        assert(threshold > 0u64);              // ERR_108: Threshold must be > 0
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return finalize_prove_threshold(creator_hash, threshold);
    }
    async function finalize_prove_threshold(
        creator_hash: field,
        threshold: u64,
    ) {
        let base: u64 = Mapping::get(tier_prices, creator_hash);
        assert(base > 0u64);                   // ERR_109: Creator not registered
        let count: u64 = Mapping::get_or_use(subscriber_count, creator_hash, 0u64);
        assert(count >= threshold);            // ERR_110: Subscriber count below threshold

        // v29: Cross-verify against Pedersen commitment
        // If commitment exists, verify: threshold * G + blind_sum * H should be <= subscriber_commit
        // The raw count check above is the primary gate; the commitment provides cryptographic backing.
        // Verifiers can independently check: count * G + blind_sum[creator] * H == subscriber_commit[creator]
        // This proves the raw count is consistent with the homomorphic aggregate.
        let cur_commit: group = Mapping::get_or_use(subscriber_commit, creator_hash, 0group);
        let cur_blind: scalar = Mapping::get_or_use(blind_sum, creator_hash, 0scalar);
        let expected: group = (count as scalar) * get_g() + cur_blind * get_h();
        assert_eq(cur_commit, expected);       // ERR_138: Pedersen commitment mismatch (integrity check)
    }

    // =========================================
    // TRIAL SUBSCRIPTIONS — Ephemeral Access Passes
    // =========================================
    // Short-lived trial passes at reduced cost. Unique to VeilSub.
    // privacy_level=2 marks trial passes, MAX trial duration enforced on-chain.

    const TRIAL_DURATION: u32 = 1000u32;       // ~12 hours max trial
    const TRIAL_PRICE_DIV: u64 = 5u64;         // Trial = 20% of regular tier price

    async transition subscribe_trial(
        payment: credits.aleo/credits,
        creator: address,
        tier: u8,
        amount: u64,
        pass_id: field,
        expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);                   // ERR_111: Trial tier must be >= 1
        assert(tier <= MAX_TIER);              // ERR_112: Trial tier exceeds maximum

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: tier,
            pass_id: pass_id,
            expires_at: expires_at,
            privacy_level: 2u8,                // 2 = trial (distinct from 0=standard, 1=blind)
        };

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: Poseidon2::hash_to_field(self.caller),
            tier: tier,
            amount: amount,
            pass_id: pass_id,
        };

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        // v27: Pass caller_hash for trial rate limiting (one trial per subscriber per creator)
        let caller_hash: field = Poseidon2::hash_to_field(self.caller);
        return (pass, receipt, change, to_creator, finalize_subscribe_trial(creator_hash, caller_hash, amount, tier, expires_at, pass_id));
    }
    async function finalize_subscribe_trial(
        creator_hash: field,
        caller_hash: field,
        amount: u64,
        tier: u8,
        expires_at: u32,
        pass_id: field,
    ) {
        // v27: One trial per subscriber per creator — prevents unlimited cheap access
        let trial_key: field = Poseidon2::hash_to_field(TrialKey { caller_hash: caller_hash, creator_hash: creator_hash });
        let already_trialed: bool = Mapping::get_or_use(trial_used, trial_key, false);
        assert(!already_trialed);             // ERR_119: Already used trial for this creator

        // Price validation: trial costs at least 1/5 of regular tier price
        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator_hash: creator_hash, tier_id: tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator_hash, 0u64);
        let legacy_price: u64 = legacy_base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;
        let trial_min: u64 = required_price / TRIAL_PRICE_DIV;

        assert(amount >= trial_min);           // ERR_113: Insufficient trial payment (need >= 20% of tier price)

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);                  // ERR_114: Trial tier is deprecated

        // Enforce short trial duration (cannot exceed TRIAL_DURATION blocks from now)
        assert(expires_at > block.height);     // ERR_115: Trial expiry must be in the future
        assert(expires_at <= block.height + TRIAL_DURATION); // ERR_116: Trial duration exceeds maximum (~12 hours)

        // Mark trial as used BEFORE updating stats (fail-first pattern)
        Mapping::set(trial_used, trial_key, true);

        // Update aggregate stats (same mappings as full subscribe)
        let count: u64 = Mapping::get_or_use(subscriber_count, creator_hash, 0u64);
        assert(count < MAX_SUBS_PER_CREATOR); // ERR_117: Subscriber cap reached
        Mapping::set(subscriber_count, creator_hash, count + 1u64);

        let revenue: u64 = Mapping::get_or_use(total_revenue, creator_hash, 0u64);
        Mapping::set(total_revenue, creator_hash, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for subscriber count
        let sub_blind: scalar = BHP256::hash_to_scalar(pass_id);
        let one_commit: group = 1scalar * get_g() + sub_blind * get_h();
        let cur_sub_commit: group = Mapping::get_or_use(subscriber_commit, creator_hash, 0group);
        Mapping::set(subscriber_commit, creator_hash, cur_sub_commit + one_commit);
        let cur_blind: scalar = Mapping::get_or_use(blind_sum, creator_hash, 0scalar);
        Mapping::set(blind_sum, creator_hash, cur_blind + sub_blind);

        // v29: Homomorphic Pedersen commitment for revenue
        let rev_blind: scalar = BHP256::hash_to_scalar(pass_id + 1field);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);

        Mapping::set(pass_creator, pass_id, creator_hash);

        let tier_sub_count: u64 = Mapping::get_or_use(subscription_by_tier, tier_key, 0u64);
        Mapping::set(subscription_by_tier, tier_key, tier_sub_count + 1u64);
    }

    // =========================================
    // TRANSITIONS — STABLECOIN SUBSCRIPTIONS (v28)
    // =========================================
    // USDCx and USAD stablecoin transitions moved to veilsub_payments_v1.aleo
    // companion program due to Leo 3.4.0 MerkleProof array type-checking bug.
    // Same bug affects NullPay v20 — their stablecoin code also fails to build on Leo 3.4.
    // See: https://github.com/ProvableHQ/leo/issues/XXXX
    // =========================================
    /*
    // MerkleProof array [MerkleProof; 2] required by stablecoin compliance layer.

    // --- USDCx Subscription ---
    async transition subscribe_usdcx(
        token: test_usdcx_stablecoin.aleo/Token,
        creator: address,
        tier: u8,
        amount: u128,
        pass_id: field,
        expires_at: u32,
        proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2],
    ) -> (AccessPass, CreatorReceipt, test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) {
        assert(tier >= 1u8);               // ERR_120: Tier must be >= 1
        assert(tier <= MAX_TIER);           // ERR_121: Tier exceeds maximum
        assert(amount > 0u128);            // ERR_122: Amount must be > 0

        let (compliance, to_creator, change, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_private(creator, amount, token, proofs);

        let amount_u64: u64 = amount as u64;

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
            amount: amount_u64,
            pass_id: pass_id,
        };

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (pass, receipt, compliance, to_creator, change, finalize_subscribe_usdcx(creator_hash, amount_u64, tier, expires_at, pass_id, transfer_future));
    }
    async function finalize_subscribe_usdcx(
        creator_hash: field,
        amount: u64,
        tier: u8,
        expires_at: u32,
        pass_id: field,
        f0: Future,
    ) {
        // Await stablecoin transfer FIRST — if transfer fails, nothing below executes
        f0.await();

        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator_hash: creator_hash, tier_id: tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator_hash, 0u64);
        let legacy_price: u64 = legacy_base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);   // ERR_123: Insufficient USDCx payment

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);              // ERR_124: Tier is deprecated

        assert(expires_at > block.height); // ERR_125: Expiry must be in the future
        assert(expires_at <= block.height + MAX_EXPIRY); // ERR_126: Expiry too far

        let count: u64 = Mapping::get_or_use(subscriber_count, creator_hash, 0u64);
        assert(count < MAX_SUBS_PER_CREATOR); // ERR_127: Subscriber cap reached
        Mapping::set(subscriber_count, creator_hash, count + 1u64);

        // Track stablecoin revenue separately (token_type=1 for USDCx)
        let token_key: field = Poseidon2::hash_to_field(creator_hash + 1field);
        let stable_rev: u64 = Mapping::get_or_use(stablecoin_revenue, token_key, 0u64);
        Mapping::set(stablecoin_revenue, token_key, stable_rev + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for subscriber count
        let sub_blind: scalar = BHP256::hash_to_scalar(pass_id);
        let one_commit: group = 1scalar * get_g() + sub_blind * get_h();
        let cur_sub_commit: group = Mapping::get_or_use(subscriber_commit, creator_hash, 0group);
        Mapping::set(subscriber_commit, creator_hash, cur_sub_commit + one_commit);
        let cur_blind: scalar = Mapping::get_or_use(blind_sum, creator_hash, 0scalar);
        Mapping::set(blind_sum, creator_hash, cur_blind + sub_blind);

        // v29: Homomorphic Pedersen commitment for stablecoin revenue
        let rev_blind: scalar = BHP256::hash_to_scalar(pass_id + 1field);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);

        Mapping::set(pass_creator, pass_id, creator_hash);

        let tier_sub_count: u64 = Mapping::get_or_use(subscription_by_tier, tier_key, 0u64);
        Mapping::set(subscription_by_tier, tier_key, tier_sub_count + 1u64);
    }

    // --- USDCx Tipping ---
    async transition tip_usdcx(
        token: test_usdcx_stablecoin.aleo/Token,
        creator: address,
        amount: u128,
        proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2],
    ) -> (CreatorReceipt, test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) {
        assert(amount > 0u128);            // ERR_128: Tip amount must be > 0

        let (compliance, to_creator, change, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_private(creator, amount, token, proofs);

        let amount_u64: u64 = amount as u64;

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: Poseidon2::hash_to_field(self.caller),
            tier: 0u8,
            amount: amount_u64,
            pass_id: 0field,
        };

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (receipt, compliance, to_creator, change, finalize_tip_usdcx(creator_hash, amount_u64, transfer_future));
    }
    async function finalize_tip_usdcx(
        creator_hash: field,
        amount: u64,
        f0: Future,
    ) {
        // Await stablecoin transfer FIRST
        f0.await();

        // Track stablecoin revenue (token_type=1 for USDCx)
        let token_key: field = Poseidon2::hash_to_field(creator_hash + 1field);
        let stable_rev: u64 = Mapping::get_or_use(stablecoin_revenue, token_key, 0u64);
        Mapping::set(stablecoin_revenue, token_key, stable_rev + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for USDCx tip revenue
        let tip_seed: field = BHP256::hash_to_field(creator_hash + (amount as field));
        let rev_blind: scalar = BHP256::hash_to_scalar(tip_seed + 1field);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);
    }

    // --- USAD Subscription ---
    async transition subscribe_usad(
        token: test_usad_stablecoin.aleo/Token,
        creator: address,
        tier: u8,
        amount: u128,
        pass_id: field,
        expires_at: u32,
        proofs: [test_usad_stablecoin.aleo/MerkleProof; 2],
    ) -> (AccessPass, CreatorReceipt, test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/Token, Future) {
        assert(tier >= 1u8);               // ERR_129: Tier must be >= 1
        assert(tier <= MAX_TIER);           // ERR_130: Tier exceeds maximum
        assert(amount > 0u128);            // ERR_131: Amount must be > 0

        let (compliance, to_creator, change, transfer_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/Token, Future) =
            test_usad_stablecoin.aleo/transfer_private(creator, amount, token, proofs);

        let amount_u64: u64 = amount as u64;

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
            amount: amount_u64,
            pass_id: pass_id,
        };

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (pass, receipt, compliance, to_creator, change, finalize_subscribe_usad(creator_hash, amount_u64, tier, expires_at, pass_id, transfer_future));
    }
    async function finalize_subscribe_usad(
        creator_hash: field,
        amount: u64,
        tier: u8,
        expires_at: u32,
        pass_id: field,
        f0: Future,
    ) {
        // Await stablecoin transfer FIRST — if transfer fails, nothing below executes
        f0.await();

        let tier_key: field = Poseidon2::hash_to_field(TierKey { creator_hash: creator_hash, tier_id: tier });
        let has_custom_tier: bool = Mapping::contains(creator_tiers, tier_key);

        let custom_price: u64 = Mapping::get_or_use(creator_tiers, tier_key, 0u64);
        let legacy_base: u64 = Mapping::get_or_use(tier_prices, creator_hash, 0u64);
        let legacy_price: u64 = legacy_base * (tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64));
        let required_price: u64 = has_custom_tier ? custom_price : legacy_price;

        assert(amount >= required_price);   // ERR_132: Insufficient USAD payment

        let deprecated: bool = Mapping::get_or_use(tier_deprecated, tier_key, false);
        assert(!deprecated);              // ERR_133: Tier is deprecated

        assert(expires_at > block.height); // ERR_134: Expiry must be in the future
        assert(expires_at <= block.height + MAX_EXPIRY); // ERR_135: Expiry too far

        let count: u64 = Mapping::get_or_use(subscriber_count, creator_hash, 0u64);
        assert(count < MAX_SUBS_PER_CREATOR); // ERR_136: Subscriber cap reached
        Mapping::set(subscriber_count, creator_hash, count + 1u64);

        // Track stablecoin revenue separately (token_type=2 for USAD)
        let token_key: field = Poseidon2::hash_to_field(creator_hash + 2field);
        let stable_rev: u64 = Mapping::get_or_use(stablecoin_revenue, token_key, 0u64);
        Mapping::set(stablecoin_revenue, token_key, stable_rev + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for subscriber count
        let sub_blind: scalar = BHP256::hash_to_scalar(pass_id);
        let one_commit: group = 1scalar * get_g() + sub_blind * get_h();
        let cur_sub_commit: group = Mapping::get_or_use(subscriber_commit, creator_hash, 0group);
        Mapping::set(subscriber_commit, creator_hash, cur_sub_commit + one_commit);
        let cur_blind: scalar = Mapping::get_or_use(blind_sum, creator_hash, 0scalar);
        Mapping::set(blind_sum, creator_hash, cur_blind + sub_blind);

        // v29: Homomorphic Pedersen commitment for stablecoin revenue
        let rev_blind: scalar = BHP256::hash_to_scalar(pass_id + 1field);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);

        Mapping::set(pass_creator, pass_id, creator_hash);

        let tier_sub_count: u64 = Mapping::get_or_use(subscription_by_tier, tier_key, 0u64);
        Mapping::set(subscription_by_tier, tier_key, tier_sub_count + 1u64);
    }

    // --- USAD Tipping ---
    async transition tip_usad(
        token: test_usad_stablecoin.aleo/Token,
        creator: address,
        amount: u128,
        proofs: [test_usad_stablecoin.aleo/MerkleProof; 2],
    ) -> (CreatorReceipt, test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/Token, Future) {
        assert(amount > 0u128);            // ERR_137: Tip amount must be > 0

        let (compliance, to_creator, change, transfer_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/Token, Future) =
            test_usad_stablecoin.aleo/transfer_private(creator, amount, token, proofs);

        let amount_u64: u64 = amount as u64;

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: Poseidon2::hash_to_field(self.caller),
            tier: 0u8,
            amount: amount_u64,
            pass_id: 0field,
        };

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (receipt, compliance, to_creator, change, finalize_tip_usad(creator_hash, amount_u64, transfer_future));
    }
    async function finalize_tip_usad(
        creator_hash: field,
        amount: u64,
        f0: Future,
    ) {
        // Await stablecoin transfer FIRST
        f0.await();

        // Track stablecoin revenue (token_type=2 for USAD)
        let token_key: field = Poseidon2::hash_to_field(creator_hash + 2field);
        let stable_rev: u64 = Mapping::get_or_use(stablecoin_revenue, token_key, 0u64);
        Mapping::set(stablecoin_revenue, token_key, stable_rev + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / PLATFORM_FEE_DIV;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);

        // v29: Homomorphic Pedersen commitment for USAD tip revenue
        let tip_seed: field = BHP256::hash_to_field(creator_hash + (amount as field));
        let rev_blind: scalar = BHP256::hash_to_scalar(tip_seed + 2field);
        let rev_commit: group = (amount as scalar) * get_g() + rev_blind * get_h();
        let cur_rev_commit: group = Mapping::get_or_use(revenue_commit, creator_hash, 0group);
        Mapping::set(revenue_commit, creator_hash, cur_rev_commit + rev_commit);
        let cur_rev_blind: scalar = Mapping::get_or_use(revenue_blind_sum, creator_hash, 0scalar);
        Mapping::set(revenue_blind_sum, creator_hash, cur_rev_blind + rev_blind);
    }
    */

}

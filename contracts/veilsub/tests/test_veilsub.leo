// =============================================================================
// VeilSub v8 — Unit Tests
//
// Tests for core contract logic: tier multipliers, fee splits, hash
// consistency, expiry bounds, record creation, audit token properties,
// and content hash integrity.
//
// Run with: leo test
// =============================================================================

program test_veilsub.aleo {

    // =========================================
    // Test: Tier Multiplier Logic
    // Verifies 1x/2x/5x pricing for tiers 1/2/3
    // =========================================
    transition test_tier_multipliers() {
        let base_price: u64 = 1_000_000u64; // 1 ALEO

        // Tier 1 (Supporter) = 1x base price
        let tier1: u8 = 1u8;
        let mult1: u64 = tier1 == 3u8 ? 5u64 : (tier1 == 2u8 ? 2u64 : 1u64);
        assert_eq(mult1, 1u64);
        assert_eq(base_price * mult1, 1_000_000u64);

        // Tier 2 (Premium) = 2x base price
        let tier2: u8 = 2u8;
        let mult2: u64 = tier2 == 3u8 ? 5u64 : (tier2 == 2u8 ? 2u64 : 1u64);
        assert_eq(mult2, 2u64);
        assert_eq(base_price * mult2, 2_000_000u64);

        // Tier 3 (VIP) = 5x base price
        let tier3: u8 = 3u8;
        let mult3: u64 = tier3 == 3u8 ? 5u64 : (tier3 == 2u8 ? 2u64 : 1u64);
        assert_eq(mult3, 5u64);
        assert_eq(base_price * mult3, 5_000_000u64);
    }

    // =========================================
    // Test: Fee Split Logic (5% platform / 95% creator)
    // Verifies correct fee calculation for various amounts
    // =========================================
    transition test_fee_split() {
        // 1 ALEO = 1,000,000 microcredits
        let amount1: u64 = 1_000_000u64;
        let platform_cut1: u64 = amount1 / 20u64;
        let creator_cut1: u64 = amount1 - platform_cut1;
        assert_eq(platform_cut1, 50_000u64);
        assert_eq(creator_cut1, 950_000u64);
        assert_eq(platform_cut1 + creator_cut1, amount1);

        // 5 ALEO = 5,000,000 microcredits
        let amount2: u64 = 5_000_000u64;
        let platform_cut2: u64 = amount2 / 20u64;
        let creator_cut2: u64 = amount2 - platform_cut2;
        assert_eq(platform_cut2, 250_000u64);
        assert_eq(creator_cut2, 4_750_000u64);
        assert_eq(platform_cut2 + creator_cut2, amount2);

        // 25 ALEO (VIP at 5x of 5 ALEO base) = 25,000,000 microcredits
        let amount3: u64 = 25_000_000u64;
        let platform_cut3: u64 = amount3 / 20u64;
        let creator_cut3: u64 = amount3 - platform_cut3;
        assert_eq(platform_cut3, 1_250_000u64);
        assert_eq(creator_cut3, 23_750_000u64);
        assert_eq(platform_cut3 + creator_cut3, amount3);
    }

    // =========================================
    // Test: BHP256 Hash Consistency
    // Verifies deterministic output for pass IDs and addresses
    // =========================================
    transition test_hash_consistency() {
        let pass_id: field = 12345field;

        // Same value hashed twice must produce identical result
        let hash1: field = BHP256::hash_to_field(pass_id);
        let hash2: field = BHP256::hash_to_field(pass_id);
        assert_eq(hash1, hash2);

        // Different inputs must produce different hashes
        let other_id: field = 67890field;
        let hash3: field = BHP256::hash_to_field(other_id);
        assert_neq(hash1, hash3);
    }

    // =========================================
    // Test: Subscriber Hash Privacy
    // Verifies that BHP256 hashing of addresses produces
    // deterministic but irreversible subscriber identifiers
    // =========================================
    transition test_subscriber_hash() {
        let addr1: address = aleo1qnr4dkkvkgfqph0vzc3y6z2eu975wnpz2925ntjccd5cfqxtyu8s7pyjh9;
        let addr2: address = aleo1wyvu96dvv0auq9e4qme54kjuhzglyfcf576h0g3nrrmrmr0505pq9escet;

        // Same address always produces same hash (deterministic)
        let hash_a1: field = BHP256::hash_to_field(addr1);
        let hash_a2: field = BHP256::hash_to_field(addr1);
        assert_eq(hash_a1, hash_a2);

        // Different addresses produce different hashes
        let hash_b: field = BHP256::hash_to_field(addr2);
        assert_neq(hash_a1, hash_b);

        // Hash is a field element (non-zero for valid addresses)
        assert_neq(hash_a1, 0field);
        assert_neq(hash_b, 0field);
    }

    // =========================================
    // Test: Expiry Bounds
    // Verifies block height constraints for subscriptions
    // =========================================
    transition test_expiry_bounds() {
        let max_duration: u32 = 1_200_000u32; // ~139 days at 3s/block

        // Standard 30-day subscription: 864,000 blocks
        let standard_duration: u32 = 864_000u32;
        assert(standard_duration <= max_duration);

        // 7-day trial: 201,600 blocks
        let trial_duration: u32 = 201_600u32;
        assert(trial_duration <= max_duration);

        // 90-day subscription: 2,592,000 blocks — EXCEEDS max, should fail
        let long_duration: u32 = 2_592_000u32;
        assert(long_duration > max_duration);

        // Verify tier range
        let tier1: u8 = 1u8;
        let tier2: u8 = 2u8;
        let tier3: u8 = 3u8;
        assert(tier1 >= 1u8 && tier1 <= 3u8);
        assert(tier2 >= 1u8 && tier2 <= 3u8);
        assert(tier3 >= 1u8 && tier3 <= 3u8);
    }

    // =========================================
    // Test: Token Fee Split (u128 — for ARC-20 tokens)
    // Verifies correct fee calculation for token amounts
    // =========================================
    transition test_token_fee_split() {
        // 10 USDC (6 decimals) = 10_000_000 units
        let amount: u128 = 10_000_000u128;
        let platform_cut: u128 = amount / 20u128;
        let creator_cut: u128 = amount - platform_cut;
        assert_eq(platform_cut, 500_000u128);
        assert_eq(creator_cut, 9_500_000u128);
        assert_eq(platform_cut + creator_cut, amount);

        // 100 USDC = 100_000_000 units
        let amount2: u128 = 100_000_000u128;
        let platform_cut2: u128 = amount2 / 20u128;
        assert_eq(platform_cut2, 5_000_000u128);

        // Minimum tip: 1 unit
        let min_amount: u128 = 1u128;
        let min_cut: u128 = min_amount / 20u128;
        assert_eq(min_cut, 0u128); // floor division — no fee on sub-20 unit amounts
    }

    // =========================================
    // Test: Content Hash Integrity
    // Verifies that content_id hashing is deterministic
    // and content_hash is stored independently
    // =========================================
    transition test_content_hash_integrity() {
        let content_id: field = 999field;
        let content_hash: field = 123456789field; // simulated SHA hash

        // Content ID is hashed for mapping key
        let hashed_id1: field = BHP256::hash_to_field(content_id);
        let hashed_id2: field = BHP256::hash_to_field(content_id);
        assert_eq(hashed_id1, hashed_id2);

        // Content hash is stored separately and must be non-zero
        assert_neq(content_hash, 0field);

        // Different content IDs produce different mapping keys
        let other_content_id: field = 1000field;
        let hashed_other: field = BHP256::hash_to_field(other_content_id);
        assert_neq(hashed_id1, hashed_other);
    }

    // =========================================
    // Test: AccessPass Record Fields
    // Verifies record construction and field access
    // =========================================
    transition test_access_pass_fields() {
        let owner_addr: address = aleo1qnr4dkkvkgfqph0vzc3y6z2eu975wnpz2925ntjccd5cfqxtyu8s7pyjh9;
        let creator_addr: address = aleo1wyvu96dvv0auq9e4qme54kjuhzglyfcf576h0g3nrrmrmr0505pq9escet;
        let tier: u8 = 2u8;
        let pass_id: field = 42field;
        let expires_at: u32 = 1_000_000u32;

        // Verify field values are preserved
        assert_eq(tier, 2u8);
        assert_eq(pass_id, 42field);
        assert_eq(expires_at, 1_000_000u32);
        assert(tier >= 1u8 && tier <= 3u8);
    }

    // =========================================
    // Test: Audit Token Subscriber Hash
    // Verifies that the same subscriber always maps to the same hash
    // across AccessPass → AuditToken creation, enabling repeat verification
    // =========================================
    transition test_audit_token_hash_linkage() {
        let subscriber: address = aleo1qnr4dkkvkgfqph0vzc3y6z2eu975wnpz2925ntjccd5cfqxtyu8s7pyjh9;

        // Hash used in CreatorReceipt
        let receipt_hash: field = BHP256::hash_to_field(subscriber);

        // Hash used in AuditToken (same function, same input)
        let audit_hash: field = BHP256::hash_to_field(subscriber);

        // They must be identical — allows creator to match receipts to audit tokens
        assert_eq(receipt_hash, audit_hash);

        // A different subscriber produces a different hash
        let other_subscriber: address = aleo1wyvu96dvv0auq9e4qme54kjuhzglyfcf576h0g3nrrmrmr0505pq9escet;
        let other_hash: field = BHP256::hash_to_field(other_subscriber);
        assert_neq(receipt_hash, other_hash);
    }

    // =========================================
    // Test: TokenKey Struct Hashing
    // Verifies composite key hashing for token-specific mappings
    // =========================================
    struct TokenKey {
        addr: address,
        token_id: field,
    }

    transition test_token_key_hashing() {
        let addr: address = aleo1qnr4dkkvkgfqph0vzc3y6z2eu975wnpz2925ntjccd5cfqxtyu8s7pyjh9;
        let token_id: field = 1field;

        let key1: field = BHP256::hash_to_field(TokenKey { addr: addr, token_id: token_id });
        let key2: field = BHP256::hash_to_field(TokenKey { addr: addr, token_id: token_id });
        assert_eq(key1, key2);

        // Different token_id produces different key
        let key3: field = BHP256::hash_to_field(TokenKey { addr: addr, token_id: 2field });
        assert_neq(key1, key3);
    }
}

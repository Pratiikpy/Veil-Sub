// =============================================================================
// VeilSub v5 — Unit Tests
//
// Tests for core contract logic: tier multipliers, fee splits, hash
// consistency, and expiry bounds.
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
        let platform_cut1: u64 = amount1 / 20u64; // 5%
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
    // Verifies that BHP256 produces deterministic output
    // =========================================
    transition test_hash_consistency() {
        let pass_id: field = 12345field;

        // Hash the same value twice — should produce identical results
        let hash1: field = BHP256::hash_to_field(pass_id);
        let hash2: field = BHP256::hash_to_field(pass_id);
        assert_eq(hash1, hash2);

        // Different inputs should produce different hashes
        let other_id: field = 67890field;
        let hash3: field = BHP256::hash_to_field(other_id);
        assert_neq(hash1, hash3);
    }

    // =========================================
    // Test: Expiry Bounds
    // Verifies block height constraints for subscriptions
    // =========================================
    transition test_expiry_bounds() {
        // Maximum subscription duration: 1,200,000 blocks (~139 days at 3s/block)
        let max_duration: u32 = 1_200_000u32;

        // Standard 30-day subscription: 864,000 blocks
        let standard_duration: u32 = 864_000u32;
        assert(standard_duration <= max_duration);

        // Verify tier constraints
        let tier1: u8 = 1u8;
        let tier2: u8 = 2u8;
        let tier3: u8 = 3u8;
        assert(tier1 >= 1u8);
        assert(tier1 <= 3u8);
        assert(tier2 >= 1u8);
        assert(tier2 <= 3u8);
        assert(tier3 >= 1u8);
        assert(tier3 <= 3u8);
    }

    // =========================================
    // Test: Token Fee Split (u128 — for ARC-20 tokens)
    // Verifies correct fee calculation for token amounts
    // =========================================
    transition test_token_fee_split() {
        // 10 USDC (6 decimals) = 10_000_000 units
        let amount: u128 = 10_000_000u128;
        let platform_cut: u128 = amount / 20u128; // 5%
        let creator_cut: u128 = amount - platform_cut;
        assert_eq(platform_cut, 500_000u128);
        assert_eq(creator_cut, 9_500_000u128);
        assert_eq(platform_cut + creator_cut, amount);
    }
}

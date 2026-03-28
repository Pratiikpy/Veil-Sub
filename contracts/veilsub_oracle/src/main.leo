// =============================================================================
// VeilSub Oracle v1 — USD-Pegged Subscription Pricing
//
// Integrates with official_oracle_v2.aleo (same oracle lasagna uses) to enable
// USD-denominated subscription prices that auto-adjust to ALEO's market rate.
//
// ARCHITECTURE:
//   - price_feed: stores token prices in micro-USD (6 decimals, e.g. 1500000 = $1.50)
//   - price_updated_at: block height of last price update (staleness detection)
//   - dynamic_tier_price: creator+tier => USD-adjusted ALEO microcredit price
//   - oracle_admin: singleton admin address for price updates
//   - Admin-submitted prices with anti-manipulation guards (50% max deviation)
//   - In production: reads attested data from official_oracle_v2.aleo
//   - Staleness check: prices must be updated within 1000 blocks (~50 min)
//
// TOKEN TYPES:
//   0 = ALEO credits
//   1 = USDCx (test stablecoin)
//   2 = USAD (test stablecoin)
//
// MAPPINGS: 4 (price_feed, price_updated_at, dynamic_tier_price, oracle_admin)
// TRANSITIONS: 4 (initialize_oracle, update_price, compute_tier_price,
//                  verify_price_freshness)
// =============================================================================

program veilsub_oracle_v1.aleo {

    @noupgrade
    async constructor() {}

    // ── Constants ─────────────────────────────────────────────────────────

    const TOKEN_ALEO: u8 = 0u8;
    const TOKEN_USDCX: u8 = 1u8;
    const TOKEN_USAD: u8 = 2u8;

    // Maximum price: $1000 in micro-USD
    const MAX_PRICE_MICRO_USD: u128 = 1000000000u128;

    // Price staleness window: ~1000 blocks (~50 minutes on Aleo testnet)
    const STALENESS_WINDOW: u32 = 1000u32;

    // Default ALEO price if no feed exists: $1.00 in micro-USD
    const DEFAULT_ALEO_PRICE: u128 = 1000000u128;

    // Micro-USD scale factor (6 decimals)
    const MICRO_USD_SCALE: u128 = 1000000u128;

    // ── Mappings ──────────────────────────────────────────────────────────

    // Token type => price in micro-USD (6 decimals). e.g. 1500000 = $1.50
    mapping price_feed: u8 => u128;

    // Token type => block height of last price update
    mapping price_updated_at: u8 => u32;

    // Poseidon2(creator_hash + tier as field) => dynamic price in microcredits
    mapping dynamic_tier_price: field => u64;

    // Singleton admin: true => admin address
    mapping oracle_admin: bool => address;

    // ── Admin Initialization ──────────────────────────────────────────────

    // Set the oracle admin (one-time initialization)
    async transition initialize_oracle(
        public admin_address: address,
    ) -> Future {
        return finalize_initialize_oracle(admin_address);
    }

    async function finalize_initialize_oracle(
        admin_address: address,
    ) {
        // Only allow initialization once
        let already_init: bool = Mapping::contains(oracle_admin, true);
        assert(!already_init);
        Mapping::set(oracle_admin, true, admin_address);
    }

    // ── Price Feed Update ─────────────────────────────────────────────────

    // Admin updates the price feed with current market data.
    // Anti-manipulation: price cannot deviate more than 50% from last known value.
    // In production, this would be called by a bot reading from CoinGecko/Binance
    // and cross-referenced with official_oracle_v2.aleo attestations.
    async transition update_price(
        public token_type: u8,
        public price_micro_usd: u128,
    ) -> Future {
        // Validate token type
        assert(token_type <= 2u8);

        // Validate price bounds
        assert(price_micro_usd > 0u128);
        assert(price_micro_usd < MAX_PRICE_MICRO_USD);

        return finalize_update_price(self.caller, token_type, price_micro_usd);
    }

    async function finalize_update_price(
        caller: address,
        token_type: u8,
        price: u128,
    ) {
        // Auth: only oracle admin can update prices
        let admin: address = Mapping::get(oracle_admin, true);
        assert_eq(caller, admin);

        // Anti-manipulation: check price deviation from last known value
        let last_price: u128 = Mapping::get_or_use(price_feed, token_type, 0u128);
        if (last_price > 0u128) {
            // New price must be within 50%-200% of previous price
            let half: u128 = last_price / 2u128;
            let double: u128 = last_price * 2u128;
            assert(price > half);
            assert(price < double);
        }

        Mapping::set(price_feed, token_type, price);
        Mapping::set(price_updated_at, token_type, block.height);
    }

    // ── Dynamic Tier Pricing ──────────────────────────────────────────────

    // Compute the ALEO microcredit price for a creator's tier based on a USD target.
    // Example: If tier costs $5 and ALEO is at $1.50, price = 5/1.5 * 1_000_000 = 3_333_333 microcredits
    // Stored in dynamic_tier_price mapping for on-chain reference.
    async transition compute_tier_price(
        public creator_hash: field,
        public tier: u8,
        public target_usd_micro: u128,
    ) -> Future {
        // Target USD must be positive
        assert(target_usd_micro > 0u128);
        // Tier must be valid (VeilSub supports up to 20 tiers)
        assert(tier <= 20u8);

        return finalize_compute_tier_price(creator_hash, tier, target_usd_micro);
    }

    async function finalize_compute_tier_price(
        creator_hash: field,
        tier: u8,
        target_usd: u128,
    ) {
        // Get current ALEO/USD price from feed (default $1.00 if not set)
        let aleo_price: u128 = Mapping::get_or_use(price_feed, 0u8, DEFAULT_ALEO_PRICE);

        // Calculate: microcredits = (target_usd * 1_000_000) / aleo_price
        // This gives the number of microcredits equivalent to the USD target.
        // Example: target=$5 (5_000_000 micro-USD), ALEO=$1.50 (1_500_000 micro-USD)
        //   = (5_000_000 * 1_000_000) / 1_500_000 = 3_333_333 microcredits = 3.33 ALEO
        let price_aleo_micro: u64 = ((target_usd * MICRO_USD_SCALE) / aleo_price) as u64;

        // Store dynamic price keyed by Poseidon2(creator_hash + tier)
        // Same hashing pattern as VeilSub's TierKey for consistency
        let key: field = Poseidon2::hash_to_field(creator_hash + (tier as field));
        Mapping::set(dynamic_tier_price, key, price_aleo_micro);
    }

    // ── Price Freshness Verification ──────────────────────────────────────

    // Verify that the ALEO price feed is fresh (updated within staleness window).
    // Other programs or the frontend can call this to gate operations on fresh prices.
    async transition verify_price_freshness(
        public token_type: u8,
    ) -> Future {
        assert(token_type <= 2u8);
        return finalize_verify_price_freshness(token_type);
    }

    async function finalize_verify_price_freshness(
        token_type: u8,
    ) {
        let updated: u32 = Mapping::get_or_use(price_updated_at, token_type, 0u32);
        // Price must have been updated within the staleness window
        assert(block.height - updated < STALENESS_WINDOW);
    }

    // ── Oracle Attestation Reader ─────────────────────────────────────────
    // TODO: Enable when official_oracle_v2.aleo is deployed on testnet.
    // This transition would read attested price data from official_oracle_v2.aleo's
    // SGX attestation, demonstrating cross-program oracle integration.
    // The request_hash identifies which oracle data feed to read.
    //
    // async transition read_oracle_attestation(
    //     public request_hash: u128,
    // ) -> Future {
    //     return finalize_read_oracle_attestation(request_hash);
    // }
    //
    // async function finalize_read_oracle_attestation(
    //     request_hash: u128,
    // ) {
    //     let attested: AttestedData = Mapping::get(
    //         official_oracle_v2.aleo/sgx_attested_data,
    //         request_hash
    //     );
    //     assert(attested.data > 0u128);
    //     assert(attested.attestation_timestamp > 0u128);
    //     Mapping::set(price_feed, 0u8, attested.data);
    //     Mapping::set(price_updated_at, 0u8, block.height);
    // }
}

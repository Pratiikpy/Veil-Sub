import credits.aleo;
import token_registry.aleo;

// =============================================================================
// VeilSub v6 — Private Creator Subscriptions on Aleo (Hardened Payments)
//
// PRIVACY ARCHITECTURE:
// - Subscriber address (self.caller) is used ONLY to set AccessPass.owner
// - self.caller is NEVER passed to any finalize function
// - finalize_subscribe receives only: creator (public), amount (public), tier (public),
//   pass_id (public), expires_at (public) — the subscriber's identity has NO code path to public state
// - verify_access has NO finalize — zero public footprint on access checks
// - All payments use credits.aleo/transfer_private or token_registry.aleo/transfer_private (not transfer_public)
// - Both creator payment and platform fee use private transfers
//
// MULTI-TOKEN SUPPORT (v5):
// - subscribe_token() and tip_token() accept ANY ARC-20 token via token_registry.aleo
// - Supports USDCx, USAD, and any future ARC-20 token without contract redeployment
// - set_token_price() allows creators to set prices in specific tokens
// - Token-specific revenue tracking in separate mappings
//
// PLATFORM FEE:
// 5% platform fee on subscriptions and tips. Both transfers are private —
// subscriber identity stays hidden from both creator and platform.
//
// SUBSCRIPTION EXPIRY:
// expires_at (block height) is stored in the private AccessPass record.
// Finalize validates the expiry is within an acceptable range.
// verify_access has NO finalize, so expiry is checked client-side to preserve
// zero-footprint access verification.
//
// CONTENT PUBLISHING:
// content_id and min_tier are public (required for mapping writes).
// Content BODY is off-chain. Only existence and tier requirement is on-chain.
// =============================================================================

program veilsub_v6.aleo {

    // Constructor — required for deployment on current Aleo consensus.
    // @noupgrade prevents future program modifications (immutable contract).
    @noupgrade
    async constructor() {}

    // Platform treasury address — receives 5% fee on subscriptions and tips.
    const PLATFORM_ADDR: address = aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk;

    // =========================================
    // STRUCTS (for hashing composite keys)
    // =========================================

    struct TokenKey {
        addr: address,
        token_id: field,
    }

    // =========================================
    // RECORDS (Private — only owner can see)
    // =========================================

    record AccessPass {
        owner: address,        // subscriber (private)
        creator: address,      // which creator (private)
        tier: u8,              // 1=basic, 2=premium, 3=vip (private)
        pass_id: field,        // unique identifier (private)
        expires_at: u32,       // block height when pass expires (private)
    }

    // =========================================
    // MAPPINGS (Public — aggregate data only)
    // =========================================

    // Core mappings
    mapping tier_prices: address => u64;
    mapping subscriber_count: address => u64;
    mapping total_revenue: address => u64;
    mapping platform_revenue: u8 => u64;       // key 0 = total platform earnings
    mapping content_count: address => u64;
    mapping content_meta: field => u8;          // hashed content_id => min tier required

    // Token-specific mappings
    mapping tier_prices_token: field => u128;       // hash(creator, token_id) => price in token units
    mapping total_revenue_token: field => u128;     // hash(creator, token_id) => total earned in token
    mapping platform_revenue_token: field => u128;  // hash(token_id, 0field) => platform earnings in token

    // =========================================
    // TRANSITIONS — ALEO CREDITS
    // =========================================

    // Creator registers and sets their subscription price
    async transition register_creator(
        public price: u64,
    ) -> Future {
        assert(price > 0u64);
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
    }

    // Subscriber pays real ALEO and gets private AccessPass with expiry.
    // Two payment records: one for creator (95%), one for platform fee (5%).
    // Frontend auto-splits a single record if user only has one.
    async transition subscribe(
        payment_creator: credits.aleo/credits,
        payment_platform: credits.aleo/credits,
        creator: address,
        tier: u8,
        amount: u64,
        pass_id: field,
        expires_at: u32,
    ) -> (AccessPass, credits.aleo/credits, credits.aleo/credits, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);
        assert(tier <= 3u8);

        let platform_cut: u64 = amount / 20u64;
        let creator_cut: u64 = amount - platform_cut;

        let (change_creator, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_creator, creator, creator_cut);

        let (change_platform, to_platform): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_platform, PLATFORM_ADDR, platform_cut);

        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: tier,
            pass_id: pass_id,
            expires_at: expires_at,
        };

        return (pass, change_creator, to_creator, change_platform, to_platform, finalize_subscribe(creator, amount, tier, expires_at));
    }
    async function finalize_subscribe(
        creator: address,
        amount: u64,
        tier: u8,
        expires_at: u32,
    ) {
        let base_price: u64 = Mapping::get(tier_prices, creator);
        let multiplier: u64 = tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64);
        let required_price: u64 = base_price * multiplier;
        assert(amount >= required_price);

        assert(expires_at > block.height);
        assert(expires_at <= block.height + 1_200_000u32);

        let count: u64 = Mapping::get_or_use(subscriber_count, creator, 0u64);
        Mapping::set(subscriber_count, creator, count + 1u64);
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / 20u64;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);
    }

    // Verify access — zero public footprint
    transition verify_access(
        pass: AccessPass,
        creator: address,
    ) -> AccessPass {
        assert_eq(pass.creator, creator);

        return AccessPass {
            owner: pass.owner,
            creator: pass.creator,
            tier: pass.tier,
            pass_id: pass.pass_id,
            expires_at: pass.expires_at,
        };
    }

    // Tip with ALEO credits — two records for creator + platform split
    async transition tip(
        payment_creator: credits.aleo/credits,
        payment_platform: credits.aleo/credits,
        creator: address,
        amount: u64,
    ) -> (credits.aleo/credits, credits.aleo/credits, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(amount > 0u64);
        let platform_cut: u64 = amount / 20u64;
        let creator_cut: u64 = amount - platform_cut;

        let (change_creator, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_creator, creator, creator_cut);

        let (change_platform, to_platform): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_platform, PLATFORM_ADDR, platform_cut);

        return (change_creator, to_creator, change_platform, to_platform, finalize_tip(creator, amount));
    }
    async function finalize_tip(
        creator: address,
        amount: u64,
    ) {
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / 20u64;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);
    }

    // Renew subscription — consumes old pass, pays again, gets fresh AccessPass
    async transition renew(
        old_pass: AccessPass,
        payment_creator: credits.aleo/credits,
        payment_platform: credits.aleo/credits,
        new_tier: u8,
        amount: u64,
        new_pass_id: field,
        new_expires_at: u32,
    ) -> (AccessPass, credits.aleo/credits, credits.aleo/credits, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(new_tier >= 1u8);
        assert(new_tier <= 3u8);

        let creator: address = old_pass.creator;

        let platform_cut: u64 = amount / 20u64;
        let creator_cut: u64 = amount - platform_cut;

        let (change_creator, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_creator, creator, creator_cut);

        let (change_platform, to_platform): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_platform, PLATFORM_ADDR, platform_cut);

        let new_pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: new_tier,
            pass_id: new_pass_id,
            expires_at: new_expires_at,
        };

        return (new_pass, change_creator, to_creator, change_platform, to_platform, finalize_renew(creator, amount, new_tier, new_expires_at));
    }
    async function finalize_renew(
        creator: address,
        amount: u64,
        new_tier: u8,
        new_expires_at: u32,
    ) {
        let base_price: u64 = Mapping::get(tier_prices, creator);
        let multiplier: u64 = new_tier == 3u8 ? 5u64 : (new_tier == 2u8 ? 2u64 : 1u64);
        let required_price: u64 = base_price * multiplier;
        assert(amount >= required_price);

        assert(new_expires_at > block.height);
        assert(new_expires_at <= block.height + 1_200_000u32);

        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / 20u64;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);
    }

    // Publish content metadata
    async transition publish_content(
        public content_id: field,
        public min_tier: u8,
    ) -> Future {
        assert(min_tier >= 1u8);
        assert(min_tier <= 3u8);
        return finalize_publish_content(self.caller, content_id, min_tier);
    }
    async function finalize_publish_content(
        creator: address,
        content_id: field,
        min_tier: u8,
    ) {
        let price: u64 = Mapping::get(tier_prices, creator);
        assert(price > 0u64);

        let hashed_content_id: field = BHP256::hash_to_field(content_id);
        Mapping::set(content_meta, hashed_content_id, min_tier);

        let count: u64 = Mapping::get_or_use(content_count, creator, 0u64);
        Mapping::set(content_count, creator, count + 1u64);
    }

    // =========================================
    // TRANSITIONS — ARC-20 TOKENS
    // =========================================

    // Creator sets their subscription price in a specific token
    async transition set_token_price(
        public token_id: field,
        public price: u128,
    ) -> Future {
        assert(price > 0u128);
        return finalize_set_token_price(self.caller, token_id, price);
    }
    async function finalize_set_token_price(
        creator: address,
        token_id: field,
        price: u128,
    ) {
        let base: u64 = Mapping::get(tier_prices, creator);
        assert(base > 0u64);

        let key: field = BHP256::hash_to_field(TokenKey { addr: creator, token_id: token_id });
        Mapping::set(tier_prices_token, key, price);
    }

    // Subscribe with any ARC-20 token — two records for creator + platform split
    async transition subscribe_token(
        payment_creator: token_registry.aleo/Token,
        payment_platform: token_registry.aleo/Token,
        creator: address,
        tier: u8,
        amount: u128,
        token_id: field,
        pass_id: field,
        expires_at: u32,
    ) -> (AccessPass, token_registry.aleo/Token, token_registry.aleo/Token, token_registry.aleo/Token, token_registry.aleo/Token, Future) {
        assert(tier >= 1u8);
        assert(tier <= 3u8);

        let platform_cut: u128 = amount / 20u128;
        let creator_cut: u128 = amount - platform_cut;

        let (to_creator, change_creator, f_creator): (token_registry.aleo/Token, token_registry.aleo/Token, Future) =
            token_registry.aleo/transfer_private(creator, creator_cut, payment_creator);

        let (to_platform, change_platform, f_platform): (token_registry.aleo/Token, token_registry.aleo/Token, Future) =
            token_registry.aleo/transfer_private(PLATFORM_ADDR, platform_cut, payment_platform);

        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: tier,
            pass_id: pass_id,
            expires_at: expires_at,
        };

        return (pass, to_creator, change_creator, to_platform, change_platform, finalize_subscribe_token(f_creator, f_platform, creator, amount, tier, token_id, expires_at));
    }
    async function finalize_subscribe_token(
        f_creator: Future,
        f_platform: Future,
        creator: address,
        amount: u128,
        tier: u8,
        token_id: field,
        expires_at: u32,
    ) {
        f_creator.await();
        f_platform.await();

        let price_key: field = BHP256::hash_to_field(TokenKey { addr: creator, token_id: token_id });
        let base_price: u128 = Mapping::get(tier_prices_token, price_key);
        let multiplier: u128 = tier == 3u8 ? 5u128 : (tier == 2u8 ? 2u128 : 1u128);
        let required_price: u128 = base_price * multiplier;
        assert(amount >= required_price);

        assert(expires_at > block.height);
        assert(expires_at <= block.height + 1_200_000u32);

        let count: u64 = Mapping::get_or_use(subscriber_count, creator, 0u64);
        Mapping::set(subscriber_count, creator, count + 1u64);

        let rev_key: field = BHP256::hash_to_field(TokenKey { addr: creator, token_id: token_id });
        let revenue: u128 = Mapping::get_or_use(total_revenue_token, rev_key, 0u128);
        Mapping::set(total_revenue_token, rev_key, revenue + amount);

        let plat_key: field = BHP256::hash_to_field(TokenKey { addr: PLATFORM_ADDR, token_id: token_id });
        let plat_rev: u128 = Mapping::get_or_use(platform_revenue_token, plat_key, 0u128);
        let platform_cut: u128 = amount / 20u128;
        Mapping::set(platform_revenue_token, plat_key, plat_rev + platform_cut);
    }

    // Tip with any ARC-20 token — two records for creator + platform split
    async transition tip_token(
        payment_creator: token_registry.aleo/Token,
        payment_platform: token_registry.aleo/Token,
        creator: address,
        amount: u128,
        token_id: field,
    ) -> (token_registry.aleo/Token, token_registry.aleo/Token, token_registry.aleo/Token, token_registry.aleo/Token, Future) {
        assert(amount > 0u128);
        let platform_cut: u128 = amount / 20u128;
        let creator_cut: u128 = amount - platform_cut;

        let (to_creator, change_creator, f_creator): (token_registry.aleo/Token, token_registry.aleo/Token, Future) =
            token_registry.aleo/transfer_private(creator, creator_cut, payment_creator);

        let (to_platform, change_platform, f_platform): (token_registry.aleo/Token, token_registry.aleo/Token, Future) =
            token_registry.aleo/transfer_private(PLATFORM_ADDR, platform_cut, payment_platform);

        return (to_creator, change_creator, to_platform, change_platform, finalize_tip_token(f_creator, f_platform, creator, amount, token_id));
    }
    async function finalize_tip_token(
        f_creator: Future,
        f_platform: Future,
        creator: address,
        amount: u128,
        token_id: field,
    ) {
        f_creator.await();
        f_platform.await();

        let rev_key: field = BHP256::hash_to_field(TokenKey { addr: creator, token_id: token_id });
        let revenue: u128 = Mapping::get_or_use(total_revenue_token, rev_key, 0u128);
        Mapping::set(total_revenue_token, rev_key, revenue + amount);

        let plat_key: field = BHP256::hash_to_field(TokenKey { addr: PLATFORM_ADDR, token_id: token_id });
        let plat_rev: u128 = Mapping::get_or_use(platform_revenue_token, plat_key, 0u128);
        let platform_cut: u128 = amount / 20u128;
        Mapping::set(platform_revenue_token, plat_key, plat_rev + platform_cut);
    }
}

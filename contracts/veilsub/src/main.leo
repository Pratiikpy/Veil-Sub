import credits.aleo;

// ═══════════════════════════════════════════════════════════════════════════════
// VeilSub v4 — Private Creator Subscriptions on Aleo
//
// PRIVACY ARCHITECTURE:
// - Subscriber address (self.caller) is used ONLY to set AccessPass.owner
// - self.caller is NEVER passed to any finalize function
// - finalize_subscribe receives only: creator (public), amount (public), tier (public),
//   pass_id (public), expires_at (public) — the subscriber's identity has NO code path to public state
// - verify_access has NO finalize — zero public footprint on access checks
// - All payments use credits.aleo/transfer_private (not transfer_public)
// - Both creator payment and platform fee use private transfers
//
// PLATFORM FEE:
// 5% platform fee on subscriptions and tips. Both transfers are private —
// subscriber identity stays hidden from both creator and platform.
//
// SUBSCRIPTION EXPIRY:
// expires_at (block height) is stored in the private AccessPass record.
// Finalize validates the expiry is within an acceptable range.
// verify_access has NO finalize, so expiry is checked client-side to preserve
// zero-footprint access verification. Adding finalize to verify_access would
// mean every access check leaves an on-chain trace — destroying privacy.
//
// CONTENT PUBLISHING:
// content_id and min_tier are public (required for mapping writes).
// Content BODY is off-chain. Only existence and tier requirement is on-chain.
// ═══════════════════════════════════════════════════════════════════════════════

program veilsub_v4.aleo {

    // Constructor — required for deployment on current Aleo consensus.
    // @noupgrade prevents future program modifications (immutable contract).
    @noupgrade
    async constructor() {}

    // Platform treasury address — receives 5% fee on subscriptions and tips.
    const PLATFORM_ADDR: address = aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk;

    // ═══════════════════════════════════════
    // RECORDS (Private — only owner can see)
    // ═══════════════════════════════════════

    record AccessPass {
        owner: address,        // subscriber (private)
        creator: address,      // which creator (private)
        tier: u8,              // 1=basic, 2=premium, 3=vip (private)
        pass_id: field,        // unique identifier (private)
        expires_at: u32,       // block height when pass expires (private)
    }

    // ═══════════════════════════════════════
    // MAPPINGS (Public — aggregate data only)
    // ═══════════════════════════════════════

    // Existing (from v2)
    mapping tier_prices: address => u64;
    mapping subscriber_count: address => u64;
    mapping total_revenue: address => u64;

    // New in v3
    mapping platform_revenue: u8 => u64;       // key 0 = total platform earnings
    mapping content_count: address => u64;      // number of posts per creator
    mapping content_meta: field => u8;          // content_id => minimum tier required
    mapping sub_created: field => u32;          // pass_id => block.height at creation

    // ═══════════════════════════════════════
    // TRANSITIONS
    // ═══════════════════════════════════════

    // Creator registers and sets their subscription price
    // Guard: cannot re-register (prevents accidental stat wipe)
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
        // Prevent re-registration — protects existing subscriber_count and total_revenue
        let already_registered: bool = Mapping::contains(tier_prices, creator);
        assert(!already_registered);
        Mapping::set(tier_prices, creator, price);
        Mapping::set(subscriber_count, creator, 0u64);
        Mapping::set(total_revenue, creator, 0u64);
    }

    // Subscriber pays real ALEO and gets private AccessPass with expiry
    // PRIVACY: self.caller is used ONLY for AccessPass.owner — never passed to finalize
    // PLATFORM FEE: 5% to platform, 95% to creator — both via transfer_private
    // Uses 2 separate input records to avoid chained transfer_private synthesis issues
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

        // Calculate platform cut (5%) and creator cut (95%)
        let platform_cut: u64 = amount / 20u64;
        let creator_cut: u64 = amount - platform_cut;

        // Transfer creator's share (PRIVATE) — from first record
        let (change_creator, creator_payment): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_creator, creator, creator_cut);

        // Transfer platform's share (PRIVATE) — from second record (no chaining)
        let (change_platform, platform_payment): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_platform, PLATFORM_ADDR, platform_cut);

        // Create private AccessPass for subscriber
        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: tier,
            pass_id: pass_id,
            expires_at: expires_at,
        };

        return (pass, change_creator, change_platform, creator_payment, platform_payment, finalize_subscribe(creator, amount, tier, pass_id, expires_at));
    }
    async function finalize_subscribe(
        creator: address,
        amount: u64,
        tier: u8,
        pass_id: field,
        expires_at: u32,
    ) {
        // Validate payment meets the creator's registered tier price
        let base_price: u64 = Mapping::get(tier_prices, creator);
        let multiplier: u64 = tier == 3u8 ? 5u64 : (tier == 2u8 ? 2u64 : 1u64);
        let required_price: u64 = base_price * multiplier;
        assert(amount >= required_price);

        // Validate expiry is in the future and within ~1 year max
        assert(expires_at > block.height);
        assert(expires_at <= block.height + 1_200_000u32);

        // Hash pass_id before public storage — defense-in-depth against correlation attacks
        let hashed_pass_id: field = BHP256::hash_to_field(pass_id);
        Mapping::set(sub_created, hashed_pass_id, block.height);

        // Update aggregate stats
        let count: u64 = Mapping::get_or_use(subscriber_count, creator, 0u64);
        Mapping::set(subscriber_count, creator, count + 1u64);
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        // Track platform revenue
        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / 20u64;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);
    }

    // Verify access — proves subscriber has valid pass
    // Consumes old pass, issues new one (standard Aleo UTXO pattern)
    // PRIVACY: This transition has NO finalize block — zero public footprint.
    // When a subscriber proves access, no mapping writes occur, no counters increment,
    // and no on-chain evidence is created. This prevents timing correlation attacks.
    // EXPIRY NOTE: expires_at is passed through to the new record unchanged.
    // Expiry is checked CLIENT-SIDE only. Adding finalize to check block.height
    // would create on-chain traces for every access check, destroying the zero-footprint
    // property that is core to VeilSub's privacy model.
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

    // Subscriber tips a creator with 5% platform fee
    // Uses 2 separate input records to avoid chained transfer_private synthesis issues
    async transition tip(
        payment_creator: credits.aleo/credits,
        payment_platform: credits.aleo/credits,
        creator: address,
        amount: u64,
    ) -> (credits.aleo/credits, credits.aleo/credits, credits.aleo/credits, credits.aleo/credits, Future) {
        // Calculate platform cut (5%) and creator cut (95%)
        let platform_cut: u64 = amount / 20u64;
        let creator_cut: u64 = amount - platform_cut;

        // Transfer creator's share (PRIVATE) — from first record
        let (change_creator, creator_payment): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_creator, creator, creator_cut);

        // Transfer platform's share (PRIVATE) — from second record (no chaining)
        let (change_platform, platform_payment): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_platform, PLATFORM_ADDR, platform_cut);

        return (change_creator, change_platform, creator_payment, platform_payment, finalize_tip(creator, amount));
    }
    async function finalize_tip(
        creator: address,
        amount: u64,
    ) {
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        // Track platform revenue
        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / 20u64;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);
    }

    // Renew an expired (or active) subscription — allows tier change
    // Consumes old pass, creates new pass with extended expiry
    // PRIVACY: Same model as subscribe — self.caller never reaches finalize
    // Uses 2 separate input records to avoid chained transfer_private synthesis issues
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

        // Calculate platform cut (5%) and creator cut (95%)
        let platform_cut: u64 = amount / 20u64;
        let creator_cut: u64 = amount - platform_cut;

        // Transfer creator's share (PRIVATE) — from first record
        let (change_creator, creator_payment): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_creator, creator, creator_cut);

        // Transfer platform's share (PRIVATE) — from second record (no chaining)
        let (change_platform, platform_payment): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment_platform, PLATFORM_ADDR, platform_cut);

        // Create new AccessPass with updated tier and expiry
        let new_pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: new_tier,
            pass_id: new_pass_id,
            expires_at: new_expires_at,
        };

        return (new_pass, change_creator, change_platform, creator_payment, platform_payment, finalize_renew(creator, amount, new_tier, new_pass_id, new_expires_at));
    }
    async function finalize_renew(
        creator: address,
        amount: u64,
        new_tier: u8,
        new_pass_id: field,
        new_expires_at: u32,
    ) {
        // Validate payment meets tier price
        let base_price: u64 = Mapping::get(tier_prices, creator);
        let multiplier: u64 = new_tier == 3u8 ? 5u64 : (new_tier == 2u8 ? 2u64 : 1u64);
        let required_price: u64 = base_price * multiplier;
        assert(amount >= required_price);

        // Validate expiry
        assert(new_expires_at > block.height);
        assert(new_expires_at <= block.height + 1_200_000u32);

        // Hash pass_id before public storage — defense-in-depth against correlation attacks
        let hashed_pass_id: field = BHP256::hash_to_field(new_pass_id);
        Mapping::set(sub_created, hashed_pass_id, block.height);

        // Update revenue (NOT subscriber_count — this is a renewal, not a new sub)
        let revenue: u64 = Mapping::get_or_use(total_revenue, creator, 0u64);
        Mapping::set(total_revenue, creator, revenue + amount);

        // Track platform revenue
        let plat_rev: u64 = Mapping::get_or_use(platform_revenue, 0u8, 0u64);
        let platform_cut: u64 = amount / 20u64;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);
    }

    // Creator publishes content metadata on-chain
    // Proves content exists and what tier it requires for access
    // PRIVACY NOTE: content_id and min_tier are public (required for mapping writes).
    // The content BODY is off-chain. Only existence and tier requirement is on-chain.
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
        // Validate creator is registered (will fail if not registered)
        let price: u64 = Mapping::get(tier_prices, creator);
        assert(price > 0u64);

        // Hash content_id before public storage — defense-in-depth against correlation attacks
        let hashed_content_id: field = BHP256::hash_to_field(content_id);
        Mapping::set(content_meta, hashed_content_id, min_tier);

        // Increment content count
        let count: u64 = Mapping::get_or_use(content_count, creator, 0u64);
        Mapping::set(content_count, creator, count + 1u64);
    }
}

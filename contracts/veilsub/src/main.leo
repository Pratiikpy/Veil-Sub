import credits.aleo;
import token_registry.aleo;

// =============================================================================
// VeilSub v8 — Private Creator Subscriptions on Aleo
//
// WAVE 2 CHANGES (v7 → v8):
// 1. CreatorReceipt record — creators now receive a private, on-chain proof
//    of every subscription/tip/renewal payment. The subscriber's identity is
//    stored as a BHP256 hash (privacy-preserving). Receipts are private records
//    only the creator can decrypt.
// 2. AuditToken record + create_audit_token transition — subscribers can
//    generate a selective-disclosure token for any third party (auditor,
//    service, contract). The token proves subscription tier + validity WITHOUT
//    revealing the subscriber's address. Zero finalize footprint.
// 3. Content integrity hashes — publish_content now accepts a content_hash
//    field stored on-chain, enabling anyone to verify content body hasn't been
//    tampered with. Content bodies remain off-chain; only the hash is on-chain.
//
// PRIVACY ARCHITECTURE:
//
//   WHAT IS PRIVATE (records — only the owner can decrypt):
//     - Subscriber address (self.caller) → set as AccessPass.owner, NEVER
//       passed to any finalize function. Zero code path to public state.
//     - AccessPass contents (creator, tier, pass_id, expires_at)
//     - CreatorReceipt contents (subscriber_hash, tier, amount, pass_id)
//     - AuditToken contents (creator, subscriber_hash, tier, expires_at)
//     - All payment transfers use credits.aleo/transfer_private
//
//   WHAT IS PUBLIC (mappings + finalize parameters — intentional by design):
//     - Creator address: Creators are public entities (like shops/channels).
//       Their prices, subscriber counts, and revenue are intentionally public
//       for discoverability. This mirrors real-world platforms: YouTube shows
//       channel stats, Patreon shows creator earnings — but viewer/subscriber
//       identities remain private.
//     - Payment amount + tier (in finalize params): Required for on-chain
//       validation against tier_prices. The amount validates the subscriber
//       paid enough; the tier determines the price multiplier. These are
//       visible in transaction data but CANNOT be linked to a specific
//       subscriber because self.caller never enters finalize.
//     - expires_at (in finalize params): Validated against block.height to
//       prevent unreasonable expiry durations.
//     - Content metadata (content_id, min_tier, content_hash): Public by
//       design — content existence and tier gating are discoverable.
//
//   DESIGN RATIONALE:
//     The privacy boundary is drawn at SUBSCRIBER IDENTITY. In a subscription
//     platform, creators WANT to be discoverable (public prices, public stats).
//     Subscribers NEED anonymity (who subscribes to what is sensitive data).
//     This model is analogous to a bookstore: the shop and its catalog are
//     public, but the customer list is private.
//
// SINGLE-RECORD PAYMENT MODEL (from v7):
//   subscribe, tip, and renew take a SINGLE credits.aleo/credits record.
//   One transfer_private sends the FULL amount to the creator. The 5% platform
//   fee is tracked in the platform_revenue mapping for deferred settlement.
//   WHY: snarkVM cannot synthesize proving keys for transitions that chain the
//   output record of one external call as input to another.
//
// MULTI-TOKEN SUPPORT (from v5):
//   subscribe_token() and tip_token() accept ANY ARC-20 token via
//   token_registry.aleo. Supports USDCx, USAD, and any future ARC-20 token
//   without contract redeployment.
//
// =============================================================================

program veilsub_v8.aleo {

    @noupgrade
    async constructor() {}

    const PLATFORM_ADDR: address = aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk;

    // =========================================
    // STRUCTS
    // =========================================

    struct TokenKey {
        addr: address,
        token_id: field,
    }

    // =========================================
    // RECORDS (Private — only owner can decrypt)
    // =========================================

    // Subscriber's access credential. Owner = subscriber (private).
    record AccessPass {
        owner: address,
        creator: address,
        tier: u8,              // 1=basic, 2=premium, 3=vip
        pass_id: field,
        expires_at: u32,       // block height
    }

    // Creator's payment proof. Owner = creator (private).
    // subscriber_hash = BHP256(subscriber_address) — creator can verify
    // a returning subscriber without knowing their actual address.
    record CreatorReceipt {
        owner: address,
        subscriber_hash: field,
        tier: u8,
        amount: u64,
        pass_id: field,
    }

    // Selective-disclosure token for third-party verification.
    // Owner = verifier/auditor. Proves a subscriber holds a valid pass
    // for a specific creator + tier WITHOUT revealing the subscriber's address.
    record AuditToken {
        owner: address,
        creator: address,
        subscriber_hash: field,
        tier: u8,
        expires_at: u32,
    }

    // =========================================
    // MAPPINGS (Public — aggregate/discoverable data)
    // =========================================

    mapping tier_prices: address => u64;
    mapping subscriber_count: address => u64;
    mapping total_revenue: address => u64;
    mapping platform_revenue: u8 => u64;
    mapping content_count: address => u64;
    mapping content_meta: field => u8;
    mapping content_hashes: field => field;     // v8: on-chain content integrity hash

    // Token-specific mappings (keys already hashed via TokenKey struct)
    mapping tier_prices_token: field => u128;
    mapping total_revenue_token: field => u128;
    mapping platform_revenue_token: field => u128;

    // =========================================
    // TRANSITIONS — ALEO CREDITS
    // =========================================

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

    // v8: subscribe returns CreatorReceipt to the creator as private payment proof.
    async transition subscribe(
        payment: credits.aleo/credits,
        creator: address,
        tier: u8,
        amount: u64,
        pass_id: field,
        expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(tier >= 1u8);
        assert(tier <= 3u8);

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: tier,
            pass_id: pass_id,
            expires_at: expires_at,
        };

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: BHP256::hash_to_field(self.caller),
            tier: tier,
            amount: amount,
            pass_id: pass_id,
        };

        return (pass, receipt, change, to_creator, finalize_subscribe(creator, amount, tier, expires_at));
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

    // Zero-footprint access verification — NO finalize, no public state changes.
    // Consumes the old AccessPass and re-creates an identical one (UTXO model).
    // The ZK proof proves ownership without revealing identity.
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

    // v8: Selective disclosure — create an AuditToken for a third-party verifier.
    // The verifier learns: creator, tier, expires_at, and a hash of the subscriber.
    // The verifier does NOT learn the subscriber's actual address.
    // NO finalize — zero public footprint. Creating audit tokens is invisible on-chain.
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
        };

        let token: AuditToken = AuditToken {
            owner: verifier,
            creator: pass.creator,
            subscriber_hash: BHP256::hash_to_field(pass.owner),
            tier: pass.tier,
            expires_at: pass.expires_at,
        };

        return (new_pass, token);
    }

    // v8: tip returns CreatorReceipt (tier=0, pass_id=0 signals "tip").
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
            subscriber_hash: BHP256::hash_to_field(self.caller),
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
        let platform_cut: u64 = amount / 20u64;
        Mapping::set(platform_revenue, 0u8, plat_rev + platform_cut);
    }

    // v8: renew returns CreatorReceipt to creator.
    async transition renew(
        old_pass: AccessPass,
        payment: credits.aleo/credits,
        new_tier: u8,
        amount: u64,
        new_pass_id: field,
        new_expires_at: u32,
    ) -> (AccessPass, CreatorReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(new_tier >= 1u8);
        assert(new_tier <= 3u8);

        let creator: address = old_pass.creator;

        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, creator, amount);

        let new_pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: new_tier,
            pass_id: new_pass_id,
            expires_at: new_expires_at,
        };

        let receipt: CreatorReceipt = CreatorReceipt {
            owner: creator,
            subscriber_hash: BHP256::hash_to_field(self.caller),
            tier: new_tier,
            amount: amount,
            pass_id: new_pass_id,
        };

        return (new_pass, receipt, change, to_creator, finalize_renew(creator, amount, new_tier, new_expires_at));
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

    // v8: publish_content now stores a content body hash for integrity verification.
    async transition publish_content(
        public content_id: field,
        public min_tier: u8,
        public content_hash: field,
    ) -> Future {
        assert(min_tier >= 1u8);
        assert(min_tier <= 3u8);
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

        let hashed_content_id: field = BHP256::hash_to_field(content_id);
        Mapping::set(content_meta, hashed_content_id, min_tier);
        Mapping::set(content_hashes, hashed_content_id, content_hash);

        let count: u64 = Mapping::get_or_use(content_count, creator, 0u64);
        Mapping::set(content_count, creator, count + 1u64);
    }

    // =========================================
    // TRANSITIONS — ARC-20 TOKENS
    // =========================================

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

    async transition subscribe_token(
        payment: token_registry.aleo/Token,
        creator: address,
        tier: u8,
        amount: u128,
        token_id: field,
        pass_id: field,
        expires_at: u32,
    ) -> (AccessPass, token_registry.aleo/Token, token_registry.aleo/Token, Future) {
        assert(tier >= 1u8);
        assert(tier <= 3u8);

        let (to_creator, change, f_creator): (token_registry.aleo/Token, token_registry.aleo/Token, Future) =
            token_registry.aleo/transfer_private(creator, amount, payment);

        let pass: AccessPass = AccessPass {
            owner: self.caller,
            creator: creator,
            tier: tier,
            pass_id: pass_id,
            expires_at: expires_at,
        };

        return (pass, change, to_creator, finalize_subscribe_token(f_creator, creator, amount, tier, token_id, expires_at));
    }
    async function finalize_subscribe_token(
        f_creator: Future,
        creator: address,
        amount: u128,
        tier: u8,
        token_id: field,
        expires_at: u32,
    ) {
        f_creator.await();

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

    async transition tip_token(
        payment: token_registry.aleo/Token,
        creator: address,
        amount: u128,
        token_id: field,
    ) -> (token_registry.aleo/Token, token_registry.aleo/Token, Future) {
        assert(amount > 0u128);

        let (to_creator, change, f_creator): (token_registry.aleo/Token, token_registry.aleo/Token, Future) =
            token_registry.aleo/transfer_private(creator, amount, payment);

        return (change, to_creator, finalize_tip_token(f_creator, creator, amount, token_id));
    }
    async function finalize_tip_token(
        f_creator: Future,
        creator: address,
        amount: u128,
        token_id: field,
    ) {
        f_creator.await();

        let rev_key: field = BHP256::hash_to_field(TokenKey { addr: creator, token_id: token_id });
        let revenue: u128 = Mapping::get_or_use(total_revenue_token, rev_key, 0u128);
        Mapping::set(total_revenue_token, rev_key, revenue + amount);

        let plat_key: field = BHP256::hash_to_field(TokenKey { addr: PLATFORM_ADDR, token_id: token_id });
        let plat_rev: u128 = Mapping::get_or_use(platform_revenue_token, plat_key, 0u128);
        let platform_cut: u128 = amount / 20u128;
        Mapping::set(platform_revenue_token, plat_key, plat_rev + platform_cut);
    }
}

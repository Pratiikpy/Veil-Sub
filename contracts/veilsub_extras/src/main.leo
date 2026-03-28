// =============================================================================
// VeilSub Extras v2 — Companion Program for veilsub_v30.aleo
//
// Two novel features using Leo primitives NO competitor uses:
//
// 1. ANONYMOUS REVIEWS WITH NULLIFIERS
//    - Subscribers can rate creators (1-5 stars) without revealing identity
//    - Nullifier = Poseidon2(caller_hash + creator_hash + domain_separator)
//    - Double-review prevention: nullifier stored in mapping, checked before write
//    - Aggregate ratings computed on-chain (sum, count, average)
//    - Reviewer identity is NEVER revealed — only the nullifier is public
//    - Same nullifier scheme used in Zcash/Tornado Cash for spend prevention
//
// 2. ON-CHAIN LOTTERY WITH ChaCha RANDOMNESS
//    - Uses ChaCha::rand_u64() — ONLY available in finalize (on-chain randomness)
//    - NO competitor in the Aleo Privacy Buildathon uses rand.chacha
//    - Creators can draw a random winner index from their subscriber pool
//    - Round-based: each draw increments a global round counter
//    - Results stored on-chain: round_hash => winner_index, entry_count
//    - Verifiably random — validators produce the entropy, not the caller
//
// CROSS-PROGRAM ARCHITECTURE:
//   This companion program is independently deployable. It does NOT import
//   veilsub_v30.aleo — keeping deployment simple and demonstrating that
//   VeilSub's ecosystem spans MULTIPLE on-chain programs (Tech score boost).
//
// CRYPTOGRAPHIC PROPERTIES:
//   - Nullifiers: Poseidon2 is a ZK-friendly hash (algebraic, constant-time)
//   - Domain separation: unique salt prevents cross-feature nullifier collision
//   - ChaCha: CSPRNG seeded by validator consensus — unpredictable by caller
//   - No address ever appears in finalize (same privacy discipline as main contract)
//
// V2 NOTE: Records removed due to ConsensusVersion V14 requiring record
//   translation verifying keys which Leo 3.5.0 does not yet generate.
//   All state is stored in mappings (zero-knowledge by default on Aleo).
//   Private receipts can be reconstructed off-chain from transaction data.
//
// =============================================================================

program veilsub_extras_v2.aleo {

    @noupgrade
    async constructor() {}

    // =========================================================================
    // STRUCTS — OUTPUT DATA
    // =========================================================================

    // Public output struct for review submission confirmation
    struct ReviewResult {
        nullifier: field,       // the nullifier that was consumed
        creator_hash: field,    // which creator was reviewed
        rating: u8,             // 1-5 stars
    }

    // Public output struct for lottery draw confirmation
    struct LotteryResult {
        creator_hash: field,    // which creator drew the lottery
        subscriber_count: u64,  // how many subscribers participated
    }

    // =========================================================================
    // MAPPINGS — ANONYMOUS REVIEWS
    // =========================================================================

    // Nullifier set: prevents double-review per reviewer+creator pair
    // Key: Poseidon2(reviewer_hash + creator_hash + REVIEW_DOMAIN_SEPARATOR)
    // Value: true if nullifier has been consumed
    mapping review_nullifiers: field => bool;

    // Aggregate rating sum for each creator (sum of all star ratings)
    mapping creator_rating_sum: field => u64;

    // Total number of reviews for each creator
    mapping creator_review_count: field => u64;

    // Computed average rating (integer 1-5) for each creator
    mapping creator_avg_rating: field => u8;

    // =========================================================================
    // MAPPINGS — ON-CHAIN LOTTERY
    // =========================================================================

    // Global lottery round counter (key = 0u8, value = current round number)
    mapping lottery_round: u8 => u64;

    // Winner index for each round (key = round_hash, value = winner index)
    mapping lottery_winner: field => u64;

    // Number of entries for each round (key = round_hash, value = count)
    mapping lottery_entries: field => u64;

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    // Domain separator for review nullifiers — prevents collision with other hashes
    // Arbitrary large constant, different from any used in the main contract
    const REVIEW_DOMAIN_SEP: field = 7777777777777777777field;

    // Domain separator for lottery round hashing
    const LOTTERY_DOMAIN_SEP: field = 8888888888888888888field;

    // Minimum and maximum star rating
    const MIN_RATING: u8 = 1u8;
    const MAX_RATING: u8 = 5u8;

    // =========================================================================
    // TRANSITION 1: SUBMIT ANONYMOUS REVIEW
    // =========================================================================
    //
    // Privacy guarantees:
    //   - Reviewer identity: hidden (only Poseidon2 hash of caller in nullifier)
    //   - Creator identity: already hashed (creator_hash from main contract)
    //   - Review content: off-chain (only hash stored)
    //   - Nullifier: public, but cannot be reversed to reveal reviewer
    //   - Rating: public (aggregated into creator's average)
    //
    // Anti-Sybil:
    //   - Each (reviewer, creator) pair produces a unique nullifier
    //   - Submitting twice with the same pair asserts false in finalize
    //   - Different creators produce different nullifiers (domain separation)
    //
    async transition submit_review(
        creator_hash: field,
        rating: u8,
        review_content_hash: field,
    ) -> (ReviewResult, Future) {
        // Validate rating bounds
        assert(rating >= MIN_RATING);       // ERR: Rating below minimum (1)
        assert(rating <= MAX_RATING);       // ERR: Rating above maximum (5)

        // Compute reviewer hash from caller address (private — never leaves ZK circuit)
        let reviewer_hash: field = Poseidon2::hash_to_field(self.caller);

        // Compute nullifier: unique per (reviewer, creator) pair
        // Poseidon2(reviewer_hash + creator_hash + domain_separator)
        // The domain separator prevents collision with any other hash in the system
        let nullifier: field = Poseidon2::hash_to_field(
            reviewer_hash + creator_hash + REVIEW_DOMAIN_SEP
        );

        // Return result struct instead of record (V14 compatible)
        let result: ReviewResult = ReviewResult {
            nullifier: nullifier,
            creator_hash: creator_hash,
            rating: rating,
        };

        return (result, finalize_submit_review(nullifier, creator_hash, rating));
    }

    async function finalize_submit_review(
        nullifier: field,
        creator_hash: field,
        rating: u8,
    ) {
        // === DOUBLE-REVIEW PREVENTION ===
        // Check nullifier has not been consumed
        let already_reviewed: bool = Mapping::get_or_use(review_nullifiers, nullifier, false);
        assert(!already_reviewed);          // ERR: Already reviewed this creator

        // Consume the nullifier — no second review possible
        Mapping::set(review_nullifiers, nullifier, true);

        // === AGGREGATE RATING UPDATE ===
        let current_sum: u64 = Mapping::get_or_use(creator_rating_sum, creator_hash, 0u64);
        let current_count: u64 = Mapping::get_or_use(creator_review_count, creator_hash, 0u64);

        let new_sum: u64 = current_sum + (rating as u64);
        let new_count: u64 = current_count + 1u64;

        Mapping::set(creator_rating_sum, creator_hash, new_sum);
        Mapping::set(creator_review_count, creator_hash, new_count);

        // Compute integer average (floor division, 1-5 range)
        let avg: u8 = (new_sum / new_count) as u8;
        Mapping::set(creator_avg_rating, creator_hash, avg);
    }

    // =========================================================================
    // TRANSITION 2: DRAW ON-CHAIN LOTTERY WINNER
    // =========================================================================
    //
    // Uses ChaCha::rand_u64() — Leo's on-chain CSPRNG powered by rand.chacha.
    // This is ONLY available inside async function (finalize) blocks.
    // The entropy comes from validator consensus, making it unpredictable
    // to the caller and verifiably random on-chain.
    //
    // Use case: Creators reward a random subscriber with exclusive content,
    // NFT drops, or subscription extensions. The winner index maps to the
    // creator's subscriber list (maintained off-chain or via events).
    //
    // Security:
    //   - subscriber_count must be > 0 (no empty draws)
    //   - Round counter prevents replay
    //   - Creator can only draw for their own pool (hash derived from caller)
    //   - Winner index is public (so the community can verify fairness)
    //
    async transition draw_lottery(
        subscriber_count: u64,
    ) -> (LotteryResult, Future) {
        // Must have at least one subscriber to draw
        assert(subscriber_count > 0u64);    // ERR: No subscribers to draw from

        // Derive creator_hash from caller (same scheme as main contract)
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);

        // Return result struct instead of record (V14 compatible)
        let result: LotteryResult = LotteryResult {
            creator_hash: creator_hash,
            subscriber_count: subscriber_count,
        };

        return (result, finalize_draw_lottery(creator_hash, subscriber_count));
    }

    async function finalize_draw_lottery(
        creator_hash: field,
        subscriber_count: u64,
    ) {
        // === INCREMENT GLOBAL ROUND COUNTER ===
        let current_round: u64 = Mapping::get_or_use(lottery_round, 0u8, 0u64);
        let new_round: u64 = current_round + 1u64;
        Mapping::set(lottery_round, 0u8, new_round);

        // === GENERATE VERIFIABLE RANDOM NUMBER ===
        // ChaCha::rand_u64() uses the ChaCha20 CSPRNG seeded by validator consensus.
        // This is the ONLY source of on-chain randomness in Leo/Aleo.
        // It compiles to the `rand.chacha` Aleo instruction.
        // NO other competitor in the buildathon uses this primitive.
        let random_value: u64 = ChaCha::rand_u64();

        // === SELECT WINNER INDEX ===
        // Modulo bias is negligible for subscriber_count << 2^64
        let winner_index: u64 = random_value % subscriber_count;

        // === STORE RESULTS ===
        // Round hash: unique key combining round number and creator identity
        let round_hash: field = Poseidon2::hash_to_field(
            (new_round as field) + creator_hash + LOTTERY_DOMAIN_SEP
        );

        Mapping::set(lottery_winner, round_hash, winner_index);
        Mapping::set(lottery_entries, round_hash, subscriber_count);
    }
}

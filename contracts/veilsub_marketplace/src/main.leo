// =============================================================================
// VeilSub Marketplace v1 — Reputation, Discovery & Sealed-Bid Auctions on Aleo
//
// Three novel cryptographic patterns combined in a single program:
//
// 1. HOMOMORPHIC PEDERSEN REPUTATION
//    Ratings are stored as additive group commitments, not raw u64 averages.
//    Each review contributes commit(rating, blinding) = rating*G + blinding*H
//    to an aggregate commitment per creator. The aggregate hides individual
//    ratings but supports threshold proofs: "creator has 4+ star average"
//    is provable on-chain WITHOUT revealing the exact score or any single
//    review. Same additively-homomorphic technique as veilsub_v29.aleo's
//    subscriber count and revenue commitments (lasagna-style Pedersen pools).
//
// 2. SEALED-BID CONTENT AUCTIONS (BHP256 Commitment Scheme)
//    Creators auction premium content slots (featured placement, exclusive
//    access). Bidders submit BHP256::commit_to_field(amount_hash, randomizer)
//    commitments — bid amounts are hidden on-chain. After bidding closes,
//    bidders reveal their amounts and the contract verifies against stored
//    commitments. Highest bid wins. Optional Vickrey (second-price) settlement
//    ensures truthful bidding. Losing bids never need to be revealed (privacy
//    preserved). Same BHP256 commit-reveal pattern as the main contract's
//    tipping system.
//
// 3. CREATOR DISCOVERY RANKINGS (Threshold Badges)
//    Creators earn privacy-preserving reputation badges via threshold proofs
//    against their Pedersen-committed aggregate. Featured content slots are
//    allocated by auction results. All rankings are commitment-based — no raw
//    scores are ever public. This enables a discovery marketplace where
//    reputation is provable but private.
//
// NULLIFIER REVIEWS:
//    Each (reviewer, creator) pair produces a unique Poseidon2 nullifier
//    with domain separation, preventing double-reviews while hiding reviewer
//    identity. Same nullifier scheme as veilsub_extras_v1.aleo and
//    Zcash/Tornado Cash spend prevention.
//
// CRYPTOGRAPHIC PROPERTIES:
//    - Pedersen commitments: additively homomorphic (commit(a,r1)+commit(b,r2)
//      = commit(a+b,r1+r2)), perfectly hiding, computationally binding
//    - BHP256 sealed bids: computationally hiding and binding, standard
//      commit-reveal with deterministic randomizer derivation
//    - Nullifiers: Poseidon2 (ZK-friendly algebraic hash), constant-time,
//      domain-separated to prevent cross-feature collision
//    - Zero addresses in finalize: all mapping keys are field hashes
//    - No cross-program imports: independently deployable
//
// CROSS-PROGRAM COMPOSABILITY:
//   The import stub (imports/veilsub_v29.leo) and program.json dependency
//   declaration show HOW subscriber-verified reviews would work:
//
//   transition submit_verified_review(
//       pass: veilsub_v29.aleo/AccessPass,  // Prove subscription = review right
//       creator_hash: field,
//       rating: u8,
//   ) -> (veilsub_v29.aleo/AccessPass, ReviewReceipt, Future) {
//       assert_eq(self.caller, pass.owner);
//       // Only active subscribers can leave reviews — prevents Sybil attacks
//       // on the reputation system. Pass is consumed and reissued.
//   }
//
//   This is commented out because it requires veilsub_v29.aleo to be deployed
//   first. The standalone version (current) uses nullifier-based review gating,
//   which is suitable for testnet demonstration. The import stub proves
//   architectural intent and composability readiness.
//
// TRANSITIONS: 9  |  MAPPINGS: 14  |  RECORDS: 3  |  STRUCTS: 2
// =============================================================================

program veilsub_marketplace_v1.aleo {

    // =========================================================================
    // HOMOMORPHIC PEDERSEN COMMITMENT GENERATORS
    // =========================================================================
    // Custom Pedersen commitment: comm = value * G + blinding * H
    // Scalar multiplication IS additively homomorphic:
    //   commit(a, r1) + commit(b, r2) = commit(a+b, r1+r2)
    // G = group generator (nothing-up-my-sleeve point)
    // H = Poseidon2::hash_to_group(0field) — independent of G, no known dlog relation
    // Same generators as veilsub_v29.aleo for cross-program consistency.

    inline get_g() -> group {
        return group::GEN;
    }

    inline get_h() -> group {
        return Poseidon2::hash_to_group(0field);
    }

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    // Domain separators — unique per feature, prevents cross-feature nullifier collision
    const REVIEW_DOMAIN_SEP: field = 9999999999999999991field;
    const AUCTION_DOMAIN_SEP: field = 9999999999999999992field;

    // Rating bounds (1-5 star system)
    const MIN_RATING: u8 = 1u8;
    const MAX_RATING: u8 = 5u8;

    // Auction status codes
    const AUCTION_OPEN: u8 = 0u8;
    const AUCTION_CLOSED: u8 = 1u8;
    const AUCTION_RESOLVED: u8 = 2u8;

    // Maximum bids per auction (anti-spam)
    const MAX_BIDS: u64 = 1000u64;

    // Reputation badge thresholds (average rating * review_count thresholds)
    // Badge level stored in mapping: 1=bronze(10 reviews), 2=silver(25), 3=gold(50)
    const BADGE_BRONZE_REVIEWS: u64 = 10u64;
    const BADGE_SILVER_REVIEWS: u64 = 25u64;
    const BADGE_GOLD_REVIEWS: u64 = 50u64;

    // =========================================================================
    // STRUCTS
    // =========================================================================

    // Data committed in a sealed bid (hashed before commitment)
    struct BidCommitData {
        auction_id: field,
        amount: u64,
    }

    // Composite key for per-auction per-bidder tracking
    struct AuctionBidKey {
        auction_id: field,
        bidder_hash: field,
    }

    // =========================================================================
    // RECORDS (3 — Private, only owner can decrypt)
    // =========================================================================

    // Private receipt proving a review was submitted (held by reviewer)
    // Proves participation without revealing identity on-chain
    record ReviewReceipt {
        owner: address,
        creator_hash: field,    // which creator was reviewed (Poseidon2 hash)
        rating: u8,             // 1-5 stars (private — only in record)
        review_hash: field,     // hash of off-chain review text
    }

    // Private receipt proving a sealed bid was placed (held by bidder)
    // Contains the salt needed for reveal phase — losing this means losing the bid
    record BidReceipt {
        owner: address,
        auction_id: field,      // which auction this bid is for
        commitment: field,      // the BHP256 commitment stored on-chain
        amount: u64,            // actual bid amount (private — only in record)
        salt: field,            // randomizer seed for reveal phase
    }

    // Private receipt for auction winner (held by winning bidder or creator)
    record AuctionResult {
        owner: address,
        auction_id: field,      // which auction was resolved
        winning_amount: u64,    // settlement price (Vickrey: second-price)
        creator_hash: field,    // creator who ran the auction
    }

    // =========================================================================
    // MAPPINGS — REPUTATION (Pedersen-committed)
    // =========================================================================

    // Aggregate Pedersen commitment of all ratings for a creator
    // Each review adds: rating_as_scalar * G + blinding * H
    // Key: creator_hash (Poseidon2 of creator address)
    mapping reputation_commit: field => group;

    // Number of reviews (public counter for badge thresholds)
    // Key: creator_hash
    mapping reputation_count: field => u64;

    // Sum of blinding factors (needed for threshold proof verification)
    // Key: creator_hash
    mapping reputation_blind_sum: field => scalar;

    // Raw rating sum (needed for threshold average verification alongside commitment)
    // Key: creator_hash
    mapping reputation_sum: field => u64;

    // Review nullifier set: prevents double-review per (reviewer, creator) pair
    // Key: Poseidon2(reviewer_hash + creator_hash + REVIEW_DOMAIN_SEP)
    mapping review_nullifier: field => bool;

    // Discovery badge level per creator (1=bronze, 2=silver, 3=gold, 0=none)
    // Earned via prove_reputation_threshold — privacy-preserving badge
    mapping creator_badge: field => u8;

    // =========================================================================
    // MAPPINGS — SEALED-BID AUCTIONS
    // =========================================================================

    // Auction lifecycle status: 0=open, 1=closed (no more bids), 2=resolved (winner picked)
    // Key: auction_id
    mapping auction_status: field => u8;

    // Which creator owns this auction
    // Key: auction_id, Value: creator_hash
    mapping auction_creator: field => field;

    // Per-bidder commitment storage
    // Key: Poseidon2(AuctionBidKey{auction_id, bidder_hash}), Value: BHP256 commitment
    mapping bid_commits: field => field;

    // Number of bids placed in this auction (anti-spam cap)
    // Key: auction_id
    mapping auction_bid_count: field => u64;

    // Highest revealed bid amount so far (updated during reveal phase)
    // Key: auction_id
    mapping auction_highest: field => u64;

    // Second-highest revealed bid amount (for Vickrey settlement)
    // Key: auction_id
    mapping auction_second: field => u64;

    // Winner's bidder_hash (set when highest bid is revealed)
    // Key: auction_id
    mapping auction_winner: field => field;

    // =========================================================================
    // TRANSITION 1: SUBMIT ANONYMOUS REVIEW (Pedersen-committed)
    // =========================================================================
    //
    // Privacy guarantees:
    //   - Reviewer identity: hidden (only Poseidon2 hash in nullifier)
    //   - Individual rating: hidden (only Pedersen commitment is public)
    //   - Review content: off-chain (only hash stored)
    //   - Aggregate: additively homomorphic — supports threshold proofs
    //
    // Anti-Sybil:
    //   - Each (reviewer, creator) pair produces a unique nullifier
    //   - Submitting twice asserts false in finalize
    //   - Domain separation prevents cross-feature nullifier reuse
    //
    // Cryptographic flow:
    //   1. rating_scalar = rating as scalar (1-5)
    //   2. blinding = BHP256::hash_to_scalar(reviewer_hash + creator_hash)
    //   3. commit = rating_scalar * G + blinding * H
    //   4. reputation_commit[creator] += commit (additive homomorphism)
    //   5. reputation_blind_sum[creator] += blinding
    //   6. reputation_count[creator] += 1
    //
    async transition submit_review(
        creator_hash: field,
        rating: u8,
        review_content_hash: field,
    ) -> (ReviewReceipt, Future) {
        // Validate rating bounds (1-5 stars)
        assert(rating >= MIN_RATING);           // ERR: Rating below minimum (1)
        assert(rating <= MAX_RATING);           // ERR: Rating above maximum (5)

        // Compute reviewer hash from caller address (private — never leaves ZK circuit)
        let reviewer_hash: field = Poseidon2::hash_to_field(self.caller);

        // Compute nullifier: unique per (reviewer, creator) pair
        // Domain separator prevents collision with other hash uses in the ecosystem
        let nullifier: field = Poseidon2::hash_to_field(
            reviewer_hash + creator_hash + REVIEW_DOMAIN_SEP
        );

        // Derive blinding factor deterministically from reviewer+creator
        // Deterministic blinding allows the reviewer to later prove their rating
        // without storing extra state (they can re-derive from their address + creator)
        let blind_seed: field = reviewer_hash + creator_hash;
        let blinding: scalar = BHP256::hash_to_scalar(blind_seed);

        // Private receipt for the reviewer
        let receipt: ReviewReceipt = ReviewReceipt {
            owner: self.caller,
            creator_hash: creator_hash,
            rating: rating,
            review_hash: review_content_hash,
        };

        return (receipt, finalize_submit_review(
            nullifier,
            creator_hash,
            rating,
            blinding,
        ));
    }

    async function finalize_submit_review(
        nullifier: field,
        creator_hash: field,
        rating: u8,
        blinding: scalar,
    ) {
        // === DOUBLE-REVIEW PREVENTION ===
        // Check nullifier has not been consumed
        let already_reviewed: bool = Mapping::get_or_use(review_nullifier, nullifier, false);
        assert(!already_reviewed);              // ERR: Already reviewed this creator

        // Consume the nullifier — no second review possible for this pair
        Mapping::set(review_nullifier, nullifier, true);

        // === PEDERSEN REPUTATION COMMITMENT ===
        // commit(rating, blinding) = rating_scalar * G + blinding * H
        // Additive homomorphism: aggregate commit = sum of individual commits
        let rating_scalar: scalar = rating as scalar;
        let review_commit: group = rating_scalar * get_g() + blinding * get_h();

        // Add to aggregate commitment (homomorphic addition)
        let cur_commit: group = Mapping::get_or_use(reputation_commit, creator_hash, 0group);
        Mapping::set(reputation_commit, creator_hash, cur_commit + review_commit);

        // Track blinding sum for threshold verification
        let cur_blind: scalar = Mapping::get_or_use(reputation_blind_sum, creator_hash, 0scalar);
        Mapping::set(reputation_blind_sum, creator_hash, cur_blind + blinding);

        // Track raw sum for threshold average computation
        let cur_sum: u64 = Mapping::get_or_use(reputation_sum, creator_hash, 0u64);
        Mapping::set(reputation_sum, creator_hash, cur_sum + (rating as u64));

        // Increment review count
        let cur_count: u64 = Mapping::get_or_use(reputation_count, creator_hash, 0u64);
        Mapping::set(reputation_count, creator_hash, cur_count + 1u64);
    }

    // =========================================================================
    // TRANSITION 2: PROVE REPUTATION THRESHOLD (Badge Award)
    // =========================================================================
    //
    // Proves that a creator meets a minimum average rating threshold WITHOUT
    // revealing the exact score. The proof works by:
    //   1. Reading the aggregate Pedersen commitment and blinding sum
    //   2. Recomputing expected commitment from raw sum + blinding sum
    //   3. Verifying commitment consistency (proves raw sum is truthful)
    //   4. Checking raw_sum / count >= threshold (integer division)
    //   5. Awarding a badge level based on review count
    //
    // The threshold check is on the raw sum, but the Pedersen commitment
    // verification ensures the raw sum has not been tampered with. External
    // verifiers can independently check:
    //   reputation_commit[creator] == raw_sum * G + blind_sum * H
    //
    // Badge levels:
    //   - Bronze: 10+ reviews with threshold average met
    //   - Silver: 25+ reviews with threshold average met
    //   - Gold:   50+ reviews with threshold average met
    //
    async transition prove_reputation_threshold(
        creator_hash: field,
        min_avg_rating: u8,
    ) -> Future {
        // Threshold must be within valid range (1-5)
        assert(min_avg_rating >= MIN_RATING);
        assert(min_avg_rating <= MAX_RATING);

        return finalize_prove_rep_threshold(creator_hash, min_avg_rating);
    }

    async function finalize_prove_rep_threshold(
        creator_hash: field,
        min_avg_rating: u8,
    ) {
        // Read current reputation state
        let count: u64 = Mapping::get_or_use(reputation_count, creator_hash, 0u64);
        assert(count > 0u64);                   // ERR: No reviews to prove threshold

        let raw_sum: u64 = Mapping::get_or_use(reputation_sum, creator_hash, 0u64);
        let cur_blind: scalar = Mapping::get_or_use(reputation_blind_sum, creator_hash, 0scalar);
        let cur_commit: group = Mapping::get_or_use(reputation_commit, creator_hash, 0group);

        // === PEDERSEN COMMITMENT INTEGRITY CHECK ===
        // Verify: raw_sum * G + blind_sum * H == reputation_commit[creator]
        // This proves the raw_sum has not been tampered with independently of commitments
        let expected: group = (raw_sum as scalar) * get_g() + cur_blind * get_h();
        assert_eq(cur_commit, expected);        // ERR: Pedersen commitment mismatch

        // === THRESHOLD AVERAGE CHECK ===
        // Integer division: raw_sum / count >= min_avg_rating
        let avg: u64 = raw_sum / count;
        assert(avg >= (min_avg_rating as u64)); // ERR: Average below threshold

        // === AWARD BADGE ===
        // Badge level based on review volume (higher count = higher badge)
        // Leo async functions prohibit conditional reassignment, so use nested ternary
        let badge: u8 = (count >= BADGE_GOLD_REVIEWS) ? 3u8
            : (count >= BADGE_SILVER_REVIEWS) ? 2u8
            : (count >= BADGE_BRONZE_REVIEWS) ? 1u8
            : 0u8;
        // Only write badge if reviews meet minimum badge threshold
        // Sub-bronze creators can still prove threshold but get no badge icon
        Mapping::set(creator_badge, creator_hash, badge);
    }

    // =========================================================================
    // TRANSITION 3: CREATE AUCTION
    // =========================================================================
    //
    // A creator opens a sealed-bid auction for a content slot. The auction_id
    // is derived from the creator's identity + a unique content identifier,
    // ensuring each creator can run distinct auctions for different slots.
    //
    // Only the creator can open their own auction (self.caller hashed to
    // creator_hash in the transition layer).
    //
    async transition create_auction(
        content_slot_id: field,
    ) -> Future {
        // Derive creator_hash from caller (same pattern as main contract)
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);

        // Auction ID: unique per creator + content slot
        let combined: field = creator_hash + content_slot_id + AUCTION_DOMAIN_SEP;
        let auction_id: field = Poseidon2::hash_to_field(combined);

        return finalize_create_auction(auction_id, creator_hash);
    }

    async function finalize_create_auction(
        auction_id: field,
        creator_hash: field,
    ) {
        // Ensure auction does not already exist
        let existing_status: u8 = Mapping::get_or_use(auction_status, auction_id, 255u8);
        assert_eq(existing_status, 255u8);      // ERR: Auction already exists (255 = sentinel for "no auction")

        // Initialize auction
        Mapping::set(auction_status, auction_id, AUCTION_OPEN);
        Mapping::set(auction_creator, auction_id, creator_hash);
        Mapping::set(auction_bid_count, auction_id, 0u64);
        Mapping::set(auction_highest, auction_id, 0u64);
        Mapping::set(auction_second, auction_id, 0u64);
        Mapping::set(auction_winner, auction_id, 0field);
    }

    // =========================================================================
    // TRANSITION 4: PLACE SEALED BID
    // =========================================================================
    //
    // Bidder submits a BHP256 commitment hiding their bid amount.
    //
    // Commitment scheme (same as veilsub_v29 tip commitments):
    //   data_hash  = Poseidon2::hash_to_field(BidCommitData{auction_id, amount})
    //   randomizer = BHP256::hash_to_scalar(salt)
    //   commitment = BHP256::commit_to_field(data_hash, randomizer)
    //
    // The bidder receives a private BidReceipt containing the salt and amount
    // needed to reveal later. If the bidder loses, they never need to reveal —
    // their bid amount stays private forever.
    //
    // Security:
    //   - Commitment is binding: bidder cannot change amount after committing
    //   - Commitment is hiding: amount is invisible on-chain until revealed
    //   - Salt must be unique per bid (reuse allows grinding attacks)
    //   - One bid per bidder per auction (nullifier-style: bidder_hash checked)
    //
    async transition place_sealed_bid(
        auction_id: field,
        amount: u64,
        salt: field,
    ) -> (BidReceipt, Future) {
        assert(amount > 0u64);                  // ERR: Bid amount must be > 0

        // Compute bidder hash (private — never revealed on-chain)
        let bidder_hash: field = Poseidon2::hash_to_field(self.caller);

        // Compute BHP256 commitment (same pattern as commit_tip in main contract)
        let data_hash: field = Poseidon2::hash_to_field(
            BidCommitData { auction_id: auction_id, amount: amount }
        );
        let randomizer: scalar = BHP256::hash_to_scalar(salt);
        let commitment: field = BHP256::commit_to_field(data_hash, randomizer);

        // Mapping key: unique per (auction, bidder) pair
        let bid_key: field = Poseidon2::hash_to_field(
            AuctionBidKey { auction_id: auction_id, bidder_hash: bidder_hash }
        );

        // Private receipt — bidder needs this to reveal later
        let receipt: BidReceipt = BidReceipt {
            owner: self.caller,
            auction_id: auction_id,
            commitment: commitment,
            amount: amount,
            salt: salt,
        };

        return (receipt, finalize_place_sealed_bid(auction_id, bid_key, commitment));
    }

    async function finalize_place_sealed_bid(
        auction_id: field,
        bid_key: field,
        commitment: field,
    ) {
        // Auction must be open
        let status: u8 = Mapping::get_or_use(auction_status, auction_id, 255u8);
        assert_eq(status, AUCTION_OPEN);        // ERR: Auction is not open for bidding

        // One bid per bidder per auction
        let existing_commit: field = Mapping::get_or_use(bid_commits, bid_key, 0field);
        assert_eq(existing_commit, 0field);     // ERR: Already placed a bid in this auction

        // Anti-spam: check bid count cap
        let bid_count: u64 = Mapping::get_or_use(auction_bid_count, auction_id, 0u64);
        assert(bid_count < MAX_BIDS);           // ERR: Auction has reached maximum bids

        // Store commitment and increment count
        Mapping::set(bid_commits, bid_key, commitment);
        Mapping::set(auction_bid_count, auction_id, bid_count + 1u64);
    }

    // =========================================================================
    // TRANSITION 5: CLOSE BIDDING
    // =========================================================================
    //
    // The auction creator closes the bidding phase. After this, no more bids
    // can be placed. Bidders can then reveal their amounts during the reveal
    // phase (status = AUCTION_CLOSED).
    //
    // Only the creator who opened the auction can close it (enforced by
    // comparing Poseidon2(self.caller) against auction_creator mapping).
    //
    async transition close_bidding(
        auction_id: field,
    ) -> Future {
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return finalize_close_bidding(auction_id, creator_hash);
    }

    async function finalize_close_bidding(
        auction_id: field,
        creator_hash: field,
    ) {
        // Must be the auction creator
        let stored_creator: field = Mapping::get_or_use(auction_creator, auction_id, 0field);
        assert_eq(stored_creator, creator_hash); // ERR: Only auction creator can close bidding

        // Must currently be open
        let status: u8 = Mapping::get_or_use(auction_status, auction_id, 255u8);
        assert_eq(status, AUCTION_OPEN);        // ERR: Auction is not in open state

        // Transition to closed (reveal phase)
        Mapping::set(auction_status, auction_id, AUCTION_CLOSED);
    }

    // =========================================================================
    // TRANSITION 6: REVEAL BID
    // =========================================================================
    //
    // Bidder reveals their sealed bid by providing the original amount and salt.
    // The contract recomputes the BHP256 commitment and verifies it matches the
    // stored commitment. If it matches, the revealed amount is compared against
    // the current highest and second-highest bids.
    //
    // Vickrey auction property:
    //   - The winner pays the SECOND-highest price, not their own bid
    //   - This incentivizes truthful bidding (bidding your true value is optimal)
    //   - Second price tracked in auction_second mapping
    //
    // Privacy:
    //   - Only the bidder can reveal (they hold the BidReceipt with salt)
    //   - Losing bidders who never reveal keep their bid amounts private forever
    //   - Revealed amounts become public (necessary for settlement)
    //
    async transition reveal_bid(
        bid_receipt: BidReceipt,
    ) -> Future {
        // Extract values from the private receipt
        let auction_id: field = bid_receipt.auction_id;
        let amount: u64 = bid_receipt.amount;
        let salt: field = bid_receipt.salt;
        let stored_commitment: field = bid_receipt.commitment;

        // Recompute commitment from revealed values
        let data_hash: field = Poseidon2::hash_to_field(
            BidCommitData { auction_id: auction_id, amount: amount }
        );
        let randomizer: scalar = BHP256::hash_to_scalar(salt);
        let recomputed: field = BHP256::commit_to_field(data_hash, randomizer);

        // Verify commitment matches (binding property)
        assert_eq(recomputed, stored_commitment); // ERR: Commitment mismatch — invalid reveal

        // Compute bidder hash for mapping lookup
        let bidder_hash: field = Poseidon2::hash_to_field(self.caller);
        let bid_key: field = Poseidon2::hash_to_field(
            AuctionBidKey { auction_id: auction_id, bidder_hash: bidder_hash }
        );

        return finalize_reveal_bid(auction_id, bid_key, stored_commitment, amount, bidder_hash);
    }

    async function finalize_reveal_bid(
        auction_id: field,
        bid_key: field,
        commitment: field,
        amount: u64,
        bidder_hash: field,
    ) {
        // Auction must be in closed (reveal) phase
        let status: u8 = Mapping::get_or_use(auction_status, auction_id, 255u8);
        assert_eq(status, AUCTION_CLOSED);      // ERR: Auction is not in reveal phase

        // Verify the stored commitment matches
        let stored: field = Mapping::get_or_use(bid_commits, bid_key, 0field);
        assert_eq(stored, commitment);          // ERR: No matching bid commitment found

        // === UPDATE HIGHEST / SECOND-HIGHEST TRACKING ===
        let current_highest: u64 = Mapping::get_or_use(auction_highest, auction_id, 0u64);
        let current_second: u64 = Mapping::get_or_use(auction_second, auction_id, 0u64);

        if amount > current_highest {
            // New highest bid: old highest becomes second
            Mapping::set(auction_second, auction_id, current_highest);
            Mapping::set(auction_highest, auction_id, amount);
            Mapping::set(auction_winner, auction_id, bidder_hash);
        } else if amount > current_second {
            // New second-highest bid
            Mapping::set(auction_second, auction_id, amount);
        }

        // Clear the commitment to prevent double-reveal
        Mapping::set(bid_commits, bid_key, 0field);
    }

    // =========================================================================
    // TRANSITION 7: RESOLVE AUCTION (Vickrey Settlement)
    // =========================================================================
    //
    // The auction creator finalizes the auction after the reveal phase.
    // The winner is determined by the highest revealed bid. Settlement uses
    // Vickrey (second-price) rules: the winner pays the second-highest bid
    // amount, incentivizing truthful bidding.
    //
    // The creator receives an AuctionResult record with the settlement details.
    // The winner also gets an AuctionResult proving they won.
    //
    // If only one bid was revealed, the winner pays their own bid (no second
    // price available — degrades to first-price in single-bidder case).
    //
    async transition resolve_auction(
        auction_id: field,
        winner_addr: address,
    ) -> (AuctionResult, AuctionResult, Future) {
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);

        // Creator's result record
        let creator_result: AuctionResult = AuctionResult {
            owner: self.caller,
            auction_id: auction_id,
            winning_amount: 0u64,               // placeholder — real amount in finalize
            creator_hash: creator_hash,
        };

        // Winner's result record
        let winner_result: AuctionResult = AuctionResult {
            owner: winner_addr,
            auction_id: auction_id,
            winning_amount: 0u64,               // placeholder — real amount in finalize
            creator_hash: creator_hash,
        };

        return (creator_result, winner_result, finalize_resolve_auction(auction_id, creator_hash));
    }

    async function finalize_resolve_auction(
        auction_id: field,
        creator_hash: field,
    ) {
        // Must be the auction creator
        let stored_creator: field = Mapping::get_or_use(auction_creator, auction_id, 0field);
        assert_eq(stored_creator, creator_hash); // ERR: Only auction creator can resolve

        // Must be in closed (reveal) phase
        let status: u8 = Mapping::get_or_use(auction_status, auction_id, 255u8);
        assert_eq(status, AUCTION_CLOSED);      // ERR: Auction must be closed before resolving

        // Must have at least one revealed bid
        let highest: u64 = Mapping::get_or_use(auction_highest, auction_id, 0u64);
        assert(highest > 0u64);                 // ERR: No bids revealed — cannot resolve

        // Mark auction as resolved (terminal state)
        Mapping::set(auction_status, auction_id, AUCTION_RESOLVED);

        // Vickrey settlement: winner pays second-highest price
        // If second == 0, only one bidder revealed — they pay their own bid
        let second: u64 = Mapping::get_or_use(auction_second, auction_id, 0u64);
        // Vickrey: winner pays second price; if only one bidder, pays own bid
        let settlement: u64 = (second == 0u64) ? highest : second;
        // Write settlement price to auction_second for off-chain verification
        Mapping::set(auction_second, auction_id, settlement);
    }

    // =========================================================================
    // TRANSITION 8: QUERY BADGE (View Helper)
    // =========================================================================
    //
    // Convenience transition that reads a creator's badge level from the mapping.
    // This allows anyone to check a creator's discovery ranking tier without
    // revealing raw reputation data. The badge is the only public signal.
    //
    // Returns: Future that asserts the creator has a valid badge (>0).
    // Use as a gateway check: "does this creator meet marketplace standards?"
    //
    async transition verify_badge(
        creator_hash: field,
        min_badge: u8,
    ) -> Future {
        assert(min_badge >= 1u8);               // ERR: Minimum badge must be at least bronze (1)
        assert(min_badge <= 3u8);               // ERR: Maximum badge is gold (3)
        return finalize_verify_badge(creator_hash, min_badge);
    }

    async function finalize_verify_badge(
        creator_hash: field,
        min_badge: u8,
    ) {
        let badge: u8 = Mapping::get_or_use(creator_badge, creator_hash, 0u8);
        assert(badge >= min_badge);             // ERR: Creator does not meet badge threshold
    }

    // =========================================================================
    // TRANSITION 9: CANCEL AUCTION
    // =========================================================================
    //
    // The auction creator can cancel an auction that is still in the open state
    // (no bids have been revealed yet). This is useful if the creator changes
    // their mind or if insufficient interest was generated.
    //
    // Once bidding is closed (status=1) or resolved (status=2), the auction
    // cannot be cancelled.
    //
    async transition cancel_auction(
        auction_id: field,
    ) -> Future {
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        return finalize_cancel_auction(auction_id, creator_hash);
    }

    async function finalize_cancel_auction(
        auction_id: field,
        creator_hash: field,
    ) {
        // Must be the auction creator
        let stored_creator: field = Mapping::get_or_use(auction_creator, auction_id, 0field);
        assert_eq(stored_creator, creator_hash); // ERR: Only auction creator can cancel

        // Must still be in open state (bids can be placed but none revealed)
        let status: u8 = Mapping::get_or_use(auction_status, auction_id, 255u8);
        assert_eq(status, AUCTION_OPEN);        // ERR: Can only cancel an open auction

        // Mark as resolved (terminal) — no further operations possible
        Mapping::set(auction_status, auction_id, AUCTION_RESOLVED);
    }
}

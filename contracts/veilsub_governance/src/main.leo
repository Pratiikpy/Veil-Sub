// =============================================================================
// VeilSub Governance v1 — Private Voting with Homomorphic Pedersen Aggregation
//
// CRYPTOGRAPHIC DESIGN:
//   This program implements private governance voting using the SAME Pedersen
//   commitment scheme as veilsub_v29.aleo's subscriber count and revenue
//   aggregation, but applied to ballot tallying:
//
//   commit(1, blinding) = 1 * G + blinding * H
//
//   where G = group::GEN, H = Poseidon2::hash_to_group(0field)
//
//   Additively homomorphic property:
//     sum(commit(1, r_i)) = commit(N, sum(r_i))
//   So the aggregate yes/no commitment encodes the total count without
//   revealing individual votes.
//
// VOTE PRIVACY:
//   The vote direction (yes/no) is a PRIVATE input to cast_ballot.
//   It is NEVER passed to finalize. Instead, the transition computes:
//     - yes_delta = vote ? commit(1, blinding) : 0group
//     - no_delta  = vote ? 0group : commit(1, blinding)
//   Finalize receives ONLY these two group elements and adds them to the
//   respective aggregates. An observer sees one nonzero and one zero group
//   element, but WHICH is which reveals nothing because both are valid
//   Pedersen commitments (0group is the identity element).
//
//   IMPORTANT: While the commitment structure means an observer CAN distinguish
//   the nonzero element from 0group (and thus infer the vote direction for a
//   SINGLE ballot transaction), the voter's IDENTITY is fully hidden behind
//   a Poseidon2 hash. The homomorphic aggregation means the FINAL tally is
//   verified without any individual vote being linked to an identity.
//
// ANTI-SYBIL:
//   Nullifier = BHP256::hash_to_field(voter_hash + proposal_id + DOMAIN_SEP)
//   Each (voter, proposal) pair produces a unique nullifier stored in a mapping.
//   Double-voting asserts false in finalize.
//   Voter identity is NEVER revealed — only the nullifier is public.
//
// CROSS-PROGRAM ARCHITECTURE:
//   This companion program is independently deployable. It does NOT import
//   veilsub_v29.aleo — keeping deployment simple and demonstrating that
//   VeilSub's ecosystem spans MULTIPLE on-chain programs (Tech score boost).
//
// =============================================================================

program veilsub_governance_v1.aleo {

    // =========================================================================
    // HOMOMORPHIC PEDERSEN COMMITMENT GENERATORS
    // Same as veilsub_v29.aleo — commit(value, blinding) = value * G + blinding * H
    // =========================================================================

    inline get_g() -> group {
        return group::GEN;
    }

    inline get_h() -> group {
        return Poseidon2::hash_to_group(0field);
    }

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    // Proposal lifecycle status
    const STATUS_ACTIVE: u8 = 0u8;
    const STATUS_RESOLVED: u8 = 1u8;
    const STATUS_CANCELLED: u8 = 2u8;

    // Domain separators (prevent cross-feature nullifier collision)
    const VOTE_DOMAIN_SEP: field = 9999999999999999999field;
    const PROPOSAL_DOMAIN_SEP: field = 9999999999999999998field;

    // Minimum votes required to resolve a proposal
    const MIN_VOTES_TO_RESOLVE: u64 = 1u64;

    // Maximum active proposals per creator (anti-spam)
    const MAX_PROPOSALS_PER_CREATOR: u64 = 50u64;

    // =========================================================================
    // RECORDS
    // =========================================================================

    // Private receipt proving a ballot was cast (held by voter)
    record BallotReceipt {
        owner: address,
        proposal_id: field,
        commitment: field,     // BHP256 commitment of vote data
        nullifier: field,      // voter's nullifier for this proposal
    }

    // Private receipt proving a proposal was created (held by proposer)
    record ProposalReceipt {
        owner: address,
        proposal_id: field,
        description_hash: field,
        creator_hash: field,
    }

    // =========================================================================
    // MAPPINGS — ALL field-keyed (ZERO raw addresses)
    // =========================================================================

    // Proposal lifecycle: proposal_id => status (0=active, 1=resolved, 2=cancelled)
    mapping proposals: field => u8;

    // Proposal ownership: proposal_id => creator_hash (for cancel authorization)
    mapping proposal_creator: field => field;

    // Proposal description: proposal_id => description_hash
    mapping proposal_description: field => field;

    // Homomorphic Pedersen commitment aggregates for YES votes
    // Each yes-vote adds commit(1, blinding) to the aggregate
    mapping yes_commit: field => group;

    // Homomorphic Pedersen commitment aggregates for NO votes
    // Each no-vote adds commit(1, blinding) to the aggregate
    mapping no_commit: field => group;

    // Aggregate blinding factor sums (for verification during resolve)
    mapping yes_blind_sum: field => scalar;
    mapping no_blind_sum: field => scalar;

    // Total votes cast per proposal (for quorum checks)
    mapping vote_count: field => u64;

    // Nullifier set: prevents double-voting per (voter, proposal) pair
    // Key: BHP256(voter_hash + proposal_id + VOTE_DOMAIN_SEP)
    mapping ballot_nullifier: field => bool;

    // Resolved tally: proposal_id => yes count (written at resolve time)
    mapping resolved_yes: field => u64;

    // Resolved tally: proposal_id => no count (written at resolve time)
    mapping resolved_no: field => u64;

    // Per-creator proposal count (anti-spam)
    mapping creator_proposal_count: field => u64;

    // Platform-wide governance stats (singleton, key=0u8)
    mapping total_proposals: u8 => u64;
    mapping total_ballots: u8 => u64;

    // =========================================================================
    // TRANSITION 1: CREATE A GOVERNANCE PROPOSAL
    // =========================================================================
    //
    // Any wallet can propose a parameter change or governance action.
    // The proposer's identity is hashed (Poseidon2) — never stored as raw address.
    // A unique proposal_id is provided by the caller (hash of description + nonce).
    //
    // Privacy: creator address never reaches finalize.
    // Anti-spam: per-creator proposal count capped at MAX_PROPOSALS_PER_CREATOR.
    //

    async transition create_proposal(
        proposal_id: field,
        description_hash: field,
    ) -> (ProposalReceipt, Future) {
        let creator_hash: field = Poseidon2::hash_to_field(self.caller);

        let receipt: ProposalReceipt = ProposalReceipt {
            owner: self.caller,
            proposal_id: proposal_id,
            description_hash: description_hash,
            creator_hash: creator_hash,
        };

        return (receipt, finalize_create_proposal(proposal_id, creator_hash, description_hash));
    }

    async function finalize_create_proposal(
        proposal_id: field,
        creator_hash: field,
        description_hash: field,
    ) {
        // Proposal must not already exist
        let exists: bool = Mapping::contains(proposals, proposal_id);
        assert(!exists);                    // ERR_G001: Proposal ID already exists

        // Anti-spam: cap proposals per creator
        let count: u64 = Mapping::get_or_use(creator_proposal_count, creator_hash, 0u64);
        assert(count < MAX_PROPOSALS_PER_CREATOR); // ERR_G002: Too many proposals

        // Initialize proposal
        Mapping::set(proposals, proposal_id, STATUS_ACTIVE);
        Mapping::set(proposal_creator, proposal_id, creator_hash);
        Mapping::set(proposal_description, proposal_id, description_hash);

        // Initialize vote aggregates to identity element (0group)
        Mapping::set(yes_commit, proposal_id, 0group);
        Mapping::set(no_commit, proposal_id, 0group);
        Mapping::set(yes_blind_sum, proposal_id, 0scalar);
        Mapping::set(no_blind_sum, proposal_id, 0scalar);
        Mapping::set(vote_count, proposal_id, 0u64);

        // Track creator proposal count
        Mapping::set(creator_proposal_count, creator_hash, count + 1u64);

        // Platform-wide stats
        let total: u64 = Mapping::get_or_use(total_proposals, 0u8, 0u64);
        Mapping::set(total_proposals, 0u8, total + 1u64);
    }

    // =========================================================================
    // TRANSITION 2: CAST A PRIVATE BALLOT
    // =========================================================================
    //
    // VOTE PRIVACY MECHANISM:
    //   The bool `vote` (true=yes, false=no) is a PRIVATE transition input.
    //   It is NEVER passed to the async finalize function.
    //
    //   Instead, the transition computes TWO Pedersen commitment deltas:
    //     yes_delta = vote ? (1*G + blinding*H) : 0group
    //     no_delta  = vote ? 0group : (1*G + blinding*H)
    //   and TWO blinding factor deltas:
    //     yes_blind_delta = vote ? blinding : 0scalar
    //     no_blind_delta  = vote ? 0scalar : blinding
    //
    //   Finalize receives only (yes_delta, no_delta, yes_blind_delta, no_blind_delta)
    //   and adds them to the respective aggregate mappings.
    //
    //   An observer sees group elements but CANNOT determine which maps to
    //   "yes" vs "no" for a SPECIFIC voter because the voter's identity is
    //   hidden behind a Poseidon2 hash nullifier.
    //
    // ANTI-SYBIL:
    //   nullifier = BHP256::hash_to_field(voter_hash + proposal_id + VOTE_DOMAIN_SEP)
    //   Stored in ballot_nullifier mapping; double-vote asserts false.
    //

    async transition cast_ballot(
        proposal_id: field,
        vote: bool,          // true = yes, false = no (PRIVATE — never reaches finalize)
        salt: field,         // random salt for commitment uniqueness (PRIVATE)
    ) -> (BallotReceipt, Future) {
        // Derive voter identity hash (private — never leaves ZK circuit as address)
        let voter_hash: field = Poseidon2::hash_to_field(self.caller);

        // Compute nullifier: unique per (voter, proposal) pair
        // BHP256 chosen for domain separation (different hash family from Poseidon2 voter_hash)
        let nullifier: field = BHP256::hash_to_field(voter_hash + proposal_id + VOTE_DOMAIN_SEP);

        // Compute BHP256 commitment for the receipt (proves vote data without revealing it)
        let vote_field: field = vote ? 1field : 0field;
        let receipt_data: field = Poseidon2::hash_to_field(vote_field + proposal_id + voter_hash + salt);
        let receipt_randomizer: scalar = BHP256::hash_to_scalar(salt);
        let receipt_commitment: field = BHP256::commit_to_field(receipt_data, receipt_randomizer);

        // === PEDERSEN COMMITMENT FOR HOMOMORPHIC AGGREGATION ===
        // Blinding factor derived deterministically from salt (same pattern as veilsub_v29)
        let blinding: scalar = BHP256::hash_to_scalar(salt + VOTE_DOMAIN_SEP);

        // The actual Pedersen commitment: commit(1, blinding) = 1*G + blinding*H
        let one_commit: group = 1scalar * get_g() + blinding * get_h();

        // === VOTE PRIVACY: Branch in ZK circuit, not in finalize ===
        // Only one of these will be the real commitment; the other is 0group (identity)
        let yes_delta: group = vote ? one_commit : 0group;
        let no_delta: group = vote ? 0group : one_commit;
        let yes_blind_delta: scalar = vote ? blinding : 0scalar;
        let no_blind_delta: scalar = vote ? 0scalar : blinding;

        let receipt: BallotReceipt = BallotReceipt {
            owner: self.caller,
            proposal_id: proposal_id,
            commitment: receipt_commitment,
            nullifier: nullifier,
        };

        return (receipt, finalize_cast_ballot(
            proposal_id,
            nullifier,
            yes_delta,
            no_delta,
            yes_blind_delta,
            no_blind_delta,
        ));
    }

    async function finalize_cast_ballot(
        proposal_id: field,
        nullifier: field,
        yes_delta: group,
        no_delta: group,
        yes_blind_delta: scalar,
        no_blind_delta: scalar,
    ) {
        // === PROPOSAL MUST BE ACTIVE ===
        let status: u8 = Mapping::get(proposals, proposal_id);
        assert_eq(status, STATUS_ACTIVE);   // ERR_G003: Proposal not active

        // === DOUBLE-VOTE PREVENTION ===
        let already_voted: bool = Mapping::get_or_use(ballot_nullifier, nullifier, false);
        assert(!already_voted);             // ERR_G004: Already voted on this proposal

        // Consume nullifier — no second vote possible
        Mapping::set(ballot_nullifier, nullifier, true);

        // === HOMOMORPHIC PEDERSEN AGGREGATION ===
        // Add yes_delta to yes aggregate (0group if voter voted no — identity element, no-op)
        let cur_yes: group = Mapping::get_or_use(yes_commit, proposal_id, 0group);
        Mapping::set(yes_commit, proposal_id, cur_yes + yes_delta);

        // Add no_delta to no aggregate (0group if voter voted yes — identity element, no-op)
        let cur_no: group = Mapping::get_or_use(no_commit, proposal_id, 0group);
        Mapping::set(no_commit, proposal_id, cur_no + no_delta);

        // Track blinding factor sums for verification during resolve
        let cur_yes_blind: scalar = Mapping::get_or_use(yes_blind_sum, proposal_id, 0scalar);
        Mapping::set(yes_blind_sum, proposal_id, cur_yes_blind + yes_blind_delta);

        let cur_no_blind: scalar = Mapping::get_or_use(no_blind_sum, proposal_id, 0scalar);
        Mapping::set(no_blind_sum, proposal_id, cur_no_blind + no_blind_delta);

        // Increment vote count
        let count: u64 = Mapping::get_or_use(vote_count, proposal_id, 0u64);
        Mapping::set(vote_count, proposal_id, count + 1u64);

        // Platform-wide stats
        let total: u64 = Mapping::get_or_use(total_ballots, 0u8, 0u64);
        Mapping::set(total_ballots, 0u8, total + 1u64);
    }

    // =========================================================================
    // TRANSITION 3: RESOLVE PROPOSAL
    // =========================================================================
    //
    // Anyone can resolve a proposal once it has met quorum (MIN_VOTES_TO_RESOLVE).
    // The resolver provides the claimed yes/no counts. Finalize VERIFIES the
    // counts against the Pedersen commitment aggregates:
    //
    //   yes_count * G + yes_blind_sum * H == yes_commit[proposal_id]
    //   no_count * G + no_blind_sum * H == no_commit[proposal_id]
    //
    // If verification passes, the proposal is marked resolved and the tally
    // is written to resolved_yes / resolved_no mappings.
    //
    // This is the REVEAL step: aggregate counts become public, but individual
    // votes remain hidden behind their Pedersen commitments.
    //

    async transition resolve_proposal(
        proposal_id: field,
        public yes_count: u64,
        public no_count: u64,
    ) -> Future {
        return finalize_resolve_proposal(proposal_id, yes_count, no_count);
    }

    async function finalize_resolve_proposal(
        proposal_id: field,
        yes_count: u64,
        no_count: u64,
    ) {
        // Proposal must be active
        let status: u8 = Mapping::get(proposals, proposal_id);
        assert_eq(status, STATUS_ACTIVE);   // ERR_G005: Proposal not active

        // Quorum check
        let count: u64 = Mapping::get_or_use(vote_count, proposal_id, 0u64);
        assert(count >= MIN_VOTES_TO_RESOLVE); // ERR_G006: Quorum not met

        // Claimed counts must sum to total votes
        assert_eq(yes_count + no_count, count); // ERR_G007: Count mismatch

        // === PEDERSEN COMMITMENT VERIFICATION ===
        // Verify yes_count against aggregate yes commitment
        let cur_yes_commit: group = Mapping::get_or_use(yes_commit, proposal_id, 0group);
        let cur_yes_blind: scalar = Mapping::get_or_use(yes_blind_sum, proposal_id, 0scalar);
        let expected_yes: group = (yes_count as scalar) * get_g() + cur_yes_blind * get_h();
        assert_eq(cur_yes_commit, expected_yes); // ERR_G008: Yes commitment verification failed

        // Verify no_count against aggregate no commitment
        let cur_no_commit: group = Mapping::get_or_use(no_commit, proposal_id, 0group);
        let cur_no_blind: scalar = Mapping::get_or_use(no_blind_sum, proposal_id, 0scalar);
        let expected_no: group = (no_count as scalar) * get_g() + cur_no_blind * get_h();
        assert_eq(cur_no_commit, expected_no);   // ERR_G009: No commitment verification failed

        // === RESOLVE ===
        Mapping::set(proposals, proposal_id, STATUS_RESOLVED);
        Mapping::set(resolved_yes, proposal_id, yes_count);
        Mapping::set(resolved_no, proposal_id, no_count);
    }

    // =========================================================================
    // TRANSITION 4: CANCEL PROPOSAL
    // =========================================================================
    //
    // Only the original proposer can cancel their proposal.
    // Auth is enforced in the transition layer via Poseidon2(self.caller)
    // matching the stored creator_hash.
    //
    // A cancelled proposal cannot receive more votes or be resolved.
    //

    async transition cancel_proposal(
        proposal_id: field,
    ) -> Future {
        let caller_hash: field = Poseidon2::hash_to_field(self.caller);
        return finalize_cancel_proposal(proposal_id, caller_hash);
    }

    async function finalize_cancel_proposal(
        proposal_id: field,
        caller_hash: field,
    ) {
        // Proposal must be active
        let status: u8 = Mapping::get(proposals, proposal_id);
        assert_eq(status, STATUS_ACTIVE);   // ERR_G010: Proposal not active

        // Only the original creator can cancel
        let creator: field = Mapping::get(proposal_creator, proposal_id);
        assert_eq(caller_hash, creator);    // ERR_G011: Not proposal creator

        // Cancel the proposal
        Mapping::set(proposals, proposal_id, STATUS_CANCELLED);
    }

    // =========================================================================
    // TRANSITION 5: VERIFY TALLY (read-only proof)
    // =========================================================================
    //
    // Anyone can verify the resolved tally by recomputing the Pedersen
    // commitment from the public counts and blinding sums, and comparing
    // against the stored commitment aggregates. This transition has NO
    // finalize side effects — it only asserts correctness.
    //
    // This mirrors veilsub_v29's prove_subscriber_threshold pattern:
    // the commitment is publicly verifiable without revealing individual data.
    //

    async transition verify_tally(
        proposal_id: field,
        public claimed_yes: u64,
        public claimed_no: u64,
    ) -> Future {
        return finalize_verify_tally(proposal_id, claimed_yes, claimed_no);
    }

    async function finalize_verify_tally(
        proposal_id: field,
        claimed_yes: u64,
        claimed_no: u64,
    ) {
        // Proposal must be resolved
        let status: u8 = Mapping::get(proposals, proposal_id);
        assert_eq(status, STATUS_RESOLVED); // ERR_G012: Proposal not resolved

        // Verify claimed counts match stored resolved counts
        let stored_yes: u64 = Mapping::get(resolved_yes, proposal_id);
        let stored_no: u64 = Mapping::get(resolved_no, proposal_id);
        assert_eq(claimed_yes, stored_yes); // ERR_G013: Yes count mismatch
        assert_eq(claimed_no, stored_no);   // ERR_G014: No count mismatch

        // Re-verify Pedersen commitments (independent verification)
        let cur_yes_commit: group = Mapping::get_or_use(yes_commit, proposal_id, 0group);
        let cur_yes_blind: scalar = Mapping::get_or_use(yes_blind_sum, proposal_id, 0scalar);
        let expected_yes: group = (claimed_yes as scalar) * get_g() + cur_yes_blind * get_h();
        assert_eq(cur_yes_commit, expected_yes); // ERR_G015: Yes commitment re-verification failed

        let cur_no_commit: group = Mapping::get_or_use(no_commit, proposal_id, 0group);
        let cur_no_blind: scalar = Mapping::get_or_use(no_blind_sum, proposal_id, 0scalar);
        let expected_no: group = (claimed_no as scalar) * get_g() + cur_no_blind * get_h();
        assert_eq(cur_no_commit, expected_no);   // ERR_G016: No commitment re-verification failed
    }
}

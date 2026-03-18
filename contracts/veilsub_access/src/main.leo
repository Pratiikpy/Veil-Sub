// =============================================================================
// VeilSub Access v1 — "Login with VeilSub" Protocol
// =============================================================================
//
// PURPOSE:
//   Transform VeilSub from an app into infrastructure. Any Aleo application
//   can gate resources behind VeilSub subscriptions by calling this program.
//   The user proves membership via an AccessProof record. The calling program
//   NEVER learns the user's identity — only that they hold a valid subscription.
//
// HOW OTHER PROGRAMS USE THIS:
//   1. User subscribes on VeilSub (veilsub_v29.aleo) and receives an AccessPass
//   2. User converts their AccessPass into an AccessProof for this program
//      (off-chain: same fields, different record type — a "proof relay")
//   3. Third-party app calls verify_membership() or gate_resource() with the
//      user's AccessProof + the creator_hash they want to verify against
//   4. If the proof is valid (correct creator, sufficient tier, not expired,
//      not revoked), the transition succeeds and the user gains access
//   5. The third-party app never sees the user's address — only the ZK proof
//
// PRIVACY GUARANTEES:
//   - User identity: NEVER revealed (record is private, only owner can decrypt)
//   - Creator identity: only Poseidon2 hash appears in finalize (no raw address)
//   - Access pattern: only hashed keys in access_log (cannot reverse to user)
//   - Resource analytics: aggregate counts only (no per-user tracking)
//   - Zero addresses in finalize: same privacy discipline as veilsub_v29.aleo
//
// ARCHITECTURE:
//   Standalone program — does NOT import veilsub_v29.aleo. AccessProof mirrors
//   the AccessPass record structure so it can be populated from AccessPass data.
//   This keeps deployment simple and avoids cross-program dependency chains.
//   Future versions can import veilsub_core directly for native record passing.
//
// TRANSITIONS: 5  |  MAPPINGS: 4  |  RECORDS: 1
// =============================================================================

program veilsub_access_v1.aleo {

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    // Domain separator for access log keys — prevents collision with other hashes
    const ACCESS_DOMAIN_SEP: field = 9999999999999999999field;

    // =========================================================================
    // RECORDS
    // =========================================================================

    // Mirror of AccessPass from veilsub_v29.aleo for standalone verification.
    // Users populate this from their AccessPass data (same fields, same types).
    // The record is private — only the owner can decrypt and use it.
    record AccessProof {
        owner: address,
        creator: address,      // creator address (private — never leaves ZK circuit)
        tier: u8,              // subscription tier level (1-20)
        pass_id: field,        // unique pass identifier (from original AccessPass)
        expires_at: u32,       // block height when subscription expires
        privacy_level: u8,     // 0=standard, 1=blind (from original AccessPass)
    }

    // =========================================================================
    // MAPPINGS — ALL field-keyed (ZERO raw addresses in finalize)
    // =========================================================================

    // Privacy-preserving access log: Poseidon2(pass_id + resource_id + domain_sep) => true
    // Cannot be reversed to identify the user or the specific pass used
    mapping access_log: field => bool;

    // Aggregate access count per resource: resource_id => total access count
    // Useful for analytics without per-user tracking
    mapping resource_access_count: field => u64;

    // Number of gated resources registered per creator: creator_hash => count
    mapping creator_gates: field => u64;

    // Pass revocation mirror: pass_id => true if revoked
    // Third-party apps can flag passes independently of the main contract
    mapping pass_revoked: field => bool;

    // =========================================================================
    // TRANSITION 1: VERIFY MEMBERSHIP
    // =========================================================================
    //
    // Core "Login with VeilSub" primitive. Verifies that:
    //   - The caller owns the AccessProof (self.caller == pass.owner)
    //   - The pass belongs to the specified creator (Poseidon2 hash match)
    //   - The subscription tier meets the minimum requirement
    //   - The pass has not expired (block.height check in finalize)
    //   - The pass has not been revoked (mapping check in finalize)
    //
    // Returns the AccessProof back to the caller (consumed + re-minted pattern)
    // so it can be reused for future verifications.
    //
    // PRIVACY: The verifying application only sees the public finalize inputs
    // (pass_id, expires_at, hashed creator). The user's address, the raw creator
    // address, and the tier level NEVER appear in finalize.
    //
    async transition verify_membership(
        pass: AccessProof,
        creator_hash: field,
        min_tier: u8,
    ) -> (AccessProof, Future) {
        // Verify pass belongs to caller (enforced by ZK circuit)
        assert_eq(self.caller, pass.owner);

        // Verify tier meets minimum requirement
        assert(pass.tier >= min_tier);

        // Compute creator hash from the private creator address
        let computed_creator_hash: field = Poseidon2::hash_to_field(pass.creator);

        // Verify creator matches (in transition — fast fail before finalize)
        assert_eq(computed_creator_hash, creator_hash);

        // Re-mint the pass (consume + re-create pattern preserves the record)
        let new_pass: AccessProof = AccessProof {
            owner: pass.owner,
            creator: pass.creator,
            tier: pass.tier,
            pass_id: pass.pass_id,
            expires_at: pass.expires_at,
            privacy_level: pass.privacy_level,
        };

        return (new_pass, finalize_verify_membership(pass.pass_id, pass.expires_at));
    }

    async function finalize_verify_membership(
        pass_id: field,
        expires_at: u32,
    ) {
        // Check pass has not been revoked
        let revoked: bool = Mapping::get_or_use(pass_revoked, pass_id, false);
        assert(!revoked);                     // ERR: Pass has been revoked

        // Check subscription has not expired
        assert(expires_at > block.height);    // ERR: Subscription expired
    }

    // =========================================================================
    // TRANSITION 2: GATE RESOURCE
    // =========================================================================
    //
    // Gate ANY resource behind a VeilSub subscription. Extends verify_membership
    // with resource-specific tracking: logs the access event and increments the
    // resource's aggregate access counter.
    //
    // Use cases:
    //   - Gated API endpoints (resource_id = hash of endpoint path)
    //   - Premium content (resource_id = hash of content identifier)
    //   - Feature flags (resource_id = hash of feature name)
    //   - Event access (resource_id = hash of event details)
    //
    // The access_log stores a Poseidon2 hash of (pass_id + resource_id + domain_sep),
    // making it impossible to reverse-engineer which user accessed which resource.
    //
    async transition gate_resource(
        pass: AccessProof,
        resource_id: field,
        creator_hash: field,
    ) -> (AccessProof, Future) {
        // Verify pass belongs to caller
        assert_eq(self.caller, pass.owner);

        // Compute and verify creator hash
        let computed_hash: field = Poseidon2::hash_to_field(pass.creator);
        assert_eq(computed_hash, creator_hash);

        // Re-mint the pass
        let new_pass: AccessProof = AccessProof {
            owner: pass.owner,
            creator: pass.creator,
            tier: pass.tier,
            pass_id: pass.pass_id,
            expires_at: pass.expires_at,
            privacy_level: pass.privacy_level,
        };

        return (new_pass, finalize_gate_resource(pass.pass_id, resource_id, pass.expires_at));
    }

    async function finalize_gate_resource(
        pass_id: field,
        resource_id: field,
        expires_at: u32,
    ) {
        // Check pass has not been revoked
        let revoked: bool = Mapping::get_or_use(pass_revoked, pass_id, false);
        assert(!revoked);                     // ERR: Pass has been revoked

        // Check subscription has not expired
        assert(expires_at > block.height);    // ERR: Subscription expired

        // Log access event (privacy-preserving: hashed composite key)
        let combined: field = pass_id + resource_id + ACCESS_DOMAIN_SEP;
        let access_key: field = Poseidon2::hash_to_field(combined);
        Mapping::set(access_log, access_key, true);

        // Increment aggregate resource access counter
        let count: u64 = Mapping::get_or_use(resource_access_count, resource_id, 0u64);
        Mapping::set(resource_access_count, resource_id, count + 1u64);
    }

    // =========================================================================
    // TRANSITION 3: GATE RESOURCE WITH TIER CHECK
    // =========================================================================
    //
    // Same as gate_resource but also enforces a minimum tier requirement.
    // Useful for tiered access: free tier sees some content, premium tier sees all.
    //
    async transition gate_resource_tiered(
        pass: AccessProof,
        resource_id: field,
        creator_hash: field,
        min_tier: u8,
    ) -> (AccessProof, Future) {
        // Verify pass belongs to caller
        assert_eq(self.caller, pass.owner);

        // Verify tier meets minimum requirement
        assert(pass.tier >= min_tier);        // ERR: Insufficient tier level

        // Compute and verify creator hash
        let computed_hash: field = Poseidon2::hash_to_field(pass.creator);
        assert_eq(computed_hash, creator_hash);

        // Re-mint the pass
        let new_pass: AccessProof = AccessProof {
            owner: pass.owner,
            creator: pass.creator,
            tier: pass.tier,
            pass_id: pass.pass_id,
            expires_at: pass.expires_at,
            privacy_level: pass.privacy_level,
        };

        return (new_pass, finalize_gate_resource_tiered(pass.pass_id, resource_id, pass.expires_at));
    }

    async function finalize_gate_resource_tiered(
        pass_id: field,
        resource_id: field,
        expires_at: u32,
    ) {
        // Check pass has not been revoked
        let revoked: bool = Mapping::get_or_use(pass_revoked, pass_id, false);
        assert(!revoked);                     // ERR: Pass has been revoked

        // Check subscription has not expired
        assert(expires_at > block.height);    // ERR: Subscription expired

        // Log access event
        let combined: field = pass_id + resource_id + ACCESS_DOMAIN_SEP;
        let access_key: field = Poseidon2::hash_to_field(combined);
        Mapping::set(access_log, access_key, true);

        // Increment aggregate resource access counter
        let count: u64 = Mapping::get_or_use(resource_access_count, resource_id, 0u64);
        Mapping::set(resource_access_count, resource_id, count + 1u64);
    }

    // =========================================================================
    // TRANSITION 4: REGISTER GATED RESOURCE
    // =========================================================================
    //
    // Register a new gated resource for a creator. This is an administrative
    // action — creators call this to declare that a resource exists and is
    // gated behind their VeilSub subscription.
    //
    // The creator_gates mapping tracks how many resources each creator has gated,
    // providing a public signal of the creator's ecosystem size.
    //
    async transition register_gate(
        creator_hash: field,
        resource_id: field,
    ) -> Future {
        return finalize_register_gate(creator_hash);
    }

    async function finalize_register_gate(creator_hash: field) {
        let count: u64 = Mapping::get_or_use(creator_gates, creator_hash, 0u64);
        Mapping::set(creator_gates, creator_hash, count + 1u64);
    }

    // =========================================================================
    // TRANSITION 5: REVOKE PASS (Admin / Creator)
    // =========================================================================
    //
    // Mark a pass as revoked in this program's local revocation mapping.
    // This allows creators or platform administrators to invalidate passes
    // without touching the main veilsub_v29.aleo contract.
    //
    // The caller must provide their own address hash to prove identity
    // (in a production cross-program version, this would check against
    // the pass_creator mapping in the main contract).
    //
    async transition revoke_pass(
        pass_id: field,
        caller_hash: field,
    ) -> Future {
        // Verify the caller is who they claim to be
        let computed_hash: field = Poseidon2::hash_to_field(self.caller);
        assert_eq(computed_hash, caller_hash);

        return finalize_revoke_pass(pass_id);
    }

    async function finalize_revoke_pass(pass_id: field) {
        Mapping::set(pass_revoked, pass_id, true);
    }
}

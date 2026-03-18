// =============================================================================
// Cross-Program Import Stub: veilsub_v29.aleo
// =============================================================================
//
// The actual program is deployed on Aleo testnet as veilsub_v29.aleo.
// This stub defines the record types and mappings that veilsub_access
// needs to reference for direct subscription verification.
//
// When both programs are deployed on the same network, Leo's cross-program
// call syntax allows the access gate to directly call verify_access on the
// core program -- eliminating the need for the AccessProof relay pattern.
// The user presents their original AccessPass and it is verified in one step.
//
// Deployed address: aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk
// =============================================================================

program veilsub_v29.aleo {

    record AccessPass {
        owner: address,
        creator: address,
        tier: u8,
        pass_id: field,
        expires_at: u32,
        privacy_level: u8,
    }

    mapping access_revoked: field => bool;
    mapping subscriber_count: field => u64;

    // Stub transition -- the actual implementation is in the deployed program.
    // Verifies that an AccessPass is valid and not revoked, then reissues it.
    async transition verify_access(
        pass: AccessPass,
        creator: address,
    ) -> (AccessPass, Future);
}

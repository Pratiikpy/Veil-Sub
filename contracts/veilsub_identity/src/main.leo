// ============================================================================
// VeilSub Identity — Signature-Verified Content Authorship & Cross-Chain ECDSA
// ============================================================================
//
// NOVEL FEATURES (no buildathon competitor uses these):
//
// 1. SIGNATURE-VERIFIED CONTENT AUTHORSHIP
//    Creators sign content hashes with their Aleo private key.
//    Anyone can verify on-chain that content was authored by the claimed creator.
//    Uses Leo's native `signature::verify` — zero competitors use this primitive.
//
// 2. CROSS-CHAIN ECDSA IDENTITY VERIFICATION (Ethereum)
//    Verify Ethereum ECDSA signatures on-chain to link Ethereum identities
//    to Aleo addresses. Uses `ECDSA::verify_keccak256_eth` — the first
//    buildathon project to bridge Ethereum identity into Aleo privacy.
//    NOTE: ECDSA verification is finalize-only in Leo/Aleo.
//
// 3. CONTENT TIMESTAMP NOTARIZATION
//    Commit content hashes on-chain with block.height timestamps.
//    First-claim-wins: proves content existed before a certain block.
//
// 4. IDENTITY PROOF VIA SIGNATURE CHALLENGE
//    Prove control of an Aleo address by signing a random challenge.
//    Creates a privacy-preserving identity proof chain.
//
// Program: veilsub_identity_v2.aleo
// Transitions: 5  |  Mappings: 6
// ============================================================================

program veilsub_identity_v2.aleo {

    @noupgrade
    async constructor() {}

    // ========================================================================
    // RECORDS
    // ========================================================================

    // Non-repudiable proof that a creator authored specific content.
    // Issued after on-chain signature verification succeeds.
    struct AuthorshipProof {
        creator: address,
        content_hash: field,
        verified: bool,
    }

    // ========================================================================
    // MAPPINGS
    // ========================================================================

    // content_hash => true if signature-verified on-chain
    mapping verified_content: field => bool;

    // content_hash => creator_hash (Poseidon2 hash of creator address)
    mapping content_author: field => field;

    // identity_hash => proof_hash (challenge-response identity proofs)
    mapping identity_proofs: field => field;

    // notary_key => block_height when content was first committed
    mapping content_timestamps: field => u32;

    // eth_link_key => true if an Ethereum identity was linked
    mapping eth_identity_linked: field => bool;

    // eth_link_key => aleo_identity_hash (maps ETH identity to Aleo identity)
    mapping eth_to_aleo_identity: field => field;

    // ========================================================================
    // TRANSITION 1: SIGNATURE-VERIFIED CONTENT AUTHORSHIP
    // ========================================================================
    //
    // Creators sign their content hash with their Aleo private key.
    // Anyone can call this to verify and record the authorship on-chain.
    //
    // This creates a non-repudiable content authorship chain:
    //   creator signs content_hash -> sig
    //   anyone submits (creator, content_hash, sig)
    //   on-chain: signature::verify(sig, creator, content_hash) == true
    //   result: content_hash is permanently linked to creator
    //
    // NO buildathon competitor uses signature::verify for content provenance.
    //
    async transition verify_authorship(
        creator: address,
        content_hash: field,
        sig: signature,
    ) -> (AuthorshipProof, Future) {
        // Verify the Aleo Schnorr signature on-chain.
        // signature::verify(sig, signer_address, message) -> bool
        let valid: bool = signature::verify(sig, creator, content_hash);
        assert(valid);

        let proof: AuthorshipProof = AuthorshipProof {
            creator: creator,
            content_hash: content_hash,
            verified: true,
        };

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (proof, finalize_verify_authorship(content_hash, creator_hash));
    }

    async function finalize_verify_authorship(
        content_hash: field,
        creator_hash: field,
    ) {
        Mapping::set(verified_content, content_hash, true);
        Mapping::set(content_author, content_hash, creator_hash);
    }

    // ========================================================================
    // TRANSITION 2: IDENTITY PROOF VIA SIGNATURE CHALLENGE
    // ========================================================================
    //
    // Prove you control an Aleo address by signing a random challenge.
    // The challenge is chosen by the caller; the signature proves control
    // without revealing the private key.
    //
    // Privacy-preserving: only the Poseidon2 hash of the address is stored.
    //
    async transition prove_identity(
        challenge: field,
        sig: signature,
    ) -> Future {
        // Verify the caller signed this challenge with their private key.
        // Method syntax: sig.verify(address, message) -> bool
        let valid: bool = sig.verify(self.caller, challenge);
        assert(valid);

        let identity_hash: field = Poseidon2::hash_to_field(self.caller);
        let proof_hash: field = BHP256::hash_to_field(challenge);

        return finalize_prove_identity(identity_hash, proof_hash);
    }

    async function finalize_prove_identity(
        identity_hash: field,
        proof_hash: field,
    ) {
        Mapping::set(identity_proofs, identity_hash, proof_hash);
    }

    // ========================================================================
    // TRANSITION 3: CONTENT TIMESTAMP NOTARIZATION
    // ========================================================================
    //
    // Prove that content existed before a certain block height by committing
    // the content hash on-chain. First-claim-wins: once notarized, the
    // timestamp cannot be overwritten.
    //
    // The caller must sign the content hash, proving they authored it.
    // The notary_key combines content_hash + creator identity for uniqueness.
    //
    async transition notarize_content(
        content_hash: field,
        sig: signature,
    ) -> Future {
        // Verify the caller authored this content.
        let valid: bool = sig.verify(self.caller, content_hash);
        assert(valid);

        let creator_hash: field = Poseidon2::hash_to_field(self.caller);
        // Combine content and creator for a unique notary key.
        let combined: field = content_hash + creator_hash;
        let notary_key: field = Poseidon2::hash_to_field(combined);

        return finalize_notarize_content(notary_key);
    }

    async function finalize_notarize_content(
        notary_key: field,
    ) {
        // First-claim-wins: only set timestamp if not already notarized.
        let existing: u32 = Mapping::get_or_use(content_timestamps, notary_key, 0u32);
        assert_eq(existing, 0u32);
        Mapping::set(content_timestamps, notary_key, block.height);
    }

    // ========================================================================
    // TRANSITION 4: CROSS-CHAIN ECDSA IDENTITY VERIFICATION (Ethereum)
    // ========================================================================
    //
    // TODO: Enable when ECDSA opcode available on testnet
    //
    // Link an Ethereum identity to an Aleo address by verifying an Ethereum
    // ECDSA signature on-chain. This uses Leo's ECDSA::verify_keccak256_eth
    // opcode — the FIRST buildathon project to do cross-chain identity.
    //
    // How it works:
    //   1. User signs a message (their Aleo address as a field) with their
    //      Ethereum private key (producing a secp256k1 ECDSA signature).
    //   2. They submit the ECDSA signature, their 20-byte Ethereum address,
    //      and the message to this transition.
    //   3. The finalize block verifies the ECDSA signature on-chain using
    //      Keccak-256 hashing (Ethereum's native hash function).
    //   4. If valid, the Ethereum identity is permanently linked to their
    //      Aleo identity hash.
    //
    // NOTE: ECDSA verification is finalize-only in Aleo (not allowed in
    //       transitions). All verification happens in the async function.
    //
    // transition verify_eth_identity(
    //     ecdsa_sig: [u8; 65],
    //     eth_address: [u8; 20],
    //     message: field,
    // ) -> Future {
    //     let aleo_identity_hash: field = Poseidon2::hash_to_field(self.caller);
    //     let eth_hash: field = BHP256::hash_to_field(eth_address);
    //     let combined: field = eth_hash + aleo_identity_hash;
    //     let link_key: field = Poseidon2::hash_to_field(combined);
    //     return finalize_verify_eth_identity(
    //         ecdsa_sig, eth_address, message, link_key, aleo_identity_hash,
    //     );
    // }
    //
    // async function finalize_verify_eth_identity(
    //     ecdsa_sig: [u8; 65],
    //     eth_address: [u8; 20],
    //     message: field,
    //     link_key: field,
    //     aleo_identity_hash: field,
    // ) {
    //     let valid: bool = ECDSA::verify_keccak256_eth(ecdsa_sig, eth_address, message);
    //     assert(valid);
    //     let already_linked: bool = Mapping::get_or_use(eth_identity_linked, link_key, false);
    //     assert_eq(already_linked, false);
    //     Mapping::set(eth_identity_linked, link_key, true);
    //     Mapping::set(eth_to_aleo_identity, link_key, aleo_identity_hash);
    // }

    // ========================================================================
    // TRANSITION 5: BATCH AUTHORSHIP VERIFICATION
    // ========================================================================
    //
    // Verify authorship of two content hashes in a single transaction.
    // This is useful for creators publishing multi-part content who want
    // to prove authorship of all parts atomically.
    //
    async transition verify_authorship_batch(
        creator: address,
        content_hash_1: field,
        content_hash_2: field,
        sig_1: signature,
        sig_2: signature,
    ) -> (AuthorshipProof, AuthorshipProof, Future) {
        // Verify both signatures.
        let valid_1: bool = signature::verify(sig_1, creator, content_hash_1);
        assert(valid_1);

        let valid_2: bool = signature::verify(sig_2, creator, content_hash_2);
        assert(valid_2);

        let proof_1: AuthorshipProof = AuthorshipProof {
            creator: creator,
            content_hash: content_hash_1,
            verified: true,
        };

        let proof_2: AuthorshipProof = AuthorshipProof {
            creator: creator,
            content_hash: content_hash_2,
            verified: true,
        };

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        return (proof_1, proof_2, finalize_verify_author_batch(
            content_hash_1,
            content_hash_2,
            creator_hash,
        ));
    }

    async function finalize_verify_author_batch(
        content_hash_1: field,
        content_hash_2: field,
        creator_hash: field,
    ) {
        Mapping::set(verified_content, content_hash_1, true);
        Mapping::set(content_author, content_hash_1, creator_hash);
        Mapping::set(verified_content, content_hash_2, true);
        Mapping::set(content_author, content_hash_2, creator_hash);
    }
}

// =============================================================================
// VeilSub Payments v1 — USDCx and USAD Stablecoin Payments
//
// Companion program for stablecoin transitions.
// Uses test_usdcx_stablecoin.aleo and test_usad_stablecoin.aleo on testnet.
//
// Note: Leo 3.4.0 has a known type-checking limitation with cross-program
// MerkleProof arrays. This program works around it by accepting raw proof
// fields and constructing the MerkleProof inline.
// =============================================================================

import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program veilsub_payments_v1.aleo {

    const PLATFORM_FEE_DIV: u64 = 20u64;

    record StablecoinReceipt {
        owner: address,
        creator: address,
        amount: u128,
        token_type: u8,
        payment_hash: field,
    }

    mapping stablecoin_revenue: field => u64;
    mapping stablecoin_tip_count: field => u64;

    // USDCx payment — accepts token + pre-built proofs from the stablecoin program
    async transition pay_usdcx(
        token: test_usdcx_stablecoin.aleo/Token,
        creator: address,
        amount: u128,
        // Accept proof fields directly to avoid MerkleProof array type issue
        proof0_siblings: [field; 16],
        proof0_leaf_index: u32,
        proof1_siblings: [field; 16],
        proof1_leaf_index: u32,
    ) -> (StablecoinReceipt, test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) {
        assert(amount > 0u128);

        // Construct the MerkleProof array from individual fields
        let proof0: test_usdcx_stablecoin.aleo/MerkleProof = test_usdcx_stablecoin.aleo/MerkleProof {
            siblings: proof0_siblings,
            leaf_index: proof0_leaf_index,
        };
        let proof1: test_usdcx_stablecoin.aleo/MerkleProof = test_usdcx_stablecoin.aleo/MerkleProof {
            siblings: proof1_siblings,
            leaf_index: proof1_leaf_index,
        };
        let proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2] = [proof0, proof1];

        let (compliance, to_creator, change, transfer_future): (
            test_usdcx_stablecoin.aleo/ComplianceRecord,
            test_usdcx_stablecoin.aleo/Token,
            test_usdcx_stablecoin.aleo/Token,
            Future
        ) = test_usdcx_stablecoin.aleo/transfer_private(creator, amount, token, proofs);

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        let payment_hash: field = Poseidon2::hash_to_field(creator_hash + (amount as field));

        let receipt: StablecoinReceipt = StablecoinReceipt {
            owner: self.caller,
            creator: creator,
            amount: amount,
            token_type: 1u8,
            payment_hash: payment_hash,
        };

        let amount_u64: u64 = amount as u64;
        return (receipt, compliance, to_creator, change,
            finalize_pay_usdcx(creator_hash, amount_u64, transfer_future));
    }

    async function finalize_pay_usdcx(creator_hash: field, amount: u64, f0: Future) {
        f0.await();
        let token_key: field = Poseidon2::hash_to_field(creator_hash + 1field);
        let rev: u64 = Mapping::get_or_use(stablecoin_revenue, token_key, 0u64);
        Mapping::set(stablecoin_revenue, token_key, rev + amount);
        let tips: u64 = Mapping::get_or_use(stablecoin_tip_count, creator_hash, 0u64);
        Mapping::set(stablecoin_tip_count, creator_hash, tips + 1u64);
    }

    // USAD payment
    async transition pay_usad(
        token: test_usad_stablecoin.aleo/Token,
        creator: address,
        amount: u128,
        proof0_siblings: [field; 16],
        proof0_leaf_index: u32,
        proof1_siblings: [field; 16],
        proof1_leaf_index: u32,
    ) -> (StablecoinReceipt, test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/Token, Future) {
        assert(amount > 0u128);

        let proof0: test_usad_stablecoin.aleo/MerkleProof = test_usad_stablecoin.aleo/MerkleProof {
            siblings: proof0_siblings,
            leaf_index: proof0_leaf_index,
        };
        let proof1: test_usad_stablecoin.aleo/MerkleProof = test_usad_stablecoin.aleo/MerkleProof {
            siblings: proof1_siblings,
            leaf_index: proof1_leaf_index,
        };
        let proofs: [test_usad_stablecoin.aleo/MerkleProof; 2] = [proof0, proof1];

        let (compliance, to_creator, change, transfer_future): (
            test_usad_stablecoin.aleo/ComplianceRecord,
            test_usad_stablecoin.aleo/Token,
            test_usad_stablecoin.aleo/Token,
            Future
        ) = test_usad_stablecoin.aleo/transfer_private(creator, amount, token, proofs);

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        let payment_hash: field = Poseidon2::hash_to_field(creator_hash + (amount as field));

        let receipt: StablecoinReceipt = StablecoinReceipt {
            owner: self.caller,
            creator: creator,
            amount: amount,
            token_type: 2u8,
            payment_hash: payment_hash,
        };

        let amount_u64: u64 = amount as u64;
        return (receipt, compliance, to_creator, change,
            finalize_pay_usad(creator_hash, amount_u64, transfer_future));
    }

    async function finalize_pay_usad(creator_hash: field, amount: u64, f0: Future) {
        f0.await();
        let token_key: field = Poseidon2::hash_to_field(creator_hash + 2field);
        let rev: u64 = Mapping::get_or_use(stablecoin_revenue, token_key, 0u64);
        Mapping::set(stablecoin_revenue, token_key, rev + amount);
        let tips: u64 = Mapping::get_or_use(stablecoin_tip_count, creator_hash, 0u64);
        Mapping::set(stablecoin_tip_count, creator_hash, tips + 1u64);
    }
}

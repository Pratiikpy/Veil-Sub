import credits.aleo;
// =============================================================================
// VeilSub Collaboration v1 — Revenue Splits and Co-Authored Content
//
// Enables two or more creators to:
// 1. Create a collaboration agreement with revenue split percentages
// 2. Publish co-authored content linked to the agreement
// 3. Automatically split incoming revenue (tips, PPV) per the agreement
//
// Privacy: collaborator addresses are in the agreement record (private).
// The on-chain mapping only stores hashed agreement IDs.
//
// CROSS-PROGRAM ARCHITECTURE:
//   This companion program imports credits.aleo for automatic revenue splitting.
//   It is independently deployable from veilsub_v29.aleo — keeping deployment
//   simple while demonstrating that VeilSub's ecosystem spans MULTIPLE on-chain
//   programs. Collaboration agreements are self-contained: both parties hold
//   private records proving the split terms, and payments are split atomically
//   in the ZK circuit using credits.aleo/transfer_private.
//
// CRYPTOGRAPHIC PROPERTIES:
//   - Poseidon2 for all mapping keys (zero raw addresses in finalize)
//   - Mapping::get_or_use everywhere (no bare Mapping::get)
//   - Atomic payment splits (both parties paid in single transition)
//   - All records are private (encrypted to owner)
//   - Revenue tracking is aggregate-only (individual payment amounts hidden)
//
// =============================================================================

program veilsub_collab_v2.aleo {

    @noupgrade
    async constructor() {}

    // =========================================================================
    // STRUCTS
    // =========================================================================

    struct CollabKey {
        creator_a_hash: field,
        creator_b_hash: field,
        collab_id: field,
    }

    // =========================================================================
    // RECORDS
    // =========================================================================

    // Collaboration agreement record (both creators get one)
    struct CollabAgreement {
        caller: address,
        partner: address,
        collab_id: field,
        split_pct: u8,        // caller's percentage (0-100)
        partner_split: u8,    // partner's percentage (100 - split_pct)
        content_hash: field,  // hash of agreed content scope
        created_at: u32,
        active: bool,
    }

    // Revenue receipt from a collaboration
    struct CollabReceipt {
        recipient: address,
        collab_id: field,
        amount: u64,         // this party's share in microcredits
        total_amount: u64,   // total before split
        content_id: field,
    }

    // =========================================================================
    // MAPPINGS — ALL field-keyed (ZERO raw addresses)
    // =========================================================================

    mapping collab_exists: field => bool;         // hash(CollabKey) => exists
    mapping collab_active: field => bool;         // hash(CollabKey) => is active
    mapping collab_revenue: field => u64;         // hash(CollabKey) => total revenue
    mapping collab_content_count: field => u64;   // hash(CollabKey) => content pieces

    // =========================================================================
    // TRANSITIONS
    // =========================================================================

    // Two creators create a collaboration agreement
    // Creator A calls this, specifying their split percentage
    async transition create_collab(
        private partner: address,
        private collab_id: field,
        private my_split_pct: u8,
        private content_scope_hash: field,
    ) -> (CollabAgreement, CollabAgreement, Future) {
        // Split must be valid (1-99, leaves something for partner)
        assert(my_split_pct >= 1u8);
        assert(my_split_pct <= 99u8);

        let partner_split: u8 = 100u8 - my_split_pct;

        let creator_a_hash: field = Poseidon2::hash_to_field(self.caller);
        let creator_b_hash: field = Poseidon2::hash_to_field(partner);

        // Agreement for creator A (caller)
        let agreement_a: CollabAgreement = CollabAgreement {
            caller: self.caller,
            partner: partner,
            collab_id: collab_id,
            split_pct: my_split_pct,
            partner_split: partner_split,
            content_hash: content_scope_hash,
            created_at: 0u32,
            active: true,
        };

        // Agreement for creator B (partner)
        let agreement_b: CollabAgreement = CollabAgreement {
            caller: partner,
            partner: self.caller,
            collab_id: collab_id,
            split_pct: partner_split,
            partner_split: my_split_pct,
            content_hash: content_scope_hash,
            created_at: 0u32,
            active: true,
        };

        let key: field = Poseidon2::hash_to_field(CollabKey { creator_a_hash, creator_b_hash, collab_id });

        return (agreement_a, agreement_b, finalize_create_collab(key));
    }

    async function finalize_create_collab(collab_key: field) {
        let exists: bool = Mapping::get_or_use(collab_exists, collab_key, false);
        assert(!exists); // Can't create duplicate collab

        Mapping::set(collab_exists, collab_key, true);
        Mapping::set(collab_active, collab_key, true);
        Mapping::set(collab_revenue, collab_key, 0u64);
        Mapping::set(collab_content_count, collab_key, 0u64);
    }

    // Split incoming payment between collaborators
    async transition split_payment(
        private agreement: CollabAgreement,
        private payment: credits.aleo/credits,
        private total_amount: u64,
        private content_id: field,
    ) -> (CollabReceipt, CollabReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(agreement.active);
        assert(total_amount > 0u64);

        // Calculate split (use u128 intermediate to prevent overflow on large amounts)
        let my_amount: u64 = ((total_amount as u128) * (agreement.split_pct as u128) / 100u128) as u64;
        let partner_amount: u64 = total_amount - my_amount;

        // Transfer partner's share to partner
        let (my_share, partner_share): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, agreement.partner, partner_amount);

        // Receipts
        let my_receipt: CollabReceipt = CollabReceipt {
            recipient: self.caller,
            collab_id: agreement.collab_id,
            amount: my_amount,
            total_amount: total_amount,
            content_id: content_id,
        };

        let partner_receipt: CollabReceipt = CollabReceipt {
            recipient: agreement.partner,
            collab_id: agreement.collab_id,
            amount: partner_amount,
            total_amount: total_amount,
            content_id: content_id,
        };

        let creator_a_hash: field = Poseidon2::hash_to_field(self.caller);
        let creator_b_hash: field = Poseidon2::hash_to_field(agreement.partner);
        let key: field = Poseidon2::hash_to_field(CollabKey { creator_a_hash, creator_b_hash, collab_id: agreement.collab_id });

        return (my_receipt, partner_receipt, my_share, partner_share, finalize_split(key, total_amount));
    }

    async function finalize_split(collab_key: field, amount: u64) {
        let active: bool = Mapping::get_or_use(collab_active, collab_key, false);
        assert(active);

        let rev: u64 = Mapping::get_or_use(collab_revenue, collab_key, 0u64);
        Mapping::set(collab_revenue, collab_key, rev + amount);
    }

    // Publish co-authored content (increments content counter)
    async transition publish_collab_content(
        private agreement: CollabAgreement,
        public content_id: field,
        public content_hash: field,
    ) -> Future {
        assert(agreement.active);

        let creator_a_hash: field = Poseidon2::hash_to_field(self.caller);
        let creator_b_hash: field = Poseidon2::hash_to_field(agreement.partner);
        let key: field = Poseidon2::hash_to_field(CollabKey { creator_a_hash, creator_b_hash, collab_id: agreement.collab_id });

        return finalize_publish_collab(key);
    }

    async function finalize_publish_collab(collab_key: field) {
        let active: bool = Mapping::get_or_use(collab_active, collab_key, false);
        assert(active);

        let count: u64 = Mapping::get_or_use(collab_content_count, collab_key, 0u64);
        Mapping::set(collab_content_count, collab_key, count + 1u64);
    }

    // End a collaboration
    async transition end_collab(
        private agreement: CollabAgreement,
    ) -> Future {
        let creator_a_hash: field = Poseidon2::hash_to_field(self.caller);
        let creator_b_hash: field = Poseidon2::hash_to_field(agreement.partner);
        let key: field = Poseidon2::hash_to_field(CollabKey { creator_a_hash, creator_b_hash, collab_id: agreement.collab_id });

        return finalize_end_collab(key);
    }

    async function finalize_end_collab(collab_key: field) {
        Mapping::set(collab_active, collab_key, false);
    }
}

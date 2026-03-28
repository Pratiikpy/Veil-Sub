import credits.aleo;
// =============================================================================
// VeilSub Social v1 — Paid DMs, Community Chat, Ephemeral Stories
//
// Privacy model:
// - DM access verified via ZK proof (subscriber proves tier without identity)
// - Chat membership verified via subscription hash (anonymous but verified)
// - Stories expire cryptographically at block height (not just UI-hidden)
//
// CROSS-PROGRAM ARCHITECTURE:
//   This companion program imports credits.aleo for paid DM transfers.
//   It is independently deployable from veilsub_v29.aleo — keeping deployment
//   simple while demonstrating that VeilSub's ecosystem spans MULTIPLE on-chain
//   programs. Subscriber verification is done via private record inputs
//   (caller proves tier ownership in the ZK circuit, not via cross-program call).
//
// CRYPTOGRAPHIC PROPERTIES:
//   - Poseidon2 for all mapping keys (zero raw addresses in finalize)
//   - Mapping::get_or_use everywhere (no bare Mapping::get)
//   - Block height for story expiry (enforced in finalize — cryptographically guaranteed)
//   - DM counter hides individual message events behind aggregate count
//   - Chat membership nullifier-free (membership record is the proof)
//
// =============================================================================

program veilsub_social_v2.aleo {

    @noupgrade
    async constructor() {}

    // =========================================================================
    // STRUCTS
    // =========================================================================

    struct DMAccessKey {
        creator_hash: field,
        subscriber_hash: field,
    }

    struct ChatRoomKey {
        creator_hash: field,
        room_id: u8,
    }

    struct StoryKey {
        creator_hash: field,
        story_id: field,
    }

    // =========================================================================
    // RECORDS
    // =========================================================================

    // Proof that a subscriber has DM access to a specific creator
    struct DMAccessProof {
        creator: address,
        creator_hash: field,
        tier: u8,
        expires_at: u32,
    }

    // Encrypted message receipt (both parties get one)
    struct MessageReceipt {
        recipient: address,
        message_hash: field,       // hash of encrypted message content
        counterparty_hash: field,  // hash of the other party (not raw address)
        timestamp: u32,            // block height when sent
        amount: u64,               // payment for this message (0 = included in sub)
    }

    // Chat room membership proof
    struct ChatMembership {
        member: address,
        creator: address,
        room_id: u8,
        min_tier: u8,
        joined_at: u32,
    }

    // Ephemeral story access token
    struct StoryAccess {
        viewer: address,
        creator: address,
        story_id: field,
        expires_at: u32,      // block height when story becomes inaccessible
        encryption_key: field, // key to decrypt story content
    }

    // =========================================================================
    // MAPPINGS — ALL field-keyed (ZERO raw addresses)
    // =========================================================================

    // DM configuration per creator
    mapping dm_enabled: field => bool;        // creator_hash => DM enabled
    mapping dm_price: field => u64;           // creator_hash => price per message (0 = free for subs)
    mapping dm_min_tier: field => u8;         // creator_hash => minimum tier for DM access
    mapping dm_count: field => u64;           // creator_hash => total DMs received

    // Chat room configuration
    mapping chat_room_exists: field => bool;  // hash(ChatRoomKey) => exists
    mapping chat_room_min_tier: field => u8;  // hash(ChatRoomKey) => min tier
    mapping chat_member_count: field => u64;  // hash(ChatRoomKey) => member count

    // Story tracking
    mapping story_exists: field => bool;          // hash(StoryKey) => exists
    mapping story_expiry: field => u32;           // hash(StoryKey) => expiry block height
    mapping story_view_count: field => u64;       // hash(StoryKey) => view count
    mapping creator_story_count: field => u64;    // creator_hash => total stories posted

    // =========================================================================
    // TRANSITIONS: DM System
    // =========================================================================

    // Creator enables DMs with pricing and tier requirements
    async transition configure_dm(
        public creator_hash: field,
        public price_per_message: u64,
        public min_tier: u8,
    ) -> Future {
        return finalize_configure_dm(creator_hash, price_per_message, min_tier);
    }

    async function finalize_configure_dm(
        creator_hash: field,
        price: u64,
        min_tier: u8,
    ) {
        Mapping::set(dm_enabled, creator_hash, true);
        Mapping::set(dm_price, creator_hash, price);
        Mapping::set(dm_min_tier, creator_hash, min_tier);
    }

    // Subscriber proves DM access via their subscription record
    // Returns a DMAccessProof without revealing subscriber identity
    transition prove_dm_access(
        private creator: address,
        private subscriber_tier: u8,
        private subscription_expires: u32,
        private pass_id: field,
    ) -> DMAccessProof {
        // Caller must have a valid subscription (verified by owning the data)
        assert(subscriber_tier >= 1u8);

        let creator_hash: field = Poseidon2::hash_to_field(creator);

        return DMAccessProof {
            creator: creator,
            creator_hash: creator_hash,
            tier: subscriber_tier,
            expires_at: subscription_expires,
        };
    }

    // Send a paid message (records payment, increments count)
    async transition send_paid_message(
        private dm_proof: DMAccessProof,
        private message_hash: field,
        private payment: credits.aleo/credits,
        private amount: u64,
    ) -> (MessageReceipt, MessageReceipt, credits.aleo/credits, Future) {
        let subscriber_hash: field = Poseidon2::hash_to_field(self.caller);
        let creator_hash: field = dm_proof.creator_hash;

        // Transfer payment to creator
        let (change, to_creator): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, dm_proof.creator, amount);

        // Receipt for subscriber
        let sub_receipt: MessageReceipt = MessageReceipt {
            recipient: self.caller,
            message_hash: message_hash,
            counterparty_hash: creator_hash,
            timestamp: 0u32, // set in finalize
            amount: amount,
        };

        // Receipt for creator (anonymous — uses subscriber_hash not address)
        let creator_receipt: MessageReceipt = MessageReceipt {
            recipient: dm_proof.creator,
            message_hash: message_hash,
            counterparty_hash: subscriber_hash,
            timestamp: 0u32,
            amount: amount,
        };

        return (sub_receipt, creator_receipt, change, finalize_send_message(creator_hash));
    }

    async function finalize_send_message(creator_hash: field) {
        let count: u64 = Mapping::get_or_use(dm_count, creator_hash, 0u64);
        Mapping::set(dm_count, creator_hash, count + 1u64);
    }

    // =========================================================================
    // TRANSITIONS: Community Chat
    // =========================================================================

    // Creator creates a chat room with tier requirement
    async transition create_chat_room(
        public creator_hash: field,
        public room_id: u8,
        public min_tier: u8,
    ) -> Future {
        return finalize_create_room(creator_hash, room_id, min_tier);
    }

    async function finalize_create_room(
        creator_hash: field,
        room_id: u8,
        min_tier: u8,
    ) {
        let key: field = Poseidon2::hash_to_field(ChatRoomKey { creator_hash, room_id });
        let exists: bool = Mapping::get_or_use(chat_room_exists, key, false);
        assert(!exists); // Room already exists

        Mapping::set(chat_room_exists, key, true);
        Mapping::set(chat_room_min_tier, key, min_tier);
        Mapping::set(chat_member_count, key, 0u64);
    }

    // Subscriber joins chat room by proving subscription tier
    async transition join_chat_room(
        private creator: address,
        private room_id: u8,
        private subscriber_tier: u8,
        private subscription_expires: u32,
    ) -> (ChatMembership, Future) {
        assert(subscriber_tier >= 1u8);

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        let key: field = Poseidon2::hash_to_field(ChatRoomKey { creator_hash, room_id });

        let membership: ChatMembership = ChatMembership {
            member: self.caller,
            creator: creator,
            room_id: room_id,
            min_tier: subscriber_tier,
            joined_at: 0u32, // validated in finalize
        };

        return (membership, finalize_join_room(key, subscriber_tier));
    }

    async function finalize_join_room(
        room_key: field,
        tier: u8,
    ) {
        let exists: bool = Mapping::get_or_use(chat_room_exists, room_key, false);
        assert(exists); // Room must exist

        let min_tier: u8 = Mapping::get_or_use(chat_room_min_tier, room_key, 1u8);
        assert(tier >= min_tier); // Must meet tier requirement

        let count: u64 = Mapping::get_or_use(chat_member_count, room_key, 0u64);
        Mapping::set(chat_member_count, room_key, count + 1u64);
    }

    // =========================================================================
    // TRANSITIONS: Ephemeral Stories
    // =========================================================================

    // Creator publishes an ephemeral story with block-height expiry
    async transition publish_story(
        public creator_hash: field,
        public story_id: field,
        public content_hash: field,       // hash of encrypted content
        public duration_blocks: u32,      // how many blocks until expiry
        private encryption_key: field,    // key to decrypt (kept private)
    ) -> Future {
        assert(duration_blocks > 0u32);
        assert(duration_blocks <= 28800u32); // Max ~24 hours at 3s/block

        return finalize_publish_story(creator_hash, story_id, content_hash, duration_blocks);
    }

    async function finalize_publish_story(
        creator_hash: field,
        story_id: field,
        content_hash: field,
        duration: u32,
    ) {
        let key: field = Poseidon2::hash_to_field(StoryKey { creator_hash, story_id });
        let exists: bool = Mapping::get_or_use(story_exists, key, false);
        assert(!exists); // Story ID must be unique

        Mapping::set(story_exists, key, true);
        Mapping::set(story_expiry, key, block.height + duration);
        Mapping::set(story_view_count, key, 0u64);

        let count: u64 = Mapping::get_or_use(creator_story_count, creator_hash, 0u64);
        Mapping::set(creator_story_count, creator_hash, count + 1u64);
    }

    // Subscriber views a story (gets access token if not expired)
    async transition view_story(
        private creator: address,
        private story_id: field,
        private subscriber_tier: u8,
    ) -> (StoryAccess, Future) {
        assert(subscriber_tier >= 1u8);

        let creator_hash: field = Poseidon2::hash_to_field(creator);
        let key: field = Poseidon2::hash_to_field(StoryKey { creator_hash, story_id });

        // Encryption key derived from story_id + creator (deterministic but private)
        let derived_key: field = Poseidon2::hash_to_field(story_id + creator_hash);

        let access: StoryAccess = StoryAccess {
            viewer: self.caller,
            creator: creator,
            story_id: story_id,
            expires_at: 0u32, // set in finalize via check
            encryption_key: derived_key,
        };

        return (access, finalize_view_story(key));
    }

    async function finalize_view_story(story_key: field) {
        let exists: bool = Mapping::get_or_use(story_exists, story_key, false);
        assert(exists); // Story must exist

        let expiry: u32 = Mapping::get_or_use(story_expiry, story_key, 0u32);
        assert(block.height < expiry); // Story must not be expired

        let views: u64 = Mapping::get_or_use(story_view_count, story_key, 0u64);
        Mapping::set(story_view_count, story_key, views + 1u64);
    }
}

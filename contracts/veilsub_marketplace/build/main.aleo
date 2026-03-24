program veilsub_marketplace_v1.aleo;

record ReviewReceipt:
    owner as address.private;
    creator_hash as field.private;
    rating as u8.private;
    review_hash as field.private;

record BidReceipt:
    owner as address.private;
    auction_id as field.private;
    commitment as field.private;
    amount as u64.private;
    salt as field.private;

record AuctionResult:
    owner as address.private;
    auction_id as field.private;
    winning_amount as u64.private;
    creator_hash as field.private;

struct BidCommitData:
    auction_id as field;
    amount as u64;

struct AuctionBidKey:
    auction_id as field;
    bidder_hash as field;

mapping reputation_commit:
    key as field.public;
    value as group.public;

mapping reputation_count:
    key as field.public;
    value as u64.public;

mapping reputation_blind_sum:
    key as field.public;
    value as scalar.public;

mapping reputation_sum:
    key as field.public;
    value as u64.public;

mapping review_nullifier:
    key as field.public;
    value as boolean.public;

mapping creator_badge:
    key as field.public;
    value as u8.public;

mapping auction_status:
    key as field.public;
    value as u8.public;

mapping auction_creator:
    key as field.public;
    value as field.public;

mapping bid_commits:
    key as field.public;
    value as field.public;

mapping auction_bid_count:
    key as field.public;
    value as u64.public;

mapping auction_highest:
    key as field.public;
    value as u64.public;

mapping auction_second:
    key as field.public;
    value as u64.public;

mapping auction_winner:
    key as field.public;
    value as field.public;

function submit_review:
    input r0 as field.private;
    input r1 as u8.private;
    input r2 as field.private;
    gte r1 1u8 into r3;
    assert.eq r3 true;
    lte r1 5u8 into r4;
    assert.eq r4 true;
    hash.psd2 self.caller into r5 as field;
    add r5 r0 into r6;
    add r6 9999999999999999991field into r7;
    hash.psd2 r7 into r8 as field;
    hash.bhp256 r6 into r9 as scalar;
    cast self.caller r0 r1 r2 into r10 as ReviewReceipt.record;
    async submit_review r8 r0 r1 r9 into r11;
    output r10 as ReviewReceipt.record;
    output r11 as veilsub_marketplace_v1.aleo/submit_review.future;

finalize submit_review:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as scalar.public;
    get.or_use review_nullifier[r0] false into r4;
    not r4 into r5;
    assert.eq r5 true;
    set true into review_nullifier[r0];
    cast r2 into r6 as scalar;
    mul r6 1540945439182663264862696551825005342995406165131907382295858612069623286213group into r7;
    mul r3 4756945026257194583189722752066097511643190336079386933095348702435126773568group into r8;
    add r7 r8 into r9;
    get.or_use reputation_commit[r1] 0group into r10;
    add r10 r9 into r11;
    set r11 into reputation_commit[r1];
    get.or_use reputation_blind_sum[r1] 0scalar into r12;
    add r12 r3 into r13;
    set r13 into reputation_blind_sum[r1];
    get.or_use reputation_sum[r1] 0u64 into r14;
    cast r2 into r15 as u64;
    add r14 r15 into r16;
    set r16 into reputation_sum[r1];
    get.or_use reputation_count[r1] 0u64 into r17;
    add r17 1u64 into r18;
    set r18 into reputation_count[r1];

function prove_reputation_threshold:
    input r0 as field.private;
    input r1 as u8.private;
    gte r1 1u8 into r2;
    assert.eq r2 true;
    lte r1 5u8 into r3;
    assert.eq r3 true;
    async prove_reputation_threshold r0 r1 into r4;
    output r4 as veilsub_marketplace_v1.aleo/prove_reputation_threshold.future;

finalize prove_reputation_threshold:
    input r0 as field.public;
    input r1 as u8.public;
    get.or_use reputation_count[r0] 0u64 into r2;
    gt r2 0u64 into r3;
    assert.eq r3 true;
    get.or_use reputation_sum[r0] 0u64 into r4;
    get.or_use reputation_blind_sum[r0] 0scalar into r5;
    get.or_use reputation_commit[r0] 0group into r6;
    cast r4 into r7 as scalar;
    mul r7 1540945439182663264862696551825005342995406165131907382295858612069623286213group into r8;
    mul r5 4756945026257194583189722752066097511643190336079386933095348702435126773568group into r9;
    add r8 r9 into r10;
    assert.eq r6 r10;
    div r4 r2 into r11;
    cast r1 into r12 as u64;
    gte r11 r12 into r13;
    assert.eq r13 true;
    gte r2 50u64 into r14;
    gte r2 25u64 into r15;
    gte r2 10u64 into r16;
    ternary r16 1u8 0u8 into r17;
    ternary r15 2u8 r17 into r18;
    ternary r14 3u8 r18 into r19;
    set r19 into creator_badge[r0];

function create_auction:
    input r0 as field.private;
    hash.psd2 self.caller into r1 as field;
    add r1 r0 into r2;
    add r2 9999999999999999992field into r3;
    hash.psd2 r3 into r4 as field;
    async create_auction r4 r1 into r5;
    output r5 as veilsub_marketplace_v1.aleo/create_auction.future;

finalize create_auction:
    input r0 as field.public;
    input r1 as field.public;
    get.or_use auction_status[r0] 255u8 into r2;
    assert.eq r2 255u8;
    set 0u8 into auction_status[r0];
    set r1 into auction_creator[r0];
    set 0u64 into auction_bid_count[r0];
    set 0u64 into auction_highest[r0];
    set 0u64 into auction_second[r0];
    set 0field into auction_winner[r0];

function place_sealed_bid:
    input r0 as field.private;
    input r1 as u64.private;
    input r2 as field.private;
    gt r1 0u64 into r3;
    assert.eq r3 true;
    hash.psd2 self.caller into r4 as field;
    cast r0 r1 into r5 as BidCommitData;
    hash.psd2 r5 into r6 as field;
    hash.bhp256 r2 into r7 as scalar;
    commit.bhp256 r6 r7 into r8 as field;
    cast r0 r4 into r9 as AuctionBidKey;
    hash.psd2 r9 into r10 as field;
    cast self.caller r0 r8 r1 r2 into r11 as BidReceipt.record;
    async place_sealed_bid r0 r10 r8 into r12;
    output r11 as BidReceipt.record;
    output r12 as veilsub_marketplace_v1.aleo/place_sealed_bid.future;

finalize place_sealed_bid:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as field.public;
    get.or_use auction_status[r0] 255u8 into r3;
    assert.eq r3 0u8;
    get.or_use bid_commits[r1] 0field into r4;
    assert.eq r4 0field;
    get.or_use auction_bid_count[r0] 0u64 into r5;
    lt r5 1000u64 into r6;
    assert.eq r6 true;
    set r2 into bid_commits[r1];
    add r5 1u64 into r7;
    set r7 into auction_bid_count[r0];

function close_bidding:
    input r0 as field.private;
    hash.psd2 self.caller into r1 as field;
    async close_bidding r0 r1 into r2;
    output r2 as veilsub_marketplace_v1.aleo/close_bidding.future;

finalize close_bidding:
    input r0 as field.public;
    input r1 as field.public;
    get.or_use auction_creator[r0] 0field into r2;
    assert.eq r2 r1;
    get.or_use auction_status[r0] 255u8 into r3;
    assert.eq r3 0u8;
    set 1u8 into auction_status[r0];

function reveal_bid:
    input r0 as BidReceipt.record;
    cast r0.auction_id r0.amount into r1 as BidCommitData;
    hash.psd2 r1 into r2 as field;
    hash.bhp256 r0.salt into r3 as scalar;
    commit.bhp256 r2 r3 into r4 as field;
    assert.eq r4 r0.commitment;
    hash.psd2 self.caller into r5 as field;
    cast r0.auction_id r5 into r6 as AuctionBidKey;
    hash.psd2 r6 into r7 as field;
    async reveal_bid r0.auction_id r7 r0.commitment r0.amount r5 into r8;
    output r8 as veilsub_marketplace_v1.aleo/reveal_bid.future;

finalize reveal_bid:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as field.public;
    input r3 as u64.public;
    input r4 as field.public;
    get.or_use auction_status[r0] 255u8 into r5;
    assert.eq r5 1u8;
    get.or_use bid_commits[r1] 0field into r6;
    assert.eq r6 r2;
    get.or_use auction_highest[r0] 0u64 into r7;
    get.or_use auction_second[r0] 0u64 into r8;
    gt r3 r7 into r9;
    branch.eq r9 false to end_then_0_0;
    set r7 into auction_second[r0];
    set r3 into auction_highest[r0];
    set r4 into auction_winner[r0];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    gt r3 r8 into r10;
    branch.eq r10 false to end_then_1_2;
    set r3 into auction_second[r0];
    branch.eq true true to end_otherwise_1_3;
    position end_then_1_2;
    position end_otherwise_1_3;
    position end_otherwise_0_1;
    set 0field into bid_commits[r1];

function resolve_auction:
    input r0 as field.private;
    input r1 as address.private;
    hash.psd2 self.caller into r2 as field;
    cast self.caller r0 0u64 r2 into r3 as AuctionResult.record;
    cast r1 r0 0u64 r2 into r4 as AuctionResult.record;
    async resolve_auction r0 r2 into r5;
    output r3 as AuctionResult.record;
    output r4 as AuctionResult.record;
    output r5 as veilsub_marketplace_v1.aleo/resolve_auction.future;

finalize resolve_auction:
    input r0 as field.public;
    input r1 as field.public;
    get.or_use auction_creator[r0] 0field into r2;
    assert.eq r2 r1;
    get.or_use auction_status[r0] 255u8 into r3;
    assert.eq r3 1u8;
    get.or_use auction_highest[r0] 0u64 into r4;
    gt r4 0u64 into r5;
    assert.eq r5 true;
    set 2u8 into auction_status[r0];
    get.or_use auction_second[r0] 0u64 into r6;
    is.eq r6 0u64 into r7;
    ternary r7 r4 r6 into r8;
    set r8 into auction_second[r0];

function verify_badge:
    input r0 as field.private;
    input r1 as u8.private;
    gte r1 1u8 into r2;
    assert.eq r2 true;
    lte r1 3u8 into r3;
    assert.eq r3 true;
    async verify_badge r0 r1 into r4;
    output r4 as veilsub_marketplace_v1.aleo/verify_badge.future;

finalize verify_badge:
    input r0 as field.public;
    input r1 as u8.public;
    get.or_use creator_badge[r0] 0u8 into r2;
    gte r2 r1 into r3;
    assert.eq r3 true;

function cancel_auction:
    input r0 as field.private;
    hash.psd2 self.caller into r1 as field;
    async cancel_auction r0 r1 into r2;
    output r2 as veilsub_marketplace_v1.aleo/cancel_auction.future;

finalize cancel_auction:
    input r0 as field.public;
    input r1 as field.public;
    get.or_use auction_creator[r0] 0field into r2;
    assert.eq r2 r1;
    get.or_use auction_status[r0] 255u8 into r3;
    assert.eq r3 0u8;
    set 2u8 into auction_status[r0];

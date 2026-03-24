program veilsub_access_v1.aleo;

record AccessProof:
    owner as address.private;
    creator as address.private;
    tier as u8.private;
    pass_id as field.private;
    expires_at as u32.private;
    privacy_level as u8.private;

mapping access_log:
    key as field.public;
    value as boolean.public;

mapping resource_access_count:
    key as field.public;
    value as u64.public;

mapping creator_gates:
    key as field.public;
    value as u64.public;

mapping pass_revoked:
    key as field.public;
    value as boolean.public;

function verify_membership:
    input r0 as AccessProof.record;
    input r1 as field.private;
    input r2 as u8.private;
    assert.eq self.caller r0.owner;
    gte r0.tier r2 into r3;
    assert.eq r3 true;
    hash.psd2 r0.creator into r4 as field;
    assert.eq r4 r1;
    cast r0.owner r0.creator r0.tier r0.pass_id r0.expires_at r0.privacy_level into r5 as AccessProof.record;
    async verify_membership r0.pass_id r0.expires_at into r6;
    output r5 as AccessProof.record;
    output r6 as veilsub_access_v1.aleo/verify_membership.future;

finalize verify_membership:
    input r0 as field.public;
    input r1 as u32.public;
    get.or_use pass_revoked[r0] false into r2;
    not r2 into r3;
    assert.eq r3 true;
    gt r1 block.height into r4;
    assert.eq r4 true;

function gate_resource:
    input r0 as AccessProof.record;
    input r1 as field.private;
    input r2 as field.private;
    assert.eq self.caller r0.owner;
    hash.psd2 r0.creator into r3 as field;
    assert.eq r3 r2;
    cast r0.owner r0.creator r0.tier r0.pass_id r0.expires_at r0.privacy_level into r4 as AccessProof.record;
    async gate_resource r0.pass_id r1 r0.expires_at into r5;
    output r4 as AccessProof.record;
    output r5 as veilsub_access_v1.aleo/gate_resource.future;

finalize gate_resource:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u32.public;
    get.or_use pass_revoked[r0] false into r3;
    not r3 into r4;
    assert.eq r4 true;
    gt r2 block.height into r5;
    assert.eq r5 true;
    add r0 r1 into r6;
    add r6 9999999999999999999field into r7;
    hash.psd2 r7 into r8 as field;
    set true into access_log[r8];
    get.or_use resource_access_count[r1] 0u64 into r9;
    add r9 1u64 into r10;
    set r10 into resource_access_count[r1];

function gate_resource_tiered:
    input r0 as AccessProof.record;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as u8.private;
    assert.eq self.caller r0.owner;
    gte r0.tier r3 into r4;
    assert.eq r4 true;
    hash.psd2 r0.creator into r5 as field;
    assert.eq r5 r2;
    cast r0.owner r0.creator r0.tier r0.pass_id r0.expires_at r0.privacy_level into r6 as AccessProof.record;
    async gate_resource_tiered r0.pass_id r1 r0.expires_at into r7;
    output r6 as AccessProof.record;
    output r7 as veilsub_access_v1.aleo/gate_resource_tiered.future;

finalize gate_resource_tiered:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u32.public;
    get.or_use pass_revoked[r0] false into r3;
    not r3 into r4;
    assert.eq r4 true;
    gt r2 block.height into r5;
    assert.eq r5 true;
    add r0 r1 into r6;
    add r6 9999999999999999999field into r7;
    hash.psd2 r7 into r8 as field;
    set true into access_log[r8];
    get.or_use resource_access_count[r1] 0u64 into r9;
    add r9 1u64 into r10;
    set r10 into resource_access_count[r1];

function register_gate:
    input r0 as field.private;
    input r1 as field.private;
    async register_gate r0 into r2;
    output r2 as veilsub_access_v1.aleo/register_gate.future;

finalize register_gate:
    input r0 as field.public;
    get.or_use creator_gates[r0] 0u64 into r1;
    add r1 1u64 into r2;
    set r2 into creator_gates[r0];

function revoke_pass:
    input r0 as field.private;
    input r1 as field.private;
    hash.psd2 self.caller into r2 as field;
    assert.eq r2 r1;
    async revoke_pass r0 into r3;
    output r3 as veilsub_access_v1.aleo/revoke_pass.future;

finalize revoke_pass:
    input r0 as field.public;
    set true into pass_revoked[r0];

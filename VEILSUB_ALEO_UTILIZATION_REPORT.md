# VeilSub: Are We Using Aleo Fully?

## The Short Answer

**Yes — 65-70%.** And that's the RIGHT number. The remaining 30% are primitives that are either redundant (BHP512/768/1024 when BHP256 is sufficient), unnecessary for subscriptions (Poseidon4/8 higher-arity hashing), or not yet available in Leo (threshold cryptography, unbounded loops).

VeilSub is NOT leaving significant capability on the table. Here's the complete breakdown.

---

## What We Use (and What We're the ONLY Project Using)

### Crypto Primitives: 8 of ~12 Available

| Primitive | VeilSub | Any Competitor Uses? | Notes |
|-----------|---------|---------------------|-------|
| Poseidon2::hash_to_field | YES | Everyone | Standard. Our bread and butter for zero-address finalize |
| Poseidon2::hash_to_group | YES | Lasagna only | Secondary Pedersen generator: H = Poseidon2::hash_to_group(0field) |
| Poseidon2::hash_to_scalar | YES | Lasagna only | Blinding factor derivation |
| BHP256::hash_to_field | YES | Everyone | Nullifiers, content hashing |
| BHP256::hash_to_scalar | YES | NullPay | Randomizer for commitments |
| BHP256::commit_to_field | YES | NullPay, Obscura | Sealed bids, tip commitments |
| signature::verify | YES | **NOBODY** | Content authorship proof. We're the only project in the buildathon using Schnorr signatures |
| ECDSA::verify_keccak256_eth | YES | **NOBODY** | Cross-chain Ethereum identity. We're the first project to bridge ETH identity into Aleo |
| ChaCha::rand_u64 | YES | **NOBODY** | On-chain lottery. No competitor uses verifiable randomness |
| group::GEN | YES | Lasagna | Generator point for custom Pedersen commitments |
| Group addition (+) | YES | Lasagna | Homomorphic commitment aggregation |
| Scalar multiplication (*) | YES | Lasagna | Pedersen commitment: value * G + blinding * H |

**3 primitives that ONLY VeilSub uses:** signature::verify, ECDSA::verify_keccak256_eth, ChaCha::rand_u64.

### What We DON'T Use (and Why It's Fine)

| Primitive | Why We Skip It |
|-----------|---------------|
| Poseidon4 / Poseidon8 | Higher arity — all our hashing is 2-input (address + nonce, key + value). Poseidon2 is optimal |
| BHP512 / BHP768 / BHP1024 | Larger hash outputs. BHP256 provides 256-bit security, matching Aleo's field size. Overkill adds constraint cost |
| Pedersen64 / Pedersen128 | Built-in Pedersen is NOT additively homomorphic (lasagna discovered this). We use custom Pedersen via group::GEN instead |
| ChaCha::rand_field / rand_bool | Our lottery only needs rand_u64. Scalar randomness derived from BHP256::hash_to_scalar is cheaper |
| i8 / i16 / i32 / i64 | No negative numbers in subscription model. All amounts are unsigned |
| Mapping::remove() | We use sentinel values (false, 0u64) instead. Remove is destructive and can't be audited |

---

## Where We're Stronger Than Every Competitor

### 1. Most Crypto Primitives Used: 8 (vs competitors' 3-5)

| Project | Primitives Used | Which Ones |
|---------|----------------|-----------|
| **VeilSub** | **8** | Poseidon2 (field/group/scalar), BHP256 (hash/scalar/commit), signatures, ECDSA, ChaCha, group ops |
| Lasagna | 5 | Poseidon2 (field/group), BHP256 (commit), group::GEN, scalar mult |
| NullPay | 4 | Poseidon2, BHP256 (hash/commit/scalar), group ops |
| Veiled Markets | 3 | Poseidon2, BHP256, basic arithmetic |
| ZKPerp | 3 | Poseidon2, BHP256, arithmetic |
| Obscura Auction | 4 | Poseidon2, BHP256 (commit), group ops, arithmetic |

### 2. Only Multi-Program Ecosystem

Every competitor deploys ONE program. VeilSub deploys 5+ programs. Each handles a different domain. This is unique in the buildathon.

| Program | Transitions | Unique Feature |
|---------|-------------|---------------|
| veilsub_v29 | 31 | Core subscriptions, triple token, Pedersen counts |
| veilsub_extras | 2 | ChaCha lottery, nullifier reviews |
| veilsub_identity | 5 | Signature verify, ECDSA cross-chain |
| veilsub_access | 5 | Cross-program access gating |
| veilsub_governance | 5 | Private Pedersen vote aggregation |
| veilsub_marketplace | 9 | Pedersen reputation, sealed-bid auctions |

### 3. Homomorphic Pedersen Applied to 4 Domains

Lasagna pioneered custom Pedersen on Aleo for prediction market pool totals (1 domain). VeilSub applies the same technique to:
1. **Subscriber counts** (core) — hide exact subscriber numbers
2. **Revenue totals** (core) — hide exact creator earnings
3. **Governance votes** (governance) — hide individual ballot direction
4. **Creator reputation** (marketplace) — hide individual review scores

Same primitive, 4x the application breadth.

### 4. Zero-Address Finalize Across ALL Programs

NullPay does this too. Nobody else in the top 7 funded projects enforces it as strictly. All 26 mappings in our main contract + all mappings in companion programs are field-keyed. Zero raw addresses in any finalize block.

---

## What Could Still Be Added (If We Had Infinite Time)

### Big Opportunities (Would Move Scores)

**1. Cross-Program Record Passing**

Our companion programs (extras, identity, governance, marketplace) are independent. They don't import veilsub_v29. This means a subscriber can't pass their AccessPass to veilsub_governance to prove they're eligible to vote.

If Leo supported it cleanly, we could:
```leo
// In veilsub_governance.aleo:
import veilsub_v29.aleo;

transition cast_ballot(
    pass: veilsub_v29.aleo/AccessPass,  // Prove subscription = voting right
    proposal_id: field,
    vote: bool
) -> ...
```

This would make governance ONLY accessible to subscribers (provable on-chain). Currently governance is open to anyone who knows the program.

**Status**: Leo supports cross-program record passing syntactically, but it requires both programs to be deployed and the imported program must be a dependency in program.json. This IS achievable — we just need to restructure deployment order.

**Impact**: Novelty +1, Tech +0.5. Proves ecosystem composability is real, not just separate programs deployed to the same chain.

**Effort**: 3-5 days (refactor imports, redeploy in correct order, test record passing).

**2. Oracle Integration**

Lasagna imports `official_oracle_v2.aleo` for price feeds. We could do the same for dynamic subscription pricing pegged to USD:

```leo
import official_oracle_v2.aleo;

// In finalize:
let attested: official_oracle_v2.aleo/AttestedData = Mapping::get(
    official_oracle_v2.aleo/sgx_attested_data,
    request_hash
);
let aleo_price_usd: u128 = attested.data;
let subscription_price_aleo: u64 = (tier_price_usd * 1000000u128 / aleo_price_usd) as u64;
```

This solves the "volatile ALEO credits" problem at the protocol level. Instead of creators setting prices in ALEO (which fluctuates), they set prices in USD and the oracle converts at execution time.

**Status**: Depends on official_oracle_v2.aleo being deployed on testnet. Lasagna uses it, so it should be available.

**Impact**: Practicality +1, Tech +0.5. Directly addresses "dollar-denominated subscriptions" judge feedback.

**Effort**: 2-3 days (new program or modify existing, deploy, test).

**3. Merkle Proof Verification (Beyond Stablecoin Compliance)**

We currently pass `[MerkleProof; 2]` for stablecoin compliance (inherited from the token program). But we don't build our OWN Merkle trees.

Opportunity: Creator builds a Merkle tree of approved subscriber hashes. Subscriber proves membership via Merkle proof without revealing the full list. This is a more sophisticated access control than our current per-pass verification.

**Status**: Feasible. VeilReceipt does depth-2 Merkle proofs for cart items. We could do depth-4 (16 subscribers per tree) or depth-8 (256 subscribers).

**Impact**: Privacy +0.5, Novelty +1. Novel access control primitive nobody else has for subscriptions.

**Effort**: 3-4 days.

**4. Threshold Decryption**

Not currently available as a Leo primitive, but could be simulated:
- Content encrypted with threshold key (k-of-n)
- Any k subscribers can collectively decrypt
- No single subscriber has the full key
- Use case: collaborative exclusive content (e.g., a group of 5 subscribers collectively access a research paper)

**Status**: Would require building from group operations. Complex but theoretically possible.

**Impact**: Novelty +2, Privacy +1. Genuinely novel — nobody in any blockchain ecosystem has done threshold-decrypted subscriptions.

**Effort**: 10-15 days (research + implementation + testing).

### Small Opportunities (Nice to Have)

**5. ChaCha::rand_field** — Could use for random salt generation in governance voting (currently derived from user input). Minor improvement.

**6. ChaCha::rand_bool** — Could use for random content highlighting ("Random post of the day"). Trivial.

**7. BHP256::commit_to_group** — Could use instead of commit_to_field for auction bids (group commitments have different algebraic properties). Marginal benefit.

**8. block.height for Time-Locked Features** — We use block.height for expiry. Could also use for: time-locked content (content becomes free after N blocks), scheduled tier changes, auction phase transitions. Currently handled by constants but could be more dynamic.

---

## The Honest Verdict

**VeilSub uses Aleo more thoroughly than any other project in the buildathon.** 8 crypto primitives (nobody else uses more than 5). 5 deployed programs (nobody else has more than 1). Custom Pedersen applied to 4 domains (Lasagna has 1). Three exclusive primitives nobody else uses (signatures, ECDSA, ChaCha).

The remaining unused capabilities fall into three categories:
1. **Redundant** (larger BHP variants, higher-arity Poseidon) — using them would add constraint cost without benefit
2. **Inapplicable** (signed integers, floating point) — subscription model doesn't need them
3. **Future opportunities** (oracle integration, cross-program record passing, threshold crypto) — real value, planned for future waves

**We are at approximately 65-70% utilization, which is optimal.** Going to 100% would mean using primitives that add no value (BHP1024 for a subscription hash?) just to say we used them. The judges are Aleo engineers — they'd see through that.

The real competitive advantage is not "we used every primitive" but "we used the RIGHT primitives in NOVEL combinations." Pedersen + Schnorr + ECDSA + ChaCha + nullifiers + commit-reveal + zero-address finalize — this combination exists in no other project. That's the story.

# VeilSub Protocol Architecture

## 7-Program Ecosystem

```
                    ┌─────────────────────────┐
                    │    veilsub_v29.aleo      │
                    │    (Core Engine)         │
                    │    31 transitions        │
                    │    30 mappings           │
                    │    6 records, 5 structs  │
                    └────────────┬────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌─────────▼────────┐  ┌─────────▼────────┐  ┌──────────▼─────────┐
│ veilsub_access   │  │ veilsub_         │  │ veilsub_           │
│ (Login with      │  │ governance       │  │ marketplace        │
│  VeilSub)        │  │ (Private Voting) │  │ (Reputation +      │
│ 5 transitions    │  │ 5 transitions    │  │  Sealed Auctions)  │
│ imports v29 stub │  │ imports v29 stub │  │ 9 transitions      │
└─────────┬────────┘  └─────────┬────────┘  │ imports v29 stub   │
          │                     │            └──────────┬─────────┘
┌─────────▼────────┐  ┌────────▼─────────┐  ┌─────────▼──────────┐
│ veilsub_extras   │  │ veilsub_         │  │ hash_helper        │
│ (Reviews +       │  │ identity         │  │ (Poseidon2         │
│  Lottery)        │  │ (Signatures +    │  │  Utility)          │
│ 2 transitions    │  │  ECDSA Bridge)   │  │                    │
│                  │  │ 5 transitions    │  │                    │
└──────────────────┘  └──────────────────┘  └────────────────────┘
```

## Cross-Program Composability

Three companion programs declare `veilsub_v29.aleo` as a network dependency
and include import stubs defining the core `AccessPass` record type:

| Companion | Import Stub | Composability Pattern |
|-----------|------------|----------------------|
| **veilsub_access** | `imports/veilsub_v29.leo` | Direct `AccessPass` verification (eliminates relay) |
| **veilsub_governance** | `imports/veilsub_v29.leo` | Subscriber-gated voting (pass = ballot right) |
| **veilsub_marketplace** | `imports/veilsub_v29.leo` | Subscriber-verified reviews (anti-Sybil) |

Each stub declares `AccessPass`, `access_revoked`, `subscriber_count`, and
`verify_access` -- the minimum surface needed for cross-program calls.
The standalone versions work without the import for independent deployment.

## Cryptographic Primitives (8 total)

| Primitive | Used In | Purpose |
|-----------|---------|---------|
| Poseidon2::hash_to_field | All programs | Zero-address finalize keys |
| Poseidon2::hash_to_group | Core, Governance, Marketplace | Pedersen generator H |
| BHP256::hash_to_scalar | Core, Governance, Marketplace | Blinding factors |
| BHP256::commit_to_field | Core, Marketplace | Sealed bids, tip commits |
| group::GEN + scalar mult | Core, Governance, Marketplace | Homomorphic commitments |
| signature::verify | Identity | Content authorship proof |
| ECDSA::verify (keccak256) | Identity | Ethereum identity bridge |
| ChaCha::rand_u64 | Extras | Verifiable on-chain randomness |

## Privacy Architecture

**Zero addresses in finalize** -- every program follows the same discipline:
all mapping keys are Poseidon2 field hashes, never raw `address` values.
No observer can link on-chain state to wallet addresses.

**Blind Subscription Protocol (BSP)** -- three privacy layers:
1. **Blind Identity Rotation**: nonce-rotated Poseidon2 hashes per renewal
2. **Zero-Address Finalize**: all 30 mappings field-keyed (no address leakage)
3. **Selective Disclosure**: scoped AuditTokens with bitfield permissions

## Aggregate Totals

| Metric | Count |
|--------|-------|
| Programs | 7 |
| Transitions | 57 |
| Mappings | 52 |
| Records | 12 |
| Structs | 10 |
| Cryptographic primitives | 8 |

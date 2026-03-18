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

## Privacy Model -- Known Limitations

### Raw Counts (v29)

The current contract stores both raw `u64` subscriber counts (`subscriber_count`,
`total_revenue` mappings) AND additively homomorphic Pedersen commitments
(`subscriber_commit`, `revenue_commit` mappings). A chain observer can read the
raw counts directly, making the Pedersen commitment redundant for privacy if both
are exposed.

**Current mitigation (frontend):** The frontend displays privacy-preserving threshold
badges (e.g. "50+ subscribers", "100+ ALEO") instead of exact numbers on all
public-facing pages. The raw values are only visible to the creator in their
private dashboard (they already know their own numbers) and in the developer
Explorer tool (with an explicit warning).

**v30 plan:** Remove the `subscriber_count` and `total_revenue` mappings entirely.
All subscriber/revenue displays will use threshold proofs verified against the
Pedersen commitments via `prove_subscriber_threshold`. The `blind_sum` mapping
enables external verifiers to check commitment consistency:
`count * G + blind_sum * H == subscriber_commit`.

### Content Encryption

Content published via `publish_encrypted_content` uses end-to-end encryption
(client-side AES-256-GCM with tier-derived keys). The server stores only
ciphertext and cannot decrypt post bodies. Content published before E2E
encryption was enabled uses server-side encryption (AES-256-GCM with
server-managed keys). Server-side encrypted content can theoretically be
read by the server operator.

### Browsing Patterns

Creator profile requests are cached client-side after bulk prefetch on the
explore page. Individual creator page visits do not generate individual
Supabase queries when the cache is warm. The API proxy (`/api/aleo/*`) hides
user IP addresses from the Aleo Provable API. However, the initial explore
page fetch reveals that the user is browsing VeilSub (though not which
specific creator they are interested in).

### Threshold Badge Tiers

The frontend maps raw counts to threshold badges for public display:

| Raw Count | Badge |
|-----------|-------|
| 0--9 | New |
| 10--49 | 10+ |
| 50--99 | 50+ |
| 100--499 | 100+ |
| 500--999 | 500+ |
| 1,000--4,999 | 1K+ |
| 5,000--9,999 | 5K+ |
| 10,000+ | 10K+ |

This reduces information leakage from exact counts to coarse buckets, which is
both more privacy-preserving and better UX (avoids comparison pressure between
creators).

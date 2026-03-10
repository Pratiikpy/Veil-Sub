# VeilSub API Reference

## Base URL

All API routes are served from the Next.js frontend at `https://veilsub.vercel.app/api/`.

---

## Content Posts API

### GET /api/posts

Fetch posts for a creator. Gated posts return `body: null` with `gated: true`.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `creator` | string | Yes | Aleo address (aleo1...) |

**Response:**
```json
{
  "posts": [
    {
      "id": "post-uuid",
      "title": "Post Title",
      "body": "Full body text (null if gated)",
      "preview": "Short teaser (max 300 chars)",
      "minTier": 2,
      "createdAt": "2026-03-01T10:00:00Z",
      "contentId": "on-chain-content-id",
      "gated": true
    }
  ]
}
```

### POST /api/posts

Create a new post. Requires wallet authentication.

**Body:**
```json
{
  "creator": "aleo1...",
  "title": "Post Title",
  "body": "Full content body",
  "preview": "Optional teaser",
  "minTier": 1,
  "contentId": "on-chain-content-id",
  "walletHash": "sha256-hex-of-address",
  "timestamp": 1709312000000,
  "signature": "wallet-signature-base64"
}
```

**Validation:**
- `title`: max 200 characters
- `body`: max 50,000 characters
- `minTier`: 1-20
- `walletHash`: SHA-256 of creator address must match
- `timestamp`: within 5 minutes of server time
- Rate limit: 5 posts/minute per address

### PUT /api/posts

Update an existing post. Requires wallet authentication.

**Body:**
```json
{
  "creator": "aleo1...",
  "postId": "post-uuid",
  "title": "Updated Title",
  "body": "Updated body",
  "preview": "Updated preview",
  "minTier": 2,
  "walletHash": "sha256-hex",
  "timestamp": 1709312000000,
  "signature": "wallet-signature"
}
```

Rate limit: 10 edits/minute per address.

### DELETE /api/posts

Delete a post. Requires wallet authentication.

**Body:**
```json
{
  "creator": "aleo1...",
  "postId": "post-uuid",
  "walletHash": "sha256-hex",
  "timestamp": 1709312000000,
  "signature": "wallet-signature"
}
```

Rate limit: 10 deletes/minute per address.

---

## Analytics API

### GET /api/analytics

Fetch analytics data. Three query modes:

**Mode 1: Global Stats**
```
GET /api/analytics?global_stats=true
```
Response:
```json
{
  "totalCreators": 5,
  "totalSubscriptions": 42,
  "totalRevenue": 21000000,
  "activePrograms": 1
}
```

**Mode 2: Recent Events**
```
GET /api/analytics?recent=true
```
Response:
```json
{
  "events": [
    {
      "tier": 2,
      "amount_microcredits": 2000,
      "tx_id": "at1...",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ]
}
```

**Mode 3: Per-Creator Events**
```
GET /api/analytics?creator_address_hash=sha256hex
```
Returns events filtered by creator address hash.

### POST /api/analytics

Record a subscription event. Rate limited by IP.

**Body:**
```json
{
  "creator_address": "aleo1...",
  "tier": 2,
  "amount_microcredits": 2000,
  "tx_id": "at1..."
}
```

Rate limit: 10 events/minute per IP.

---

## On-Chain Mapping Queries

Mapping data is read via the Aleo API proxy:

```
GET /api/aleo/program/{programId}/mapping/{mappingName}/{key}
```

**Example:**
```
GET /api/aleo/program/veilsub_v27.aleo/mapping/tier_prices/7077346...field
```

Returns raw Aleo value (e.g., `"500u64"`) or `null` if not set.

### Available Mappings (25 total)

| Mapping | Key Format | Value | Description |
|---------|-----------|-------|-------------|
| `tier_prices` | Poseidon2(address) | u64 | Creator base price |
| `subscriber_count` | Poseidon2(address) | u64 | Total subscribers |
| `total_revenue` | Poseidon2(address) | u64 | Lifetime revenue |
| `content_count` | Poseidon2(address) | u64 | Published content |
| `platform_revenue` | 0u8 | u64 | Platform fee pool |
| `total_creators` | 0u8 | u64 | Platform-wide creator count |
| `total_content` | 0u8 | u64 | Platform-wide content count |
| `creator_tiers` | Poseidon2(TierKey) | u64 | Custom tier price |
| `tier_count` | Poseidon2(address) | u64 | Tiers per creator |
| `tier_deprecated` | Poseidon2(TierKey) | bool | Tier deprecated flag |
| `content_meta` | Poseidon2(content_id) | u8 | Min tier for content |
| `content_hashes` | Poseidon2(content_id) | field | Content integrity hash |
| `content_creator` | Poseidon2(content_id) | field | Creator hash (auth) |
| `content_deleted` | Poseidon2(content_id) | bool | Deletion flag |
| `access_revoked` | pass_id | bool | Access revoked flag |
| `pass_creator` | pass_id | field | Creator hash for pass |
| `gift_redeemed` | gift_id | bool | Gift used flag |
| `nonce_used` | Poseidon2(nonce) | bool | Blind nonce replay guard |
| `encryption_commits` | Poseidon2(content_id) | field | Encryption commitment |
| `content_disputes` | Poseidon2(content_id) | u64 | Dispute count |
| `dispute_count_by_caller` | Poseidon2(DisputeKey) | u64 | Per-caller dispute count |
| `tip_commitments` | BHP256 commitment | bool | Tip commitment exists |
| `tip_revealed` | BHP256 commitment | bool | Tip revealed flag |
| `subscription_by_tier` | Poseidon2(TierKey) | u64 | Subscribers per tier |
| `trial_used` | Poseidon2(TrialKey) | bool | Trial rate-limit flag |

**Privacy note:** All mapping keys are field-hashed (Poseidon2). No raw addresses appear in any mapping key. This is the "Zero-Address Finalize" privacy layer.

---

## Authentication

API write endpoints (POST/PUT/DELETE) use wallet-based authentication:

1. Client computes `walletHash = SHA-256(walletAddress)` (hex string)
2. Client includes current `timestamp` (milliseconds)
3. Client signs a message with wallet and includes `signature`
4. Server verifies:
   - `walletHash` matches `SHA-256(creator)` from request body
   - `timestamp` is within 5 minutes
   - `signature` is a non-empty string (proves wallet signing capability)

No passwords, no sessions, no cookies. Wallet ownership = authorization.

---

## Error Responses

All endpoints return errors in consistent format:

```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Invalid request (missing fields, bad format) |
| 403 | Authentication failed (bad wallet hash, expired timestamp) |
| 404 | Resource not found |
| 429 | Rate limited |
| 500 | Internal server error |
| 503 | Storage not configured (Redis/Supabase unavailable) |

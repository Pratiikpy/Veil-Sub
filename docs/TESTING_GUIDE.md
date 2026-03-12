# VeilSub Testing Guide

## Quick Start

```bash
# Run all frontend tests
cd frontend && npx vitest run

# Run tests in watch mode
cd frontend && npx vitest

# Run with coverage
cd frontend && npx vitest run --coverage
```

---

## Test Structure

```
frontend/src/lib/__tests__/
  utils.test.ts                 — Core utility functions (34 tests)
  errorMessages.test.ts         — Error code mapping (10 tests)
  config.test.ts                — Configuration validation (23 tests)
  configAdvanced.test.ts        — Advanced config validation (40 tests)
  encryption.test.ts            — Encryption utilities (16 tests)
  aleoUtils.test.ts             — Aleo utility helpers (22 tests)
  types.test.ts                 — Type validation (27 tests)
  utilsEdgeCases.test.ts        — Edge case coverage (60 tests)
  errorMessagesAdvanced.test.ts — Advanced error mapping (23 tests)
  contractHelpers.test.ts       — Contract helper functions (26 tests)
```

### What's Tested

**utils.test.ts** — Core utility functions
- `generatePassId()`: randomness, uniqueness, field size bounds, non-zero
- `formatCredits()`: zero, whole, fractional, small amounts, thousands, edge cases
- `creditsToMicrocredits()`: conversion accuracy, flooring
- `parseRecordPlaintext()`: string records, object records, suffix stripping, address preservation
- `parseAccessPass()`: valid parsing, missing fields, invalid tiers
- `isValidAleoAddress()`: format validation, prefix, length, case sensitivity
- `shortenAddress()`: truncation, short input passthrough, custom char count
- `parseMicrocredits()`: extraction, underscored numbers, missing field, whitespace

**errorMessages.test.ts** — Error code mapping
- Coverage of all error code ranges (ERR_001 through ERR_119)
- `getErrorMessage()` code extraction from error strings
- First-match behavior for multiple codes
- Fallback to original string for unknown codes

**config.test.ts** — Configuration integrity
- Program ID matches deployed contract
- Platform address validation
- Fee structure: all positive, blind > standard, verify cheapest
- Creator hash map: valid addresses, field-suffixed values
- Seed content: all tiers covered, required fields present
- Featured creators: valid addresses, non-empty labels

---

## Smart Contract Testing

### Leo Build Verification

```bash
cd contracts/veilsub && leo build
```

Expected output:
```
  Compiled 'veilsub_v27.aleo'
  Variables: ...
  Constraints: ...
  Statement count: 866
```

### On-Chain Transaction Verification

Verify deployed contract on explorer:
- https://testnet.aleoscan.io/program?id=veilsub_v27.aleo
- https://testnet.explorer.provable.com/program/veilsub_v27.aleo

### Manual Test Flows

**1. Creator Registration**
```
1. Connect Shield Wallet on https://veil-sub.vercel.app
2. Navigate to /dashboard
3. Enter base price (e.g., 500 microcredits)
4. Click "Register" -> approve transaction
5. Wait for confirmation (~30-60 seconds)
6. Verify: tier_prices mapping shows value on explorer
```

**2. Subscribe to Creator**
```
1. Navigate to /creator/{address}
2. Select tier (Supporter/Premium/VIP)
3. Click "Subscribe" -> SubscribeModal opens
4. Verify price displayed matches tier
5. Click "Subscribe" -> approve transaction
6. Wait for confirmation
7. Verify: AccessPass appears in wallet records
8. Verify: subscriber_count incremented on explorer
```

**3. Blind Subscribe**
```
1. Same as #2 but toggle "Blind Mode" in SubscribeModal
2. Verify: nonce generated (shown in modal)
3. After confirmation: pass has privacy_level = 1
4. Verify: nonce_used mapping set on explorer
```

**4. Verify Access**
```
1. Navigate to /verify
2. Select an AccessPass from left panel
3. Click "Verify with ZK Proof"
4. Verify: transaction succeeds, pass returned
5. Zero on-chain trace of who verified
```

**5. Content Gating**
```
1. As creator: publish a post with minTier=2
2. As tier-1 subscriber: visit creator page -> post shows locked
3. As tier-2 subscriber: visit creator page -> post body visible
```

**6. Walletless Explorer**
```
1. Navigate to /explorer (no wallet needed)
2. Enter a creator address in search
3. Verify: stats load (subscriber count, revenue, etc.)
4. Check "Quick Mapping Queries" section for live data
```

---

## Adding New Tests

Tests live alongside source files in `__tests__/` directories:

```typescript
// src/lib/__tests__/newFeature.test.ts
import { describe, it, expect } from 'vitest'
import { myFunction } from '../myModule'

describe('myFunction', () => {
  it('does what it should', () => {
    expect(myFunction(input)).toBe(expected)
  })
})
```

Run a single test file:
```bash
cd frontend && npx vitest run src/lib/__tests__/utils.test.ts
```

# VeilSub Master Audit & Fix — Production-Ready Quality Gate

> This is the FINAL audit. After this, every feature works, every button clicks, every flow completes, every edge case is handled. No paper cuts. No silent failures. No half-wired features. Production quality.

---

## MISSION

Audit and fix the ENTIRE VeilSub frontend codebase so that it functions as a professional, production-level application. This means:

- Every user flow works end-to-end without errors
- Every button does something (or is removed)
- Every API call includes proper authentication
- Every page handles loading, error, and empty states
- Every form validates inputs and shows errors
- Every piece of data syncs correctly between frontend, Supabase, Redis, and Aleo
- Zero console errors, zero TypeScript errors, zero silent failures
- The app feels like Twitter/Instagram/Medium — not a prototype

---

## HARD RULES

1. **NEVER touch `.leo` files** in `/contracts/` — deployed on-chain
2. **NEVER delete or rename hooks** in `/frontend/src/hooks/`
3. **NEVER change env var names** — Vercel depends on them
4. **NEVER change Supabase schema** — production data
5. **NEVER change Redis key structure** — existing posts depend on it
6. **One commit per audit phase** — clean revert path
7. **`npm run build` must pass after every commit** — non-negotiable
8. **Use immutable patterns** — never mutate state, always new objects
9. **Files under 800 lines** — split large files
10. **Always choose the harder, better solution** — no shortcuts, no workarounds

---

## PHASE 0: UNDERSTAND THE CODEBASE

Before touching ANY code, read these files in order. This is mandatory.

### Data Layer
```
/frontend/src/types/index.ts              → all types
/frontend/src/lib/config.ts               → program IDs, fees, constants
/frontend/src/lib/supabase.ts             → Supabase client (server-only)
/frontend/src/lib/redis.ts                → Upstash Redis (posts + rate limits)
/frontend/src/lib/apiAuth.ts              → wallet auth: SHA-256 hash + 2-min window
/frontend/src/lib/authenticatedFetch.ts   → HTTP client with wallet headers
/frontend/src/lib/encryption.ts           → AES-256-GCM server-side
/frontend/src/lib/e2eEncryption.ts        → client-side E2E (tier-specific keys)
/frontend/src/lib/contentEncryption.ts    → per-creator content encryption
/frontend/src/lib/utils.ts               → helpers (formatCredits, computeWalletHash)
/frontend/src/lib/poseidon.ts            → Poseidon2 hashing for on-chain identity
/supabase-schema.sql                     → DB: creator_profiles, subscription_events
```

### Hooks (the brain)
```
/frontend/src/hooks/useVeilSub.ts         → barrel export of all hooks
/frontend/src/hooks/useContractExecute.ts  → Aleo contract execution
/frontend/src/hooks/useCreatorActions.ts   → register, tiers, withdraw
/frontend/src/hooks/useSubscription.ts     → subscribe, blind, trial, gift, renew
/frontend/src/hooks/useTipping.ts          → tip, commit-reveal, audit tokens
/frontend/src/hooks/useContentActions.ts   → publish, update, delete content
/frontend/src/hooks/useContentFeed.ts      → CRUD posts via Redis API
/frontend/src/hooks/useSupabase.ts         → profile CRUD in Supabase
/frontend/src/hooks/useCreatorStats.ts     → on-chain stats with 30s cache
/frontend/src/hooks/useWalletRecords.ts    → credits, passes, records
/frontend/src/hooks/useTransactionFlow.ts  → multi-step tx sequencing
```

### API Routes (all 22)
```
Read every /frontend/src/app/api/*/route.ts file.
For each route note: HTTP methods, auth requirements, storage (Supabase/Redis/Aleo), rate limits.
```

### Pages (all 19+)
```
Read every /frontend/src/app/*/page.tsx file.
```

### Key Components
```
/frontend/src/components/CreatePostForm.tsx
/frontend/src/components/SubscribeModal.tsx
/frontend/src/components/TipModal.tsx
/frontend/src/components/RenewModal.tsx
/frontend/src/components/GiftSubscriptionFlow.tsx
/frontend/src/components/ContentFeed.tsx
/frontend/src/components/ArticleReader.tsx
/frontend/src/components/OnboardingWizard.tsx
/frontend/src/components/dashboard/RegistrationForm.tsx
/frontend/src/components/dashboard/ProfileEditor.tsx
/frontend/src/components/dashboard/PostsList.tsx
/frontend/src/components/Header.tsx
/frontend/src/components/DesktopSidebar.tsx
```

---

## PHASE 1: CRITICAL BUGS (Fix First — These Break Core Features)

### BUG 1: Tier Validation Rejects Custom Tiers
- **File:** `/frontend/src/lib/utils.ts` (parseAccessPass)
- **Bug:** Validates `tier < 1 || tier > 3` but contract supports up to 20
- **Impact:** Subscribers with tiers 4-20 cannot access their subscriptions
- **Fix:** Change to `tier < 1 || tier > 20`

### BUG 2: useCreatorStats Queries Wrong Mapping Keys
- **File:** `/frontend/src/hooks/useCreatorStats.ts`
- **Bug:** Fetches `tier_prices` and `content_count` by raw address, but v29 keys by `Poseidon2(address)` hash
- **Impact:** Creator stats always show zero. Featured creator cards hang forever.
- **Fix:** Compute Poseidon2 hash client-side before querying on-chain mappings. Use the existing poseidon.ts utility.

### BUG 3: Privacy Mode UI Never Rendered
- **File:** `/frontend/src/components/SubscribeModal.tsx`
- **Bug:** `privacyMode` state exists ('standard'|'blind'|'trial') but NO UI toggle exists
- **Impact:** Blind subscription — your novel privacy feature — is completely invisible to users
- **Fix:** Add radio buttons or segmented control: Standard / Blind / Trial. Wire to existing `subscribeBlind()` and `subscribeTrial()` hooks.

### BUG 4: RenewModal Defaults Custom Tiers to Tier 1
- **File:** `/frontend/src/components/RenewModal.tsx`
- **Bug:** `TIERS.find((t) => t.id === pass.tier) || TIERS[0]` — custom tiers (4-20) fallback to cheapest
- **Impact:** Subscribers renewing custom tiers pay wrong amount
- **Fix:** Fetch actual tier data from on-chain `creator_tiers` mapping. Don't rely on hardcoded TIERS array.

### BUG 5: Hardcoded TIERS Array Everywhere
- **File:** `/frontend/src/types/index.ts` (TIERS constant)
- **Bug:** Only 3 tiers defined (Supporter/Premium/VIP). Contract supports 20.
- **Impact:** Custom tiers invisible across entire app — subscribe modal, renew modal, post creation, profile page
- **Fix:** Create a `useCreatorTiers(address)` hook that fetches tiers dynamically from on-chain. Replace every TIERS reference.

### BUG 6: PPV Unlock Stored in localStorage (Bypassable)
- **File:** `/frontend/src/components/ContentFeed.tsx`
- **Bug:** `localStorage.setItem('veilsub_ppv_unlocked_...')` — client can manually unlock PPV content
- **Impact:** Paid content accessible for free by editing localStorage
- **Fix:** Verify on-chain AccessPass before serving content. Move unlock status to server-side (Redis or Supabase).

---

## PHASE 2: API AUTH MISMATCHES

### The Auth Contract
```
Required headers for authenticated endpoints:
  x-wallet-address:    raw Aleo address (aleo1...)
  x-wallet-hash:       SHA-256(address + WALLET_AUTH_SALT)
  x-wallet-timestamp:  Date.now() (within 2 minutes)
  x-wallet-signature:  optional signed message
```

### Audit Steps
1. Read `/frontend/src/lib/apiAuth.ts` — understand `verifyWalletAuth()`
2. Read `/frontend/src/lib/authenticatedFetch.ts` — understand the helper
3. For EVERY API route: note which methods require auth
4. Search ALL frontend code for `fetch('/api/` — check if auth headers sent
5. Every `fetch()` to an auth-required endpoint MUST use `authenticatedFetch()` or manually add headers
6. Known broken: image upload in CreatePostForm.tsx calls `/api/upload` without wallet headers

### Fix Strategy
- Ensure `authenticatedFetch()` is complete and correct
- Replace ALL raw `fetch()` calls to authenticated endpoints
- Add wallet-disconnected guard: if no wallet, show "Connect wallet" instead of making the call

---

## PHASE 3: DEAD BUTTONS & UNWIRED HANDLERS

Search for and fix ALL of these:

```
onClick={() => {}}           → no-op handlers
onClick={() => null}         → no-op handlers
onClick={undefined}          → missing handlers
cursor-pointer (no handler)  → visual lies
href="#" or href=""          → links to nowhere
disabled={true} (always)    → permanently dead buttons
onSubmit with only e.preventDefault() → forms that don't submit
TODO / FIXME near buttons   → incomplete features
```

For each dead button: wire it to the correct hook/API, or replace with `toast("Coming soon")` + `data-todo` attribute.

---

## PHASE 4: EVERY USER FLOW END-TO-END

Trace each flow through the code. At each step, verify: does it work? What happens on error? What happens on success?

### Flow 1: Creator Registration
Connect wallet → Dashboard → RegistrationForm → registerCreator() on-chain → Supabase upsert → UI updates → Profile visible at /creator/[address]

### Flow 2: Profile Editing
Dashboard → ProfileEditor → Edit fields → upsertCreatorProfile() → Supabase update → Cache clear → Changes visible everywhere

### Flow 3: Post Creation (ALL 5 types)
For EACH of Post, Article, Photo, Video, Note:
- Select content type → Fill form → Upload media (WITH AUTH HEADERS) → Select tier → Publish → on-chain tx → Redis store → Appears in feed

### Flow 4: Subscription
Visit /creator/[address] → Click Subscribe → SubscribeModal → Select tier → Select privacy mode → Balance check → Transaction → Success → AccessPass created → Gated content unlocks

### Flow 5: Content Viewing (Subscriber Feed)
/feed → Load posts → Free posts: full content → Gated posts: preview + "Subscribe to unlock" → Unlocked posts: decrypt and show

### Flow 6: Tipping
Creator page → Click Tip → TipModal → Enter amount → Standard or commit-reveal → Transaction → Success

### Flow 7: Renewal
/subscriptions → Find expiring pass → Click Renew → RenewModal → Correct tier + price → Transaction → New AccessPass

### Flow 8: Notifications
/notifications → Load notifications → Display → Mark as read

### Flow 9: Explore & Search
/explore → Creator cards → Search → Filter by category → Click → Navigate to /creator/[address]

### Flow 10: Settings
/settings → Load current settings → Change → Save with auth → Persist → Reload confirms

---

## PHASE 5: STATE & DATA INTEGRITY

For EVERY component that fetches data:

1. **Loading state** — show skeleton or spinner, NEVER blank screen
2. **Error state** — show error message with retry, NEVER crash
3. **Empty state** — show helpful message with action ("Create your first post"), NEVER nothing
4. **Race conditions** — check if component still mounted before setState
5. **Dependency arrays** — every useEffect has correct deps (no missing, no extra)
6. **Cache invalidation** — after mutation (post, subscribe, tip), refetch affected data
7. **Wallet disconnect** — what happens mid-flow? Graceful degradation, not crash.

### Data Sync Verification
- Creator profile: Supabase ↔ on-chain stats ↔ UI — all match?
- Posts: Redis ↔ on-chain content_meta ↔ feed display — all sync?
- Subscriptions: on-chain AccessPass ↔ subscriber count ↔ gated content unlock — all consistent?
- Tiers: on-chain creator_tiers ↔ Subscribe modal ↔ Renew modal ↔ post creation — all show same tiers?

---

## PHASE 6: TYPESCRIPT & RUNTIME SAFETY

1. Run `npx tsc --noEmit` — fix EVERY error
2. Search for `as any` — each one is a potential crash. Fix or justify.
3. Search for `@ts-ignore` / `@ts-expect-error` — fix underlying issues
4. Add optional chaining (`?.`) everywhere a value could be null/undefined
5. Wrap every `JSON.parse()` in try-catch
6. Guard every `.map()` / `.filter()` / `.find()` — verify input is actually an array
7. Add type guards for API responses — don't trust the shape

---

## PHASE 7: API RESPONSE STANDARDIZATION

Standardize ALL API routes to this envelope:

```typescript
{
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: { total?: number; page?: number; limit?: number };
}
```

For each of the 22 API routes:
- Ensure consistent response format
- Ensure proper HTTP status codes (200, 201, 400, 401, 403, 404, 429, 500)
- Ensure rate limiting where needed
- Ensure wallet auth where needed
- Ensure input validation (use zod schemas)

---

## PHASE 8: CLEANUP & POLISH

### Remove Debug Artifacts
- Search for `console.log` — remove all from production code
- Search for `console.error` — replace with proper error handling
- Search for `TODO` / `FIXME` / `HACK` — complete or remove every one
- Search for commented-out code blocks — remove

### Remove Dead Code
- Find components never imported anywhere — delete them
- Find functions never called — delete them
- Find CSS classes never used — remove them

### Hardcoded Data
- Search for `DEMO_` / `demo` / `mock` / `hardcoded` / `placeholder` — replace with real data or remove
- Governance page: either wire to real `veilsub_governance_v1` contract or remove the page
- Marketplace page: either wire to real `veilsub_marketplace_v1` contract or remove the page
- Featured creators: fetch from Supabase instead of hardcoded array

### Loading States
- Every page with data fetching MUST have a `loading.tsx` or skeleton
- Every page MUST have an `error.tsx` for graceful error handling
- `/app/not-found.tsx` must be helpful (suggestions, navigation, search)

---

## PHASE 9: SECURITY

1. Every mutation API route has wallet auth via `verifyWalletAuth()`
2. No hardcoded secrets in source code
3. All user inputs validated and sanitized
4. Rate limiting on all public endpoints
5. Error messages don't leak internal details (no stack traces, no DB info)
6. CORS headers properly configured
7. No XSS vectors (sanitize HTML in rich text)

---

## PHASE 10: BUILD & VERIFY

1. `npm run build` — must pass with zero errors
2. `npx tsc --noEmit` — must pass with zero errors
3. Search for remaining `console.log` — must be zero
4. Search for remaining `TODO` — must be zero
5. Search for remaining `as any` — document any that remain with justification
6. Verify every page loads without console errors
7. Verify every form submits correctly
8. Verify every button does something

---

## PHASE 11: FINAL VERIFICATION AUDIT

After ALL fixes are applied, do one final pass:

Launch parallel sub-agents for multi-perspective review:

1. **UX Auditor** — Walk through every page as a new user. Is anything confusing? Missing? Broken?
2. **Security Reviewer** — Check all API routes, auth, input validation, error messages
3. **Data Integrity Checker** — Verify data flows correctly between Supabase ↔ Redis ↔ Aleo ↔ UI
4. **TypeScript Auditor** — Run `tsc --noEmit`, check for unsafe patterns
5. **Performance Reviewer** — Check for unnecessary re-renders, missing memoization, debouncing

---

## OUTPUT

Create `/frontend/AUDIT_RESULTS.md`:

```markdown
# VeilSub Production Audit Results
Date: [today]
Auditor: Claude Code CLI

## Executive Summary
- Total issues found: [N]
- Issues fixed: [N]
- Issues deferred (with justification): [N]

## Critical Bugs Fixed
| # | Bug | File(s) | Root Cause | Fix |
|---|-----|---------|-----------|-----|

## Auth Mismatches Fixed
| # | Endpoint | Caller | Fix |
|---|----------|--------|-----|

## Dead Buttons Fixed
| # | Element | File | Fix |
|---|---------|------|-----|

## User Flows Verified
| Flow | Status | Notes |
|------|--------|-------|
| Creator Registration | PASS/FAIL | |
| Post Creation (Post) | PASS/FAIL | |
| Post Creation (Article) | PASS/FAIL | |
| Post Creation (Photo) | PASS/FAIL | |
| Post Creation (Video) | PASS/FAIL | |
| Post Creation (Note) | PASS/FAIL | |
| Subscription | PASS/FAIL | |
| Tipping | PASS/FAIL | |
| Renewal | PASS/FAIL | |
| Feed Viewing | PASS/FAIL | |
| Content Unlock | PASS/FAIL | |
| Explore/Search | PASS/FAIL | |
| Notifications | PASS/FAIL | |
| Settings | PASS/FAIL | |

## Data Sync Verification
| Data Path | Synced? | Notes |
|-----------|---------|-------|
| Profile: Supabase ↔ UI | YES/NO | |
| Posts: Redis ↔ Feed | YES/NO | |
| Stats: Aleo ↔ Dashboard | YES/NO | |
| Tiers: Aleo ↔ Modals | YES/NO | |

## Build Status
- `npm run build`: PASS
- `npx tsc --noEmit`: PASS
- Console errors: 0
- TODO comments: 0

## Files Modified
[complete list]
```

---

## EXECUTION ORDER

```
Phase 0:  Read codebase (DO NOT SKIP)
Phase 1:  Fix 6 critical bugs → commit → build
Phase 2:  Fix API auth mismatches → commit → build
Phase 3:  Fix dead buttons → commit → build
Phase 4:  Fix user flows (all 10) → commit → build
Phase 5:  Fix state & data integrity → commit → build
Phase 6:  Fix TypeScript errors → commit → build
Phase 7:  Standardize API responses → commit → build
Phase 8:  Cleanup & polish → commit → build
Phase 9:  Security hardening → commit → build
Phase 10: Build verification → commit → build
Phase 11: Final multi-agent audit → commit → build
          Create AUDIT_RESULTS.md → commit
```

**After EVERY phase: `npm run build` must PASS.**

**If a fix in Phase 7 reveals a bug from Phase 2's category, fix it in Phase 7's commit. Don't go back.**

**Never compromise. Always choose the better solution even if it takes more effort. This is the final push to production quality.**

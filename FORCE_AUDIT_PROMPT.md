# VeilSub FORCE AUDIT — Unlimited Parallel Subagent Execution

> INSTRUCTION TO CLAUDE CODE CLI: This prompt REQUIRES you to launch as many parallel subagents (Task tool) as your system allows. Do NOT limit yourself to 3 or 5 agents. Launch 10, 20, 40+ agents in parallel waves. Every independent audit domain gets its OWN dedicated agent. When in doubt, launch MORE agents, not fewer. Speed and thoroughness over caution. Use your FULL capability. This is a production launch audit — treat it like your reputation depends on it.

---

## EXECUTION MODEL: MAXIMUM PARALLELISM

You are the **orchestrator**. Your ONLY job is to:
1. Read Phase 0 files yourself (the orchestrator must understand the codebase)
2. Launch WAVE 1 agents (all independent — launch ALL simultaneously)
3. Collect WAVE 1 results
4. Launch WAVE 2 agents (fix everything found in WAVE 1 — launch ALL simultaneously)
5. Collect WAVE 2 results
6. Launch WAVE 3 agents (verification — launch ALL simultaneously)
7. Produce final AUDIT_RESULTS.md

**NEVER run agents sequentially when they can run in parallel.**
**NEVER combine two audit domains into one agent — each gets its own.**
**NEVER skip an agent because "it's probably fine" — check everything.**

---

## HARD RULES (IMMUTABLE)

1. **NEVER touch `.leo` files** in `/contracts/` — deployed on-chain, immutable
2. **NEVER delete or rename hooks** in `/frontend/src/hooks/`
3. **NEVER change env var names** — Vercel depends on them
4. **NEVER change Supabase schema** — production data exists
5. **NEVER change Redis key structure** — existing posts depend on it
6. **One commit per wave** — clean revert path
7. **`npm run build` must pass after every wave** — non-negotiable
8. **Use immutable patterns** — never mutate state, always return new objects
9. **Files under 800 lines** — split any file exceeding this
10. **Always choose the harder, better solution** — no shortcuts, no "good enough"

---

## PHASE 0: CODEBASE INGESTION (Orchestrator does this — NOT an agent)

Read these files IN ORDER before launching any agents. This is your map.

### Data Layer
```
/frontend/src/types/index.ts              → all types, TIERS constant, interfaces
/frontend/src/lib/config.ts               → program IDs, fees, constants
/frontend/src/lib/supabase.ts             → Supabase client (server-only)
/frontend/src/lib/redis.ts                → Upstash Redis (posts + rate limits)
/frontend/src/lib/apiAuth.ts              → wallet auth: SHA-256(address + salt) + 2-min window
/frontend/src/lib/authenticatedFetch.ts   → HTTP client that attaches wallet headers
/frontend/src/lib/encryption.ts           → AES-256-GCM server-side encryption
/frontend/src/lib/e2eEncryption.ts        → client-side E2E (tier-specific keys via PBKDF2)
/frontend/src/lib/contentEncryption.ts    → per-creator content encryption
/frontend/src/lib/utils.ts               → helpers (formatCredits, computeWalletHash, parseAccessPass)
/frontend/src/lib/poseidon.ts            → Poseidon2 hashing for on-chain identity
/supabase-schema.sql                     → DB schema
```

### Hooks
```
/frontend/src/hooks/useVeilSub.ts         → barrel export
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

### API Routes — Read every `/frontend/src/app/api/*/route.ts`
### Pages — Read every `/frontend/src/app/*/page.tsx`
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

## WAVE 1: AUDIT (Launch ALL of these agents IN PARALLEL — every single one simultaneously)

### Agent 1: CRITICAL BUG HUNTER
```
MISSION: Find and fix the 6 known critical bugs + any others you discover.

KNOWN BUGS:
1. /frontend/src/lib/utils.ts — parseAccessPass validates tier < 1 || tier > 3, should be > 20
2. /frontend/src/hooks/useCreatorStats.ts — queries raw address instead of Poseidon2 hash (stats always zero)
3. /frontend/src/components/SubscribeModal.tsx — privacyMode state exists but NO UI toggle (blind/trial invisible)
4. /frontend/src/components/RenewModal.tsx — TIERS.find fallback to TIERS[0] for custom tiers (wrong price)
5. /frontend/src/types/index.ts — TIERS array hardcoded to 3 tiers, contract supports 20
6. /frontend/src/components/ContentFeed.tsx — PPV unlock in localStorage (bypassable)

ALSO FIND: Any other logic bugs, off-by-one errors, wrong comparisons, impossible states, unreachable code paths.
Fix every bug you find. Document each in your output.
```

### Agent 2: AUTH MISMATCH AUDITOR
```
MISSION: Every API call from the frontend to an authenticated endpoint MUST include wallet auth headers.

STEPS:
1. Read /frontend/src/lib/apiAuth.ts — understand verifyWalletAuth()
2. Read /frontend/src/lib/authenticatedFetch.ts — understand the helper
3. Read EVERY /frontend/src/app/api/*/route.ts — note which require auth
4. Search ALL frontend code for fetch('/api/ and fetch("/api/ and fetch(`/api/
5. For each fetch call: does the target endpoint require auth? If yes, does the call use authenticatedFetch() or manually add headers?
6. KNOWN BROKEN: CreatePostForm.tsx image upload calls /api/upload without wallet headers → 401
7. Fix every mismatch. Replace raw fetch() with authenticatedFetch() where needed.
8. Add wallet-disconnected guards: if no wallet connected, show "Connect wallet" toast instead of making the call.
```

### Agent 3: DEAD BUTTON & NO-OP HANDLER HUNTER
```
MISSION: Find every button, link, and interactive element that does NOTHING when clicked.

SEARCH PATTERNS:
- onClick={() => {}}
- onClick={() => null}
- onClick={undefined}
- Elements with cursor-pointer class but no click handler
- href="#" or href=""
- disabled={true} that's always true (permanently dead)
- onSubmit with only e.preventDefault() and nothing else
- TODO / FIXME / HACK near event handlers

For each dead element: wire it to the correct hook/API call, or if the feature genuinely doesn't exist yet, replace with toast("Coming soon") and add a data-todo="feature-name" attribute.
```

### Agent 4: CREATOR REGISTRATION FLOW AUDITOR
```
MISSION: Trace the complete creator registration flow through code. Fix every break.

FLOW: Connect wallet → /dashboard → RegistrationForm → registerCreator() on-chain → Supabase upsert → UI updates → Profile visible at /creator/[address]

CHECK:
- Does RegistrationForm call registerCreator() correctly?
- Does it handle tx failure? Success? Loading?
- Does it upsert to Supabase after on-chain success?
- Does the dashboard refresh after registration?
- Is the profile visible at /creator/[address]?
- What happens if wallet disconnects mid-registration?
- What happens if the creator is already registered?
```

### Agent 5: PROFILE EDITING FLOW AUDITOR
```
MISSION: Trace profile editing end-to-end. Fix every break.

FLOW: Dashboard → ProfileEditor → Edit fields → upsertCreatorProfile() → Supabase update → Cache invalidation → Changes visible everywhere

CHECK:
- Does ProfileEditor pre-populate with current data?
- Does it validate inputs (bio length, display name format, etc.)?
- Does upsertCreatorProfile() use auth headers?
- Does it invalidate caches after save?
- Do changes appear immediately on /creator/[address] page?
- What happens on save failure?
```

### Agent 6: POST CREATION FLOW — POST TYPE
```
MISSION: Trace creating a "Post" (short-form content like a tweet) end-to-end. Fix every break.

FLOW: Dashboard → CreatePostForm → Select "Post" type → Write content → Select tier → Publish → on-chain tx → Redis store → Appears in feed

CHECK every step. Ensure media upload uses auth headers. Ensure tier selection works for custom tiers (not just 1-3). Ensure post appears in feed after creation.
```

### Agent 7: POST CREATION FLOW — ARTICLE TYPE
```
MISSION: Trace creating an "Article" (long-form rich text) end-to-end. Fix every break.

Same checks as Agent 6 but for Article type. Additionally:
- Does the Tiptap rich text editor work correctly?
- Are formatting options functional (bold, italic, headings, links, images)?
- Is article content properly encrypted for gated tiers?
- Does ArticleReader render the article correctly for subscribers?
```

### Agent 8: POST CREATION FLOW — PHOTO TYPE
```
MISSION: Trace creating a "Photo" post end-to-end. Fix every break.

Same checks as Agent 6 but for Photo type. Additionally:
- Does image upload use authenticatedFetch() with wallet headers?
- Does it show upload progress?
- Does it handle upload failure?
- Are images properly encrypted for gated tiers?
- Do images display correctly in the feed?
```

### Agent 9: POST CREATION FLOW — VIDEO TYPE
```
MISSION: Trace creating a "Video" post end-to-end. Fix every break.

Same checks as Agent 6 but for Video type. Additionally:
- Does video URL validation work?
- Does the video embed preview render?
- Is the video properly gated for paid tiers?
```

### Agent 10: POST CREATION FLOW — NOTE TYPE
```
MISSION: Trace creating a "Note" (quick thought, like a tweet without media) end-to-end. Fix every break.

Same checks as Agent 6 but for Note type. Ensure it's the simplest, fastest flow.
```

### Agent 11: SUBSCRIPTION FLOW AUDITOR
```
MISSION: Trace the complete subscription flow. Fix every break.

FLOW: Visit /creator/[address] → Click Subscribe → SubscribeModal → Select tier → Select privacy mode (standard/blind/trial) → Balance check → Transaction → Success → AccessPass created → Gated content unlocks

CHECK:
- Does SubscribeModal show correct tiers (including custom tiers, not just hardcoded 3)?
- Does privacy mode toggle exist and work? (KNOWN BUG: it doesn't exist)
- Does it check wallet balance before attempting tx?
- Does subscribeStandard() / subscribeBlind() / subscribeTrial() work?
- After success, does gated content immediately unlock without page refresh?
- What happens on tx failure? Insufficient balance? Network error?
```

### Agent 12: TIPPING FLOW AUDITOR
```
MISSION: Trace the complete tipping flow. Fix every break.

FLOW: Creator page → Click Tip → TipModal → Enter amount → Standard or commit-reveal → Transaction → Success toast

CHECK:
- Does TipModal validate tip amount (min/max)?
- Does standard tip work?
- Does commit-reveal tip work (2-step process)?
- What happens on failure?
- Does the tip show up in creator's stats?
- Are there TODO comments that need resolving? (KNOWN: TipModal.tsx:205)
```

### Agent 13: RENEWAL FLOW AUDITOR
```
MISSION: Trace subscription renewal. Fix every break.

FLOW: /subscriptions → Find expiring pass → Click Renew → RenewModal → Correct tier + price → Transaction → New AccessPass

CHECK:
- Does RenewModal show the CORRECT tier and price (not fallback to tier 1)?
- Does it handle custom tiers (4-20)?
- Does it create a new AccessPass on success?
- What happens if the original tier was deleted by the creator?
```

### Agent 14: FEED & CONTENT DISPLAY AUDITOR
```
MISSION: Audit the feed page and content display. Fix every break.

CHECK:
- /feed loads posts correctly from Redis
- Free posts show full content
- Gated posts show preview + "Subscribe to unlock" CTA
- Unlocked posts decrypt and display correctly
- Pagination/infinite scroll works
- Empty state when no posts
- Loading skeleton while fetching
- Error state with retry on failure
- PPV content unlock flow (and fix localStorage bypass — move to server-side)
```

### Agent 15: EXPLORE & SEARCH AUDITOR
```
MISSION: Audit /explore page. Fix every break.

CHECK:
- Creator cards load and display correctly
- Search works (by name, category)
- Category filters work
- Clicking a creator navigates to /creator/[address]
- Featured creators fetched from Supabase (not hardcoded)
- Empty search results show helpful message
- Loading and error states exist
```

### Agent 16: NOTIFICATIONS AUDITOR
```
MISSION: Audit /notifications page. Fix every break.

CHECK:
- Notifications load correctly
- Mark as read works
- Different notification types render correctly
- Empty state when no notifications
- Loading and error states
- Real-time updates (or polling)
```

### Agent 17: SETTINGS AUDITOR
```
MISSION: Audit /settings page. Fix every break.

CHECK:
- Current settings load correctly
- Changes save with proper auth
- Settings persist after reload
- All settings fields are functional (not just visual)
- Loading and error states
```

### Agent 18: STATE & DATA INTEGRITY AUDITOR
```
MISSION: Audit every component that fetches data for proper state handling.

FOR EVERY COMPONENT WITH DATA FETCHING:
1. Loading state — skeleton or spinner, NEVER blank screen
2. Error state — error message with retry button, NEVER crash
3. Empty state — helpful message with CTA, NEVER nothing
4. Race conditions — check if component is still mounted before setState
5. useEffect dependency arrays — correct deps (no missing, no extra)
6. Cache invalidation — after every mutation, affected data is refetched
7. Wallet disconnect — graceful degradation, not crash

DATA SYNC VERIFICATION:
- Creator profile: Supabase ↔ on-chain stats ↔ UI — all match?
- Posts: Redis ↔ on-chain content_meta ↔ feed display — all sync?
- Subscriptions: on-chain AccessPass ↔ subscriber count ↔ gated content unlock — consistent?
- Tiers: on-chain creator_tiers ↔ Subscribe modal ↔ Renew modal ↔ post creation — same tiers?
```

### Agent 19: TYPESCRIPT SAFETY AUDITOR
```
MISSION: Eliminate every TypeScript safety issue.

1. Run npx tsc --noEmit — fix EVERY error
2. Search for "as any" — each is a potential crash. Fix or add detailed justification comment.
3. Search for @ts-ignore / @ts-expect-error — fix underlying type issues
4. Add optional chaining (?.) everywhere a value could be null/undefined
5. Wrap every JSON.parse() in try-catch with fallback
6. Guard every .map() / .filter() / .find() — verify input is actually an array
7. Add type guards for all API responses
8. Ensure no implicit any (strict mode)
```

### Agent 20: API RESPONSE STANDARDIZATION AUDITOR
```
MISSION: Standardize ALL 22 API routes to a consistent envelope.

TARGET FORMAT:
{
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: { total?: number; page?: number; limit?: number };
}

FOR EACH API ROUTE:
- Consistent response format (above envelope)
- Proper HTTP status codes (200, 201, 400, 401, 403, 404, 429, 500)
- Rate limiting where needed (especially public endpoints)
- Wallet auth where needed (all mutations)
- Input validation with zod schemas
- Error messages that don't leak internals
```

### Agent 21: SECURITY AUDITOR
```
MISSION: Security hardening of the entire frontend.

CHECK:
1. Every mutation API route has wallet auth via verifyWalletAuth()
2. No hardcoded secrets in source code (search for API keys, tokens, passwords)
3. All user inputs validated and sanitized
4. Rate limiting on all public endpoints
5. Error messages don't leak internal details (no stack traces, no DB info)
6. CORS headers properly configured
7. No XSS vectors (sanitize HTML in rich text / Tiptap output)
8. No SQL injection (parameterized queries in Supabase calls)
9. localStorage doesn't store sensitive data (PPV unlocks, auth tokens)
10. Content-Security-Policy headers
```

### Agent 22: CLEANUP AUDITOR
```
MISSION: Remove all debug artifacts, dead code, and demo data.

REMOVE:
- All console.log statements (replace console.error with proper error handling)
- All TODO / FIXME / HACK comments (complete the work or remove)
- All commented-out code blocks
- Components never imported anywhere
- Functions never called
- CSS classes never used

REPLACE:
- All DEMO_ / demo / mock / hardcoded / placeholder data with real data or remove
- Governance page: wire to real veilsub_governance_v1 contract OR show "Coming Soon" properly
- Marketplace page: wire to real veilsub_marketplace_v1 contract OR show "Coming Soon" properly
- Featured creators: fetch from Supabase, not hardcoded array
```

### Agent 23: LOADING & ERROR STATES AUDITOR
```
MISSION: Every page and data-fetching component must have proper loading, error, and empty states.

FOR EVERY PAGE:
- Must have loading.tsx (or inline skeleton)
- Must have error.tsx (or inline error boundary)
- /app/not-found.tsx must be helpful (suggestions, nav, search)

FOR EVERY COMPONENT THAT FETCHES DATA:
- Loading: skeleton matching content shape, NEVER blank
- Error: message + retry button, NEVER crash/white screen
- Empty: helpful message with CTA ("Create your first post"), NEVER nothing
```

### Agent 24: PERFORMANCE AUDITOR
```
MISSION: Find and fix performance issues.

CHECK:
- Unnecessary re-renders (components that render on every state change)
- Missing React.memo() on expensive components
- Missing useMemo() / useCallback() for expensive computations / handlers
- Missing debounce on search inputs, resize handlers, scroll handlers
- Images without width/height (layout shift)
- Missing next/image optimization
- Bundle size: are there heavy imports that could be lazy-loaded?
- API calls on every render instead of cached
```

### Agent 25: ACCESSIBILITY AUDITOR
```
MISSION: Basic accessibility compliance.

CHECK:
- All images have alt text
- All buttons have accessible labels
- All form inputs have labels
- Color contrast meets WCAG AA (especially on dark theme)
- Keyboard navigation works (tab order, focus visible, escape to close modals)
- Screen reader: aria-labels on icon-only buttons
- Focus trap in modals
```

### Agent 26: RESPONSIVE & MOBILE AUDITOR
```
MISSION: Audit responsive behavior across breakpoints.

CHECK:
- Every page renders correctly at mobile (375px), tablet (768px), desktop (1280px)
- No horizontal overflow at any breakpoint
- Touch targets are at least 44px on mobile
- Modals are usable on mobile (not cut off, scrollable)
- Sidebar collapses properly on mobile
- Forms are usable on mobile (inputs don't get hidden by keyboard)
```

### Agent 27: NAVIGATION & ROUTING AUDITOR
```
MISSION: Audit all navigation paths.

CHECK:
- Every link in sidebar/header navigates correctly
- Back button works on every page
- Deep links work (/creator/[address], /post/[id], etc.)
- 404 page shows for invalid routes
- Auth guards: pages that require wallet connection redirect or show prompt
- No broken links anywhere in the app
```

### Agent 28: WALLET INTEGRATION AUDITOR
```
MISSION: Audit wallet connection and disconnection across the entire app.

CHECK:
- Connect wallet flow works
- Wallet address displays correctly everywhere
- Wallet disconnect: every page/component handles gracefully (no crash, shows connect prompt)
- Switching wallets: data refreshes for new wallet
- Auto-reconnect on page refresh
- Wallet-dependent components show appropriate state when no wallet connected
```

### Agent 29: ENCRYPTION & PRIVACY AUDITOR
```
MISSION: Verify the triple encryption layer works correctly.

CHECK:
- Server-side AES-256-GCM encryption (lib/encryption.ts) — used correctly for at-rest content
- Client-side E2E encryption (lib/e2eEncryption.ts) — tier-specific keys generated and used properly
- Content encryption (lib/contentEncryption.ts) — per-creator encryption works
- Poseidon2 hashing (lib/poseidon.ts) — used wherever on-chain identity is needed (not raw addresses)
- No plaintext secrets in localStorage, cookies, or URL params
- Encryption keys properly derived and rotated
```

### Agent 30: COMPONENT SIZE & ARCHITECTURE AUDITOR
```
MISSION: Split oversized components and enforce clean architecture.

CHECK:
- CreatePostForm.tsx (1100+ lines) — MUST be split into /composers/ directory with separate components per content type
- Any component over 800 lines — split
- Any function over 50 lines — extract
- Any file with 5+ responsibilities — separate concerns
- No prop drilling more than 3 levels deep (use context or composition)
```

---

## WAVE 2: FIX (Launch ALL fix agents IN PARALLEL based on WAVE 1 findings)

After WAVE 1 completes, the orchestrator:
1. Collects all findings from all 30 agents
2. Groups fixes by file to avoid merge conflicts
3. Launches fix agents — one per file cluster — ALL IN PARALLEL
4. Each fix agent applies the fixes for its file cluster
5. After all fixes applied: `npm run build` — must pass

---

## WAVE 3: VERIFICATION (Launch ALL verification agents IN PARALLEL)

After WAVE 2 fixes are applied, launch these verification agents simultaneously:

### Verify Agent A: BUILD & TYPESCRIPT
```
Run npm run build — must pass with zero errors.
Run npx tsc --noEmit — must pass with zero errors.
Search for remaining console.log — must be zero.
Search for remaining TODO — must be zero.
Search for remaining "as any" — document any with justification.
```

### Verify Agent B: FLOW WALKER
```
Re-trace ALL 14 user flows through the fixed code.
Verify each step works. Report any remaining breaks.
```

### Verify Agent C: DATA INTEGRITY CHECKER
```
Verify data sync paths:
- Profile: Supabase ↔ UI
- Posts: Redis ↔ Feed
- Stats: Aleo ↔ Dashboard
- Tiers: Aleo ↔ All Modals
- Subscriptions: Aleo ↔ Content Unlock
```

### Verify Agent D: SECURITY RE-CHECK
```
Re-run security audit on the fixed codebase.
Verify no new vulnerabilities introduced by fixes.
```

### Verify Agent E: UX FINAL PASS
```
Walk through every page as a brand new user.
Is anything confusing? Missing? Broken? Ugly?
Report any remaining paper cuts.
```

---

## WAVE 4: FINAL OUTPUT

Create `/frontend/AUDIT_RESULTS.md`:

```markdown
# VeilSub Production Audit Results
Date: [today]
Auditor: Claude Code CLI (30-agent parallel audit)

## Executive Summary
- Total issues found: [N]
- Issues fixed: [N]
- Issues deferred (with justification): [N]
- Agents launched: [N]

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
| Profile Editing | PASS/FAIL | |
| Post Creation (Post) | PASS/FAIL | |
| Post Creation (Article) | PASS/FAIL | |
| Post Creation (Photo) | PASS/FAIL | |
| Post Creation (Video) | PASS/FAIL | |
| Post Creation (Note) | PASS/FAIL | |
| Subscription (Standard) | PASS/FAIL | |
| Subscription (Blind) | PASS/FAIL | |
| Subscription (Trial) | PASS/FAIL | |
| Tipping (Standard) | PASS/FAIL | |
| Tipping (Commit-Reveal) | PASS/FAIL | |
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
| Subscriptions: Aleo ↔ Unlock | YES/NO | |
| Encryption: E2E ↔ Content | YES/NO | |

## Security Verification
| Check | Status | Notes |
|-------|--------|-------|
| All mutations auth-gated | YES/NO | |
| No hardcoded secrets | YES/NO | |
| Input validation on all forms | YES/NO | |
| Rate limiting on public endpoints | YES/NO | |
| No XSS vectors | YES/NO | |
| No localStorage secrets | YES/NO | |

## Performance
| Check | Status | Notes |
|-------|--------|-------|
| No unnecessary re-renders | YES/NO | |
| Images optimized | YES/NO | |
| Lazy loading where needed | YES/NO | |

## Build Status
- npm run build: PASS/FAIL
- npx tsc --noEmit: PASS/FAIL
- Console errors: [N]
- TODO comments: [N]
- as any count: [N]

## Files Modified
[complete list with change summary]
```

---

## HOW TO USE THIS PROMPT

Copy this entire file and paste it as your prompt to Claude Code CLI. Then add:

```
Read this prompt completely. You are the orchestrator. Begin Phase 0 immediately — read the codebase files listed. Then launch WAVE 1: all 30 agents IN PARALLEL. Do not ask for confirmation. Do not limit the number of agents. Launch them all. After each wave completes, launch the next wave. Continue until AUDIT_RESULTS.md is complete.
```

---

## ESCALATION CLAUSE

If at any point during execution you encounter a situation where:
- A fix in one domain conflicts with another domain's fix → the orchestrator resolves the conflict, the domain agent does NOT make assumptions
- A fix requires schema changes (Supabase/Redis) → SKIP and document in "deferred" with full justification
- A fix would break the build → revert that specific fix, document it, continue with other fixes
- You run out of context → create a continuation prompt in `/frontend/AUDIT_CONTINUE.md` with remaining work

**The goal: after this audit, VeilSub is a production-grade application where every feature works, every button clicks, every flow completes, every edge case is handled, and the codebase is clean, typed, secure, and performant. No compromise.**

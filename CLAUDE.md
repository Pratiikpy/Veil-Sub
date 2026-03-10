# CLAUDE.md — VeilSub Project Intelligence

## What Is VeilSub?

VeilSub is a **privacy-first creator subscription platform** built on the Aleo blockchain. Creators register, set subscription tiers, and publish gated content. Subscribers pay with private Aleo credits, receive encrypted AccessPass records, and can verify access with **zero public footprint**. The platform is competing in the **Aleo Privacy Buildathon** (10 waves, $50K total pool).

- **Current contract**: `veilsub_v27.aleo` (local build) — 27 transitions, 25 mappings, 5 structs, 6 records, 866 statements (contracts/veilsub/src/main.leo)
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind 4 (frontend/)
- **Off-chain**: Supabase (profiles, analytics) + Upstash Redis (posts, rate limiting)
- **Wallet support**: Shield, Leo (patched), Fox, Puzzle, Soter

---

## CRITICAL RULES

### 0. NEVER Add AI Slop to Git Commits
- **NEVER** add `Co-Authored-By`, `Co-authored-by`, or any AI author/co-author lines to commit messages
- **NEVER** mention Claude, GPT, AI, or any AI tool in commit messages
- **NEVER** add signatures, attributions, or footers to commits
- Commit messages must look 100% human-written — clean, concise, no fluff
- This is a buildathon rule: "No AI Slop!" — judges will penalize AI-looking submissions
- Just write a normal commit message describing what changed and why

### 1. NEVER Guess Aleo/Leo Code
- **ALWAYS** consult the Aleo reference documentation and example projects before writing ANY Leo code
- The Leo language has specific syntax, constraints, and patterns that differ from Rust/Solidity
- **NEVER** assume a Leo feature exists — verify it in the docs or examples first
- If unsure about a Leo pattern, READ the funded competitor contracts first — they are proven working code
- Key Leo constraints to remember:
  - No dynamic arrays, no strings, no floating point
  - All record fields must be typed at compile time
  - `self.caller` is only available in transitions, NOT in finalize
  - Finalize functions can only access mappings, not records
  - Imports must reference deployed program IDs (e.g., `import credits.aleo;`)

#### Aleo Reference Sources (MUST use before writing any Leo code)
These are the **authoritative sources of truth** for Leo/Aleo. Always `git pull` to get the latest before using them. If local copies are outdated or missing, clone fresh.

| Source | GitHub | Local Path | What It Contains |
|--------|--------|------------|------------------|
| Leo Language | https://github.com/ProvableHQ/leo | `aleo-reference-projects/leo/` | Leo compiler, language spec, **examples/** folder with working Leo programs for every pattern |
| Aleo Documentation | https://github.com/AleoNet/welcome | `aleo-reference-projects/welcome/` | Official Aleo docs — **documentation/** folder covers concepts, deployment, execution, records, mappings, finalize |
| Awesome Aleo | — | `aleo-reference-projects/awesome-aleo/` | Community examples and resources |
https://github.com/ProvableHQ/aleo-dev-toolkit  must understnad this too

everyign in aleo reffrence proecjt u msut understnad to the latest github thing

**Workflow**: Before writing ANY Leo code → `git pull` these repos → read relevant examples/docs → THEN write code. Never skip this step.

### 2. ALWAYS Use Sub-Agents for Complex Tasks
- Use the Task tool to spawn parallel sub-agents whenever possible
- Clone + analyze repos → parallel agents
- Multi-file edits across contract + frontend → parallel agents
- Research + implementation → parallel agents
- This maximizes speed and thoroughness — the buildathon has tight deadlines

### 3. ALWAYS Read INFO_DATA.md Before Making Decisions
- `aleo-reference-projects/INFO_DATA.md` is the **single source of truth** for ALL buildathon context
- It contains: buildathon rules, judge criteria, scoring patterns, competitor analysis, strategic context, wave-by-wave judge feedback, and what judges reward vs penalize
- **Before proposing ANY feature, architectural decision, or prioritization**: read this file first. Do not rely on memory or assumptions — the file gets updated with new intel each wave
- It contains the judge's EXACT feedback on VeilSub and what they want to see next
- Every decision should be validated against this file: "Does INFO_DATA.md support this choice?"

### 4. ALWAYS Compare Against Funded Competitors
- Before claiming any feature is "good enough", compare it against the 5 funded projects
- Ask: "Would this score higher than what NullPay/Veiled Markets/lasagna did?"
- The bar is Tech 8+, Privacy 8+, not just "working code"

When you add a new finalize function (e.g., `finalize_renew`), you MUST copy ALL mapping updates from the similar existing function (e.g., `finalize_subscribe`). Missing a single mapping = broken feature.

**Mandatory Checklist for Any Subscribe/Renew/Referral Finalize Block**:
- ✓ `subscriber_count` — increment subscriber count for creator
- ✓ `total_revenue` — add subscription price to creator's lifetime revenue
- ✓ `platform_revenue` — add platform fee (5-10% of price) to fee pool
- ✓ `pass_creator` — map pass_id → creator (required for revocation auth)
- ✓ `subscription_by_tier` — increment per-tier subscriber count (v19+)
- ✓ `creator_last_active` — update creator's last action block height (v19+)
- ✓ `subscription_epoch` — increment epoch count for analytics (v20+)
- ✓ `total_subscriptions` — increment lifetime subscription count (v20+)

**Why each mapping matters**:
- `subscriber_count`, `total_revenue`: Public metrics for explorer/analytics
- `platform_revenue`, `pass_creator`: Business logic + access control
- `subscription_by_tier`: Per-tier analytics (judges want this detail)
- `creator_last_active`: Activity tracking for onboarding incentives
- `subscription_epoch`: Wave-by-wave historical data
- `total_subscriptions`: Career metric for creator reputation

**Example**: When `finalize_subscribe` was added in v9, it should have updated all 8 mappings. When `finalize_renew` was added in v10, it must update the SAME 8. When new mappings are added, old finalizes must be back-filled.

### 7. ALWAYS Add Error Code Comments to All Asserts

Every `assert!()` statement MUST have an error code comment. The error code format is:
```leo
assert(condition);                    // ERR_XXX: Human-readable description
```

**Current Error Code Range**: ERR_001 through ERR_113 (v21)

When adding new asserts:
1. Find the highest existing error code in main.leo (currently 113)
2. Increment by 1 (so 114, 115, etc.)
3. Add comment describing what the assert validates

**Example**:
```leo
// WRONG ❌ — no error code
assert(amount > 0u64);

// RIGHT ✅ — clear error code + description
assert(amount > 0u64);               // ERR_114: Tip amount must be positive
```

**Why this matters**:
- Judges can understand contract failures without reading source
- Creates an audit trail of validation rules
- Helps developers debug transaction failures ("ERR_114" → look up what that validates)
- v21 has 113 error codes; every new assertion must continue the sequence

### 8. NEVER Mix BHP256 and Poseidon2 Hash Functions — Use Each in Its Correct Layer

VeilSub uses two cryptographic hash functions for different purposes. Using the wrong one breaks privacy or efficiency.

**Layer Usage Rule**:
- **Transition Layer** (public visibility): Use **BHP256** for privacy-critical hashing
  - Subscriber identity hashing (blind renewal)
  - Private data commitments
  - Reason: BHP256 outputs are not pre-computed; provides plausible deniability

- **Finalize Layer** (public mapping keys): Use **Poseidon2** for gas efficiency
  - Mapping key hashing (content_id, nonce)
  - Analytics aggregation
  - Reason: Poseidon2 is ZK-friendly and cheaper on-chain## 9. ALWAYS Build and Verify After Modifying main.leo

Leo compiler is strict and will catch errors early. After ANY change to `contracts/veilsub/src/main.leo`:

**IMMEDIATE BUILD CHECK** (run this RIGHT AFTER editing):
```bash
cd contracts/veilsub && leo build
```

**Zero Errors Required**: If leo build fails, the contract doesn't work. Full stop.

**Verify Variable Count**:
After a successful build, leo will output:
```
    Variables: XXX,XXX
    Constraints: XXX,XXX
    Statement count: XXX
```

**Testnet Limit Rule**:
- Variables must stay **below 2,097,152** (testnet limit)
- Current deployed: v26 = 1,879,536 variables (89.6% of limit)
- If you add significant features, you WILL exceed the limit

**When adding new features**:
1. Build locally first — verify it compiles
2. Check variable count in build output
3. If near limit (>1.9M): mark as "local-only" or simplify the feature
4. If way over (>2.1M): you need to wait for Aleo network upgrade or refactor

**This is not optional**: Judges will compile and verify variable count. If it doesn't compile, instant failure.

never use ai slop thign in anywhere any where readme or frotnen make sure no ai slop 


## 10. ALWAYS Keep Frontend and Contract in Sync

When you add a new transition to the smart contract, you MUST update the frontend in parallel. Missing steps = broken feature that compiles but doesn't work.



---

## Competition Context

### Buildathon Structure
- 10 waves total, each ~1 week
- 5 scoring categories: Privacy (10), Tech (10), UX (10), Practicality (10), Novelty (10) = 50 max
- Milestone points (0-5 per wave) are SEPARATE funding decisions
- Milestone points × wave_rate = USDT funding
- Wave 2 rate was $337.50 per milestone point

### VeilSub Wave 2 Results
- Privacy: 7, Tech: 5, UX: 7, Practicality: 7, Novelty: 7 = **33/50**
- Milestone: 0, Funding: $0
- Judge comment: "Would be better if subscription tiers can be flexibly added by creators themselves, interested to see how verification and gated content delivery actually work next"

### Funded Competitor Repos

These are the 5 funded projects + 1 direct competitor. They update their code every wave, so **always clone/pull the latest** before comparing. Local copies may exist in `aleo-reference-projects/` but could be outdated.

| Project | GitHub | W2 Scores (P/T/U/Pr/N) | Total | Funding | Key Strength |
|---------|--------|------------------------|-------|---------|--------------|
| ZKPerp | https://github.com/hwdeboer1977/ZKPerp | 7/5/5/5/7 | 29 | $1,350 | Strong W1, perpetual futures |
| NullPay | https://github.com/geekofdhruv/NullPay | 8/8/8/8/7 | 39 | $1,215 | Highest rubric, v13, dual-records |
| Veiled Markets | https://github.com/mdlog/veiled-markets | 8/9/7/7/8 | 39 | $1,035 | Tech 9, 2576 lines, FPMM AMM |
| lasagna | https://github.com/ss251/private-prediction-market | 8/7/5/6/9 | 35 | $585 | Novelty 9, Pedersen/DAR |
| VeilReceipt | https://github.com/mohamedwael201193/VeilReceipt | 8/7/5/5/6 | 31 | $315 | 6 record types, ZK loyalty stamps |
| **VeilSub** | **(this repo)** | **7/5/7/7/7** | **33** | **$0** | Zero-footprint verification |
| Privtok | https://github.com/vybzcody/privtok | 7/4/5/5/6 | 27 | $0 | Direct category competitor |

### How to Use Competitor Code
- **ALWAYS pull latest code** before comparing — competitors push updates every wave. Clone into `aleo-reference-projects/` or use sub-agents to clone + analyze fresh
- **DO**: Study their privacy patterns, record structures, finalize strategies, and feature scope
- **DO**: Learn from their contract iteration approach (NullPay v13 means 13 deploys with improvements)
- **DO**: Compare feature-for-feature when evaluating our implementation — actively look for ways they've improved that we haven't matched yet
- **DO**: Proactively identify areas where competitors are pulling ahead and flag them
- **DON'T**: Copy code directly — judges will notice similar patterns
- **DON'T**: Assume their approach is optimal — some have lower scores in specific categories

---

## Known Gaps (Wave 2 → Wave 3 Priorities)

### P0 — Must Fix (Judge explicitly asked for these)
1. **Custom creator tiers** — Replace hardcoded 1x/2x/5x with dynamic tier creation by creators
2. **Video demo** — Show verification + gated content delivery working end-to-end

### P1 — High Impact on Scores
3. **Subscription gifting** — Gift a subscription to another address (new record type = Novelty boost)
4. **Content update/delete transitions** — Complete content lifecycle
5. **Platform fee withdrawal** — Real business model (Practicality boost)
6. **Higher contract version** — Push to v12+ through iterative improvements (Tech signal)
7. **Pre-populated test data** — Makes judging easier (UX boost)

### P2 — Score Differentiators
8. **Novel privacy technique** — Something equivalent to lasagna's DAR (Privacy + Novelty boost)
9. **Subscription transfer** — Transfer an AccessPass to another user
10. **Nonce-based privacy modes** — Different privacy levels per transaction

### P3 — Polish
11. **Updated documentation** — Reflect all new features
12. **Referral tracking** — On-chain referral system

---

## Development Workflow

### Before Writing Any Leo Code:
1. `git pull` the Leo and Welcome repos to get latest docs/examples
2. Read `aleo-reference-projects/leo/examples/` for syntax patterns
3. Read `aleo-reference-projects/welcome/documentation/` for Aleo concepts
4. Check funded competitor contracts for proven patterns (clone/pull latest first)
5. Verify the feature is possible in Leo (no dynamic arrays, no strings, etc.)

### Before Any Feature Decision:
1. Read `aleo-reference-projects/INFO_DATA.md` for judge criteria
2. Compare against funded competitors — will this score higher?
3. Check the judge's exact feedback on VeilSub
4. Prioritize features that move multiple scoring categories at once

### Build & Test:
```bash
cd contracts/veilsub && leo build          # Compile contract
cd frontend && npm run build               # Build frontend (zero TS errors required)
cd frontend && npm run dev                 # Local development
```

### Deploy:
```bash
leo deploy                                 # Deploy to testnet
leo execute <transition> <args>            # Execute transitions on testnet
```

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `contracts/veilsub/src/main.leo` | Core smart contract |
| `contracts/veilsub/program.json` | Program ID + dependencies |
| `frontend/src/lib/config.ts` | Program ID, API URLs, constants |
| `frontend/src/hooks/useVeilSub.ts` | Main contract interaction hook |
| `frontend/src/hooks/useCreatorStats.ts` | Creator analytics hook |
| `frontend/src/app/docs/page.tsx` | In-app documentation |
| `frontend/src/app/privacy/page.tsx` | Privacy model page |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/PRIVACY_MODEL.md` | Privacy threat model |
| `aleo-reference-projects/INFO_DATA.md` | Buildathon intel + judge analysis |
| `README.md` | Project overview + competitive positioning |

---

## Scoring Targets for Wave 3

| Category | Current | Target | How |
|----------|---------|--------|-----|
| Privacy | 7 | 9 | Novel privacy technique + additional privacy layers |
| Tech | 5 | 8 | Custom tiers, content CRUD, fee withdrawal, v12+ iterations |
| UX | 7 | 9 | Video demo, pre-populated data, polished wallet flow |
| Practicality | 7 | 8 | Fee mechanism, dispute/refund, real business model |
| Novelty | 7 | 8 | Subscription gifting, privacy modes, unique features |
| **Total** | **33** | **42** | Top 3 in entire buildathon |

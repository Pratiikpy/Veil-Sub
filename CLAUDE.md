# CLAUDE.md — VeilSub: Aleo Privacy Buildathon

## Prime Directive

**VERIFY BEFORE YOU BUILD. NEVER GUESS.**

Before writing ANY code, making ANY architectural decision, or implementing ANY feature:

1. **Check official resources FIRST** — Read the actual docs, not assumptions
2. **Understand the constraint** — Know WHY something works that way in Aleo/Leo
3. **Verify against judge criteria** — Every line of code must serve the scoring rubric
4. **Only then implement** — With confidence, not guesswork

If unsure about ANY Leo/Aleo behavior, fetch and read the official docs before proceeding. Wrong assumptions in ZK development cause silent, unfixable bugs.

---

## Official Resources (CHECK THESE BEFORE CODING)

These are the ONLY trusted sources. Always verify against them:

| Resource | URL | Use For |
|----------|-----|---------|
| Leo Language Docs | https://docs.leo-lang.org/leo | Leo syntax, types, features |
| Leo Program Structure | https://docs.leo-lang.org/language/structure | Program layout, transitions, finalize |
| Aleo Developer Docs | https://developer.aleo.org/ | Network concepts, deployment, SDK |
| Aleo Records | https://developer.aleo.org/concepts/fundamentals/records/ | Record ownership, spending, privacy |
| credits.aleo | https://developer.aleo.org/concepts/fundamentals/credits/ | Credit transfers, fee handling |
| Transfer Credits SDK | https://developer.aleo.org/sdk/guides/transfer_credits/ | SDK-level credit operations |
| Wallet Adapter | https://github.com/demox-labs/aleo-wallet-adapter | Frontend wallet integration |
| Solidity to Leo | https://developer.aleo.org/guides/solidity-to-leo/migration-guide/ | Pattern translation |
| Leo Security Patterns | https://blog.zksecurity.xyz/posts/aleo-program-security/ | Security best practices |
| Aleo Explorer | https://explorer.aleo.org/ | Verify on-chain transactions |
| Aleoscan | https://aleoscan.io/ | Alternative explorer |
| Shield Wallet (Leo Wallet) | https://www.leo.app/ | User wallet |
| Aleo Testnet Faucet | https://faucet.aleo.org/ | Get test credits |
| Awesome Aleo | https://github.com/howardwu/awesome-aleo | Reference implementations |

**RULE: When implementing ANY Aleo/Leo feature, fetch the relevant doc page and read it before writing code. Use WebFetch on the URLs above.**

## Local Reference Repos (CHECK THESE FOR IMPLEMENTATION PATTERNS)

These repos can be cloned locally for offline reference. Before implementing ANY Leo/Aleo feature, check the relevant repo:

| Repo | Clone Command | Use For |
|------|---------------|---------|
| Leo Language Source | `git clone https://github.com/ProvableHQ/leo reference-repos/leo` | Leo compiler internals, language grammar, built-in functions, examples |
| Aleo Welcome/Docs | `git clone https://github.com/AleoNet/welcome reference-repos/welcome` | Official Aleo documentation, guides, SDK references |
| Awesome Aleo | `git clone https://github.com/howardwu/awesome-aleo reference-repos/awesome-aleo` | Reference implementations, ecosystem patterns, example projects |

**RULE**: For ANY Aleo-related question, check these repos BEFORE making assumptions. They contain the ground truth for Leo syntax, Aleo architecture, and ecosystem best practices.

---

## Judge Scoring Rubric (EVERY DECISION MUST OPTIMIZE FOR THIS)

| Category | Weight | What Judges Want |
|----------|--------|------------------|
| **Privacy Usage** | **40%** | Deep use of Aleo's privacy: records, encrypted state, selective disclosure, ZK proofs. NOT surface-level. |
| **Technical Implementation** | **20%** | Clean architecture, proper Leo patterns, secure code, no anti-patterns |
| **User Experience** | **20%** | Smooth UI/UX, intuitive flows, wallet integration that works seamlessly |
| **Practicality / Real-World Use** | **10%** | Solves a real problem, has clear PMF and GTM |
| **Novelty / Creativity** | **10%** | Unique in the Aleo ecosystem or privacy space |

**Privacy is 40% of the score. Every feature must justify its privacy model.**

---

## ABSOLUTE MUST-HAVES (Judge checks these FIRST)

These are non-negotiable. Missing ANY ONE of these = automatic failure:

- [ ] **Live web URL** on Vercel/Netlify that loads and works
- [ ] **README.md** with: project description, privacy model, how to test, architecture, team info, wallet addresses
- [ ] **At least 1 Leo program** deployed on Aleo Testnet
- [ ] **At least 1 real on-chain transaction** visible on explorer
- [ ] **Frontend buttons connected to REAL on-chain transitions** (not mocked)
- [ ] **Wallet connection working** (Shield Wallet or Leo Wallet)
- [ ] **Video demo** showing end-to-end flow (YouTube/Loom link)
- [ ] **Progress changelog** showing wave-over-wave improvements

---

## ABSOLUTE MUST-NOTS (Violating ANY = instant score killer)

**NEVER do any of these. Check EVERY code change against this list:**

### Deployment
- **NEVER** make downloadable executables — must be web-accessible only
- **NEVER** use Solidity/EVM contracts — must be Leo/Aleo only

### Privacy Violations (these DESTROY the 40% privacy score)
- **NEVER** store private data in public mappings
- **NEVER** leak private values in finalize scope
- **NEVER** send records to program addresses (records become permanently lost and unspendable)

### Payment Anti-Patterns
- **NEVER** use fake payment records instead of real `credits.aleo` transfers

### ZK Anti-Patterns
- **NEVER** do manual nullifier/ZK proof verification (Aleo handles this natively)
- **NEVER** use `ProgramManager.run()` with raw Leo code (it doesn't work)
- **NEVER** submit another user's record (only the owner can spend their records)
- **NEVER** try to modify/create records in finalize scope (impossible in Leo — records are created in transitions only)

### Submission Rules
- **NEVER** allow multiple submissions from same person

**RULE: Before committing ANY Leo code, mentally check every variable: "Is this private data going into a public mapping or finalize?" If yes, STOP and redesign.**

---

## Development Workflow: Resource-First Protocol

### For ANY Leo/Smart Contract Work:
```
1. FETCH docs → WebFetch the relevant Leo docs page
2. READ examples → Check awesome-aleo for reference patterns
3. VERIFY privacy model → Ensure private data stays private (records, not mappings)
4. IMPLEMENT → Write the code
5. CHECK against must-nots → Scan for every anti-pattern listed above
6. TEST → Verify on testnet with real transactions
```

### For ANY Frontend/SDK Work:
```
1. FETCH wallet adapter docs → Read the actual API, don't guess
2. VERIFY SDK methods → Confirm the method exists and works as expected
3. IMPLEMENT → Connect to real on-chain transitions
4. TEST with real wallet → Shield Wallet or Leo Wallet, not mocks
```

### For ANY Architecture Decision:
```
1. ASK: "Does this maximize the 40% privacy score?"
2. ASK: "Does this violate any must-not?"
3. ASK: "Is this verifiable on the explorer?"
4. ASK: "Will this work with a real wallet?"
5. Only proceed if all answers are satisfactory
```

---

## Automatic Tool Usage Policy

**Use the right tool automatically. Never ask permission — just use it.**

### Always Use When Applicable:
| Context | Tool/Plugin/Agent to Use |
|---------|--------------------------|
| Any frontend/UI work | `frontend-design` skill — high design quality, production-grade |
| Code review needed | `code-reviewer` agent or `/code-review` |
| Feature implementation | `feature-dev` skill — 7-phase guided development |
| Git commits | `/commit` skill |
| PR creation | `/commit-push-pr` skill |
| Comprehensive PR review | `pr-review-toolkit` agents (all 6 specialized agents) |
| Error handling review | `silent-failure-hunter` agent |
| Type design | `type-design-analyzer` agent |
| Test coverage | `pr-test-analyzer` agent |
| Code architecture | `code-architect` agent |
| Codebase exploration | `code-explorer` agent or Explore subagent |
| Security concerns | `security-guidance` hook awareness |
| Iterative autonomous work | `/ralph-loop` |
| Research tasks | HuggingFace MCP, WebSearch, WebFetch |
| Deployment | Vercel skills (`/vercel:deploy`, `/vercel:setup`) |
| Any Aleo/Leo question | WebFetch official docs FIRST |

### Parallel Execution:
- Launch multiple subagents in parallel when tasks are independent
- Run code-review + test-analysis + type-checking simultaneously
- Fetch multiple doc pages at once when researching

### Proactive Behavior:
- After writing code → automatically review it
- After implementing a feature → check for silent failures
- Before committing → verify against must-nots list
- When editing Leo code → verify privacy model isn't broken

---

## Leo/Aleo Technical Rules

### Record Ownership
- Records are PRIVATE by default — this is Aleo's core privacy feature
- Only the record OWNER can spend/consume a record
- Records are created in TRANSITIONS, never in finalize
- Sending a record to a program address = permanent loss

### Privacy Model
- Use `record` types for private state (user balances, positions, votes)
- Use `mapping` types ONLY for public aggregate state (total supply, public counters)
- NEVER put private user data in mappings
- The `finalize` scope is PUBLIC — never pass private values to it
- Use `private` keyword for function inputs that should stay hidden

### credits.aleo
- Always use real `credits.aleo` for payments
- Use the SDK's transfer methods, not custom implementations
- Verify credit transfers on the explorer

### Deployment
- Always deploy to Aleo Testnet first
- Verify deployment on explorer.aleo.org or aleoscan.io
- Keep program names unique and descriptive

---

## Wave Submission Checklist

Before EVERY wave submission, verify:

```
MUST-HAVES:
[ ] Live URL works and loads
[ ] README.md is complete and updated
[ ] Leo program(s) deployed on testnet
[ ] On-chain transactions visible on explorer
[ ] Frontend → on-chain transitions are REAL (not mocked)
[ ] Wallet connects and works
[ ] Video demo is recorded and linked
[ ] Progress changelog updated (Wave 2+)

MUST-NOTS (scan entire codebase):
[ ] No private data in public mappings
[ ] No private value leaks in finalize
[ ] No records sent to program addresses
[ ] No fake payment records
[ ] No manual nullifier/ZK verification
[ ] No ProgramManager.run() with raw Leo
[ ] No submitting other users' records
[ ] No record creation in finalize scope

SCORING OPTIMIZATION:
[ ] Privacy model is deep, not surface-level (40%)
[ ] Code is clean, well-architected (20%)
[ ] UX is smooth and intuitive (20%)
[ ] Real-world use case is clear (10%)
[ ] Something novel/creative exists (10%)
```

---

## Critical Reminders

1. **Aleo's privacy IS the product** — Don't bolt privacy on as an afterthought. Design privacy-first.
2. **Records > Mappings** for anything user-specific — Mappings are public, records are private.
3. **Finalize = Public execution** — Anything in finalize is visible to everyone.
4. **Test with real wallets** — Mock connections don't count for judges.
5. **Show transactions on explorer** — If judges can't verify it on-chain, it doesn't count.
6. **Progressive improvement** — Each wave must show clear progress over the last.
7. **Web-only** — No desktop apps, no CLI-only tools. Must be accessible via browser URL.

# VeilSub — Wave 3 Creative & Practical Improvements

**Date:** March 6, 2026
**Current:** v25 local / v24 deployed, ~37-38 projected score
**Budget:** 364K variables remaining (17.3% of testnet limit)
**Deadline:** March 11, 2026 (5 days)

---

## Reality Check: What Your Other AI Got Wrong

That document listed 10 "powerful upgrades" and 3 "killer privacy features." Here's the truth:

### Already Built (Stop Proposing These)

| Suggestion | VeilSub Status | Since |
|-----------|---------------|-------|
| Gift Subscriptions | `gift_subscription` + `redeem_gift` | v10 |
| Transferable Access Pass | `transfer_pass` | v15 |
| Private Tipping | `commit_tip` + `reveal_tip` (BHP256) | v14 |
| Private Analytics | CreatorReceipt + useCreatorStats | v8 |
| Anonymous Reputation | subscriber_count, total_revenue, content_count mappings | v8 |
| Zero Identity Verification | `verify_access` (zero-footprint) | v8 |
| Selective Proof Tokens | `create_audit_token` (ZERO finalize) | v8 |
| BSP Named | Documented in PRIVACY_MODEL.md | v11 / recently branded |
| Subscription Marketplace | Explore page with creator discovery | v8 |

**9 out of 13 suggestions already exist in your codebase.** The other AI didn't read your code.

### Can't Fit on Testnet (Stop Trying)

| Suggestion | Variable Cost | Budget Left | Verdict |
|-----------|--------------|-------------|---------|
| Pedersen Homomorphic Counting | +300K | 364K left | Won't fit (was in v17, removed) |
| Subscription Bundles/Pools | +150K | 364K left | Won't fit |
| Reputation Badges (new records) | +100K | 364K left | Won't fit |
| Private Referral System | +80K | 364K left | Was in v10, removed for budget |
| ZK Range Proofs | +200K | 364K left | Won't fit |
| Multi-Sig Governance | +120K | 364K left | Won't fit |

### Actually Possible But Not Worth It

| Suggestion | Why Not Worth It |
|-----------|-----------------|
| Anonymous Comments (on-chain) | Leo has no strings. Would need comment_hash + subscriber proof. AuditToken already proves subscriber status. The "Subscriber #145" display is pure frontend work. |
| Dynamic Pricing Oracle | `update_tier_price` already exists. The "oracle" part is an off-chain bot calling an existing transition. Not a contract feature. |
| Content Auto-Unlock | Needs external trigger (no cron jobs in Leo). block.height comparison exists but someone has to call the transition. |

---

## What Actually Moves the Score (Ranked by ROI)

### Tier 1: Non-Code Actions (Highest ROI)

These don't touch the contract or frontend code. They're pure execution.

#### 1. Record the Video Demo (UX: +1 to +2)

**Time:** 2 hours
**Risk:** Zero
**Score impact:** UX 7→8-9

Every funded project either had a video or judges saw features working. You have 25 transitions and judges are going "interested to see how verification and gated content delivery actually work." SHOW THEM.

5-minute script:
- 0:00-0:30: Landing page, explain "private Patreon" concept
- 0:30-1:30: Creator registers, creates Tier 4 "Gold" at custom price, publishes gated content
- 1:30-3:00: Subscriber connects different wallet, selects BLIND mode, subscribes, unlocks content
- 3:00-4:00: Gift subscription to third address, redeem, show new AccessPass
- 4:00-5:00: Open testnet explorer, show ZERO addresses in finalize args, explain BSP

#### 2. Execute 10+ Diverse Testnet Transactions (Tech: +1)

**Time:** 1 hour
**Risk:** Zero (using existing deployed v24)
**Score impact:** Tech 6→7

Current state: 13+ transactions but probably similar types. Execute one of each:
- create_custom_tier (tier 4, 3000 microcredits)
- subscribe (standard, tier 1)
- subscribe_blind (with nonce — BSP in action)
- verify_access
- gift_subscription
- redeem_gift
- commit_tip
- reveal_tip
- publish_content
- transfer_pass

10 different transition types = proof every feature works.

#### 3. Update Akindo Submission (Practicality: +0.5)

**Time:** 30 minutes
**Risk:** Zero

Make sure submission includes:
- Video link (when recorded)
- v24 testnet contract address with explorer link
- "What changed since Wave 2" list (quantified: 12→25 transitions, 10→22 mappings, etc.)
- GitHub repo link
- Deployed frontend URL

### Tier 2: Small Code Changes (Medium ROI)

#### 4. Add Blind Mode to RenewModal (Privacy: +0.5)

**Current gap:** SubscribeModal has privacy toggle (standard vs blind). RenewModal does NOT — it always uses standard `renew()`. A subscriber who chose blind mode initially loses that privacy on renewal.

**Fix:** Copy the privacy toggle from SubscribeModal to RenewModal. When blind is selected, call `renewBlind()` instead of `renew()`.

**Time:** 30 min CLI work
**Variable cost:** 0 (transitions already exist)
**Risk:** Low

#### 5. Error Code → Human Message Mapping (UX: +0.5)

**Current gap:** Transaction failures show raw errors. Judges WILL encounter errors during testing.

**Fix:** Add to config.ts or a new error-messages.ts:
```typescript
export const ERROR_MESSAGES: Record<string, string> = {
  'ERR_001': 'Tier price must be at least 100 microcredits',
  'ERR_022': 'Payment insufficient for this tier — check the price and try again',
  'ERR_023': 'This tier has been discontinued by the creator',
  'ERR_026': 'This creator has reached maximum subscriber capacity',
  'ERR_027': 'Your access has been revoked by the creator',
  'ERR_067': 'This privacy nonce was already used — try subscribing again',
  'ERR_104': 'Your subscription has expired — please renew',
  // ... map all 90 error codes
}
```

Show these in toast notifications when transactions fail.

**Time:** 1 hour CLI work
**Variable cost:** 0
**Risk:** Zero

#### 6. Testnet Explorer Deep Links (UX: +0.5)

**Current gap:** After a successful transaction, users see "Transaction confirmed!" but no way to verify on-chain.

**Fix:** After any successful tx, show "View on Explorer" link: `https://testnet.aleoscan.io/transaction/{txId}`

**Time:** 30 min CLI work
**Variable cost:** 0
**Risk:** Zero

### Tier 3: Creative Features That Actually Fit (Lower ROI but Differentiation)

#### 7. Subscriber Threshold Proof (Novelty: +0.5, Privacy: +0.5)

**Concept:** A transition that proves "this creator has N+ subscribers" without revealing exact count.

```
transition prove_subscriber_threshold(threshold: u64) -> Future
  // creator_hash computed from self.caller
  return finalize(creator_hash, threshold);

finalize prove_subscriber_threshold(creator_hash: field, threshold: u64):
  let count: u64 = Mapping::get_or_use(subscriber_count, creator_hash, 0u64);
  assert(count >= threshold);  // ERR_108: Subscriber count below threshold
```

**Why it's novel:** No competitor has threshold proofs for creator reputation. lasagna has Pedersen aggregation for betting pools. This is the subscription equivalent — prove popularity without leaking exact numbers.

**Variable cost:** ~5K-8K (one simple transition + finalize)
**Time:** 30 min CLI work
**Risk:** Low (simple transition, no new records or complex logic)

#### 8. Content Access Count (Tech: +0.5)

**Concept:** Track how many times content has been verified (accessed) without tracking WHO accessed it.

```
mapping content_access_count: field => u64;  // keyed by content_id hash

// Add to finalize_verify_access:
let access_count: u64 = Mapping::get_or_use(content_access_count, content_hash, 0u64);
Mapping::set(content_access_count, content_hash, access_count + 1u64);
```

**Why it's useful:** Creators see which content is popular. Judges see analytics sophistication. Privacy maintained — counter increments but subscriber identity never recorded.

**Variable cost:** ~2K-3K (one new mapping, 3 lines in existing finalize)
**Time:** 15 min CLI work
**Risk:** Very low

#### 9. Platform Statistics Transition (Practicality: +0.5)

**Concept:** A public-facing transition that returns platform-wide statistics.

```
mapping total_creators: u8 => u64;  // singleton, key=0
mapping total_content: u8 => u64;   // singleton, key=0

// Increment total_creators in finalize_register
// Increment total_content in finalize_publish_content
```

**Why it's useful:** Platform-level metrics visible on explorer. Shows VeilSub is a PLATFORM, not just a contract. Judges can see "47 creators registered, 230 pieces of content" without any privacy leak.

**Variable cost:** ~3K-5K (two new mappings, 4 lines across existing finalizes)
**Time:** 20 min CLI work
**Risk:** Very low

### Tier 4: Frontend-Only Improvements (No Variable Cost)

These are pure frontend/UX improvements that cost zero contract variables.

#### 10. Privacy Explainer in Subscribe Flow

**Current:** Privacy toggle shows "Standard: BHP256 hash" and "Blind: Nonce rotation" — technical jargon.

**Improvement:** Add expandable tooltip:
```
Standard: Your subscription is linked to a consistent identity hash.
The creator sees the same subscriber ID across renewals.

Blind (BSP): Each subscription uses a random nonce, creating a
new identity each time. Nobody — not even the creator — can link
your subscriptions together. This is VeilSub's Blind Subscription
Protocol.
```

With a visual:
```
Standard:  You → hash(you) → Renew → hash(you)     [same ID]
Blind:     You → hash(you+nonce1) → Renew → hash(you+nonce2)  [different IDs]
```

#### 11. "For Judges" Quick Test Section in README

Add a section at the top of README specifically for judges:

```markdown
## Quick Test (2 minutes)

1. Visit [deployed URL]
2. Connect Shield or Leo wallet
3. Click any Featured Creator
4. Subscribe with BLIND mode selected (try it!)
5. Open [testnet explorer link] — see ZERO addresses in transaction

Video Demo: [link]
Testnet Contract: [https://testnet.aleoscan.io/program?id=veilsub_v27.aleo]
15+ confirmed transactions on testnet
```

**Why:** Judges review dozens of projects. Make testing VeilSub take 2 minutes, not 20.

#### 12. Transaction Status Messages

**Current:** Generic "Proving..." during the 30-60 second ZK proof generation.

**Improvement:** Cycle through educational messages:
```
"Generating zero-knowledge proof... (this proves your subscription without revealing your identity)"
"Encrypting your AccessPass record... (only you can read this)"
"Broadcasting to Aleo testnet... (no subscriber addresses will appear on-chain)"
"Verifying finalize execution... (mapping updates use Poseidon2 hashes, not addresses)"
```

**Why:** Turns wait time into education. Judges sitting through 30s of proof generation learn about your privacy guarantees.

#### 13. Creator Page — Show Active Tier Details

**Current:** Creator page shows subscriber count and tier price but doesn't display custom tier names/prices.

**Improvement:** Below the creator profile, show a tier card grid:
```
[Tier 1: Supporter — 500 microcredits]
[Tier 2: Premium — 2,000 microcredits]
[Tier 4: Gold — 3,000 microcredits] ← Custom tier!
```

Fetched from CREATOR_CUSTOM_TIERS config or constructed from on-chain data.

#### 14. Homepage Stats Counter Animation

**Current:** Static numbers (27 transitions, 24 mappings, etc.)

**Improvement:** Animate the count-up when stats section scrolls into view. Simple CSS/JS animation — makes the page feel dynamic.

#### 15. Dark Mode Polish

**Current:** App has dark theme by default (Tailwind dark classes).

**Improvement:** Ensure ALL components render correctly in dark mode. Check:
- Modal backgrounds
- Dropdown menus
- Toast notifications
- Error states
- Loading skeletons

---

## Part 2: Presentation Strategy (Think Like a Startup)

### The Narrative That Wins

Don't present VeilSub as "a smart contract with 25 transitions."

Present it as:

**"The private Patreon. Subscribe to creators without anyone knowing."**

Then explain:
- Problem: Patreon, Substack, OnlyFans expose everything. Payments traceable. Followers visible.
- Solution: VeilSub. Subscribe privately. Pay privately. Prove access without identity.
- How: Blind Subscription Protocol — each renewal looks like a new person. Zero addresses on-chain.
- Proof: [show testnet explorer] — look, no addresses. Just hashes.

### The Comparison That Positions You

Don't compare to Veiled Markets or NullPay (different categories).
Compare to Patreon and Substack (traditional platforms):

| Feature | Patreon | Substack | VeilSub |
|---------|---------|----------|---------|
| Subscriber identity | Public | Public | Private (BSP) |
| Payment tracing | Yes | Yes | No (private credits) |
| Content gating | Yes | Yes | Yes (on-chain ZK) |
| Subscription transfer | No | No | Yes |
| Subscription gifting | Limited | No | Yes (private) |
| Creator analytics | Public | Public | Private (creator-only) |
| Proof of subscription | N/A | N/A | Zero-knowledge |

**This table should be in the video demo, the README, and the Akindo submission.**

### The Privacy Story That Gets 9/10

Privacy 7 = "standard Aleo privacy (records + hashing)"
Privacy 8 = "novel technique OR multiple privacy layers"
Privacy 9 = "something judges haven't seen before"

You have THREE privacy layers:
1. **Layer 1 — Blind Identity Rotation (BSP):** Nonce per transaction → unlinkable subscriptions
2. **Layer 2 — Zero-Address Finalize:** All 22 mappings hashed → no raw addresses on-chain
3. **Layer 3 — Selective Disclosure:** AuditToken with zero finalize → invisible proof sharing

Plus two additional techniques:
4. **Commit-Reveal Tipping:** BHP256 commitment → hidden tip amounts
5. **Privacy Mode Selection:** Users choose their privacy level (standard vs blind)

**Present these as "BSP: A Five-Layer Privacy Architecture"** in the video and docs.

---

## Part 3: What Would Make Judges Say "Wow"

These are the creative, big-thinking ideas. Some are feasible for Wave 3, some are Wave 4+.

### Idea 1: "Privacy Score" for Each Transaction

**Frontend-only feature. Zero contract changes.**

After each transaction, show a "Privacy Score" visualization:

```
Your transaction privacy: ████████░░ 80%

✓ Private payment (credits.aleo transfer_private)
✓ Hashed subscriber identity (Poseidon2)
✓ Zero-address finalize
✗ Standard mode (upgrade to Blind for 100%)
```

For blind mode:
```
Your transaction privacy: ██████████ 100%

✓ Private payment (credits.aleo transfer_private)
✓ Nonce-rotated identity (BSP)
✓ Zero-address finalize
✓ Unlinkable renewals
```

**Why it's powerful:** Gamifies privacy. Makes the abstract concrete. Judges see you've thought about privacy UX, not just privacy engineering.

### Idea 2: "Privacy Comparison" Page

**Frontend-only feature. No contract changes.**

A page that lets users compare VeilSub's privacy guarantees against traditional platforms AND other Aleo projects.

Show a matrix:
```
                     VeilSub   Patreon   NullPay   lasagna
Subscriber privacy     ✓         ✗         ✓         N/A
Payment privacy        ✓         ✗         ✓         ✓
Identity rotation      ✓         ✗         ✗         ✗
Zero-footprint verify  ✓         ✗         ✗         ✗
Selective disclosure   ✓         ✗         ✗         ✗
Content gating         ✓         ✓         N/A       N/A
```

### Idea 3: Subscription "Proof Card" (Shareable Image)

**Frontend-only feature.**

Generate a shareable image that proves subscription status:

```
┌─────────────────────────────┐
│   VeilSub Proof of Access   │
│                             │
│   Creator: ████████████     │
│   Tier: Premium             │
│   Valid Until: Block 1.2M   │
│   Privacy: Blind (BSP)      │
│                             │
│   Verify: veilsub.xyz/v/... │
└─────────────────────────────┘
```

Creator name is hashed. Subscriber address never shown. The verification link checks the AuditToken on-chain.

**Why:** It's viral. People share proof cards. It demonstrates the selective disclosure concept visually.

### Idea 4: "Time Until Renewal" Dashboard Widget

**Frontend-only feature.**

Show subscribers a countdown to their subscription expiry:

```
Your VeilSub Passes:

CryptoAnalyst    [██████████░░░░] 72% remaining (864,000 blocks left)
PrivacyReporter  [████░░░░░░░░░░] 28% remaining (240,000 blocks left) ⚠️ Expiring soon
```

With a "Renew" button that pre-fills the RenewModal.

### Idea 5: Creator "Privacy Pledge" Badge

**Frontend-only feature.**

Creators who:
- Accept blind subscriptions
- Never revoke access
- Don't require identity verification

Get a "Privacy Pledge" badge on their profile:

```
🛡️ Privacy-First Creator
• Accepts blind subscriptions
• Zero revocations
• No identity requirements
```

Data pulled from on-chain: check if creator has tier_deprecated for any tier, check access_revoked mapping for that creator's passes.

---

## Part 4: Wave 4+ Roadmap (For Submission Document)

Judges want to see you're thinking beyond this wave. Include in submission:

### Mainnet Features (When Variable Limits Increase)

1. **Pedersen Homomorphic Subscriber Counting** — Already proven working in v17. Waiting for mainnet variable limits.
2. **Private Referral System** — Was in v10, removed for budget. Will restore on mainnet.
3. **Time-Locked Escrow** — Subscriber protection with automatic refunds.
4. **Multi-Creator Subscription Bundles** — Subscribe to 5 creators with one payment.
5. **USDCx Stablecoin Support** — Dual-token payments (Aleo credits + USDCx).

### Platform Growth Features

6. **Creator Onboarding Wizard** — Guided 3-step flow (register → create tiers → publish first content)
7. **Subscription Analytics Dashboard** — Charts showing subscriber growth, revenue trends, tier distribution
8. **Mobile-First Redesign** — Shield Wallet mobile integration
9. **API for Creators** — Webhook notifications for new subscribers, tips, content access
10. **Creator Discovery Algorithm** — Surface popular creators without leaking subscriber identities

---

## Day-by-Day Priority (March 6-11)

### March 6 (Today) — Lock In

- [x] All audit bugs fixed
- [x] BSP named and documented
- [x] Custom tiers in subscribe flow
- [ ] Execute 10 diverse testnet transactions on v24

### March 7 — Record & Fix

- [ ] RECORD THE VIDEO DEMO (morning, 2 hours)
- [ ] Add blind mode to RenewModal (30 min CLI)
- [ ] Add error code messages (1 hour CLI)
- [ ] Add testnet explorer deep links (30 min CLI)

### March 8 — Creative Features (Pick 2)

- [ ] prove_subscriber_threshold transition (30 min CLI, ~5K variables)
- [ ] content_access_count mapping (15 min CLI, ~3K variables)
- [ ] total_creators / total_content platform stats (20 min CLI, ~5K variables)
- [ ] Deploy v26 with new features (if ALEO available)

### March 9 — Polish

- [ ] Privacy explainer tooltip in SubscribeModal
- [ ] "For Judges" section in README
- [ ] Privacy Score visualization (frontend only)
- [ ] Educational transaction status messages
- [ ] "vs Patreon" comparison table in video/docs

### March 10 — Submit

- [ ] Final build check (leo build + npm run build)
- [ ] Upload video to YouTube/Loom
- [ ] Update Akindo submission
- [ ] Final README review
- [ ] Submit before midnight

### March 11 — Deadline (Don't Touch Anything)

If you haven't submitted by March 10 evening, submit whatever you have.

---

## Honest Score Projections

### Do Nothing More: 37-38/50
Privacy 8, Tech 6-7, UX 7, Practicality 7, Novelty 7-8

### Do Video + Testnet TX + Small Fixes: 39-40/50
Privacy 8, Tech 7-8, UX 8-9, Practicality 7-8, Novelty 8

### Do Everything Above: 41-43/50
Privacy 8-9, Tech 8, UX 9, Practicality 8, Novelty 8-9

### The Funded Threshold (Based on Wave 2)
- NullPay: 39/50, $1,215
- VeilReceipt: 31/50, $315
- Lowest funded: 29/50 (ZKPerp, but had strong W1 foundation)
- To be safe, target 38+ total with at least 1 milestone point

---

## Final Word

Your contract is genuinely good. The privacy architecture is stronger than most competitors. BSP is novel. The feature set is comprehensive.

But judges don't read code — they watch demos and click buttons.

The gap between 37 and 42 is not engineering. It's presentation. Record the video. Execute the testnet transactions. Make the privacy story visible. That's it.

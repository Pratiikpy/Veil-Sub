# VeilSub — Wave 3 Beyond: Creative Improvements & Polish

**Date:** March 6, 2026 (5 days to Wave 3 deadline: March 11)
**Current State:** v26 deployed, 27 transitions, 24 mappings, 6 records, 4 structs
**Current Projected Score:** 37-38/50
**Target:** 42+/50

---

## Current State Assessment

### What's Done Right (Don't Touch These)

- Contract compiles clean, 1,202 lines, 90 error codes, zero dead code
- BSP (Blind Subscription Protocol) named and documented in PRIVACY_MODEL.md
- Zero addresses in any finalize function — strongest privacy discipline in the buildathon
- Custom tiers work on-chain AND in frontend (CREATOR_CUSTOM_TIERS map + displayTiers)
- Blind subscription toggle exists in SubscribeModal (standard vs blind)
- useCreatorStats queries mappings with Poseidon2 hashes (correct)
- RenewModal constructs fallback tier objects for custom tiers 4-20
- 62 frontend components, 16 hooks, 6 API routes — complete app
- All stale audit files archived
- CLAUDE.md accurate for v26

### What's Still Weak (Honest Assessment)

1. **No video demo** — Judge asked for this in Wave 2. It's been the #1 recommendation across 3 audit sessions. Every day without it is a day closer to submitting blind.

2. **v24 deployed, v25 local-only** — The 25 in "v25" looks impressive but judges verify on-chain. They'll see v24 with 13 transactions. Not bad, but NullPay is at v13 deployed and Veiled Markets at v18 deployed.

3. **No testnet transactions showing new features** — Custom tiers, blind subscription, gifting, commit-reveal tipping — none of these have testnet tx evidence. Judges check the explorer.

4. **Frontend custom tier discovery is hardcoded** — CREATOR_CUSTOM_TIERS in config.ts has manually entered tier data for one creator. If judges register as a new creator and create tiers, subscribers won't see them.

5. **Dispute mechanism is incomplete** — You can file a dispute (dispute_content) but there's no resolution. No outcome mapping, no refund trigger. Veiled Markets has 3-phase dispute. lasagna has threshold-based challenges.

6. **No creative "wow factor"** — BSP naming was smart but it's marketing, not engineering. lasagna got Novelty 9 by inventing a cryptographic pattern (Pedersen homomorphic aggregation). Your contract doesn't have an equivalent technical innovation.

---

## Part 1: Practical Improvements (High ROI, Low Risk)

These are the safe, proven moves that directly address judge criteria.

### 1.1 Record the Video Demo (UX: +1 to +2)

**Time:** 2 hours
**Impact:** UX 7→8-9

This is not optional anymore. Here's the exact script:

**Minute 0:00-0:30 — Hook**
- Open VeilSub landing page
- Show "Blind Subscription Protocol" headline
- Quick scroll through featured creators

**Minute 0:30-1:30 — Creator Flow**
- Connect wallet (Shield or Leo)
- Register as creator (show testnet tx)
- Create custom tier: "Gold Tier" at 2000 microcredits (show TierCreationDialog)
- Publish content with tier gating (show content ID + min tier)
- Show content appearing in feed

**Minute 1:30-3:00 — Subscriber Flow**
- Switch to different wallet/address
- Navigate to creator page
- Subscribe using BLIND mode (show the toggle, explain nonce rotation)
- Show AccessPass record in wallet
- Click locked content → show "Verifying access..." → content unlocks
- Show that testnet explorer has NO subscriber address — only hashes

**Minute 3:00-4:00 — Advanced Features**
- Gift a subscription to a third address
- Show GiftToken record → redeem → AccessPass created
- Commit-reveal tip: commit a tip (hidden amount) → reveal later
- Show creator dashboard with stats

**Minute 4:00-5:00 — Privacy Deep Dive**
- Open testnet explorer → show transaction
- Point out: zero addresses in finalize arguments
- Show only field hashes — no subscriber identity leaked
- Explain BSP: "Each renewal uses a different nonce, making subscriptions unlinkable"
- Show AuditToken creation — selective disclosure without on-chain trace

**Recording tips:**
- Use OBS Studio or Loom
- 1080p, no music, clear narration
- Show wallet popups and transaction confirmations
- Keep it under 5 minutes (judges are reviewing dozens of projects)

### 1.2 Execute Testnet Transactions for Key Features (Tech: +1)

**Time:** 1 hour
**Impact:** Tech 6-7→7-8

Judges check the testnet explorer. Execute these transactions on v24:

1. `create_custom_tier` — Create tier 4 at 3000 microcredits
2. `subscribe` — Standard subscription at tier 1
3. `subscribe_blind` — Blind subscription with nonce (BSP in action)
4. `verify_access` — Zero-footprint verification
5. `gift_subscription` — Gift to another address
6. `redeem_gift` — Redeem the gift
7. `commit_tip` — Commit a hidden tip
8. `reveal_tip` — Reveal the tip
9. `publish_content` — Publish gated content
10. `transfer_pass` — Transfer subscription to another address

Each transaction is visible on-chain evidence of a working feature. 10 diverse transactions > 13 repetitive ones.

### 1.3 Deploy v25 If Budget Allows (Tech: +0.5)

**Time:** 30 minutes + 37 ALEO
**Impact:** Minor but signals iteration

v25 has real improvements (publish_encrypted content limit, dispute expiry check, dead code removed). Deploying it would show v24→v25 progression visible on-chain.

If you don't have 37 ALEO: skip this. v24 with diverse transactions is better than v25 with zero transactions.

### 1.4 Pre-populate Demo Data (UX: +0.5)

**Time:** 30 minutes
**Impact:** Judge sees a living app, not an empty shell

Your SEED_CONTENT and FEATURED_CREATORS in config.ts exist but judges need to see:
- 3+ creators with different tier structures
- 10+ pieces of gated content across tiers
- Active subscriber counts (from testnet transactions)
- Creator profiles with avatars and descriptions (Supabase)

Execute the testnet transactions from 1.2 using different addresses to populate real on-chain data.

---

## Part 2: Creative Improvements (Differentiation)

These go beyond bug fixes. These are the ideas that could push Novelty and Tech scores higher.

### 2.1 Subscription Epochs — Privacy-Preserving Analytics (Novelty: +1, Tech: +0.5)

**Concept:** Instead of updating subscriber_count on every subscription (which leaks timing of individual subscriptions), batch analytics into "epochs."

**How it works:**
- New mapping: `epoch_subscriber_delta: field => u64` (keyed by epoch_id)
- New mapping: `current_epoch: u8 => u32` (singleton, stores current epoch start block)
- Epoch duration: ~1000 blocks (~1 day)
- During an epoch, individual subscriptions DON'T update subscriber_count
- Instead, they increment `epoch_subscriber_delta`
- A new transition `close_epoch` finalizes the epoch, adding the delta to subscriber_count
- Result: Observer sees total count change once per day, not per transaction

**Why this matters for judges:**
- It's a genuine privacy innovation: subscription timing is obscured
- Similar philosophy to lasagna's DAR (defer revelation of aggregate data)
- Easy to implement (2 new mappings, 1 new transition, ~50 lines)
- Variable cost: ~15K-20K (well within budget)

**Narrative for PRIVACY_MODEL.md:**
"Epoch-Batched Analytics" — subscriber counts update only at epoch boundaries, preventing transaction-timing correlation attacks. An observer cannot determine WHEN a specific subscription occurred within an epoch.

### 2.2 Subscriber Commitment Proof — Zero-Knowledge Subscription Count (Novelty: +1, Privacy: +1)

**Concept:** Let creators prove they have N+ subscribers without revealing the exact count.

**How it works:**
- New transition: `prove_subscriber_threshold(creator_hash, threshold)`
- Finalize checks: `subscriber_count[creator_hash] >= threshold`
- Returns true/false without revealing actual count
- No new record needed — just a public finalize check

**Why this matters:**
- Creators can prove "I have 100+ subscribers" for partnership deals
- Without revealing if it's 101 or 10,000
- Range proofs are a known ZK primitive — implementing it in Leo is novel for this buildathon
- Extremely cheap: ~3K-5K variables

**Narrative:** "Threshold Proofs for Creator Reputation" — creators prove subscriber milestones without leaking exact metrics.

### 2.3 Content Access Proofs — Prove You Can Access Without Accessing (Novelty: +1)

**Concept:** Prove you have access to specific content without actually viewing it.

**How it works:**
- New transition: `prove_content_access(pass: AccessPass, content_id: field) -> (AccessPass)`
- Transition-only (NO finalize) — zero on-chain footprint
- Verifies: pass.tier >= content_meta[content_id] AND pass.expires_at > block.height AND !access_revoked[pass_id]
- Returns the AccessPass unchanged (ownership proof)

**Wait — this needs finalize to check mappings.** Alternative approach:
- `prove_content_access` with finalize that checks access_revoked and content_meta
- But subscriber identity still never enters finalize
- The "proof" is the successful transaction execution itself

**Why this matters:**
- Subscriber proves "I could read this content" to a third party (employer, auditor)
- Without the third party seeing what the content IS
- Without the content creator knowing the subscriber checked
- New use case: compliance verification, institutional access auditing

**Variable cost:** ~30K-40K (meaningful but within budget)

### 2.4 Privacy Mode Escalation — Progressive Privacy Levels (Novelty: +0.5)

**Concept:** Three privacy tiers that subscribers can choose between, with different on-chain footprints.

**Already have:**
- Standard (privacy_level: 0): BHP256(subscriber) — consistent identity across renewals
- Blind (privacy_level: 1): Poseidon2(BlindKey{subscriber, nonce}) — unlinkable renewals

**Could add:**
- Stealth (privacy_level: 2): Subscription exists but ZERO subscriber hash in any mapping. Only the AccessPass record proves access. Finalize only updates subscriber_count (no pass_creator, no subscription_by_tier — those would leak info).

**Why this matters:**
- Three-level privacy model is more sophisticated than any competitor
- Shows privacy is not binary — it's a spectrum
- Judges can see you've thought deeply about threat models
- The tradeoff (stealth subscribers can't be revoked because pass_creator isn't set) is itself interesting

**Variable cost:** One new transition path (~70K-100K). Tight on budget but possible.

### 2.5 Encrypted Metadata Commitment (Tech: +0.5, Privacy: +0.5)

**Concept:** Content metadata (title, description) committed on-chain as encrypted blobs, decryptable only by subscribers with the right tier.

**Already have:** `publish_encrypted_content` with `encryption_commitment` field.

**Could enhance:**
- Add a `metadata_commitment: field` to publish_encrypted_content
- This commitment = BHP256::commit_to_field(metadata_hash, encryption_key_hash)
- Subscribers who pay decrypt the metadata off-chain using the encryption key from their AccessPass
- Non-subscribers see only opaque commitments

**Why this matters:**
- Content TITLES are currently visible (or hashed to meaningless field values)
- With metadata commitments, even the existence of specific content is hidden
- "You can see there's content, but you can't see what it's about without paying"
- Extends the privacy story from "subscriber identity" to "content privacy"

**Variable cost:** Minimal — just adding a field to an existing finalize (~2K-3K)

---

## Part 3: Frontend Polish (UX Score Boosters)

### 3.1 Error Code → Human Message Mapping

**Current:** Transaction failures show generic errors.
**Improvement:** Map ERR_001-ERR_107 to user-friendly messages.

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  'ERR_001': 'Price must be at least 100 microcredits',
  'ERR_002': 'Tier ID must be between 1 and 20',
  'ERR_020': 'Invalid tier selection',
  'ERR_022': 'Insufficient payment for this tier',
  'ERR_023': 'This tier has been discontinued by the creator',
  'ERR_024': 'Subscription expiry must be in the future',
  'ERR_026': 'Creator has reached maximum subscriber capacity',
  'ERR_027': 'Your access has been revoked by the creator',
  'ERR_067': 'This nonce has already been used — try a different one',
  // ... etc
}
```

**Impact:** When a transaction fails, users see "This tier has been discontinued by the creator" instead of "Transaction failed." Judges testing the app will encounter errors — good error messages show maturity.

### 3.2 Transaction History Panel

**Current:** No way to see past transactions in the app.
**Improvement:** Add a "My Activity" tab in the dashboard showing:
- Subscriptions purchased (with tier, creator, expiry)
- Tips sent (commit-reveal status)
- Gifts sent/received
- Content published (for creators)

Pull data from wallet records (AccessPass, CreatorReceipt, GiftToken) and display chronologically.

**Why:** Judges want to see the app is USED. A transaction history makes the app feel alive even without many users.

### 3.3 Creator Onboarding Flow

**Current:** Creator registration is a single "Register" button with a price input.
**Improvement:** Guided 3-step wizard:

Step 1: "Set your base price" (slider + explanation of tier multipliers)
Step 2: "Create your tiers" (show TierCreationDialog inline, suggest 3 tiers)
Step 3: "Publish your first content" (inline content creation)

**Why:** Judge said "interested to see how verification and gated content delivery actually work." A guided flow makes this obvious.

### 3.4 Live Subscriber Count Animation

**Current:** Subscriber count is a static number.
**Improvement:** When a new subscription comes in (detected via mapping poll), animate the count incrementing with the existing CountUp component. Add a subtle pulse effect.

**Why:** Makes the app feel real-time and alive. Small detail, big UX impact.

### 3.5 Privacy Mode Explainer Tooltip

**Current:** Blind mode toggle shows "Standard: BHP256 hash" and "Blind: Nonce rotation" — technical labels.
**Improvement:** Add an expandable explainer:

"Standard mode: Your subscription is linked to your address hash. Renewals are traceable to the same subscriber.

Blind mode: Each subscription uses a random nonce, creating a different identity hash each time. An observer cannot link your subscriptions together. This is VeilSub's Blind Subscription Protocol (BSP)."

Include a simple diagram:
```
Standard:  Sub1 → hash(you) → Sub2 → hash(you)     [linkable]
Blind:     Sub1 → hash(you+nonce1) → Sub2 → hash(you+nonce2)  [unlinkable]
```

**Why:** Judges reading the UI should immediately understand WHY blind mode matters. If they have to read PRIVACY_MODEL.md to understand, they probably won't.

### 3.6 Testnet Explorer Deep Links

**Current:** No links from the app to testnet explorer.
**Improvement:** After any successful transaction, show a "View on Explorer" link that opens the testnet transaction page.

**Why:** Judges can verify on-chain execution with one click. Removes friction between "it says it worked" and "I can see it worked."

---

## Part 4: Documentation & Submission Polish

### 4.1 Update WAVE3_SUBMISSION.md

The current file needs to reflect everything that's been built since Wave 2. Structure:

```
## What Changed Since Wave 2

### Contract Improvements (v8 → v25)
- Custom creator tiers (judge's #1 request): create_custom_tier, update_tier_price, deprecate_tier
- Blind Subscription Protocol: subscribe_blind, renew_blind with nonce rotation
- Content lifecycle: publish, update, delete, publish_encrypted
- Gifting system: gift_subscription, redeem_gift
- Commit-reveal tipping: commit_tip, reveal_tip
- Dispute mechanism: dispute_content with rate limiting
- Subscription transfer: transfer_pass
- Fee withdrawal: withdraw_platform_fees, withdraw_creator_rev
- 12→25 transitions, 10→22 mappings, 3→6 records

### Privacy Architecture (v23+ Overhaul)
- ZERO addresses in any finalize function
- All 22 mapping keys are Poseidon2 hashes
- BSP: Nonce-rotated subscriber identity (unlinkable renewals)
- AuditToken: Zero-finalize selective disclosure

### Frontend
- Blind subscription toggle in subscribe flow
- Custom tier creation dialog
- Creator stats with hash-based mapping queries
- 42 components, 5 wallet support
```

### 4.2 Update VIDEO_DEMO_SCRIPT.md

The current script (111 lines) is fine but should be updated to emphasize:
- Custom tier creation (judge's specific ask)
- Blind mode toggle (BSP in action)
- Testnet explorer verification (proof it's real)

### 4.3 Add "How to Judge" Section to README

Add a section specifically for judges:

```
## For Judges: Quick Verification Guide

1. **Testnet Contract:** [explorer link to veilsub_v24.aleo]
2. **Confirmed Transactions:** 15+ on testnet (subscribe, blind subscribe, gift, tip, verify)
3. **Video Demo:** [link when recorded]
4. **Try it yourself:**
   - Visit [deployed URL]
   - Connect Shield/Leo wallet
   - Register as creator → Create tier → Publish content
   - Switch wallet → Subscribe (try Blind mode!) → Access content
5. **Privacy Proof:** Open any transaction on explorer — ZERO subscriber addresses visible
```

**Why:** Judges review dozens of projects. Making verification effortless = higher engagement = higher scores.

---

## Part 5: Strategic Moves (Think Like a Co-Founder)

### 5.1 The Version Number Game

NullPay is at v13. Veiled Markets at v18. You're at v25 local / v24 deployed.

v25 is already the highest version in the buildathon. If you deploy v25 and make even small iterations to v26, v27 (each with a real improvement), you signal the most active development in the competition.

**But only if each version has a real change.** Empty version bumps are obvious and judges penalize them.

Possible real version bumps:
- v26: Add `prove_subscriber_threshold` transition (the threshold proof idea)
- v27: Add epoch-batched analytics
- v28: Final polish + any remaining fixes

Each would be a real, deployable improvement.

### 5.2 The Comparison Table Strategy

Your README already has a comparison table against competitors. Make sure it's updated and PROMINENT. Judges love seeing a project that knows its competitive landscape.

Key columns to highlight:
- Privacy Architecture (VeilSub: Zero-address finalize. Others: Mixed)
- Custom Tiers (VeilSub: Dynamic 1-20. Others: Fixed)
- Blind Renewal (VeilSub: BSP nonce rotation. Others: None)
- Record Types (VeilSub: 6. Only VeilReceipt matches with 6)

### 5.3 The "Privacy-First" Framing

Every funded project except ZKPerp scored Privacy 8+. Your Privacy 7 is the difference between funded and unfunded.

BSP naming helped. But you need to go further:
- The video demo should OPEN with privacy (show the explorer, show zero addresses)
- The README should lead with privacy (not features)
- WAVE3_SUBMISSION.md should frame every feature through a privacy lens

Example: Instead of "We added gifting" → "We added private gifting where the gifter's identity is hashed (gifter_hash: field), making gift subscriptions unlinkable to the gifter."

### 5.4 The Akindo Submission Strategy

Akindo submission has specific fields. Make sure:
- "What changed this wave" is specific and quantified (not vague)
- Video link is included (if recorded)
- Testnet contract address is correct
- GitHub repo link works
- Any deployment URLs are live

### 5.5 Think Beyond Wave 3

Milestone points are cumulative. Even if Wave 3 scores 38, that's 71 cumulative (33+38). With 7 more waves, there's $35K still in the pool.

What matters for cumulative scoring:
- Consistent improvement wave over wave
- Not dropping scores (worse than flat)
- Building toward mainnet readiness

For Wave 4+, start thinking about:
- Mainnet deployment (when Aleo mainnet is ready)
- Real user testing (not just testnet)
- Mobile-first design (NullPay already has Shield mobile)
- Multi-token support (USDCx — but only if variable budget allows)

---

## Part 6: What NOT to Do (Time Traps)

### Don't:

1. **Don't refactor the contract.** It works. It compiles. It's clean. Any refactoring risks introducing bugs 5 days before deadline.

2. **Don't add USDCx support.** It costs 50-80K variables and requires importing a second program. Not worth the risk right now.

3. **Don't build mobile responsive polish.** Judges test on desktop. CSS tweaks are invisible to scoring.

4. **Don't write more documentation for documentation's sake.** You have README, PRIVACY_MODEL, ARCHITECTURE, CHANGELOG, VIDEO_DEMO_SCRIPT, WAVE3_SUBMISSION. That's more than enough.

5. **Don't try to match Veiled Markets' transition count.** They have 37 transitions because they're building an AMM with LP mechanics. Subscription platforms don't need 37 transitions. Quality > quantity.

6. **Don't add features that don't have frontend support.** A contract transition without a UI button doesn't exist to judges.

---

## Part 7: Day-by-Day Battle Plan (March 6-11)

### Day 1 — March 6 (Today): Foundation

- [x] Audit complete, all critical bugs fixed
- [x] BSP named and documented
- [x] Custom tiers in subscribe flow
- [x] Dead code cleaned
- [ ] Execute 10 diverse testnet transactions on v24 (1 hour)
- [ ] Start video demo preparation (write talking points)

### Day 2 — March 7: Video + Transactions

- [ ] Record video demo — PRIORITY #1 (2 hours)
- [ ] If v25 deploy affordable: deploy and execute 5 more tx on v25
- [ ] Update WAVE3_SUBMISSION.md with Wave 3 changes
- [ ] Add "For Judges" section to README

### Day 3 — March 8: Creative Feature (Pick ONE)

If time and ALEO budget allow, implement ONE creative feature:

**Option A (Safest, ~5K variables):** `prove_subscriber_threshold` transition — threshold proof for creator reputation. Simple, novel, low risk.

**Option B (Medium, ~20K variables):** Epoch-batched analytics — privacy-preserving subscriber counting. More impressive but more code.

**Option C (Highest impact, ~40K variables):** Content access proofs — zero-footprint proof of content access eligibility. Most impressive but tightest on budget and time.

Recommendation: Option A. Lowest risk, real novelty, builds on existing architecture.

### Day 4 — March 9: Polish

- [ ] Error code → message mapping in frontend
- [ ] Testnet explorer deep links from transaction confirmations
- [ ] Privacy mode explainer in SubscribeModal
- [ ] Final round of testnet transactions to populate data
- [ ] Check all links work (explorer, GitHub, deployed frontend)

### Day 5 — March 10: Submit

- [ ] Final build check: `leo build` + `npm run build` (zero errors)
- [ ] Upload video to YouTube/Loom (unlisted)
- [ ] Update Akindo submission with:
  - Video link
  - v24/v25 testnet contract address
  - GitHub link
  - Deployed frontend URL
  - "What changed" summary
- [ ] Review submission one final time

---

## Summary: The 5 Things That Matter Most

1. **Record the video demo.** Nothing else comes close in ROI. Do it tomorrow.

2. **Execute diverse testnet transactions.** 10 different transition types on v24. Takes 1 hour. Shows judges every feature works.

3. **Frame everything through privacy.** BSP, zero-address finalize, nonce rotation — lead with these in every document, the video, and the submission.

4. **Add one creative feature** (if time allows). prove_subscriber_threshold is the safest bet — it's a genuine privacy primitive that no competitor has.

5. **Submit early, not last minute.** Wave 3 deadline is March 11. Submit March 10 evening. Murphy's Law applies to buildathons.

---

## Realistic Score Projection

### If you do items 1-2 only (video + testnet tx):
Privacy 8, Tech 7, UX 8-9, Practicality 7, Novelty 7-8 = **37-39**

### If you do items 1-4 (video + tx + privacy framing + creative feature):
Privacy 8-9, Tech 7-8, UX 8-9, Practicality 7-8, Novelty 8 = **38-42**

### If you do everything in this document:
Privacy 9, Tech 8, UX 9, Practicality 8, Novelty 8 = **42** (top 3 in buildathon)

The gap between 37 and 42 is the video demo + one creative feature + privacy-first framing. That's maybe 6-8 hours of work total.

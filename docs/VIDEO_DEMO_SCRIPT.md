# VeilSub Wave 3 Video Demo Script

## Duration Target: 3-5 minutes

**Key Message:** VeilSub v27 deployed — zero addresses in finalize, blind renewal, commit-reveal tipping, 27 transitions, 25 mappings, scoped audit tokens, trial rate-limiting.

---

## Opening (15 seconds)
- Show landing page hero at veil-sub.vercel.app
- "VeilSub — Private Creator Subscriptions on Aleo"
- Highlight the stat cards: 27 transitions, 6 record types, 25 mappings, v27 deployed

## 1. Walletless Explorer (20 seconds)
- Navigate to /explorer
- Show mapping queries working WITHOUT a wallet
- Query: subscriber_count, tier_prices, content_count
- Say: "Anyone can verify public stats — but subscriber identities are never exposed. All mapping keys are Poseidon2 hashes — zero raw addresses on-chain."

## 2. Creator Registration (30 seconds)
- Navigate to /dashboard
- Connect wallet (Shield preferred — judges explicitly praise Shield integration)
- Click "Register as Creator"
- Set base price (1000 microcredits = 0.001 ALEO)
- Show transaction status stepper (signing → proving → broadcasting → confirmed)
- Show success + creator profile appears

## 3. Tier Creation (30 seconds)
- In Dashboard, click "Create Tier"
- Create "Supporter" tier (500 microcredits)
- Create "Premium" tier (2000 microcredits)
- Say: "Tiers are fully dynamic — creators set their own pricing. The judge specifically asked for this in Wave 2."
- Show tiers appearing on creator page

## 4. Content Publishing (30 seconds)
- In Dashboard, create a new post
- Title: "Exclusive: My first VeilSub post"
- Set minimum tier: Supporter
- Submit → show transaction confirmation
- Show post appearing in content feed (blur-locked for non-subscribers)
- Say: "Content metadata is on-chain, but the body stays private. Only subscribers with the right tier can see it."

## 5. Subscribe with Privacy Modes (45 seconds)
- Navigate to creator page (via Explore or direct URL)
- Click "Subscribe"
- **Show Privacy Mode Selector:**
  - Standard: normal subscription with public counter increment
  - Blind: nonce-rotated identity — creator cannot link renewals to same person
- Select "Blind" mode
- Complete subscription → show AccessPass received
- Show content unlocked (blur removed)
- Say: "In Blind mode, each renewal uses a different nonce. The creator sees a 'different subscriber' each time — even though it's the same person. This is our novel privacy technique, equivalent to lasagna's DAR but for subscriber identity."

## 6. Zero-Footprint Verification (30 seconds)
- Navigate to /verify
- Enter creator address
- Click "Verify Access"
- Show verification result (green checkmark)
- Say: "This is zero-footprint verification. The contract checks revocation status, but no trace of WHO verified is left on-chain. The judge asked to see verification working — here it is."

## 7. Trial Subscription (20 seconds)
- On creator page, click "Subscribe" and select "Trial" mode
- Show: 20% of tier price, ~12 hour duration
- Say: "Trial passes let users try before committing. Ephemeral AccessPass, 20% of regular price, auto-expires after ~12 hours."

## 8. Tipping with Commit-Reveal (20 seconds)
- On creator page, click Tip button
- Send a private tip
- Say: "Tips can use our commit-reveal scheme: BHP256 commitment hides the amount on-chain until the tipper voluntarily reveals."

## 9. Privacy Architecture (30 seconds)
- Navigate to /privacy
- Scroll through privacy boundary table
- Highlight: "Zero addresses in finalize — the v23 privacy overhaul, now deployed as v27"
- Show the "What Observers Learn vs Cannot Learn" table
- Say: "In v23, we eliminated ALL raw addresses from the public execution layer. Every mapping key is a Poseidon2 hash. Auth checks happen in the transition layer, enforced by ZK proofs."

## 10. Documentation & Technical Depth (20 seconds)
- Navigate to /docs
- Tab through: Overview, Contract, Privacy, API, FAQ
- Show the 27 transitions listed with privacy levels
- Say: "Every transition documented with its privacy boundary. 19 version iterations from v8 to v27."

## 11. Testnet Proof (15 seconds)
- Open https://testnet.aleoscan.io/program?id=veilsub_v27.aleo
- Show the deployed contract
- Say: "All of this is deployed and tested on Aleo testnet. Not a demo — a working system."

## Closing (15 seconds)
- Back to landing page
- "VeilSub v27 deployed: 27 transitions, 25 mappings, 6 record types"
- "Zero addresses in finalize, blind renewal, commit-reveal tipping, scoped audit tokens"
- "19 version iterations from v8 to v27"
- "Built for Aleo. Privacy is the default."

---

## Recording Tips
- Use 1080p or higher, clean browser (no bookmarks bar, no extensions visible)
- Dark mode system theme (matches the app)
- Slow, deliberate mouse movements
- Pause 1-2 seconds on each key screen so judges can read
- Use browser zoom (125-150%) if text is small
- If wallet transactions take time, cut/edit between submit and confirm
- Keep voiceover concise — focus on WHAT is private and WHY
- Mention "zero addresses in finalize" at least twice — this is the privacy headline
- Mention the judge's Wave 2 feedback to show you listened

## Key Phrases to Use
- "Zero-address finalize" — the privacy overhaul headline
- "Blind renewal with identity rotation" — novel technique
- "Commit-reveal tipping with BHP256" — novel technique
- "Zero-footprint verification" — no on-chain trace
- "27 version iterations" — shows heavy development
- "The judge asked for this in Wave 2" — shows responsiveness

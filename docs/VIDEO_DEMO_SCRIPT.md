# VeilSub Wave 3 Video Demo Script

## Duration Target: 3-5 minutes

---

## Opening (15 seconds)
- Show landing page hero
- "VeilSub — Private Creator Subscriptions on Aleo"
- Highlight the stat cards: 31 transitions, 8 record types, 30 mappings, v20

## 1. Creator Registration (30 seconds)
- Navigate to Dashboard
- Connect wallet (Shield/Leo/Fox)
- Click "Register as Creator"
- Set base price (1000 microcredits)
- Show transaction in TransactionStatus stepper (4 steps)
- Show success + creator profile appears

## 2. Tier Creation (30 seconds)
- In Dashboard, click "Create Tier"
- Create "Supporter" tier (500 microcredits)
- Create "Premium" tier (2000 microcredits)
- Show tiers appearing on creator page

## 3. Content Publishing (30 seconds)
- In Dashboard, create a new post
- Title: "Welcome to my VeilSub channel"
- Set minimum tier: Supporter
- Submit → show transaction confirmation
- Show post appearing in content feed (blur-locked)

## 4. Subscribe with Privacy Modes (45 seconds)
- Navigate to creator page (via Explore or direct URL)
- Click "Subscribe"
- **Show Privacy Mode Selector:**
  - Standard: normal subscription
  - Blind: nonce-rotated identity
  - Maximum: Pedersen commitment (no public counter)
- Select "Blind" mode
- Complete subscription → show AccessPass received
- Show content unlocked (blur removed)

## 5. Verify Access (30 seconds)
- Navigate to /verify
- Enter creator address
- Click "Verify" → show zero-footprint proof
- Explain: "This verification leaves NO trace on-chain of who verified"

## 6. On-Chain Explorer (20 seconds)
- Navigate to /explorer
- Show mapping queries working without wallet
- Query: subscriber_count, total_revenue, tier_prices
- "Anyone can verify public stats — but subscriber identities are never exposed"

## 7. Privacy Features Demo (30 seconds)
- Show /privacy page
- Scroll through privacy boundary table
- Highlight: "self.caller NEVER passes to finalize"
- Show the code proof section with all 31 transitions
- "4 zero-footprint proofs leave no on-chain trace"

## 8. Technical Deep Dive (30 seconds)
- Show /docs page
- Tab through: Overview, Privacy, Transitions, Explorer, FAQ
- Highlight v4→v20 evolution (12 versions in Wave 3)
- Show competitive comparison table in README

## Closing (15 seconds)
- Back to landing page
- "VeilSub v20: 31 transitions, 30 mappings, 8 record types"
- "3 privacy modes, 4 zero-footprint proofs, 20 version iterations"
- "Built for Aleo. Privacy first."

---

## Recording Tips
- Use 1080p, clean browser (no bookmarks bar)
- Dark mode system theme
- Slow, deliberate mouse movements
- Pause 1-2 seconds on each key screen
- Use browser zoom if text is small
- If wallet transactions take time, cut/edit between submit and confirm

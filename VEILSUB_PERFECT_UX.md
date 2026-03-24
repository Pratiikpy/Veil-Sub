# VeilSub: The Perfect UX

> Every flow. Every user type. Every screen. Every edge case. Every second.
> Time is unlimited. Build the best version that could possibly exist.

---

## The Three Users

VeilSub has three completely different users with completely different needs. The UX must serve all three without any of them seeing the others' complexity.

**Subscriber**: Wants to find creators, pay privately, read content. Thinks in: "who do I follow, what's new, when does my access expire." Never thinks about ZK proofs, hashes, or finalize functions.

**Creator**: Wants to earn money, publish content, understand their audience. Thinks in: "how much did I earn, who's subscribing (aggregate), what content performs best." Never thinks about Poseidon2 or mapping keys.

**Developer**: Wants to integrate VeilSub into their app. Thinks in: "npm install, import, call function, get result." Wants runnable code, not whitepapers.

---

## SUBSCRIBER JOURNEY (The Most Important Flow)

### First Visit: "What is this?"

**Current**: Homepage shows hero text + educational sections about zero-address finalize.
**Problem**: Subscriber doesn't care about finalize. They care about: "Can I subscribe to creators without anyone knowing?"

**Perfect version**:

The homepage loads. No text appears first. Instead, a 10-second animated demo plays in the hero:

1. (0s) A user icon appears on the left, a creator icon on the right
2. (2s) A dotted line connects them labeled "Subscribe"
3. (3s) The line transforms into a ZK proof animation (glowing particles traveling along the line)
4. (5s) The line disappears. A lock icon appears on the subscriber's side. A money icon appears on the creator's side.
5. (6s) A magnifying glass icon appears in the middle (representing an observer). It scans. Finds nothing. Fades away with a "?"
6. (8s) Text fades in: "Subscribe to anyone. Nobody will ever know."
7. (10s) CTA button fades in: "Find Creators"

This tells the ENTIRE story without a single word of explanation. The subscriber understands immediately: I pay, they earn, nobody can see the connection.

Below the hero: ONE section showing 3 featured creators with "Subscribe from $X/month" buttons. Not 6 educational sections. Three creators. One action.

Below that: "How is this possible?" — ONE paragraph. Not a technical explanation. A human one: "VeilSub uses Aleo's zero-knowledge proofs to process your subscription without ever recording your identity. Your wallet address never appears in any public data. Mathematically impossible to trace."

Below that: "Ready to browse?" — full-width CTA to /explore.

Total homepage: hero animation + 3 featured creators + one paragraph + CTA. That's it. Everything else moves to /privacy, /docs, /about.

### Finding a Creator: "Who should I follow?"

**Current**: /explore shows grid of creator cards with search and category filters.
**Problem**: Creator cards show too much information (avatar + name + category + bio + stats + badge + footer). Hard to scan. No social proof beyond subscriber count.

**Perfect version**:

The explore page is organized like Netflix, not like a directory:

**Row 1: "Trending This Week"** — Horizontal scroll, larger cards (300px wide). Shows: avatar, name, one-line bio, subscriber count with growth indicator ("+12 this week"), starting price. Hover: card lifts, shows "Subscribe from $5/month" overlay.

**Row 2: "New Creators"** — Same format, smaller cards (240px). Shows creators registered in the last 30 days.

**Row 3: "Most Subscribed"** — Sorted by subscriber count (from commitment threshold proofs, not raw numbers).

**Below rows: "All Creators"** — Grid view with filters (category, price range, sort). This is the current explore page, but below the curated rows.

**Search**: As you type, results appear instantly (debounced 300ms). Results show creator name, category, and subscriber count. Clicking a result navigates to their page. If no results: "No creators match '[query]'. Browse all creators instead."

**Every card**: One clear CTA. Not "View Profile" — that's vague. "See Content" or "Subscribe from $X". One action, one click.

### Subscribing: "Take my money (privately)"

**Current**: Click Subscribe on creator page → modal opens → select privacy mode → select tier → confirm → transaction processes → success modal with hash.
**Problem**: Privacy mode selection is confusing (Standard/Blind/Trial). Tier selection requires understanding pricing. Success shows a hash nobody understands.

**Perfect version — the 4-step subscription wizard**:

**Step 1: Choose your plan**
Three cards side by side. Each shows: tier name, price, features list, duration. One card highlighted as "Most Popular" with a subtle glow. Click to select. No dropdown. No form. Just click a card.

If user doesn't have enough balance: show "You need X more ALEO" with a "Get Credits" button that opens the fiat on-ramp.

**Step 2: Choose how to pay**
Three token icons: ALEO Credits, USDCx, USAD. Click to select. Below each: the equivalent price in that token. "500 Credits ≈ $5.00" / "5.00 USDCx" / "5.00 USAD".

If user doesn't have the selected token: "You don't have enough USDCx. Switch to Credits?" with a button.

**Step 3: Privacy level** (simplified)
Two options, not three:
- **Standard** — "Quick and simple. Your subscription is private."
- **Maximum** — "Extra privacy. Each renewal uses a new identity. Even your creator can't tell it's the same person." (This is Blind mode, but explained in human terms.)

Trial is NOT a privacy level. Trial is accessed separately: "Try for 12 hours at 20% price" link below the wizard.

**Step 4: Confirm**
Summary: Creator name, tier, price, token, privacy level. One button: "Subscribe Privately". Below the button in small text: "Your wallet will ask you to sign a transaction. Your identity never appears on the blockchain."

**The proof moment**: After clicking, the modal transforms. The wizard steps disappear. A centered animation appears: the glowing orb. Purple, pulsing, with subtle particle effects. Text below: "Generating your privacy proof..."

This is the moment. The orb isn't a loading spinner. It's a CEREMONY. The user is watching their privacy being created. It should feel sacred, not like waiting for a webpage to load.

After 5-20 seconds: the orb expands, turns green, bursts into dissolving particles. Large text: "You're subscribed." Below: "Your AccessPass is in your wallet. Your identity is protected." Two buttons: "Read Exclusive Content" (primary, navigates to creator's content feed) and "Done" (secondary, closes modal).

No hash shown. No transaction ID. No technical details. If they want those: small link at the bottom "View transaction details" that expands to show the hash and AleoScan link.

### Reading Content: "Show me what I paid for"

**Current**: Content appears on the creator's page in a feed. Locked posts show blur. Unlocked posts show content.
**Problem**: No aggregated feed across all subscribed creators. User has to visit each creator's page individually.

**Perfect version**:

**The /feed page** (NEW — most important missing page):

This is the Patreon Home. The Instagram Feed. The Twitter Timeline. It shows ALL content from ALL subscribed creators in reverse chronological order.

Layout:
- Left sidebar (desktop): list of subscribed creators with unread count badges
- Center: content feed (cards, each showing creator avatar + name + post title + preview + timestamp)
- Right sidebar (desktop): "Discover more creators" with 3 recommendations

Content cards:
- Creator avatar (small, top-left) + creator name + time ago
- Post title (bold, h3)
- First 3 lines of content (or full content if short)
- Image/video preview (if media post)
- "Read more" link to full post
- Interaction bar: heart (tip), share, report

Locked content (from creators you're NOT subscribed to, if you visit their page):
- Shows first 2 lines clearly
- Rest fades into a gradient blur
- Below blur: "Subscribe to read this post — from $X/month" button
- This blur-to-CTA pattern is the single most effective conversion mechanism in the subscription economy

**Content loading**:
- Skeleton cards match exact layout (avatar circle, title rectangle, content lines, media placeholder)
- Content fades in per-card with 50ms stagger
- Infinite scroll with "Loading more..." at bottom
- Pull-to-refresh on mobile (custom animation: VeilSub logo stretches, bounces back)

### Managing Subscriptions: "What am I paying for?"

**Current**: /subscriptions shows cards with block-based expiry. "Renew" links to creator page.
**Problem**: Block numbers mean nothing. Renewal requires navigating away and finding the tier again.

**Perfect version**:

The /subscriptions page shows two tabs: **Active** and **Expired**.

**Active tab**: Each subscription card shows:
- Creator avatar + name (clickable → their page)
- Tier name + price per period
- "Expires March 25, 2026 (3 days left)" — HUMAN DATE, not block number
- Privacy mode badge: "Standard" or "Maximum Privacy"
- Two buttons: "Renew" (primary) and "Manage" (secondary)

**"Renew" button**: Opens a compact modal (not the full subscription wizard). Shows: "Renew [Tier Name] for [Creator Name] — [Price] [Token]". One button: "Renew Now". Done. No tier selection. No payment selection. Same tier, same token, one click.

**"Manage" button**: Expands card to show:
- View on AleoScan (transaction link)
- Transfer Pass (to another address)
- Privacy info: "This subscription uses [Standard/Blind] privacy"

**Expired tab**: Same cards but grayed out. "Resubscribe" button instead of "Renew". Links to the subscription wizard.

**Smart notifications** (appear as banners at top of page):
- "2 subscriptions expiring this week" (amber banner)
- "Your subscription to [Creator] expired yesterday" (red banner with "Resubscribe" button)

### Verifying Access: "Prove I'm subscribed"

**Current**: /verify page shows demo animation, then pass list, then verify button. Success shows "Verified!" and nothing else.
**Problem**: After verification, there's nowhere to go. The flow dead-ends.

**Perfect version**:

Verification should NOT be a standalone page. It should be embedded in the flow:

**Scenario 1: Gated content** — User clicks a locked post. Instead of showing "Subscribe to read," the system checks if they have an active AccessPass. If yes: auto-verify in the background (no user action needed), unlock content with a dissolving blur animation. If no: show subscribe CTA.

**Scenario 2: Third-party verification** — A website uses "Login with VeilSub." The user clicks the button. A compact modal appears: "Prove you're subscribed to [Creator]." User selects their AccessPass (if they have multiple). One click: "Prove Access." The ZK proof generates (orb animation, 5-15 seconds). Success: modal closes, the website unlocks its content.

**Scenario 3: Manual verification** — The /verify page exists for users who want to manually check their passes. But after successful verification, the page shows: "Access Verified! Here's what you can do:" with links to the creator's content, the feed, and an option to share a verification receipt.

**The verification receipt**: A beautiful, shareable card (like a digital badge) showing: "Verified Subscriber — [Creator Name] — [Tier] — Active until [Date]." Downloadable as PNG. Shareable via link. Contains NO identifying information about the subscriber. This is a social proof tool: "I support this creator" without revealing who you are.

---

## CREATOR JOURNEY

### Registration: "I want to earn money"

**Current**: Dashboard shows Connect Wallet → Onboarding Wizard (4 steps) → Celebration → Dashboard.
**Problem**: 10-second celebration blocks the dashboard. Onboarding wizard doesn't explain WHY each step matters.

**Perfect version — the Creator Setup**:

**Step 1: "Welcome to VeilSub"**
Not a wall of text. A 30-second animated walkthrough: "1. You set your prices. 2. Subscribers pay privately. 3. You earn. You never know who they are, and that's the point." Three animations showing each step. "Let's get you set up" button.

**Step 2: "Your Profile"**
- Name (required, explains: "This is how subscribers find you")
- Bio (required, 280 chars, explains: "One sentence about what you create")
- Category (dropdown: Writer, Artist, Developer, etc., explains: "Helps subscribers discover you")
- Profile image (upload or auto-generate from address)
- LIVE PREVIEW on the right showing how the creator card will look on /explore

**Step 3: "Set Your Prices"**
- Start with ONE tier. Not three. "Most successful creators start with one tier and add more later."
- Name: "What do you call this tier?" (placeholder: "Supporter", "Premium", "VIP")
- Price: slider + input. Shows dollar estimate next to ALEO amount.
- Features: "What do subscribers get?" (text area, placeholder: "Access to all exclusive posts, direct messages, early previews")
- Transaction happens here: register_creator + create_custom_tier. Show the orb animation.

**Step 4: "Your First Post"**
- Rich text editor (Tiptap). Already built.
- "Write something your future subscribers will love. Even one paragraph is enough to start."
- Publish button → publish_content transaction → orb animation → success

**Success**: NO 10-second celebration. Instead: a 1-second checkmark animation + the dashboard slides in from the right. A persistent banner at the top: "Your creator page is live! Share it: [copy link button]". The banner dismisses after the creator clicks it or after 24 hours.

### Publishing Content: "Create something"

**Current**: Rich text editor on dashboard with Tiptap.
**Problem**: No scheduling, no drafts (visible), no content preview, no analytics per post.

**Perfect version**:

The content creation flow lives at `/dashboard/new` (dedicated page, not embedded in dashboard):

**Editor** (full-width, distraction-free):
- Top bar: "Back to Dashboard" | "Save Draft" | "Preview" | "Publish"
- Title input (large, 32px font, auto-focus)
- Body: Tiptap editor with toolbar (bold, italic, heading, list, image, video, code block, divider)
- Right sidebar (collapsible):
  - Tier gating: "Who can see this?" dropdown (Free / Tier 1 / Tier 2 / Tier 3)
  - Scheduling: "Publish now" or "Schedule for..." date picker
  - Tags: multi-select (art, tutorial, update, exclusive)
  - Content encryption toggle: "Encrypt at rest" with explanation tooltip

**Preview mode**: Click "Preview" → content renders exactly as subscribers will see it. Desktop and mobile preview toggles.

**Publishing**: Click "Publish" → confirmation modal: "Publishing '[Title]' to [Tier] subscribers. This cannot be undone." → "Publish" button → brief orb animation → "Published! View your post" link.

**Drafts**: Auto-saved every 30 seconds to Redis. Draft list accessible from dashboard. Resume any draft. Delete drafts.

**Post analytics** (per-post): Views, unique viewers, time spent reading (averaged), comments/reactions. Available 24 hours after publishing.

### Analytics: "How am I doing?"

**Current**: Dashboard shows basic stats. /analytics page exists with charts.
**Problem**: Stats are basic. No actionable insights. No comparison over time.

**Perfect version — the Creator Analytics Dashboard**:

**Top row — Key Metrics (4 cards)**:
- Revenue (total + this month + trend sparkline)
- Subscribers (total + this month + trend sparkline)
- Content (total posts + this month)
- Engagement (avg reading time + views per post)

Each card: large number, small label, sparkline (30-day), percentage change badge.

**Section 2 — Revenue Chart**:
- Line chart showing daily/weekly/monthly revenue
- Toggle: Credits / USDCx / USAD / All
- Hover: exact amount for that day
- Compare: "vs last month" toggle overlay

**Section 3 — Subscriber Chart**:
- Area chart showing subscriber count over time
- New subscribers per day (bar overlay)
- Churn rate (subscribers who didn't renew / total)

**Section 4 — Tier Breakdown**:
- Donut chart: revenue by tier
- Table: tier name, subscriber count, revenue, churn rate
- Insight: "Your Premium tier has 2x better retention than Basic. Consider promoting it."

**Section 5 — Content Performance**:
- Table: post title, publish date, views, avg reading time, tier
- Sort by any column
- Insight: "Posts published on Tuesday get 40% more views than average."

**Section 6 — Audience**:
- Privacy-preserving analytics ONLY:
  - New vs returning subscribers (aggregate, not individual)
  - Peak activity times (when do subscribers read)
  - Geographic distribution (country-level, from API request origins)
  - Device breakdown (mobile vs desktop, from user-agent)
- Prominent note: "All analytics are aggregated. Individual subscriber identities are never stored or displayed."

---

## DEVELOPER JOURNEY

### Discovery: "Can I use this?"

**Current**: /developers page with code snippets and SDK description.
**Problem**: Code examples don't work (pseudo-code). No interactive playground.

**Perfect version — the Developer Portal**:

**URL**: /developers (redesigned as a proper documentation site)

**Landing**:
- "Add private subscriptions to any app in 5 minutes"
- Three cards: "React" / "Node.js" / "WordPress" — click to see integration guide for your stack
- "npm install @veilsub/sdk" with copy button

**Quick Start** (< 2 minutes reading):
```
Step 1: Install → npm install @veilsub/sdk
Step 2: Import → import { VeilSubClient } from '@veilsub/sdk'
Step 3: Query → const stats = await client.queryMapping('subscriber_count', creatorHash)
Step 4: Gate → if (stats > 0) { showContent() }
```
Every line is real, runnable code. Not pseudo-code.

**Interactive Playground**: Embedded CodeSandbox with @veilsub/sdk pre-installed. Developer can type code and see results. Pre-loaded with 3 example scripts:
1. Query a creator's subscriber count
2. Build a subscribe transaction
3. Verify an AccessPass

**SDK Reference**: Auto-generated from TypeScript types. Every function: name, parameters (typed), return type, example, description. Searchable.

**Integration Guides** (4 full tutorials):
1. "Add VeilSub paywall to your Next.js app" (20-min read, with code)
2. "Gate Discord channels with VeilSub subscriptions" (15-min read)
3. "Add VeilSub to WordPress" (10-min read, plugin install)
4. "Build a custom verification flow" (25-min read, advanced)

**API Reference**: All REST endpoints documented. Request/response examples. Authentication (API key). Rate limits.

---

## FLOWS THAT DON'T EXIST YET (But Must)

### 1. The /feed Page
Aggregated content from all subscribed creators. This is the most-used feature on Patreon. Without it, subscribers have to visit each creator individually. Build it like an Instagram feed: vertical scroll, creator avatar + name + timestamp + content + interactions.

### 2. Notification Center
Bell icon in header (already exists as NotificationBell). Dropdown showing:
- "New post from [Creator]" (click → post)
- "Subscription expiring in 3 days" (click → /subscriptions)
- "Tip received: 500 ALEO" (click → /dashboard)
- Mark as read, mark all as read
- Notification preferences page

### 3. Settings Page (/settings)
- Profile: name, bio, avatar
- Privacy: default privacy mode (Standard/Maximum)
- Notifications: email preferences, in-app preferences
- Wallet: connected wallet info, balance
- Display: dark/light mode, language, timezone
- Security: active sessions, connected apps

### 4. Subscriber Profile
When a subscriber visits their own profile (not public, only visible to themselves):
- Active subscriptions (count + list)
- Total spent (all time)
- Privacy score: "100% — Your identity has never been exposed"
- Activity: recent verifications, content viewed, tips sent (all local data, never sent to server)

### 5. Search Everything (Cmd+K Enhancement)
The command palette already exists. Expand it:
- Search creators by name
- Search content by title
- Search actions ("subscribe", "verify", "publish")
- Search pages ("governance", "marketplace")
- Recent items: last 5 visited creators, last 5 actions
- Keyboard shortcut hints for every result

### 6. Error Recovery System
Every error in the app should have THREE options:
1. "Try Again" — retry the exact action
2. "Get Help" — link to docs or FAQ for this specific error
3. "Go Back" — navigate to the previous page

No error should be a dead end. No error should show a hash. Every error should explain what happened in human terms and what the user can do about it.

### 7. Offline Mode (PWA)
When the network drops:
- Cached pages still render (service worker)
- Cached content still readable
- Actions queue: if user tries to subscribe while offline, the action queues and executes when connection returns
- Banner: "You're offline. Some features are unavailable."
- Feed shows cached content with "Last updated: 2 minutes ago" timestamp

### 8. Onboarding Tour (First Visit)
First-time visitors see a 5-step tour:
1. Spotlight on "Explore Creators" — "Find creators you want to support"
2. Spotlight on a creator card — "Click to see their content and tiers"
3. Spotlight on Subscribe button — "Subscribe privately — your identity is never stored"
4. Spotlight on header wallet — "Connect any Aleo wallet to get started"
5. Final: "That's it! You're ready to browse."

Each step: skip button, "Next" button, progress dots (1/5, 2/5, ...). Never shows again. Stored in localStorage.

---

## EMOTIONAL DESIGN PRINCIPLES

### 1. Privacy Should Feel Empowering, Not Scary
Current: the app talks about "threats," "attacks," "observers." This makes privacy feel defensive.
Better: "You're in control. You choose what to share. Nobody can take that away." Privacy as superpower, not shield.

### 2. ZK Proofs Should Feel Like Magic, Not Like Waiting
The orb animation for ZK proofs isn't a loading spinner. It's a ceremony. The user is watching their privacy being created in real-time. The animation should feel like: "something powerful is happening" not "this is taking forever."

### 3. Subscriptions Should Feel Like Supporting, Not Paying
Copy throughout the app should frame subscriptions as support: "Support [Creator]" not "Pay [Creator]." "You're supporting" not "You're subscribing to." This emotional framing increases conversion.

### 4. Empty States Should Feel Like Opportunity, Not Failure
"No subscriptions yet" → "Your private creator universe starts here. Find someone worth supporting."
"No content yet" → "Your audience is waiting. Write your first exclusive post."
"No passes found" → "Subscribe to a creator to get your first AccessPass."

### 5. Success Should Feel Celebratory But Brief
0.5 seconds of celebration. Check mark draws itself. Text appears: "Done." Then the next useful thing happens. Never block the user. Never show confetti for more than a second. The best celebration is getting out of the way so the user can enjoy what they just unlocked.

---

## THE 10-SECOND TEST

After all of this work, test with this:

Show the app to a stranger. Start a timer. They get 10 seconds of silent browsing. Then ask:

1. "What does this app do?"
2. "Who is it for?"
3. "Would you use it?"

If they can answer all three correctly in 10 seconds, the UX is working.

If they can't: the homepage isn't clear enough. Go back to the hero animation. Make it simpler. Clearer. More obvious.

The best UX in the world doesn't need explanation. It just works. And the user says: "Oh, I get it."

That's the target. Not 50/50 on a rubric. Not more features. Not more pages. Just: "Oh, I get it."

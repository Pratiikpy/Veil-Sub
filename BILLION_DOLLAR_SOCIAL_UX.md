# VeilSub: The Billion-Dollar Social Media UX Blueprint

> I saw the live app. Here is what is wrong and exactly how to fix every pixel.

---

## WHAT I SAW vs WHAT INSTAGRAM LOOKS LIKE

I opened veil-sub.vercel.app. Here is what hit me in the first 10 seconds:

**Homepage**: 4 seconds of pure black screen before content loads. Then a "BUILT ON ALEO" badge, a headline, a subtitle, a description paragraph, two CTA buttons, a small text note, a trust ticker with developer metrics, and a HeroMockup of a fake creator page. The first real content (featured creators) requires scrolling past ALL of this. That is 2-3 full viewport heights of marketing before I see a single creator.

**Instagram**: You open it. Content fills the screen. Zero marketing. Zero explanation. Zero badges. Just content.

**Explore page**: "ZERO-FOOTPRINT DISCOVERY" badge, "Explore Creators" title in serif italic, subtitle, description, another description line, stats ("4 registered creators, 4 published posts"), "Featured Creators" label, 3 featured cards, category filter chips, a search bar, THEN finally the creator grid. That is SEVEN layers of preamble before the actual creator list.

**Instagram Explore**: Grid of content. Full screen. No title. No subtitle. No badge. No description. Just content from pixel one.

**Creator page**: Name, address hash, bio, "View on Explorer / Copy / Share" links, subscriber count, ALEO earned stats, "Subscription Tiers" header with "2 custom tiers on-chain" badge, 3 tier cards side by side, "Exclusive Content" header with description, locked post with lock icon and "Connect wallet for AccessPass" button.

**Instagram profile**: Photo, name, bio, stats row (posts/followers/following), Follow button, grid of content. That is it. Seven elements total.

The fundamental problem is not design quality. Your glass morphism is good. Your colors are good. Your typography is good. The problem is **information architecture**. You show 20 things where social media shows 5. You explain where social media demonstrates. You market where social media just works.

---

## THE THREE RULES OF BILLION-DOLLAR SOCIAL UX

### Rule 1: Content First, Always

Every screen opens with CONTENT, not marketing. Not badges. Not subtitles. Not descriptions. Content.

- Homepage: feed of posts (if logged in) or featured creators (if not)
- Explore: grid of creators filling the viewport from pixel one
- Creator profile: their posts, immediately visible
- Dashboard: your recent posts and compose box

### Rule 2: Maximum 5 Elements Above the Fold

Instagram profile has: photo, name, bio, stats, Follow button. Five things. Not twelve.

Every VeilSub page currently has 8-15 elements above the fold. Cut each to 5 max.

### Rule 3: Show, Never Explain

Instagram never says "This is a photo sharing app where you can follow creators and like their posts." It just shows photos. You tap. Things happen. You learn by doing.

VeilSub currently explains everything: "Subscribe anonymously. Prove access without revealing your identity. No subscriber addresses written to blockchain mappings. Verification uses zero-knowledge proofs." Kill all of it from user-facing pages. Move it to /docs and /privacy.

---

## PAGE-BY-PAGE TRANSFORMATION

### HOMEPAGE (Logged Out)

**CURRENT (what I saw):**
```
[Header nav]
(4 seconds of black)
BUILT ON ALEO badge
"Subscribe to Creators."
"Your identity stays hidden."
3-line description paragraph
[Start Subscribing] [Explore Zero-Footprint Privacy]
"Browse publicly—connect Shield or Leo Wallet to subscribe privately."
trust ticker: testnet / BSP Zero-Footprint Verify / v27 Deployed
[HeroMockup: fake creator page with tier cards]
```

**BILLION-DOLLAR VERSION:**
```
[Minimal header: VeilSub logo | Explore | Log In]

"Support creators privately."         ← 4 words. Not 10.
[Find Creators]                       ← ONE button. Not two.

[3 featured creator cards filling the width]
[3 more creator cards]
[See all creators →]
```

That is it. Six elements. The entire homepage becomes a creator showcase, not a marketing page. The headline is 4 words. The CTA is 2 words. The rest is CONTENT — real creators that the visitor can click on immediately.

No badge. No subtitle. No description. No trust ticker. No mockup. Those all move to /about or /privacy.

The homepage is not a landing page. It is a portal to content. Instagram's homepage is the feed. Twitter's homepage is the timeline. VeilSub's homepage is the creator showcase.

**HOMEPAGE (Logged In):**

Redirect to /feed. Do not show the marketing page to logged-in users. They already know what VeilSub is.

---

### EXPLORE PAGE

**CURRENT (what I saw):**
```
ZERO-FOOTPRINT DISCOVERY badge
"Explore Creators" (serif italic)
"Subscribe anonymously. Prove access without revealing your identity."
"No subscriber addresses written to blockchain mappings..."
4 registered creators · 4 published posts
Featured Creators label
[3 featured cards]
[All Creators] [Tech] [Art & Design] [DeFi] [Gaming] [Education]
[Search bar]
6 creators · Sort: Featured / Newest
[creator cards in 3-column grid]
```

**BILLION-DOLLAR VERSION:**
```
[Search bar — full width, top of page]      ← First thing. Instagram Explore has search at top.
[Category chips: All | Tech | Art | DeFi | Gaming | Education]

[Creator grid — 3 columns desktop, 2 mobile, 1 small mobile]
   Each card: avatar + name + one-line + price + [Subscribe]
   Nothing else. No address hash. No join date. No "Zero-Knowledge" badge. No "View creator →" link.
   The ENTIRE card is clickable.
```

Zero hero section. Zero badge. Zero title. Zero subtitle. Zero description. Zero stats. The page IS the grid. Search at top. Filters below search. Grid fills everything else.

Each creator card shows exactly 5 things:
1. Avatar (48px, round)
2. Name (bold, 16px)
3. One-line bio (14px, truncated to 1 line, white/60)
4. Starting price ("From $5/mo" — dollar estimate, not "from 3 ALEO")
5. Subscribe button (small, right-aligned, or on hover)

That is it. Not: address hash, join date, subscriber count, "Zero-Knowledge" badge, "View creator" link, category badge. Those are 6 extra elements per card that add noise without aiding the primary decision: "should I click on this creator?"

**Mobile explore:** Single column. Cards become horizontal: avatar on left, name+bio+price on right, full width. Like Twitter's "Who to follow" cards.

---

### CREATOR PROFILE

**CURRENT (what I saw):**
```
prateek 5thj
aleo106ygg...7l69jv
im wht
View on Explorer · Copy · Share
1 subscribers · 0 ALEO earned

Subscription Tiers   [2 custom tiers on-chain]
[Supporter 5 ALEO] [Supporter 5 ALEO] [VIP 7 ALEO]

Exclusive Content
"Content is server-gated—locked posts are never sent..."
[Locked post: "This is the test content" — Supporter tier]
[Lock icon + "Connect wallet for AccessPass →"]
"Gated content is server-protected. Bodies are only delivered..."

Send a Private Tip
...more sections below...
```

**BILLION-DOLLAR VERSION:**
```
┌─────────────────────────────────────────────────────┐
│             COVER GRADIENT (full width)              │
│                                                      │
│  ┌──────┐                                           │
│  │Avatar│  Creator Name              [Subscribe]    │
│  └──────┘  One-line bio                             │
│            12 posts · 47 subscribers · $5/mo        │
├──────────────────────────────────────────────────────┤
│  [ Posts ]    [ Tiers ]    [ About ]                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Creator Name · 2 hours ago                    │   │
│  │ My Creative Process                           │   │
│  │ Here is how I approach every new piece of...  │   │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                               │   │
│  │    Subscribe to continue reading — $5/mo      │   │
│  │              [ Subscribe ]                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Creator Name · Yesterday                      │   │
│  │ Welcome to My Page                            │   │
│  │ I am excited to share my work with you...     │   │
│  │ ❤ Tip  ↗ Share                                │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Changes from current:

1. **Cover gradient** exists in the code but was not visible on the deployed site. Make sure it renders.

2. **Profile header**: Avatar + Name + Bio + Stats row + ONE Subscribe button. Remove: address hash, "View on Explorer", "Copy", "Share" (move to About tab or overflow menu).

3. **Stats row** like Instagram: "12 posts · 47 subscribers · $5/mo" — three numbers, one line.

4. **Tabs**: Posts (default) | Tiers | About. Posts tab shows content FIRST. Not tiers. People come to see content, not pricing.

5. **Post cards look like social media posts**: Avatar + name + timestamp at top. Title bold. Content preview. If locked: first 3 lines visible, then gradient blur, then "Subscribe to continue reading — $5/mo" with button. If unlocked: full content with Tip and Share buttons at bottom.

6. **Subscribe button**: ONE button in the header. Not in each tier card AND the header AND the locked content AND a floating bar. One consistent location. Header on desktop. Sticky bottom bar on mobile.

7. **Tiers tab**: Only shown when user actively clicks "Tiers." Not the default view. Cards show: name, price (dollar estimate), creator-defined perks (not hardcoded "Early access posts, Community chat"). "Most Popular" highlighted.

8. **About tab**: Full bio, creator's other links, on-chain information (expandable), QR code, share link.

**MOBILE CREATOR PROFILE:**
```
┌──────────────────────────┐
│     COVER GRADIENT       │
│  ┌────┐                  │
│  │ AV │ Creator Name     │
│  └────┘ One-line bio     │
│  12 posts · 47 subs      │
│                          │
│ [Posts] [Tiers] [About]  │
├──────────────────────────┤
│                          │
│ Post card 1...           │
│                          │
│ Post card 2...           │
│                          │
│ Post card 3...           │
│                          │
├──────────────────────────┤
│ Creator · $5/mo  [Sub]   │  ← STICKY BOTTOM BAR (always visible)
└──────────────────────────┘
```

The sticky bottom bar is critical on mobile. As the user scrolls through content and decides to subscribe, the button is always within thumb reach. Like Uber's "Request Ride" bar. Like Airbnb's "Reserve" button.

---

### FEED PAGE (NEW — THE MOST IMPORTANT MISSING PAGE)

This page does not exist. It must.

```
┌──────────────────────────────────────────────────────┐
│ [Avatar] What is new                          [Bell] │
├──────────────────────────────────────────────────────┤
│ [All] [@Alice] [@Bob] [@Carol]        ← filter chips│
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────────────────────────────────────────┐    │
│ │ 🟣 Alice · 2 hours ago                       │    │
│ │                                               │    │
│ │ Behind the Scenes of My Latest Album          │    │
│ │                                               │    │
│ │ I wanted to share how the creative process    │    │
│ │ unfolded for this project. It started with... │    │
│ │                                               │    │
│ │ [Read more →]                                 │    │
│ │                                               │    │
│ │ ❤ Tip   ↗ Share                    3 min read │    │
│ └──────────────────────────────────────────────┘    │
│                                                      │
│ ┌──────────────────────────────────────────────┐    │
│ │ 🔵 Bob · 5 hours ago        [Premium]        │    │
│ │                                               │    │
│ │ Q1 Market Analysis                            │    │
│ │                                               │    │
│ │ The first quarter showed unprecedented...     │    │
│ │ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │    │
│ │                                               │    │
│ │ Upgrade to Premium to read — $10/mo           │    │
│ │ [ Upgrade ]                                   │    │
│ └──────────────────────────────────────────────┘    │
│                                                      │
│ ┌──────────────────────────────────────────────┐    │
│ │ 🟢 Carol · Yesterday                         │    │
│ │                                               │    │
│ │ [IMAGE: Full-width photo]                     │    │
│ │                                               │    │
│ │ My studio setup for the new series            │    │
│ │                                               │    │
│ │ ❤ Tip   ↗ Share                    1 min read │    │
│ └──────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Layout: Centered column (max-w-2xl, like Twitter). Full-width on mobile. Creator filter chips at top (horizontal scroll). Posts in reverse chronological order from ALL subscribed creators. Infinite scroll. Pull-to-refresh on mobile.

Each post card: Creator avatar (colored, 36px) + name + time ago. Title (bold). Content preview (3-5 lines or full if short). Media (images full-width, videos with poster). Interaction bar (Tip + Share + reading time). Tier badge if premium content.

Locked content (from higher tier than subscriber has): Show first 3 lines, blur, upgrade CTA.

When feed is empty: "Your feed is empty. Discover creators to follow." with 3 recommended creator cards below.

This page becomes the DEFAULT page for logged-in users. Homepage redirects here.

---

### DASHBOARD (CREATOR VIEW)

**CURRENT**: 4 tabs (Overview, Content, Analytics, Settings). Overview is default with stats and getting-started checklist.

**BILLION-DOLLAR VERSION:**

No tabs. Single scrollable page. Content creation is the primary action.

```
┌──────────────────────────────────────────────────────┐
│ Your Page                                            │
│ $127 this month · 47 subscribers · 12 posts          │
│ [Withdraw $127] [View My Page →]                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────────────────────────────────────────┐    │
│ │ 🟣 What is on your mind?                     │    │  ← Collapsed compose box
│ └──────────────────────────────────────────────┘    │
│                                                      │
│ YOUR POSTS                                           │
│                                                      │
│ ┌──────────────────────────────────────────────┐    │
│ │ Behind the Scenes · 2h ago · Premium · 47👁  │    │
│ │ Preview of the post...              [⋮ Edit] │    │
│ └──────────────────────────────────────────────┘    │
│                                                      │
│ ┌──────────────────────────────────────────────┐    │
│ │ Welcome Post · Yesterday · Free · 123👁      │    │
│ │ Preview of the post...              [⋮ Edit] │    │
│ └──────────────────────────────────────────────┘    │
│                                                      │
│ YOUR TIERS                                           │
│ [Basic $5] [Premium $10 ⭐] [VIP $25] [+ New Tier]  │
│                                                      │
│ RECENT ACTIVITY                                      │
│ 🟢 New subscriber — Tier 2 — 10 min ago             │
│ 💜 Tip received — 500 ALEO — 1 hour ago             │
│ 📝 Post viewed 47 times — today                     │
│                                                      │
│ QUICK STATS                                          │
│ Revenue ▁▂▃▅▇ $127    Subscribers ▁▁▂▃▅ 47          │
│ [View full analytics →]                              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

The compose box is ALWAYS visible at the top. Click it to expand into full Tiptap editor. Like Twitter's tweet box. This is the #1 action a creator takes.

Posts show below with title, time, tier badge, view count, and edit menu.

Tiers as horizontal scroll with + New.

Activity feed showing anonymized real-time events.

Stats as compact sparklines linking to full /analytics.

---

## THE LOCKED CONTENT PATTERN (Most Important Single Change)

**CURRENT**: Lock icon + "Connect wallet for AccessPass" button. Subscriber sees an icon and a technical instruction. They have no idea what content they are missing.

**BILLION-DOLLAR VERSION:**

```
┌──────────────────────────────────────────────────────┐
│ Creator Name · 3 hours ago                           │
│                                                      │
│ The Complete Guide to Privacy-First Design           │
│                                                      │
│ After years of building products that collect user   │
│ data by default, I realized there is a better way.   │
│ The key insight is that most of the data we collect  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                      │
│           Subscribe to continue reading              │
│                From $5 / month                       │
│              [ Subscribe Now ]                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

The first 3 lines of REAL CONTENT are visible. Then a gradient blur (not a hard cut). Then a subscribe CTA.

CSS implementation:
```css
.content-preview {
  position: relative;
  max-height: 120px;
  overflow: hidden;
}
.content-preview::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--bg-surface) 70%,
    var(--bg-surface) 100%
  );
}
```

This single change — showing real content with a blur — is the highest-converting paywall pattern in the subscription industry. Substack, Medium, The Athletic, The Information, and every major subscription publication uses it. The subscriber sees WHAT they are missing and the curiosity drives conversion.

---

## REMOVING EVERY PIECE OF CRYPTO JARGON

Every page I saw has crypto terminology that normal people do not understand. Here is the complete replacement list:

| Current Text (I saw this on the live site) | Replacement |
|---|---|
| "BUILT ON ALEO" badge | Remove entirely from homepage |
| "ZERO-FOOTPRINT DISCOVERY" | Remove entirely |
| "BSP Zero-Footprint Verify" (trust ticker) | Remove or change to "100% Private" |
| "v27 Deployed" (trust ticker) | Remove |
| "Zero-Knowledge" badge on creator cards | Remove from cards. Keep on /privacy page only |
| "2 custom tiers on-chain" badge | Remove. Just show the tiers |
| "Connect wallet for AccessPass" | "Subscribe to read" |
| "Content is server-gated—locked posts are never sent to your browser until your AccessPass is verified" | Remove entirely. Users do not need to know HOW content is gated |
| "Published via veilsub_v27.aleo" on posts | Remove. Users do not care about the program name |
| "Gated content is server-protected. Bodies are only delivered after AccessPass verification—never exposed in network requests" | Remove entirely |
| "aleo106ygg...7l69jv" (address hash) | Hide by default. Show on tap/click or in About tab |
| "from 3 ALEO" (price) | "From $5/month" (with ALEO amount in small text below if needed) |
| "1 subscribers" | "1 subscriber" (fix grammar) AND use "47 subscribers" format like Instagram's "47 followers" |
| "0 ALEO earned" | Hide when zero. Only show earnings when there are some |
| "View on Explorer" link | Move to About tab or three-dot menu |
| "Send a Private Tip" section header | Move to three-dot overflow menu |

After these removals, every user-facing page reads like a normal social media app. The privacy story lives on /privacy and /docs for people who want to understand the technology.

---

## MOBILE-SPECIFIC DESIGN (THE REAL GAP)

I could not test mobile because the browser resize did not trigger responsive layout. But based on the code:

### Mobile Navigation
**Current**: Top header nav with text links + bottom MobileBottomNav.
**Billion-dollar**: Bottom tab bar ONLY. No top nav on mobile. Five icons:

```
┌──────────────────────────────────────┐
│                                      │
│          (page content)              │
│                                      │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  🏠    🔍    ➕    🔔    👤         │
│ Home  Find  Post  Alerts  Me        │
└──────────────────────────────────────┘
```

Home = /feed (or homepage if logged out)
Find = /explore
Post = opens compose sheet (creators only) or disabled for subscribers
Alerts = /notifications
Me = /dashboard (creators) or /subscriptions (subscribers)

The "+" button in the center is Instagram's create button. For creators, it opens a bottom sheet compose flow. For subscribers, it could be "Find creators" or hidden.

### Mobile Creator Profile
```
┌──────────────────────────────────────┐
│ ← Back            [···]             │
├──────────────────────────────────────┤
│        (cover gradient)              │
│  ┌────┐                             │
│  │ AV │ Creator Name                │
│  └────┘ One-line bio                │
│                                      │
│ 12 posts  47 subs  $5/mo            │
│                                      │
│ [Posts]  [Tiers]  [About]           │
├──────────────────────────────────────┤
│                                      │
│ Post 1...                            │
│                                      │
│ Post 2 (locked, blur)...             │
│                                      │
│ Post 3...                            │
│                                      │
├──────────────────────────────────────┤
│ Creator Name · $5/mo    [Subscribe] │  ← STICKY
└──────────────────────────────────────┘
```

Back button top-left. Three-dot menu top-right (Tip, Gift, Share, Report). Stats row compact. Tabs below stats. Content fills the rest. Sticky subscribe bar at bottom.

### Mobile Post Card
```
┌──────────────────────────────────────┐
│ 🟣 Creator · 2h ago      [Premium] │
│                                      │
│ Post Title Here                      │
│                                      │
│ First few lines of content that      │
│ give you a taste of what this        │
│ creator writes about...              │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                      │
│   Subscribe to read — $5/mo          │
│        [ Subscribe ]                 │
│                                      │
├──────────────────────────────────────┤
│ ❤ Tip     ↗ Share        3 min read │
└──────────────────────────────────────┘
```

Full width. No side padding on the card itself (cards are edge-to-edge on mobile like Instagram posts). Content flows naturally. Blur gradient on locked content. Interaction bar at bottom of each post.

### Mobile Feed
```
┌──────────────────────────────────────┐
│ VeilSub                       [🔔]  │
├──────────────────────────────────────┤
│ [All] [Alice] [Bob] [Carol] →       │  ← horizontal scroll chips
├──────────────────────────────────────┤
│                                      │
│ (Post cards, full width,             │
│  edge-to-edge, infinite scroll)      │
│                                      │
├──────────────────────────────────────┤
│  🏠    🔍    ➕    🔔    👤         │
└──────────────────────────────────────┘
```

Pull down to refresh (custom animation: VeilSub logo stretches and bounces back). Infinite scroll. Edge-to-edge cards. No side margins on posts (like Instagram). Filter chips at top.

### Mobile Subscription Flow
```
┌──────────────────────────────────────┐
│                              [ ✕ ]  │
│                                      │
│   Subscribe to Creator Name          │
│                                      │
│   ┌────────┐ ┌────────┐ ┌────────┐ │
│   │ Basic  │ │Premium │ │  VIP   │ │
│   │ $5/mo  │ │$10/mo⭐│ │ $25/mo │ │
│   └────────┘ └────────┘ └────────┘ │
│                                      │
│   Pay with  [ ALEO ▾ ]              │
│                                      │
│   🔒 Maximum privacy                │
│                                      │
│   [ Subscribe — $10/mo ]             │
│                                      │
│   Your identity stays hidden.        │
└──────────────────────────────────────┘
```

Bottom sheet (slides up from bottom, like Apple Pay sheet). Not a centered modal. Swipe down to dismiss. Tier cards horizontal scroll if more than 3. One-tap to select tier. One-tap to subscribe. Two taps total.

---

## ANIMATIONS THAT MAKE IT FEEL ALIVE

### Feed Scroll
- Posts enter viewport with subtle opacity 0 to 1 + translateY 8px to 0 (200ms, ease-out)
- Staggered: each post delays 30ms after the previous
- Scroll is 60fps with no jank (virtualize long lists with react-window if needed)

### Subscribe Success
- Bottom sheet content fades to white (100ms)
- Green checkmark draws itself center-screen (SVG path animation, 400ms)
- "Subscribed" text fades in below (200ms)
- After 1 second: sheet slides down, page scrolls to creator posts, previously locked content blurs dissolve (500ms per post, staggered 100ms)
- The user WATCHES their content unlock. This is the payoff moment.

### Content Unlock (Blur Dissolve)
- When subscriber gains access to a locked post: the gradient blur fades from opacity 1 to 0 over 500ms
- Simultaneously, the hidden content below fades from opacity 0 to 1
- The "Subscribe to read" CTA fades out
- The interaction bar (Tip, Share) fades in where the CTA was
- This should feel like a curtain lifting

### Pull to Refresh
- Pull down 80px to trigger
- Custom indicator: VeilSub "V" logo stretches vertically as you pull
- Release: logo snaps back with spring physics, spins once, then content refreshes
- Not a generic spinner. A branded animation.

### Page Transitions
- Navigate forward (explore to creator): content slides left, new page slides in from right
- Navigate back: content slides right, previous page slides in from left
- Tab switch (Posts/Tiers/About): content crossfades with 150ms duration
- Modal open: backdrop fades 200ms, content slides up from bottom (mobile) or scales from center (desktop)

---

## THE COMPLETE PAGE MAP

After transformation, VeilSub has these user-facing pages:

| Route | Purpose | First Thing Visible |
|---|---|---|
| / (logged out) | Creator showcase | 6 creator cards |
| / (logged in) | Redirects to /feed | - |
| /feed | Aggregated subscriber feed | Post cards from subscribed creators |
| /explore | Creator discovery | Search bar + creator grid |
| /creator/[addr] | Creator profile | Cover + avatar + name + posts |
| /dashboard | Creator studio | Compose box + recent posts |
| /subscriptions | Subscriber management | Active subscription cards |
| /verify | Access verification | Pass selector + verify button |
| /settings | User preferences | Profile, privacy, notifications |

Technical/information pages (NOT in main nav, accessible via footer or deep links):
| /privacy | Privacy deep-dive | For people who want to understand the tech |
| /docs | Developer documentation | SDK reference, transition docs |
| /developers | Integration guides | For developers building on VeilSub |
| /analytics | Platform analytics | For creators wanting detailed stats |
| /explorer | On-chain query tool | For technical users |
| /vision | Roadmap | For investors/partners |
| /governance | DAO voting | When live |
| /marketplace | Creator marketplace | When live |

Main navigation shows: Home, Find, Post, Alerts, Me (mobile) or Home, Explore, Dashboard, Verify (desktop). Technical pages are footer links only.

---

## TIMELINE

| Phase | Duration | What Changes |
|---|---|---|
| 1. Kill the preamble | 2 weeks | Remove all hero sections, badges, descriptions from explore, creator, dashboard. Content first on every page. |
| 2. Build /feed | 2 weeks | Aggregated subscriber feed with post cards, filter chips, infinite scroll, pull-to-refresh. |
| 3. Blur-lock content | 1 week | Replace lock icons with 3-line preview + gradient blur + subscribe CTA on all locked content. |
| 4. Simplify creator profile | 2 weeks | Cover + header + tabs (Posts default) + overflow menu. Sticky mobile subscribe bar. Remove address/explorer/copy from header. |
| 5. Rebuild dashboard | 2 weeks | Remove tabs. Always-visible compose box. Posts list. Horizontal tier scroll. Activity feed. Compact stats. |
| 6. Remove all jargon | 1 week | Complete sweep: every string, every badge, every tooltip. Zero crypto terms in user-facing UI. |
| 7. Mobile bottom tab bar | 1 week | Replace top nav on mobile. 5 icons: Home, Find, Post, Alerts, Me. |
| 8. Post card redesign | 2 weeks | Avatar + name + time + title + content + media + interactions. Social media format. |
| 9. Subscribe bottom sheet | 1 week | Mobile: slide-up sheet. Tier cards + pay selector + one button. 2 taps total. |
| 10. Content unlock animation | 1 week | Blur dissolve when subscriber gains access. Curtain-lifting effect. |
| 11. Spring physics | 2 weeks | Replace all duration-based animations with spring physics across entire app. |
| 12. Edge-to-edge mobile | 2 weeks | Posts go full width on mobile. No side padding on cards. Like Instagram. |
| 13. Custom pull-to-refresh | 1 week | Branded "V" logo animation on pull. |
| 14. Page transitions | 1 week | Slide left/right for forward/back. Crossfade for tabs. Bottom sheet for modals. |
| 15. Performance | 2 weeks | Virtualized lists. Image optimization. Under 300KB initial bundle. 60fps scroll. |
| 16. Sound + haptics | 2 weeks | Optional UI sounds. Mobile haptic feedback on key actions. |
| 17. Dark + light mode | 3 weeks | Complete light theme. Animated toggle. System preference. |
| 18. Creator themes | 2 weeks | Creators pick accent color. Their profile uses it. |
| 19. Onboarding tour | 1 week | 5-step spotlight for first-time users. |
| 20. Command palette | 1 week | Cmd+K search everything. Already partially built — polish and extend. |

**Total: ~30 weeks (7 months) for the core transformation.**

After that: continuous refinement of every animation, every transition, every edge case, every breakpoint, every micro-interaction for however many years you want. That is what makes the difference between "good social app" and "billion-dollar social app" — years of compounding tiny improvements.

---

## THE TEST

After implementation, do this:

1. Hand your phone to someone who uses Instagram daily.
2. Open VeilSub.
3. Do not explain anything.
4. Watch what they do for 60 seconds.

If they naturally browse, find a creator, and tap Subscribe without asking any questions — you built a social media app.

If they say "what do I do?" or "what is this?" — the UX still has work to do.

That is the bar. Not a score rubric. Not a feature list. Can a normal person use this without explanation?

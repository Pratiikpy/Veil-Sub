# VeilSub: Creator Profile & Dashboard Redesign

> The two most important pages in the app. 5 years to make them perfect.

---

## THE PROBLEM

**Creator Profile (/creator/[address])** — Currently a data sheet with 8 action buttons visible at once. Subscribers see: avatar, name, address, bio, then Subscribe, Tip, Gift, Renew, Transfer, Dispute, Audit Token, Redeem Gift buttons all in a row. Below that: hardcoded tier cards. Below that: content feed. This is not how any successful creator platform works. Instagram shows Follow + Message. Patreon shows Join. Nobody shows 8 buttons.

**Creator Dashboard (/dashboard)** — Currently an admin panel with 4 tabs (Overview, Content, Analytics, Settings). Overview shows stats and a "getting started" checklist. This is not how YouTube Studio, Instagram Creator Studio, or Twitter Creator Dashboard works. They put CONTENT FIRST. "Create" is the primary action. Stats are glanceable, not the main view.

**The tier system** — Tier features are hardcoded in TIERS config (Supporter/Premium/VIP with generic descriptions). Creators can set price but can't define what subscribers actually GET. A musician can't say "exclusive demos." A writer can't say "first drafts." All tiers look the same across all creators. This makes VeilSub feel like a template, not a platform.

---

## CREATOR PROFILE — THE INSTAGRAM/PATREON HYBRID

### The Layout (Top to Bottom)

**1. Cover Banner (NEW)**
Full-width, 280px height. Three options:
- Creator uploads a custom banner image (stored in Supabase Storage)
- Auto-generated gradient from creator's Aleo address hash (deterministic, unique per creator)
- Default: subtle dark gradient with noise texture

Implementation: `<CoverBanner address={address} customUrl={profile?.banner_url} />`
Responsive: 280px desktop, 200px tablet, 160px mobile. Edge-to-edge, no padding.

**2. Profile Header (Overlapping Banner by 40px)**

Left side: Large avatar (80px, overlapping the banner bottom edge). Creator name (h1, 28px, serif italic). One-line bio (16px, white/70). Category badge (small, colored dot + text).

Right side: Subscriber count ("1.2K subscribers" — human number, not raw). Starting price ("From $5/month" — with dollar estimate, not just ALEO). ONE primary button: "Subscribe" (accent color, prominent). A "..." overflow menu containing: Tip, Gift, Share, Report.

No address shown by default. Tap/click the name → shows address with copy button. Most subscribers don't care about the address.

```
┌──────────────────────────────────────────────────┐
│                  COVER BANNER                     │
│                                                   │
│  ┌────┐                                          │
│  │ AV │  Creator Name          [Subscribe]  ···  │
│  └────┘  One-line bio          From $5/mo        │
│          🎨 Artist · 1.2K subscribers             │
└──────────────────────────────────────────────────┘
```

**3. Tab Navigation**

Three tabs. Not four. Not five. Three.

```
[ Posts ]  [ Tiers ]  [ About ]
```

Active tab has violet underline that slides with spring animation between tabs. Content below changes with crossfade (not instant swap).

**4. Posts Tab (Default View)**

This is what subscribers see first. Not tiers. Not stats. CONTENT.

Each post card:
- Creator avatar (small, 32px) + name + time ago ("2 hours ago")
- Post title (bold, 18px)
- Content preview:
  - If subscriber has access: full content (or first 500 chars with "Read more")
  - If subscriber does NOT have access: first 2-3 lines clearly visible, then content fades into a gradient blur over 100px. Below the blur: "Subscribe to continue reading — from $5/month" with a Subscribe button.
- Media: images display inline, videos show poster with play button
- Interaction bar: ❤️ tip button + 💬 comment count (future) + ↗️ share

The blur-to-CTA pattern is THE most effective subscription conversion mechanism. Substack, Medium, and The Athletic all use it. VeilSub should too.

Content loads with skeleton → crossfade. Infinite scroll for creators with many posts. "No posts yet — check back soon" empty state with illustration for new creators.

**5. Tiers Tab**

Cards displayed horizontally (3 max visible, scroll for more on mobile).

Each tier card:
```
┌─────────────────────────┐
│  ⭐ Premium              │ ← Tier name (creator-defined)
│                          │
│  $10 / month             │ ← Price (USD estimate + ALEO amount small below)
│                          │
│  What you get:           │
│  ✓ Access to all posts   │ ← Features (creator-defined, not hardcoded)
│  ✓ Monthly video call    │
│  ✓ Discord access        │
│  ✓ Early access to demos │
│                          │
│  [ Subscribe ]           │ ← One CTA per card
│                          │
│  47 subscribers          │ ← Social proof (from commitment threshold, not raw count)
└─────────────────────────┘
```

The "Most Popular" tier gets a highlighted border (violet glow) and a "Most Popular" badge. This is determined by which tier has the most subscribers (from on-chain subscription_by_tier mapping).

**Critical change: Tier features are creator-defined.** When a creator creates a tier on the dashboard, they write their own feature list. Stored in Supabase alongside the on-chain tier data. Each creator's tiers are unique:
- A musician: "Exclusive demos, behind-the-scenes, early access"
- A writer: "First drafts, writing process notes, monthly Q&A"
- A developer: "Code reviews, private repos, office hours"
- A political commentator: "Unfiltered analysis, source documents, subscriber-only discussions"

No more generic "Supporter features" / "Premium features" / "VIP features."

**6. About Tab**

- Full bio (multi-paragraph, rich text)
- Creator stats: total posts, total subscribers, member since (human date)
- Links: creator's other social profiles (if they choose to add — stored in Supabase)
- QR code for sharing (existing component)
- "Share this creator" button with link copy
- On-chain info (expandable): program address, AleoScan link, total on-chain transactions

---

## SUBSCRIPTION FLOW — THE 30-SECOND EXPERIENCE

### Current: 6+ clicks, confusing privacy mode selection, technical jargon

### Perfect: 3 clicks, zero jargon

**Click 1: "Subscribe" button on creator profile**

Modal opens. NOT a multi-step wizard. A single clean screen:

```
┌────────────────────────────────────────┐
│                                    ✕   │
│  Subscribe to @CreatorName             │
│                                        │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Basic    │ │ Premium  │ │  VIP   │ │
│  │ $5/mo   │ │ $10/mo ⭐│ │ $25/mo │ │
│  │          │ │ (popular)│ │        │ │
│  └──────────┘ └──────────┘ └────────┘ │
│                                        │
│  Pay with: [ALEO ▾]                   │
│                                        │
│  🔒 Maximum privacy (recommended)     │
│     Each renewal uses a new identity   │
│                                        │
│  [ Subscribe — $10.00 ]               │
│                                        │
│  Your identity never appears on-chain. │
└────────────────────────────────────────┘
```

Tier cards are clickable. Premium pre-selected (most popular). Pay token has dropdown (ALEO / USDCx / USAD) with balance shown. Privacy toggle is a single checkbox, defaulting to Maximum (Blind mode), with a one-sentence explanation. No "Standard vs Blind vs Trial" confusion.

Trial is NOT in this modal. Trial is a separate small link on the creator profile: "Try free for 12 hours" — opens a simpler modal.

**Click 2: "Subscribe" button in modal**

Wallet asks for signature. While ZK proof generates:

The modal content fades. The glowing orb appears, centered. Violet, pulsing, with soft particle effects. Below: "Creating your private access..." (not "Generating ZK proof").

Progress messages update every 10 seconds:
- 0-10s: "Creating your private access..."
- 10-20s: "Securing your identity on Aleo..."
- 20-30s: "Almost there — privacy takes a moment..."
- 30s+: "Still working. Zero-knowledge proofs are worth the wait."

**Click 3: NONE — auto-redirect**

On success: orb expands, turns green, dissolves. The modal content changes to:

```
┌────────────────────────────────────────┐
│              ✓ Subscribed!             │
│                                        │
│  You now have Premium access to        │
│  @CreatorName                          │
│                                        │
│  Your identity is protected.           │
│  The creator knows someone subscribed  │
│  but not who.                          │
│                                        │
│  [ Read Exclusive Content → ]          │
│                                        │
│  Manage in /subscriptions              │
└────────────────────────────────────────┘
```

"Read Exclusive Content" closes the modal and scrolls the page to the Posts tab, where previously blur-locked content now animates to visible (blur dissolves over 0.5s, content fades in).

The subscriber sees their content unlock in real-time. This is the PAYOFF moment. The reason they subscribed.

---

## CREATOR DASHBOARD — THE YOUTUBE STUDIO

### The Layout

**No tabs.** The dashboard is a single scrollable page with sections, not a tab-based admin panel. Tabs hide information. Sections show everything at a glance.

**Section 1: Top Bar (Sticky on Desktop)**
```
┌──────────────────────────────────────────────────┐
│  🟢 Your Page is Live                            │
│  veil-sub.vercel.app/creator/aleo1...  [Copy] [↗]│
│                                                   │
│  💰 $1,247       👥 89 subscribers    📝 12 posts │
│  this month      +7 this week        3 this month │
└──────────────────────────────────────────────────┘
```

Three key numbers. Always visible. Revenue shows dollar estimate (not ALEO microcredits). Subscribers shows count + weekly delta. Posts shows total + monthly count.

"Withdraw" button appears when revenue > 0. Clicking opens a small inline panel (not a modal) showing available balance and a "Withdraw to wallet" button.

**Section 2: Create (The Primary Action)**
```
┌──────────────────────────────────────────────────┐
│  What's on your mind?                             │
│  ┌───────────────────────────────────────────┐   │
│  │ Start writing...                          │   │
│  │                                           │   │
│  │                                           │   │
│  └───────────────────────────────────────────┘   │
│  [📷 Image] [🎬 Video] [Tier: Premium ▾] [Publish]│
└──────────────────────────────────────────────────┘
```

The text area is ALWAYS visible. Not behind a "Create Post" button. Like Twitter's compose box. Click into it → it expands into the full Tiptap editor with toolbar. Click outside (without content) → it collapses back.

This is the #1 action a creator takes every day. It should be the first thing they see and the easiest thing to do.

Tier gating: dropdown showing the creator's custom tiers. Default to "Free" (visible to everyone). Select a tier → content is gated to that tier's subscribers.

Scheduling: hidden by default. Small "Schedule" link below the editor. Click → date/time picker appears.

**Section 3: Recent Posts**

Reverse chronological list. Each post:
- Title + tier badge + time ago
- View count + engagement (if available)
- Three-dot menu: Edit, Delete, Change tier

"View all posts" link at bottom → expands or navigates to full post management.

**Section 4: Your Tiers**

Horizontal scroll of tier cards. Each shows: name, price, subscriber count. "Edit" button on hover. "+ Create New Tier" card at the end.

**Creating a tier:**
Clicking "Create New Tier" or "Edit" opens an inline form (not a modal):

```
┌──────────────────────────────────────────────────┐
│  Tier Name: [Premium Access          ]            │
│  Price:     [$10    ] /month                      │
│                                                   │
│  What subscribers get:                            │
│  [✎ Access to all exclusive posts               ]│
│  [✎ Monthly video call                          ]│
│  [✎ Discord community access                    ]│
│  [+ Add another perk]                             │
│                                                   │
│  [Create Tier]  [Cancel]                          │
└──────────────────────────────────────────────────┘
```

Each perk is a text input. Creator types whatever they want. No predefined options. No checkboxes for "Video Call" — if a creator doesn't do video calls, they don't add it. If they do pottery livestreams, they type "Weekly pottery livestream."

Perks stored in Supabase: `tier_perks` table with `creator_address`, `tier_id`, `perks: string[]`.

**Section 5: Analytics (Compact)**

NOT a full analytics dashboard. A compact summary:
- Revenue sparkline (30 days, inline)
- Subscriber growth sparkline (30 days, inline)
- Top performing post (most views this month)
- Churn alert: "3 subscribers expired this week" (if applicable)

"View detailed analytics" link → navigates to /analytics.

**Section 6: Settings (Compact)**

Profile edit form (name, bio, category, avatar, banner). All inline, not in a separate tab. "Save" button at bottom.

---

## THE FEED PAGE — THE MISSING CENTER

### Why This Doesn't Exist and Why It Must

A subscriber on Patreon opens the app. They see: a feed of ALL content from ALL creators they support, sorted by newest. They scroll. They read. They tip. They discover new posts.

A subscriber on VeilSub opens the app. They see: a landing page about zero-address finalize. To read content, they must: navigate to /explore → find a specific creator → click into their page → scroll to content feed. For each creator. Individually.

This is like Instagram without the feed. Nobody would use it.

### The /feed Page

**URL**: /feed (new route, added to main navigation)

**When wallet not connected**: "Connect your wallet to see your personal feed" + "Browse creators" CTA.

**When wallet connected but no subscriptions**: "Your feed is empty. Find creators to support." + Featured creators grid (3 cards) + "Explore all creators" link.

**When wallet connected with subscriptions**:

```
┌─────────┬────────────────────────────┬──────────┐
│ SIDEBAR │         FEED               │ DISCOVER │
│         │                            │          │
│ All     │ ┌────────────────────────┐ │ You might│
│ @Alice  │ │ @Alice · 2 hours ago   │ │ like:    │
│ @Bob    │ │ Behind the Scenes      │ │          │
│ @Carol  │ │ Here's how I created   │ │ @Dave    │
│         │ │ the album art for...   │ │ @Eve     │
│ 3 active│ │ [Read more]            │ │ @Frank   │
│         │ │ ❤️ Tip  ↗️ Share       │ │          │
│         │ └────────────────────────┘ │          │
│         │                            │          │
│         │ ┌────────────────────────┐ │          │
│         │ │ @Bob · 5 hours ago     │ │          │
│         │ │ Market Analysis Q1     │ │          │
│         │ │ The first quarter...   │ │          │
│         │ │ ▓▓▓▓▓▓▓░░░░░░░░░░░░░ │ │          │
│         │ │ [Upgrade to Premium    │ │          │
│         │ │  to continue reading]  │ │          │
│         │ └────────────────────────┘ │          │
│         │                            │          │
└─────────┴────────────────────────────┴──────────┘
```

**Left sidebar** (desktop only, hidden on mobile): List of subscribed creators. Click one → filter feed to only that creator. "All" shows everything. Unread count badges on creators with new posts.

**Center feed**: Cards from all subscribed creators, reverse chronological. Content the subscriber has access to shows fully. Content from a higher tier shows blur-locked with upgrade CTA. Content from unsubscribed creators NEVER appears (this is a private feed, not a discovery page).

**Right sidebar** (desktop only): "Discover more" with 3 recommended creators. Based on: same category as current subscriptions, high subscriber count, recently active. Recommendations are LOCAL (computed in browser from explore page data, not server-side tracking).

**Mobile**: Full-width feed. No sidebars. Creator filter via horizontal scroll chips at top. "Discover" accessible via footer nav.

---

## CUSTOMIZABLE TIER FEATURES — THE IMPLEMENTATION

### Database Schema (Supabase)

```sql
-- New table for custom tier perks
create table tier_perks (
  id uuid primary key default gen_random_uuid(),
  creator_address text not null,
  tier_id integer not null,
  perks text[] not null default '{}',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(creator_address, tier_id)
);

-- Enable RLS
alter table tier_perks enable row level security;

-- Creators can manage their own perks
create policy "creators_manage_own_perks" on tier_perks
  for all using (auth.uid()::text = creator_address);

-- Anyone can read perks (needed for subscriber-facing tier cards)
create policy "anyone_can_read_perks" on tier_perks
  for select using (true);
```

### API Route

```typescript
// /api/tiers/perks/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const creator = searchParams.get('creator')
  const { data } = await supabase
    .from('tier_perks')
    .select('tier_id, perks, description')
    .eq('creator_address', creator)
  return Response.json({ tiers: data })
}

export async function POST(req: Request) {
  const { creator_address, tier_id, perks, description } = await req.json()
  const { data, error } = await supabase
    .from('tier_perks')
    .upsert({ creator_address, tier_id, perks, description })
  return Response.json({ success: !error })
}
```

### Frontend Hook

```typescript
// useCreatorPerks.ts
export function useCreatorPerks(creatorAddress: string) {
  const [perks, setPerks] = useState<Record<number, string[]>>({})

  useEffect(() => {
    fetch(`/api/tiers/perks?creator=${creatorAddress}`)
      .then(r => r.json())
      .then(data => {
        const map: Record<number, string[]> = {}
        data.tiers?.forEach((t: any) => { map[t.tier_id] = t.perks })
        setPerks(map)
      })
  }, [creatorAddress])

  return perks
}
```

### On the Creator Profile (Subscriber View)

```tsx
// In Tiers tab
{displayTiers.map(tier => (
  <TierCard
    name={tier.name}
    price={tier.price}
    perks={creatorPerks[tier.id] || ['Access to exclusive content']}
    subscriberCount={tierSubscribers[tier.id]}
    isPopular={tier.id === mostPopularTierId}
    onSubscribe={() => openSubscribeModal(tier)}
  />
))}
```

If creator hasn't set custom perks, show default: "Access to exclusive content." One line, not a fake feature list.

### On the Dashboard (Creator Editing)

```tsx
// Inline perk editor
function PerkEditor({ tierId, initialPerks, onSave }) {
  const [perks, setPerks] = useState(initialPerks)

  const addPerk = () => setPerks([...perks, ''])
  const updatePerk = (i, value) => {
    const updated = [...perks]
    updated[i] = value
    setPerks(updated)
  }
  const removePerk = (i) => setPerks(perks.filter((_, idx) => idx !== i))

  return (
    <div>
      <label>What subscribers get:</label>
      {perks.map((perk, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={perk}
            onChange={e => updatePerk(i, e.target.value)}
            placeholder="e.g., Monthly video call, exclusive demos..."
          />
          <button onClick={() => removePerk(i)}>✕</button>
        </div>
      ))}
      <button onClick={addPerk}>+ Add another perk</button>
      <button onClick={() => onSave(perks)}>Save</button>
    </div>
  )
}
```

---

## THE SOCIAL MEDIA FEEL

### What Makes Instagram/Twitter/Patreon Feel "Social"

1. **Activity is visible**: You see new posts, new followers, new interactions. The app feels alive.
2. **Actions have immediate feedback**: Like → heart fills. Comment → appears instantly. Follow → count increments.
3. **Content is the center**: Not settings, not stats, not documentation. CONTENT.
4. **Identity is personal**: Custom profiles, custom themes, personal feeds.
5. **Time is present**: "2 hours ago", "yesterday", "last week" — not block numbers.

### How VeilSub Gets There

**The homepage becomes a portal, not a brochure**: If logged in, homepage redirects to /feed. If not logged in, shows the marketing page. This is what Twitter, Instagram, and Patreon all do.

**Timestamps everywhere**: Replace block numbers with human dates. "2 hours ago" not "block #1234567." "Expires March 25" not "expires at block 1200000." Use the existing `blocksToTime` utility but surface human dates in the UI.

**Real-time updates**: Supabase Realtime (already integrated) powers:
- New post notification badge in the feed
- Subscriber count incrementing live on the dashboard (without refresh)
- "New content available" toast in the feed when a subscribed creator publishes

**Profile customization** (future):
- Creators choose accent color → their profile page uses that color instead of violet
- Creators upload banner image → displayed on profile
- Creators add social links → displayed in About tab

**Activity feed on dashboard**:
Instead of a static stats panel, a scrolling activity feed:
```
• New subscriber — Tier 2 — 10 min ago
• Tip received — 500 ALEO — 1 hour ago
• Post viewed 47 times — "My Creative Process" — today
• Subscriber expired — 3 days ago
```

All anonymized (no addresses). But the feed shows the creator their platform is alive.

---

## EVERY EDGE CASE

### When creator has zero posts
Profile Posts tab: illustration + "No posts yet. Check back soon!" Tiers tab still shows pricing. About tab shows bio.

### When creator has zero subscribers
Profile: "0 subscribers" shown honestly (not hidden). But the tier card shows "Be the first subscriber" instead of "0 subscribers."

### When subscriber's pass expires while reading
Content blur-locks in real-time (if checking expiry client-side). Gentle transition: content fades to blur over 2 seconds. Banner appears: "Your subscription has expired. Renew to keep reading."

### When creator deprecates a tier that subscriber is on
Subscriber's existing access remains until expiry. On renewal: "This tier is no longer available. Choose a different tier." Shows active tiers.

### When network drops during subscription
Transaction status: "Connection lost. Your transaction may still be processing." Check button: "Check transaction status" (polls AleoScan). If confirmed: show success. If not found: "Transaction not found. Please try again."

### When subscriber visits a creator page for someone who never registered
Error page: "This address isn't registered as a VeilSub creator." CTA: "Explore creators" link to /explore.

### When subscriber has multiple passes to same creator (upgraded tier)
Show highest-tier pass only. Lower tiers auto-hidden. "You have Premium access" — no mention of old Basic pass.

### When creator tries to withdraw more than available balance
"Insufficient balance. Available: 500 ALEO. You requested: 1000 ALEO." Pre-fill withdraw amount with available balance.

---

## THE QUALITY BAR

After implementing all of this, test with this scenario:

**The 60-second test**: A person who has never seen VeilSub visits a creator's profile page. In 60 seconds, can they:
1. Understand what the creator offers? (Posts tab with content)
2. Understand the pricing? (Tiers tab with custom perks)
3. Subscribe? (One button, 3 clicks total)
4. See their content unlock? (Blur dissolves after subscription)

If yes at all 4: the creator profile is working.

**The creator test**: A creator registers and sets up their page. In 5 minutes, can they:
1. Register and see their dashboard? (Onboarding wizard)
2. Create their first tier with custom perks? (Inline form)
3. Publish their first post? (Always-visible compose box)
4. See who subscribed? (Activity feed, anonymized)

If yes at all 4: the dashboard is working.

Everything in this document serves those two tests.

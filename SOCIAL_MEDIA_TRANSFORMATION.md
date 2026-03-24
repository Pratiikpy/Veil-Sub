# Making VeilSub Feel Like Social Media — Specific Changes

> I've read the actual code. Here's exactly what needs to change, file by file.

---

## What Already Exists (Credit to Claude Code CLI)

The creator page ALREADY has:
- Cover banner with auto-generated gradient from address ✓
- Avatar overlapping the banner ✓
- Tabs: Posts / Tiers / About ✓
- TierCard with pricing and USD estimate ✓
- AboutTab with stats, share, QR code, on-chain info ✓
- Breadcrumb navigation ✓
- Primary button logic (Subscribe/Renew/Subscribed states) ✓

This is already 70% of the way there. The remaining 30% is what makes it feel like a DATA PAGE vs a SOCIAL PROFILE.

---

## CHANGE 1: Simplify the Header Actions

**File:** `frontend/src/app/creator/[address]/page.tsx`

**Current (around line 850-900):** The header renders Subscribe button + Tip button + Gift dropdown + more action buttons all visible.

**Change to:** ONE primary button (Subscribe/Renew/Subscribed) + ONE overflow menu icon ("...") containing everything else.

```tsx
// Header actions section should be:
<div className="flex items-center gap-3">
  {renderPrimaryButton()}  {/* Already exists — Subscribe/Renew/Subscribed */}

  {connected && (
    <OverflowMenu>
      <MenuItem icon={Heart} label="Tip" onClick={() => setShowTip(true)} />
      <MenuItem icon={Gift} label="Gift Subscription" onClick={() => setShowGift(true)} />
      <MenuItem icon={Share2} label="Share" onClick={handleShare} />
      {isSubscribed && (
        <>
          <Divider />
          <MenuItem icon={ArrowLeftRight} label="Transfer Pass" onClick={() => setTransferPass(userPasses[0])} />
          <MenuItem icon={FileKey} label="Create Audit Token" onClick={() => setAuditTokenPass(userPasses[0])} />
          <MenuItem icon={Flag} label="Report Content" onClick={() => setDisputeContentId('latest')} />
        </>
      )}
    </OverflowMenu>
  )}
</div>
```

Build an `OverflowMenu` component: three-dot button that opens a dropdown with grouped items. Instagram's "..." menu. Same pattern. Framer AnimatePresence for open/close.

This change removes 5-6 visible buttons and replaces them with 1 button + 1 menu.

---

## CHANGE 2: Add Stats Row (Instagram Style)

**File:** `frontend/src/app/creator/[address]/page.tsx`

**Current:** Stats are only in the About tab.

**Change:** Add a compact stats row BELOW the name, ABOVE the tabs. Like Instagram's "47 posts · 1.2K followers · 89 following" row.

```tsx
// Between bio and tabs:
<div className="flex items-center gap-6 mt-4 text-sm">
  <div>
    <span className="font-semibold text-white">{stats?.contentCount ?? 0}</span>
    <span className="text-white/50 ml-1">posts</span>
  </div>
  <div>
    <span className="font-semibold text-white">{formatSubscriberCount(stats?.subscriberCount ?? 0)}</span>
    <span className="text-white/50 ml-1">subscribers</span>
  </div>
  <div>
    <span className="font-semibold text-white">{formatCredits(basePrice)}</span>
    <span className="text-white/50 ml-1">ALEO/mo</span>
  </div>
</div>
```

Where `formatSubscriberCount` formats: 0 → "0", 999 → "999", 1000 → "1K", 1500 → "1.5K", 10000 → "10K".

This makes the profile scannable in 2 seconds: name, stats, subscribe button. Just like Instagram.

---

## CHANGE 3: Content Preview with Blur Lock

**File:** `frontend/src/components/ContentFeed.tsx`

**Current:** Locked posts show a lock icon and "This content is for [Tier] subscribers."

**Change:** Show the FIRST 3 LINES of content clearly, then fade into a gradient blur. Below the blur: "Subscribe to continue reading — from $X/month" with a Subscribe button.

```tsx
// For locked posts:
<div className="relative">
  {/* Show first 3 lines */}
  <div className="text-sm text-white/80 leading-relaxed line-clamp-3">
    {post.body}
  </div>

  {/* Gradient blur overlay */}
  <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[var(--bg-surface)] via-[var(--bg-surface)]/80 to-transparent" />

  {/* Subscribe CTA overlaid on blur */}
  <div className="relative -mt-4 pt-8 text-center">
    <p className="text-sm text-white/60 mb-3">
      Subscribe to continue reading
    </p>
    <button
      onClick={onSubscribe}
      className="px-6 py-2.5 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 transition-all active:scale-[0.98]"
    >
      Subscribe — from {formatCredits(tierPrice)} ALEO
    </button>
  </div>
</div>
```

This is the Substack/Medium pattern. Showing 3 lines of real content is 10x more effective at converting than showing a lock icon. The subscriber sees WHAT they're missing and wants to read more.

---

## CHANGE 4: Content Cards Feel Like Posts (Not Data Rows)

**File:** `frontend/src/components/ContentFeed.tsx`

**Current:** Content cards probably show title + body + tier badge.

**Make each card look like a social media post:**

```tsx
<article className="p-6 rounded-xl bg-surface-1 border border-border">
  {/* Post header — like a tweet header */}
  <div className="flex items-center gap-3 mb-4">
    <AddressAvatar address={creatorAddress} size={40} />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-white">{creatorName}</p>
      <p className="text-xs text-white/50">{timeAgo(post.createdAt)}</p>
    </div>
    {post.tier > 1 && (
      <span className="px-2.5 py-1 rounded-full text-xs bg-violet-500/10 border border-violet-500/20 text-violet-300">
        {tierName}
      </span>
    )}
  </div>

  {/* Post title */}
  <h3 className="text-lg font-semibold text-white mb-2">{post.title}</h3>

  {/* Post content (or blur-locked preview) */}
  {hasAccess ? (
    <div className="prose-content text-sm text-white/80 leading-relaxed">
      <RichContentRenderer content={post.body} />
    </div>
  ) : (
    <LockedContentPreview body={post.body} tierPrice={tierPrice} onSubscribe={onSubscribe} />
  )}

  {/* Post media */}
  {post.imageUrl && hasAccess && (
    <div className="mt-4 rounded-xl overflow-hidden">
      <img src={post.imageUrl} alt={post.title} className="w-full" />
    </div>
  )}

  {/* Interaction bar — like Twitter's like/retweet/share bar */}
  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
    <button className="flex items-center gap-2 text-xs text-white/50 hover:text-violet-400 transition-colors">
      <Heart className="w-4 h-4" />
      Tip
    </button>
    <button className="flex items-center gap-2 text-xs text-white/50 hover:text-white/70 transition-colors">
      <Share2 className="w-4 h-4" />
      Share
    </button>
    {hasAccess && (
      <span className="text-xs text-white/30 ml-auto">
        {estimateReadingTime(post.body)} min read
      </span>
    )}
  </div>
</article>
```

This looks like a tweet or an Instagram post. Avatar + name + time → content → media → interactions. People recognize this pattern instantly.

---

## CHANGE 5: Creator-Defined Tier Perks

**Files:** Multiple

**Current (line 404):** `tier.features?.length ? tier.features : ['Access to exclusive content']`

Features come from hardcoded TIERS array. Every creator shows the same generic list.

**Changes needed:**

**5a. Supabase table:**
```sql
create table tier_perks (
  id uuid primary key default gen_random_uuid(),
  creator_address text not null,
  tier_id integer not null,
  perks text[] not null default '{}',
  unique(creator_address, tier_id)
);
```

**5b. API route** (`/api/tiers/perks/route.ts`):
```typescript
// GET: fetch perks for a creator
// POST: creator saves their perks
```

**5c. Hook** (`useCreatorPerks.ts`):
```typescript
export function useCreatorPerks(address: string) {
  const [perks, setPerks] = useState<Record<number, string[]>>({})
  // fetch from API on mount
  return perks
}
```

**5d. Creator profile (subscriber view):** Replace hardcoded features with creator-defined perks:
```tsx
// In TierCard:
const customPerks = creatorPerks[tier.id]
const features = customPerks?.length ? customPerks : ['Access to exclusive content']
```

**5e. Dashboard (creator editing):** Inline perk editor in tier management:
```tsx
// Each tier shows editable perk list:
// [✎ Access to all exclusive posts    ]
// [✎ Monthly video call               ]
// [+ Add another perk]
// [Save]
```

---

## CHANGE 6: Dashboard — Content First, Not Stats First

**File:** `frontend/src/components/dashboard/RegisteredDashboard.tsx`

**Current:** 4 tabs (Overview, Content, Analytics, Settings). Overview is default. Shows stats checklist.

**Change:** Remove tabs. Single scrollable page. Content creation at the TOP.

```
┌──────────────────────────────────────────────────┐
│ STICKY TOP BAR                                    │
│ 💰 $1,247 this month   👥 89 subscribers   📝 12 │
│ [Withdraw]           [View My Page]               │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ CREATE POST (always visible, like Twitter compose)│
│ ┌────────────────────────────────────────────┐   │
│ │ What's on your mind?                       │   │
│ │                                            │   │
│ └────────────────────────────────────────────┘   │
│ [📷] [🎬] [Tier: Free ▾]            [Publish]   │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ YOUR POSTS (reverse chronological)               │
│                                                   │
│ ┌─ Latest Post ────────────────────────────────┐ │
│ │ Title · 2 hours ago · Premium · 47 views     │ │
│ │ Preview text...                    [⋮] Edit  │ │
│ └──────────────────────────────────────────────┘ │
│                                                   │
│ ┌─ Previous Post ──────────────────────────────┐ │
│ │ Title · Yesterday · Free · 123 views         │ │
│ │ Preview text...                    [⋮] Edit  │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ YOUR TIERS (horizontal scroll)                   │
│ [Basic $5] [Premium $10 ⭐] [VIP $25] [+ New]   │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ ANALYTICS (compact sparklines)                   │
│ Revenue ▁▂▃▅▇ $1,247    Subscribers ▁▁▂▃▅ 89    │
│ [View detailed analytics →]                      │
└──────────────────────────────────────────────────┘
```

The compose box is always visible at the top. Click into it → expands into full Tiptap editor with toolbar. Click outside (empty) → collapses back. Like Twitter's tweet box.

Posts show below the compose area. Recent posts with title, time, tier badge, view count, and edit menu.

Tiers show as horizontal scroll cards. Click "+" to create new. Click existing to edit.

Analytics shows as compact sparklines with a "View detailed" link to /analytics.

Settings moved to a gear icon in the header or a /dashboard/settings subroute.

---

## CHANGE 7: Post Creation Feels Like Tweeting

**File:** `frontend/src/components/CreatePostForm.tsx`

**Current:** Full form with title input, Tiptap editor, tier dropdown, publish button. Always expanded.

**Change:** Collapsed by default. Expands on click.

**Collapsed state (always visible):**
```tsx
<div
  onClick={() => setExpanded(true)}
  className="p-4 rounded-xl bg-surface-1 border border-border cursor-text hover:border-border-hover transition-colors"
>
  <div className="flex items-center gap-3">
    <AddressAvatar address={publicKey} size={36} />
    <span className="text-sm text-white/40">What's on your mind?</span>
  </div>
</div>
```

**Expanded state (after click):**
```tsx
<div className="p-4 rounded-xl bg-surface-1 border border-accent-border">
  <input
    placeholder="Title"
    className="w-full text-lg font-semibold bg-transparent border-none outline-none text-white placeholder-white/30 mb-3"
    autoFocus
  />
  <TiptapEditor
    content={body}
    onChange={setBody}
    placeholder="Write something your subscribers will love..."
  />
  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
    <div className="flex items-center gap-2">
      <button className="p-2 rounded-lg hover:bg-white/[0.04] text-white/50">
        <ImageIcon className="w-5 h-5" />
      </button>
      <button className="p-2 rounded-lg hover:bg-white/[0.04] text-white/50">
        <Video className="w-5 h-5" />
      </button>
      <select className="bg-transparent text-sm text-white/60 border border-border rounded-lg px-3 py-1.5">
        <option>Free</option>
        <option>Basic</option>
        <option>Premium</option>
        <option>VIP</option>
      </select>
    </div>
    <button className="px-5 py-2 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 active:scale-[0.98]">
      Publish
    </button>
  </div>
</div>
```

Publish button is on the RIGHT of the toolbar (like Twitter's Tweet button). Tier selector is inline, not a separate section. Media buttons are icons, not labeled buttons. The whole thing feels like composing a tweet, not filling a form.

---

## CHANGE 8: The /feed Page (Most Important Missing Page)

**New file:** `frontend/src/app/feed/page.tsx`

This is the page subscribers open every day. Aggregated content from all subscribed creators.

```tsx
export default function FeedPage() {
  const { connected } = useWallet()
  const { getAccessPasses } = useVeilSub()
  const [subscribedCreators, setSubscribedCreators] = useState<string[]>([])
  const [posts, setPosts] = useState<ContentPost[]>([])

  // 1. Get all AccessPasses → extract unique creator addresses
  // 2. Fetch posts from all subscribed creators via API
  // 3. Merge and sort by timestamp (newest first)
  // 4. Render as vertical feed

  if (!connected) return <ConnectWalletPrompt message="Connect to see your feed" />
  if (subscribedCreators.length === 0) return <EmptyFeed />

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Creator filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterChip>
        {subscribedCreators.map(creator => (
          <FilterChip key={creator} active={filter === creator} onClick={() => setFilter(creator)}>
            <AddressAvatar address={creator} size={20} />
            {getCreatorName(creator)}
          </FilterChip>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
```

This is a narrow, centered feed (max-w-2xl, like Twitter). Creator filter chips at top (horizontal scroll, like Instagram Stories). Posts render as social cards (see Change 4). Infinite scroll. Pull-to-refresh on mobile.

The `/feed` route should be added to the main navigation. When logged in + has subscriptions, it should be the DEFAULT route (homepage redirects to /feed).

---

## CHANGE 9: Activity Feed on Dashboard

**File:** `frontend/src/components/dashboard/RegisteredDashboard.tsx`

**Current:** Static stats panel.

**Add:** A real-time activity feed showing recent events.

```tsx
<div className="space-y-3">
  <h3 className="text-sm font-semibold text-white/70">Recent Activity</h3>
  {activities.map(activity => (
    <div key={activity.id} className="flex items-center gap-3 py-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.iconBg}`}>
        <activity.icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80">{activity.message}</p>
        <p className="text-xs text-white/40">{timeAgo(activity.timestamp)}</p>
      </div>
    </div>
  ))}
</div>
```

Activities sourced from Supabase Realtime (already integrated):
- "New subscriber — Tier 2 — 10 min ago" (green dot)
- "Tip received — 500 ALEO — 1 hour ago" (violet dot)
- "Post viewed 47 times — today" (blue dot)
- "Subscription expired — 3 days ago" (amber dot)

All anonymized. No addresses. But the feed shows the creator their platform is alive.

---

## CHANGE 10: Mobile Bottom Actions

**File:** `frontend/src/components/MobileBottomNav.tsx`

On the creator page (mobile), the Subscribe button should be a STICKY BOTTOM BAR. Not in the header where it's hidden after scrolling.

```tsx
// On creator page, mobile only:
<div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-[var(--bg-base)]/95 backdrop-blur-lg border-t border-border sm:hidden">
  <div className="flex items-center justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-white">{creatorName}</p>
      <p className="text-xs text-white/50">From {formatCredits(basePrice)} ALEO/mo</p>
    </div>
    <button className="px-6 py-2.5 rounded-xl bg-white text-black font-medium text-sm">
      Subscribe
    </button>
  </div>
</div>
```

Like Uber's "Request Ride" bar. Like Airbnb's "Reserve" bar. The subscribe button is ALWAYS visible on mobile, no matter where you scroll. This alone can increase conversion significantly.

---

## Summary of Files to Change

| File | Change | Effort |
|------|--------|--------|
| `creator/[address]/page.tsx` | Overflow menu, stats row, sticky mobile CTA | 1 day |
| `ContentFeed.tsx` | Blur-lock preview, social post cards, interaction bar | 1 day |
| `dashboard/RegisteredDashboard.tsx` | Remove tabs, content-first layout, activity feed | 2 days |
| `CreatePostForm.tsx` | Collapsible compose box (tweet-style) | 0.5 day |
| `feed/page.tsx` (NEW) | Aggregated subscriber feed | 2 days |
| API: `/api/tiers/perks/route.ts` (NEW) | Creator-defined tier perks | 0.5 day |
| Hook: `useCreatorPerks.ts` (NEW) | Fetch perks from API | 0.25 day |
| Supabase: `tier_perks` table (NEW) | Store creator perks | 0.25 day |
| `OverflowMenu.tsx` (NEW) | Three-dot dropdown component | 0.5 day |
| `MobileBottomNav.tsx` or new sticky bar | Mobile subscribe CTA | 0.5 day |

**Total: ~8-9 days of work.** Every change is specific, file-level, with code examples. No hand-waving.

---

## The Test

After these changes, show the creator profile page to someone and ask: "Is this Instagram, Patreon, or something else?"

If they say "it's like Instagram but for subscriptions" — you nailed it.

If they say "it's a crypto app" — the jargon is still leaking. Go back and remove every technical term from user-facing text.

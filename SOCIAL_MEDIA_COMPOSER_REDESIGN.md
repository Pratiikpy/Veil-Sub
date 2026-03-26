# VeilSub Content Creation Redesign — Premium Social Media Feel

> Paste this into Claude Code CLI. Each content type gets redesigned to match the best-in-class platform for that content format.

---

## WHAT I SAW (Current State — March 2026)

### Dashboard
- Title: "Creator Dashboard" in huge text — feels like an admin panel, not a social app
- Stats row (Revenue, Subscribers, Posts) — useful but looks like a CRM dashboard
- "What's on your mind, creator?" prompt bar — good idea but feels flat and disconnected
- Post composer opens INLINE below the dashboard stats — gets lost in the page
- Posts list shows titles + tier badges + dates — looks like a CMS content table, not a social feed

### Post Tab (Current)
- Generic form: Title → Body (rich text) → Preview → Image upload → Video URL → Tier → PPV toggle → Tags → Schedule → Save/Publish
- ALL fields shown at once — overwhelming wall of inputs
- Image upload is a dashed border box buried between body and video
- No visual hierarchy — every field looks the same importance
- Feels like filling out a government form, not posting on social media

### Article Tab (Current)
- Identical layout to Post but with word count / reading time
- Same form-first approach — Title field → big empty rich text box → all the same settings below
- No distraction-free writing mode
- The rich text editor area is a small box, not a full writing canvas
- Nothing about it says "write a beautiful long-form article"

### Photo Tab (Current)
- "Upload Photo" drag zone at top — good
- Then: Title (optional) → Caption → Tier → PPV → Tags → Schedule
- Caption is a small textarea, not the star of the show
- No image preview/crop/filter step
- No multi-photo gallery support
- Feels like attaching an image to an email, not posting a photo

### Video Tab (Current)
- "Video URL" text field — paste a YouTube link
- Then: Title → Description → Tier → Tags → Schedule
- No video preview or embed preview
- No thumbnail selection
- Feels like pasting a link, not publishing a video

### Note Tab (Current)
- Textarea with "What's on your mind?" + 280 char counter + "Share Note" button
- This is actually the closest to feeling social (simple, direct)
- But it's buried as the 5th tab — should be the most prominent quick-action

---

## WHAT THE BEST PLATFORMS DO

### Twitter/X — Post Composer
- **Modal overlay** that dims the background — focused, no distractions
- **Avatar** next to the compose area — reminds you it's YOUR voice
- **"What's happening?"** — large, inviting placeholder in the text area
- **Media toolbar at bottom**: tiny icon row — image, GIF, poll, emoji, schedule, location, Bold, Italic
- **"Everyone can reply"** — audience selector dropdown
- **Character counter** — circular progress ring (fills as you type, turns yellow at 80%, red at 100%)
- **"Post" button** — solid blue, right-aligned, disabled until content exists
- **Drafts link** — top-right, subtle
- **NO title field** — the text IS the post
- **NO tags field** — hashtags are inline in the text
- **NO settings** visible until you need them

### Medium — Article Editor
- **Full-page takeover** — no sidebar, no nav, no distractions
- **Massive serif "Title" placeholder** — centered, huge font (~42px), feels like typing a headline
- **"Tell your story..."** — body placeholder, elegant serif
- **Plus (+) button** — appears on left margin when cursor is on empty line, expands to show: Image, Video, Embed, Divider
- **Floating toolbar** — appears only when you SELECT text (bold, italic, heading, link, quote, code)
- **White canvas** — pure white background, content is centered ~680px wide
- **"Publish" button** — green, top-right, small
- **"Draft" indicator** — next to logo, auto-saves
- **NO visible settings** — tier/tags/preview are all in a PUBLISH dialog that opens when you click Publish
- **Reading time auto-calculates** and shows subtly

### Instagram — Photo Post
- **Modal flow** — centered modal over dimmed feed
- **Step 1: Upload** — big photo/video icon + "Drag photos and videos here" + blue "Select from computer" button
- **Step 2: Crop/Filter** — after upload, shows the image with crop handles, aspect ratio buttons (1:1, 4:5, 16:9), filter gallery below
- **Step 3: Caption + Settings** — image preview on left, caption + location + alt text + tagging on right
- **Image is HERO** — takes up 60%+ of the modal space
- **Caption** is a clean textarea below, no title needed
- **Multi-image carousel** — can add up to 10 photos with left/right navigation
- **Share button** — blue, top-right

### YouTube Studio — Video Upload
- **Modal overlay** — "Upload videos" title
- **Step 1: Upload** — centered upload arrow icon + "Drag and drop video files to upload" + "Select files" button
- **Step 2: Details** (after file selected) — multi-step wizard:
  - **Details tab**: Title, Description, Thumbnail (pick 3 auto-generated or upload custom), Playlist, Audience (kids/not kids)
  - **Video elements tab**: Add end screen, add cards
  - **Checks tab**: Copyright check results
  - **Visibility tab**: Public/Unlisted/Private/Scheduled + date picker
- **Progress bar** at top showing upload progress
- **Video preview** on the right side
- **Stepper/wizard** — clear numbered steps with Next/Back buttons

---

## THE REDESIGN — 5 CONTENT TYPES, 5 DIFFERENT EXPERIENCES

### HARD RULES
1. NEVER touch `.leo` files in `/contracts/`
2. NEVER delete or rename hooks in `/frontend/src/hooks/`
3. NEVER change env var names
4. Use existing Tailwind classes + Framer Motion
5. Dark mode default (#000 bg, #0a0a0a cards, #1c1c1c borders, #fafafa text)
6. Fonts: Manrope (UI), Lora (body/article), JetBrains Mono (metadata)
7. One commit per content type redesign
8. `npm run build` must pass after every commit
9. Keep file sizes under 800 lines — split `CreatePostForm.tsx` into separate components

---

### REDESIGN 1: NOTE — The Twitter-Style Quick Post

**Reference**: Twitter/X compose modal

**The Problem**: Note is the simplest, most social content type — but it's hidden as Tab 5. It should be the DEFAULT quick-action, front and center.

**What To Build**:

```
┌─────────────────────────────────────────────────┐
│  ┌──┐                                           │
│  │HP│  What's on your mind?                     │
│  └──┘                                           │
│                                                 │
│       [textarea expands as you type]            │
│                                                 │
│                                                 │
│  ─────────────────────────────────────────────  │
│  [emoji] [GIF placeholder]     ○○○○ 280  Post  │
│                                 ^^^^            │
│                           character ring        │
└─────────────────────────────────────────────────┘
```

**Exact Implementation**:

1. **Split `CreatePostForm.tsx`** into 5 separate components:
   - `NoteComposer.tsx` (~150 lines)
   - `PostComposer.tsx` (~200 lines)
   - `ArticleEditor.tsx` (~250 lines)
   - `PhotoUploader.tsx` (~200 lines)
   - `VideoPublisher.tsx` (~200 lines)
   - `CreatePostForm.tsx` becomes a thin router that renders the right component based on selected tab

2. **NoteComposer layout**:
   - Remove the "New Post" / "Create" header — unnecessary for notes
   - Show creator's avatar (32px circle) on the left
   - Textarea fills the remaining width — no border, no background, just text
   - Placeholder: "What's on your mind?" in `text-zinc-500`
   - Textarea auto-expands as user types (min 2 rows, max 8 rows)
   - Font: `font-sans text-base` (Manrope 16px) — same as Twitter
   - No title field, no preview field, no image, no video — just text

3. **Bottom toolbar** (separator line + row):
   - Left side: emoji picker icon button (use existing EmojiReactions or a simple picker)
   - Right side: character counter ring (SVG circle that fills, like Twitter):
     - 0-224 chars: `stroke-zinc-600` (gray)
     - 225-260: `stroke-yellow-500` (warning)
     - 261-280: `stroke-red-500` (danger)
     - Counter shows remaining number when < 20 chars left
   - "Post" button: `bg-white text-black rounded-full px-5 py-1.5 font-semibold text-sm`
     - Disabled (opacity-50) when textarea is empty
     - Enabled when text exists

4. **On submit**: Call existing `publishContent()` hook with `minTier: 0` (notes are always free)

5. **Framer Motion**: Textarea expand with `layout` animation, button enable with `animate={{ opacity: 1 }}`

**What It Should Feel Like**: Typing a tweet. Fast, effortless, 5 seconds to post.

---

### REDESIGN 2: POST — The Twitter-Style Rich Post

**Reference**: Twitter/X compose with media attachments

**The Problem**: Post tab is a giant form with Title, Body, Preview, Image, Video, Tier, PPV, Tags, Schedule all visible at once. Too much.

**What To Build**:

```
┌─────────────────────────────────────────────────┐
│  [×]                                   [Drafts] │
│                                                 │
│  ┌──┐                                          │
│  │HP│  Title (optional)                         │
│  └──┘  ─────────────────────────────────────    │
│        What's happening?                        │
│                                                 │
│        [rich text area — tiptap editor]         │
│                                                 │
│        ┌─────────────────────────┐              │
│        │     uploaded image      │  [×]         │
│        │     preview here        │              │
│        └─────────────────────────┘              │
│                                                 │
│  ─────────────────────────────────────────────  │
│  [📷] [🎬] [😀] [🏷️]     [🔒 Free ▾] [Publish]│
│  img  vid  emoji tags      tier select          │
└─────────────────────────────────────────────────┘
```

**Exact Implementation**:

1. **PostComposer.tsx** — modal-style card (not inline):
   - Opens as a focused card with subtle backdrop blur
   - Close (×) button top-left, "Drafts" link top-right
   - Max-width: 600px, centered

2. **Composer area**:
   - Avatar on left (40px)
   - Title input: `text-lg font-semibold` placeholder "Title (optional)" — single line, no border
   - Separator line (1px `border-zinc-800`)
   - Body: Tiptap rich text editor — `text-base` placeholder "What's happening?"
   - Supports: bold, italic, headings (H2, H3), bullet list, numbered list, blockquote, code, links
   - NO toolbar visible by default — floating toolbar appears on text selection (like Medium)

3. **Media attachment area** (appears only when media added):
   - Image: shows preview with rounded corners + (×) remove button
   - Video: shows embedded preview (YouTube/Vimeo oEmbed) or URL badge
   - Max 1 image OR 1 video per post (not both)

4. **Bottom toolbar**:
   - Left icons (24px, `text-zinc-400 hover:text-white`):
     - 📷 Image — opens file picker, calls `POST /api/upload` WITH wallet auth headers
     - 🎬 Video — opens URL input inline
     - 😀 Emoji — opens emoji picker
     - 🏷️ Tags — opens tag input inline (max 5)
   - Right side:
     - Tier selector: pill/dropdown showing "Free" / "Supporter" / "Premium" / "VIP" with lock icon
     - "Publish" button: `bg-white text-black rounded-full px-5 py-2 font-semibold`

5. **Advanced settings** (collapsed by default, expand with "More options" link):
   - Preview text (for gated posts)
   - Schedule date/time
   - Pay-Per-View toggle
   - E2E encryption toggle

6. **Auto-draft**: Save to localStorage every 30 seconds (existing behavior), show "Draft saved" toast

**What It Should Feel Like**: Twitter compose modal but with optional title + rich text + tier gating.

---

### REDESIGN 3: ARTICLE — The Medium-Style Writing Experience

**Reference**: Medium's new-story editor

**The Problem**: Article editor is the same form as Post with slightly different labels. Writing a long article in a small textarea surrounded by settings fields is painful. Medium proved that distraction-free is the only way.

**What To Build**:

```
┌─────────────────────────────────────────────────────────┐
│  VeilSub   Draft saved          [Preview] [...] [Publish]│
│                                                          │
│                                                          │
│                                                          │
│              Your Article Title                          │
│              ─────────────────                           │
│                                                          │
│           ⊕  Tell your story...                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                              5 min read  │
└─────────────────────────────────────────────────────────┘
```

**Exact Implementation**:

1. **ArticleEditor.tsx** — FULL PAGE takeover (not inline in dashboard):
   - Route: Stay on `/dashboard` but render ArticleEditor as a full-screen overlay (`fixed inset-0 z-50 bg-black`)
   - Or use Framer Motion `AnimatePresence` to slide it in from bottom

2. **Top bar** (minimal, fixed):
   - Left: "VeilSub" logo (small) + "Draft saved" / "Saving..." indicator
   - Right: "Preview" button (ghost), "•••" menu (settings), "Publish" button (green/white solid)
   - Height: 56px, `bg-black/80 backdrop-blur-sm border-b border-zinc-800`

3. **Writing canvas** (centered, clean):
   - Max-width: 720px, centered horizontally
   - Padding-top: 80px (breathing room below top bar)
   - Title: `font-serif text-4xl font-bold` (Lora, 42px) — placeholder "Your Article Title"
   - Body: `font-serif text-lg leading-relaxed` (Lora, 18px, line-height 1.8) — placeholder "Tell your story..."
   - Use Tiptap editor configured for long-form:
     - Heading (H2, H3)
     - Bold, Italic, Strikethrough
     - Blockquote (with left border style)
     - Bullet list, Ordered list
     - Code block (with syntax highlighting via `JetBrains Mono`)
     - Horizontal rule
     - Image (inline, with caption support)
     - Video embed
     - Link

4. **Plus (+) button** — Medium-style insert menu:
   - Appears on the left margin when cursor is on an empty new line
   - Clicking expands to show: [📷 Image] [🎬 Video] [━ Divider] [< > Code block]
   - Image: opens file picker → uploads via `/api/upload` WITH AUTH HEADERS → inserts inline
   - Video: opens URL input → validates YouTube/Vimeo → inserts embed
   - Framer Motion: rotate the + 45° to × when expanded

5. **Floating format toolbar** — appears on text selection:
   - Shows: B, I, S, H2, H3, Link, Quote, Code
   - `bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl`
   - Appears above the selected text with a triangle pointer
   - Framer Motion: `scale` + `opacity` entrance animation

6. **Reading time**: Calculate from word count, show bottom-right as `text-zinc-600 text-sm`

7. **Publish dialog** — opens when clicking "Publish":
   - Modal with:
     - Cover image upload (optional, hero image)
     - Preview text (for subscribers feed)
     - Minimum tier selector
     - Tags (max 5)
     - Schedule toggle + date/time
     - "Publish now" button
   - This is the ONLY place settings appear — not on the writing canvas

8. **Auto-save**: Save to localStorage every 15 seconds, show "Draft saved" in top bar

**What It Should Feel Like**: Medium. Pure writing. The settings are hidden until publish time. The canvas is sacred.

---

### REDESIGN 4: PHOTO — The Instagram-Style Photo Post

**Reference**: Instagram's create post modal (multi-step)

**The Problem**: Current photo tab shows a dashed upload box, then dumps you into the same form as Post with caption/title/tier/tags. No visual emphasis on the photo itself. No preview step.

**What To Build**:

```
STEP 1: Upload
┌─────────────────────────────────────────────┐
│  Create Photo Post                      [×] │
│                                             │
│           ┌─────────────┐                   │
│           │  📷  🎬      │                   │
│           │              │                   │
│           │  Drag photo  │                   │
│           │  here or     │                   │
│           │  [Browse]    │                   │
│           └─────────────┘                   │
│                                             │
│  JPG, PNG, GIF, WebP · Max 5MB             │
└─────────────────────────────────────────────┘

STEP 2: Preview + Caption
┌─────────────────────────────────────────────┐
│  ← Back                Share Photo Post [→] │
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐  │
│  │                  │  │ ┌──┐            │  │
│  │                  │  │ │HP│ Creator     │  │
│  │   PHOTO PREVIEW  │  │ └──┘            │  │
│  │   (large, fills  │  │                 │  │
│  │    left half)    │  │ Write a caption │  │
│  │                  │  │ ...             │  │
│  │                  │  │                 │  │
│  │                  │  │ ────────────    │  │
│  │                  │  │ 🔒 Free ▾      │  │
│  │                  │  │ 🏷️ Add tags     │  │
│  └──────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────┘
```

**Exact Implementation**:

1. **PhotoUploader.tsx** — multi-step modal:
   - Step state: `upload` → `preview`
   - Modal: 720px wide, centered, `bg-zinc-950 border border-zinc-800 rounded-2xl`

2. **Step 1 — Upload**:
   - Centered upload zone: photo+video icon (SVG), "Drag photos and videos here" text, blue "Select from computer" button
   - Also accept: paste image URL (text input below the drop zone)
   - On file select or drop:
     - Validate: JPEG/PNG/GIF/WebP, max 5MB
     - Upload to `/api/upload` WITH wallet auth headers
     - Show upload progress bar (Framer Motion width animation)
     - On success: transition to Step 2

3. **Step 2 — Preview + Caption** (split layout):
   - LEFT side (55% width): Photo preview, fills the space, `rounded-lg object-cover`
   - RIGHT side (45% width):
     - Creator avatar + name at top
     - Caption textarea: `font-sans text-sm` placeholder "Write a caption..." — no border, auto-expand
     - Character count: `0/2200` (Instagram's limit)
     - Separator line
     - Tier selector: "Visible to" dropdown — Free / Supporter / Premium / VIP
     - Tags input: "Add tags..." — compact pill style
   - "Share" button: top-right, `bg-white text-black rounded-lg px-4 py-2 font-semibold`

4. **Framer Motion transitions**:
   - Step 1 → Step 2: slide left animation (`x: 0 → -100%, new content x: 100% → 0`)
   - Modal entrance: `scale: 0.95 → 1, opacity: 0 → 1`

**What It Should Feel Like**: Instagram's post creation flow. Image is king. Caption is secondary. Settings are minimal.

---

### REDESIGN 5: VIDEO — The YouTube-Style Video Publisher

**Reference**: YouTube Studio's upload wizard

**The Problem**: Current video tab is just a URL input field + the same form as everything else. Pasting a YouTube link and filling out title/description feels like filling out a contact form, not publishing a video.

**What To Build**:

```
STEP 1: Video URL
┌─────────────────────────────────────────────┐
│  Publish Video                          [×] │
│                                             │
│           ┌─────────────┐                   │
│           │  🎬          │                   │
│           │              │                   │
│           │  Paste video │                   │
│           │  URL here    │                   │
│           │              │                   │
│           └─────────────┘                   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ 🔗 https://youtube.com/watch?v=...  │   │
│  └──────────────────────────────────────┘   │
│  YouTube, Vimeo, or direct .mp4/.webm       │
│                                             │
│                          [Next →]           │
└─────────────────────────────────────────────┘

STEP 2: Details
┌─────────────────────────────────────────────┐
│  ← Back              Video Details   [Post] │
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐  │
│  │                  │  │ Title *          │  │
│  │  VIDEO EMBED     │  │ ───────────     │  │
│  │  PREVIEW         │  │                 │  │
│  │  (live preview   │  │ Description     │  │
│  │   of the video   │  │ ───────────     │  │
│  │   playing)       │  │                 │  │
│  │                  │  │ ────────────    │  │
│  │                  │  │ 🔒 Free ▾      │  │
│  │                  │  │ 🏷️ Tags         │  │
│  │                  │  │ 📅 Schedule     │  │
│  └──────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────┘
```

**Exact Implementation**:

1. **VideoPublisher.tsx** — multi-step modal:
   - Step state: `url` → `details`
   - Modal: 800px wide (wider for video preview), centered

2. **Step 1 — URL Input**:
   - Centered video icon (SVG play button in circle)
   - "Paste a video link" text
   - URL input field: full-width, `bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3`
   - Placeholder: "https://www.youtube.com/watch?v=..."
   - Below: "YouTube, Vimeo, or direct video files (.mp4, .webm)" in `text-zinc-500 text-sm`
   - Validation: On paste/change, validate URL pattern:
     - YouTube: `youtube.com/watch?v=` or `youtu.be/`
     - Vimeo: `vimeo.com/`
     - Direct: ends in `.mp4`, `.webm`
   - Show green checkmark when valid, red × when invalid
   - "Next" button: enabled only when URL is valid

3. **Step 2 — Details** (split layout):
   - LEFT side (55%): Live video embed preview
     - YouTube: use `iframe` embed with `youtube-nocookie.com`
     - Vimeo: use Vimeo embed
     - Direct: use `<video>` tag with controls
     - Rounded corners, 16:9 aspect ratio
   - RIGHT side (45%):
     - Title: `text-lg font-semibold` input — REQUIRED (red asterisk)
     - Description: textarea, 4 rows, `text-sm`
     - Separator
     - Tier selector
     - Tags input
     - Schedule toggle + date/time picker
   - "Publish" button: top-right header

4. **Auto-populate**: If YouTube URL, try to fetch video title via oEmbed API and pre-fill the title field

**What It Should Feel Like**: YouTube Studio's upload wizard. Video preview is prominent. Details are a structured form beside it. Professional.

---

## DASHBOARD REDESIGN (THE CONTAINER)

The dashboard itself needs to stop looking like an admin panel and start looking like a social media creator studio.

### Current Dashboard Problems
1. "Creator Dashboard" title is huge and wastes space
2. Stats cards (Revenue, Subscribers, Posts) look like a finance dashboard
3. "What's on your mind, creator?" bar opens a form INLINE — gets lost
4. Posts list looks like a CMS table
5. Everything is vertical — scroll forever

### New Dashboard Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  MAIN CONTENT                   │ [Right Bar] │
│             │                                  │             │
│  VeilSub    │  ┌─ Profile Card ──────────────┐ │ Featured    │
│             │  │ HP  Creator Name    [Edit]   │ │ Creators   │
│  Feed       │  │ @address  · 2 subs · 4 posts│ │             │
│  Explore    │  │ [View Page]  [Share]         │ │ Privacy     │
│  Notifs     │  └─────────────────────────────┘ │ Info        │
│  Dashboard  │                                  │             │
│             │  ┌─ Quick Create ───────────────┐ │             │
│  Search     │  │ ┌──┐ What's on your mind?    │ │             │
│  Settings   │  │ │HP│                    Post │ │             │
│             │  │ └──┘                         │ │             │
│  Connected  │  │ [Note] [Article] [Photo][Vid]│ │             │
│             │  └─────────────────────────────┘ │             │
│             │                                  │             │
│             │  ┌─ Stats (compact) ───────────┐ │             │
│             │  │ $49 rev  │ 2 subs  │ 4 posts│ │             │
│             │  │ [Withdraw 32.7 ALEO]        │ │             │
│             │  └─────────────────────────────┘ │             │
│             │                                  │             │
│             │  ┌─ Your Posts ────────────────┐ │             │
│             │  │ [Published 4] [Drafts] [Sched]│             │
│             │  │                              │ │             │
│             │  │ Post cards (social style)    │ │             │
│             │  │ with previews, not just      │ │             │
│             │  │ titles in a list             │ │             │
│             │  └─────────────────────────────┘ │             │
└──────────────────────────────────────────────────────────────┘
```

**Changes**:

1. **Remove "Creator Dashboard" title** — the sidebar already tells you where you are
2. **Profile card** — compact: avatar, name, truncated address, subscriber count, post count, [View Page] [Share] [Edit Profile] buttons. Like Twitter profile header but compact.
3. **Quick Create bar** — the composer prompt + content type shortcuts below:
   - Click the bar → opens NoteComposer inline (default)
   - Click [Article] → opens ArticleEditor full-page
   - Click [Photo] → opens PhotoUploader modal
   - Click [Video] → opens VideoPublisher modal
   - Click [Post] → opens PostComposer modal
4. **Stats row** — ONE compact row, not 3 separate cards. Revenue | Subscribers | Posts. With withdraw button.
5. **Posts list** — change from CMS table to **post cards** (like Twitter feed but for your own posts):
   - Each card shows: thumbnail (if image), title, first line of body, tier badge, date, engagement count
   - Delete button on hover
   - Click card to edit

---

## CONTENT TYPE TAB SWITCHER REDESIGN

Replace the current flat tab bar:
```
CURRENT: [Post] [Article] [Photo] [Video] [Note]
```

With content-type icons + labels that indicate the EXPERIENCE:
```
NEW:  [✏️ Note]  [📝 Post]  [📄 Article]  [📷 Photo]  [🎬 Video]
       default    modal      full-page     modal/step   modal/step
```

- Note is FIRST (most used, fastest)
- Each type opens its own dedicated component
- Active tab: `bg-white text-black rounded-full` pill
- Inactive: `text-zinc-400 hover:text-white`

---

## EXECUTION ORDER

```
Phase 1: Split CreatePostForm.tsx into 5 components → commit → build
Phase 2: NoteComposer (Twitter-style) → commit → build
Phase 3: PostComposer (Twitter-style modal) → commit → build
Phase 4: ArticleEditor (Medium-style full page) → commit → build
Phase 5: PhotoUploader (Instagram-style multi-step) → commit → build
Phase 6: VideoPublisher (YouTube-style wizard) → commit → build
Phase 7: Dashboard layout redesign → commit → build
Phase 8: Tab switcher + Quick Create bar → commit → build
Phase 9: Final polish — animations, transitions, loading states → commit → build
```

**CRITICAL for every phase**:
- `npm run build` must pass
- ALL existing functionality preserved (publishing, drafts, scheduling, tier gating, tags, PPV)
- Wallet auth headers on ALL API calls (especially `/api/upload`)
- Dark mode default
- Mobile responsive (modals become full-screen sheets on mobile)

---

## WHAT SUCCESS LOOKS LIKE

After all 9 phases:
- Writing a **Note** feels like tweeting — 5 seconds, done
- Writing a **Post** feels like composing a tweet with media — focused modal, clean toolbar
- Writing an **Article** feels like Medium — distraction-free canvas, serif fonts, floating toolbar
- Uploading a **Photo** feels like Instagram — image-first, step-by-step, beautiful preview
- Publishing a **Video** feels like YouTube Studio — paste link, see preview, add details, publish
- The **Dashboard** feels like a creator studio — profile card, quick create, compact stats, social-style post feed
- NOTHING feels like filling out a form

---

## FILES TO CREATE / MODIFY

### New Files
```
/frontend/src/components/composers/NoteComposer.tsx
/frontend/src/components/composers/PostComposer.tsx
/frontend/src/components/composers/ArticleEditor.tsx
/frontend/src/components/composers/PhotoUploader.tsx
/frontend/src/components/composers/VideoPublisher.tsx
/frontend/src/components/composers/FloatingToolbar.tsx
/frontend/src/components/composers/InsertMenu.tsx
/frontend/src/components/composers/CharacterRing.tsx
/frontend/src/components/composers/MediaToolbar.tsx
/frontend/src/components/composers/TierSelector.tsx
/frontend/src/components/composers/TagInput.tsx
/frontend/src/components/composers/PublishDialog.tsx
/frontend/src/components/composers/index.ts
```

### Modified Files
```
/frontend/src/components/CreatePostForm.tsx  → thin router importing from /composers/
/frontend/src/app/dashboard/page.tsx         → new layout with profile card + quick create
/frontend/src/components/dashboard/PostsList.tsx → social card style instead of table
```

### Shared Sub-Components
```
CharacterRing.tsx   → SVG circular progress (used in Note + Post)
FloatingToolbar.tsx → text selection toolbar (used in Post + Article)
InsertMenu.tsx      → (+) button menu (used in Article)
MediaToolbar.tsx    → bottom icon row (used in Note + Post)
TierSelector.tsx    → dropdown tier picker (used in Post + Photo + Video)
TagInput.tsx        → tag pill input (used in Post + Photo + Video)
PublishDialog.tsx   → publish settings modal (used in Article)
```

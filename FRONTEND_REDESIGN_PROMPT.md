# Ultra-Detailed Frontend Redesign Prompt for Claude Code CLI

> **CONTEXT**: VeilSub is a privacy-first creator subscription platform on Aleo blockchain competing in a buildathon. The frontend was recently redesigned from glassmorphism to solid monochrome. Now we need to push it to a premium dark SaaS level — matching or exceeding sites like Setrex, Cortado, and Portfolite. The goal is to score 9/10 on UX from buildathon judges.

> **CRITICAL RULES**:
> - Zero TypeScript errors after every change. Run `npm run build` to verify.
> - Do NOT touch any business logic, hooks, API calls, wallet integration, or transaction flows. Only visual/design changes.
> - Do NOT add new npm packages unless absolutely necessary.
> - Keep Framer Motion for animations (already installed).
> - Keep all existing page routes and component imports intact.
> - Work in small incremental steps — verify build after each file change.
> - Do NOT add any AI co-author lines to git commits.

---

## REFERENCE SITE ANALYSIS (What We're Matching)

### Setrex (setrex-saas-template.framer.ai)
**Design DNA:**
- Deep black backgrounds (#000000 to #0a0a0a) with a dramatic hero using a real photographic Earth/globe image
- **Lime/neon green** accent color (approximately #c8ff00 / #a3e635) for primary CTAs — extremely high contrast on dark
- Rounded pill buttons with solid fill (green CTA) and outlined ghost buttons
- "Partnering with world's leading enterprises" logo ticker (grayscale logos on dark bg, continuous horizontal scroll)
- Clean section titles in large white serif-like or sans-serif font, centered
- Frosted/elevated cards with very subtle dark borders — cards sit on slightly lighter dark surfaces
- Feature grid with icon + title + description, minimal spacing
- "Overview of Interface" section with a dark mockup/wireframe screenshot inside a card
- Subtle floating green dots as decorative elements (particle-like)
- Footer: multi-column with company links, clean separation

**Key Takeaway**: HIGH CONTRAST accent (neon green on black), photographic hero imagery, logo ticker for social proof, clean grid layouts.

### Cortado (cortado.framer.website)
**Design DNA:**
- Near-black background (#050507 to #0a0a10) with subtle purple/blue cosmic particle dots scattered across the page
- **Purple/violet** accent (#7c3aed to #8b5cf6) — used sparingly on the logo ring and badge pill
- Hero: centered "JavaScript Library" badge above massive white display text "Create, Deploy, and Scale with Cortado"
- Two CTA buttons side by side: "Get Started" (filled dark) + "Learn More" (outlined)
- **Resource cards section** "What's in Cortado.js?" — 6 cards in a 3×2 grid. Each card has: subtle icon, bold title, gray description. Cards have very subtle borders and slight hover glow
- "1.2.0 Cortado.js" release note card with arrow icon (showing freshness/updates)
- **Logo ticker** below cards — grayscale partner logos in horizontal scroll
- "Why Cortado.js?" section: 3×3 icon grid with feature names (Built-in Routing, WebSocket Support, etc.)
- **Integration logos** (Framer, Apple, Adobe, Microsoft, Slack, Figma) in a horizontal row with decorative curved lines connecting to center logo
- **Pricing section**: 2 plans (Free / Premium) in side-by-side cards with feature lists and CTA buttons. Clean, minimal. "$0/mo" and "$20/mo" with checkmark feature lists
- 4-column footer (Company, Account, More, Legal) with clean link lists

**Key Takeaway**: Cosmic particle background, centered typography, resource card grid, pricing section, logo integrations display, very polished footer.

### Portfolite (portfolite.framer.website)
**Design DNA:**
- Deep black with white/cream text. Photographic imagery (B&W portrait, product shots)
- "Crafting Unique Brand Identities" pill badge above hero text
- Huge display heading "Branding that you need Indeed" — oversized serif-like typography
- "Scroll down to see projects" instruction with a scroll indicator icon (mouse/scroll shape)
- **Brand logo ticker** at bottom of hero (continuous horizontal scroll, grayscale)
- "Meet Meily" about section: large B&W portrait on right, bio text on left, skill tags (Product Design, UX Design, Branding, Figma, Photoshop) as pill badges
- Work experience table: clean 3-column layout (Role, Company, Date)
- "Recent Works" gallery: horizontal scrolling card carousel of project images
- Portfolio approach: image-heavy, editorial, less SaaS-like

**Key Takeaway**: Bold oversized typography, B&W imagery, skill/tag badges, horizontal scroll gallery, editorial feel.

---

## DESIGN CHANGES TO IMPLEMENT

### Phase 1: Design System Tokens & Foundations

**File: `frontend/src/app/globals.css`**

Update CSS custom properties to add more depth:

```
Current tokens to KEEP:
--background: #08080a
--surface-1: #111113
--surface-2: #18181b
--foreground: #fafafa
--accent: #8b5cf6

NEW tokens to ADD:
--surface-3: #1f1f23 (for elevated cards on hover)
--accent-glow: rgba(139, 92, 246, 0.15) (purple glow for focus/hover states)
--accent-gradient: linear-gradient(135deg, #8b5cf6, #a78bfa) (gradient for primary buttons)
--shadow-card: 0 1px 2px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2) (subtle card elevation)
--shadow-card-hover: 0 2px 4px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3) (hover elevation)
--shadow-glow: 0 0 20px rgba(139, 92, 246, 0.1) (accent glow shadow)
```

Add these new keyframe animations:
```css
@keyframes gradient-sweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0); }
  50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.15); }
}
```

### Phase 2: Button Component Upgrade

**File: `frontend/src/components/ui/Button.tsx`**

The primary button needs to feel premium like Setrex/Cortado CTAs:

- **Primary variant**: Background should use `--accent-gradient` (purple gradient). Add `box-shadow: var(--shadow-glow)` on hover. Transition shadow and transform (slight scale 1.02 on hover). Keep the shimmer sweep animation but make it more subtle (slower, less visible).
- **Secondary variant**: Use a 1px border with `rgba(255,255,255,0.1)`, transparent background. On hover: border brightens to `rgba(255,255,255,0.2)`, background shifts to `rgba(255,255,255,0.03)`. Text color stays `--foreground`.
- **Ghost variant**: No border, no background. Just text with hover underline or opacity change.
- Add `active:scale-[0.98]` to all variants for tactile click feedback.
- Border radius should be `rounded-lg` (12px) for all buttons, not 8px.

### Phase 3: Card Component (GlassCard) Upgrade

**File: `frontend/src/components/GlassCard.tsx`**

This is the most-used component. Upgrade it to match Cortado's card style:

- Default variant: `bg-[var(--surface-1)]`, `border border-[rgba(255,255,255,0.06)]`, `rounded-xl` (12px), add `box-shadow: var(--shadow-card)`.
- Hover state: `hover:border-[rgba(255,255,255,0.1)]`, `hover:bg-[var(--surface-2)]`, `hover:shadow-[var(--shadow-card-hover)]`. Add `transition-all duration-300`.
- Heavy variant: Same but with `bg-[var(--surface-2)]` base and stronger shadow.
- Remove any remaining `backdrop-filter` or `backdrop-blur` from this component.
- The card should feel like it "lifts" slightly on hover — add `hover:-translate-y-0.5` for a subtle float.

### Phase 4: Landing Page Redesign

**File: `frontend/src/app/page.tsx`**

This is the most critical file. Judges see this first. Redesign section by section:

#### 4.1 Hero Section
CURRENT: Simple radial gradient glow, badge, heading, subheading, 2 buttons.
TARGET: Match Cortado's hero — centered, clean, dramatic.

Changes:
- Add a very subtle radial gradient at the center-top: `bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08)_0%,transparent_60%)]`. This creates a soft purple glow behind the heading like Cortado's cosmic feel.
- Add scattered particle dots using a CSS pseudo-element or a very lightweight absolute-positioned div with small circles (2-3px) at random positions with low opacity (0.1-0.15). Use `animate-pulse` with random delays. Keep to 8-12 dots max in the hero area. These should be subtle, like Cortado's cosmic particles.
- Badge: Style like Cortado's "JavaScript Library" badge — small pill with icon, `bg-[rgba(139,92,246,0.08)]`, `border border-[rgba(139,92,246,0.15)]`, `text-[#a78bfa]`, `text-xs uppercase tracking-wider font-medium`. Icon should be a small shield or lock icon.
- Main heading: Keep "Subscribe Privately." but make it larger on desktop: `text-5xl sm:text-6xl lg:text-7xl`. Use `font-semibold tracking-tight`. Pure white `text-[var(--foreground)]`.
- Subtitle: `text-base sm:text-lg`, `text-[var(--text-secondary)]`, `max-w-[540px] mx-auto`, `leading-relaxed`.
- CTAs: Two buttons side by side. Primary: "Start Subscribing" (purple gradient, filled). Secondary: "View Source" (outlined, ghost-like). Use `gap-3` between them.
- Below CTAs, add a small muted text: "Built on Aleo · Zero-Knowledge Proofs" in `text-xs text-[var(--text-tertiary)]`.

#### 4.2 Trust Ticker
CURRENT: Marquee scrolling text features.
TARGET: Match Setrex/Cortado logo ticker style.

Changes:
- Instead of text-only marquee, convert to a visual ticker with small icons paired with text. Each item should have: a small icon (shield, lock, eye-off, zap, etc from lucide-react) + short label.
- Add a `border-y border-[rgba(255,255,255,0.04)]` top and bottom, with `py-5` padding.
- Keep the gradient fade masks on left and right edges.
- Slow down the animation slightly (35-40s instead of 30s).
- Keep the dark background (same as page bg or slightly different).

#### 4.3 Problem/Solution Section
CURRENT: 2-column with comparison grid (red X vs green check).
TARGET: More visual impact, like Cortado's feature cards.

Changes:
- Keep the 2-column layout but make the left side more prominent.
- Left side: SectionHeader with badge "The Problem" + heading "Every Platform Exposes You" + paragraph description.
- Right side: Instead of flat rows, use 3 stacked cards. Each card: left side has red X icon with "Traditional" label + description, right side has green checkmark with "VeilSub" label + description. Cards should use the GlassCard component with the new hover effects. Add a thin divider line between left and right within each card.
- Add `gap-6` between the 3 comparison cards.

#### 4.4 How It Works Section
CURRENT: 4-column grid with numbered cards.
TARGET: Cleaner, with step numbers more prominent.

Changes:
- Keep the 4-column layout on desktop (`grid sm:grid-cols-2 lg:grid-cols-4 gap-5`).
- Each step card: Large step number (`text-4xl font-bold text-[rgba(139,92,246,0.2)]`) at top, then icon, then title, then description. The number should be huge and muted (like Cortado's large decorative numbers).
- Add a subtle connecting line or arrow between cards on desktop (use a `hidden lg:block` absolute-positioned horizontal line with a gradient from `rgba(255,255,255,0.04)` to `rgba(255,255,255,0.08)` between each card).
- Card hover: border brightens, card lifts slightly.

#### 4.5 Stats Row
CURRENT: 3 simple stats ("100% Private", "9 Transitions", "Zero Exposure").
TARGET: More impactful, like a highlight strip.

Changes:
- Update the stats to be more impressive: "100% Private" (keep), "27 Transitions" (updated number!), "7 Record Types" (new stat), "v13 Deployed" (shows iteration).
- Make it a 4-column grid on desktop.
- Each stat: Large number/text in `text-4xl sm:text-5xl font-bold text-[var(--foreground)]`, sublabel in `text-sm text-[var(--text-tertiary)]`.
- Add a very subtle purple glow behind the section: `bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.04)_0%,transparent_70%)]`.
- Border top and bottom: `border-y border-[rgba(255,255,255,0.04)]`.

#### 4.6 Creator Explore Section
CURRENT: Search input + featured creators.
TARGET: Keep functional but polish the search UI.

Changes:
- Search input: Larger, with a subtle purple focus ring (`focus:ring-2 focus:ring-[rgba(139,92,246,0.3)]`). Add a search icon (magnifying glass) inside the input on the left. Border should brighten on focus.
- Featured creator cards: Use updated GlassCard with hover lift effect.
- Add `placeholder="Search by Aleo address..."` if not already there.

#### 4.7 CTA Section (Bottom)
CURRENT: Simple card with "Ready to start?" and 2 buttons.
TARGET: More dramatic, like Setrex's CTA section.

Changes:
- Wrap in a GlassCard with `bg-[var(--surface-1)]` and a subtle purple gradient glow inside: `bg-gradient-to-b from-[rgba(139,92,246,0.06)] to-transparent`.
- Heading: "Ready to Own Your Privacy?" — larger, bolder.
- Subtitle: "Join creators and subscribers who value privacy. Built on Aleo, verified by zero-knowledge proofs."
- Two buttons: "Become a Creator" (primary, purple gradient) + "View on GitHub" (secondary, outlined).
- Center everything.

#### 4.8 Footer
CURRENT: 4-column grid, basic links, "v8.0" version.
TARGET: Match Cortado's footer — cleaner, more organized.

Changes:
- Update version from "v8.0" to "v13" in the bottom bar.
- Keep 4-column structure but add slightly more padding.
- Column headers: `text-xs font-semibold uppercase tracking-widest text-[var(--foreground)]` (currently these might be too dim).
- Links: `text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors`.
- Bottom bar: Left side "© 2026 VeilSub. Built on Aleo." Right side: "veilsub_v13.aleo" as a monospace link to explorer.
- Add a subtle border-top on the entire footer container.

### Phase 5: Subtle Background Particles (Cortado-style)

**New file: `frontend/src/components/BackgroundParticles.tsx`**

Create a lightweight decorative component that renders 10-15 small dots (2-3px circles) scattered across the viewport at random positions. Each dot should be a different shade of purple with very low opacity (0.05-0.15). Some should pulse slowly. Some should be static. This is NOT a canvas-based particle system — just simple absolute-positioned divs with CSS animations. It adds the cosmic feel that Cortado has.

Place this component in the root layout so it appears on all pages, behind all content (use `fixed inset-0 pointer-events-none z-0`).

Keep it very subtle. If it draws attention, it's too much. The user should barely notice it consciously but feel the page is "alive."

### Phase 6: App Page Polish (Dashboard, Creator, Explorer, Verify)

These pages don't need full redesigns — just apply the updated design tokens:

**Dashboard** (`/dashboard/page.tsx`):
- Cards should use updated GlassCard with shadows and hover lift.
- Stats should use the same bold typography from the landing stats row.

**Creator page** (`/creator/[address]/page.tsx`):
- Creator header area: Make the address text monospace and slightly larger.
- Subscription tiers: Show as distinct cards with the tier name prominent.
- Content feed: Each post card should use GlassCard with clear separation.

**Explorer** (`/explore/page.tsx`):
- Creator cards in the grid should have the hover lift effect.
- Search input should match the landing page search styling.

**Verify** (`/verify/page.tsx`):
- The verification result should be dramatic — green glow on success, red on failure.
- Add a subtle animation (scale + fade) when the result appears.

### Phase 7: Modal Polish

**All modal components** in `/src/components/modals/` and `/src/components/`:
- Backdrop: Use `bg-black/60 backdrop-blur-sm` (slight blur, not heavy).
- Modal card: `bg-[var(--surface-1)]`, `border border-[rgba(255,255,255,0.08)]`, `rounded-xl`, `shadow-2xl`.
- Close button: Top-right, subtle X icon.
- Entrance animation: Scale from 0.95 to 1.0 with opacity 0 to 1, duration 200ms.
- Exit animation: Scale to 0.95 with opacity to 0, duration 150ms.

### Phase 8: Loading States Upgrade

**All components with loading states:**
- Replace basic `animate-pulse` gray rectangles with a gradient sweep skeleton:
```css
.skeleton {
  background: linear-gradient(90deg, var(--surface-1) 25%, var(--surface-2) 50%, var(--surface-1) 75%);
  background-size: 200% 100%;
  animation: gradient-sweep 1.5s ease infinite;
}
```
- This gives a shimmer effect to loading skeletons instead of the boring pulse.

---

## EXECUTION ORDER

1. **Phase 1** — Update globals.css tokens (5 min, zero risk)
2. **Phase 3** — Upgrade GlassCard component (10 min, affects all cards)
3. **Phase 2** — Upgrade Button component (10 min)
4. **Phase 5** — Add BackgroundParticles (15 min, new component)
5. **Phase 4** — Landing page redesign (30-45 min, most complex)
6. **Phase 8** — Loading states (10 min)
7. **Phase 6** — App page polish (20 min)
8. **Phase 7** — Modal polish (15 min)

**Run `npm run build` after EVERY phase. Fix any TypeScript errors before moving on.**

---

## WHAT NOT TO DO

- Do NOT change any routing, page structure, or component hierarchy
- Do NOT modify useVeilSub.ts, useCreatorStats.ts, or any hook logic
- Do NOT touch API routes (/api/*)
- Do NOT change wallet adapter integration
- Do NOT add heavy animation libraries (no GSAP, no Three.js)
- Do NOT add images or external assets (keep it CSS/SVG only)
- Do NOT change the color from purple — it's the brand identity
- Do NOT make it look like a portfolio site (Portfolite is reference for typography only, not layout)
- Do NOT use gradients excessively — max 2-3 gradient elements on any page
- Do NOT add light mode — dark only
- Do NOT break mobile responsiveness

---

## SUCCESS CRITERIA

After all changes, the frontend should:
1. Feel as polished and premium as Cortado/Setrex when a judge lands on it
2. Have subtle depth (shadows on cards, not just flat borders)
3. Have a sense of life (particles, hover effects, micro-interactions)
4. Load fast (no heavy assets, CSS-only decorations)
5. Build with zero TypeScript errors
6. Work perfectly on mobile (test bottom nav, modals, wallet flow)
7. Show accurate v13 stats in all visible places (transitions count, version number, etc.)
8. Make a judge think "this team takes design seriously" within 3 seconds of loading

---

## CURRENT FILE INVENTORY (For Reference)

Design system files:
- `frontend/src/app/globals.css` — CSS tokens, keyframes, global styles
- `frontend/src/app/layout.tsx` — Root layout, fonts, providers
- `frontend/src/components/ui/Button.tsx` — Button component (3 variants)
- `frontend/src/components/ui/Badge.tsx` — Badge/tag component
- `frontend/src/components/ui/Container.tsx` — Max-width wrapper (1120px)
- `frontend/src/components/ui/SectionHeader.tsx` — Section title component
- `frontend/src/components/GlassCard.tsx` — Card component (3 variants)
- `frontend/src/components/Header.tsx` — Navigation header
- `frontend/src/components/MobileBottomNav.tsx` — Mobile bottom nav
- `frontend/src/components/PageTransition.tsx` — Route transition wrapper

Landing page:
- `frontend/src/app/page.tsx` — 451 lines, 9 sections

App pages:
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/creator/[address]/page.tsx`
- `frontend/src/app/explore/page.tsx`
- `frontend/src/app/verify/page.tsx`
- `frontend/src/app/docs/page.tsx`
- `frontend/src/app/privacy/page.tsx`

Modals:
- `frontend/src/components/SubscribeModal.tsx`
- `frontend/src/components/RenewModal.tsx`
- `frontend/src/components/TipModal.tsx`
- `frontend/src/components/RefundRequestModal.tsx`
- `frontend/src/components/TierCreationDialog.tsx`

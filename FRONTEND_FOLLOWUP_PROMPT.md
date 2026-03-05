# VeilSub Frontend Follow-Up Prompt — Live Site Analysis Corrections

> **Context**: This is a FOLLOW-UP to `FRONTEND_REDESIGN_PROMPT.md`. The original prompt was written from screenshots only. This prompt contains corrections and additional details from actually visiting and inspecting the three reference sites live. Apply these changes ON TOP of whatever work the original prompt produced.

---

## CRITICAL CORRECTIONS FROM LIVE SITE VISITS

### What the original prompt got WRONG or MISSED:

---

## 1. SETREX (https://setrex-saas-template.webflow.io/)

### Exact Design Tokens Extracted from Live CSS:
```
Body background:       rgb(1, 1, 4)        — NOT pure black, it's a deep blue-black
Body font:             "BDO Grotesk", Arial, sans-serif
Hero font size:        62px
Hero font weight:      500 (medium, NOT bold)
Hero letter-spacing:   -3.72px  — THIS IS KEY: very tight negative tracking
Hero line-height:      70px
Accent color:          rgb(207, 254, 37)    — lime-green (#CFFE25)
Secondary accent:      rgb(243, 255, 155)   — lighter lime for hover states
Tertiary accent:       rgb(216, 247, 214)   — soft sage for badges/tags
Card background:       rgb(13, 13, 16)      — NOT transparent, solid dark
Card border-radius:    24px
Card padding:          60px (very generous)
Card box-shadow:       rgba(0, 0, 0, 0.3) 0px 24px 24px 0px
Button border-radius:  100px (full pill shape)
Button padding:        11px 24px
Nav background:        transparent (floats on hero)
```

### Key Patterns the Original Prompt Missed:

1. **Bento Grid Layout**: The social proof section uses an asymmetric bento grid — one tall testimonial card (left) paired with two stacked stat cards (right: "15+ Years" and "98% Client Satisfaction"). This is NOT a simple 3-column grid. Implement this for VeilSub's stats section.

2. **Badge Design**: Section label badges (e.g., "CEO's Words", "Years of experiences", "Client satisfaction rate") use `background: rgba(216, 247, 214, 0.15)` with `color: rgb(216, 247, 214)` and `border-radius: 100px`. They're positioned in the TOP-RIGHT corner of cards, not centered.

3. **Integration Icons Section**: A horizontal strip of grayscale logo icons in individual cells with subtle borders — scrolls horizontally. Below the features section.

4. **Pricing Card Highlight**: The "Most Popular" plan has a FULL lime-green background (`rgb(207, 254, 37)`) with BLACK text — not a subtle outline. The non-highlighted plan stays dark. This creates extreme contrast. For VeilSub's tier display, consider highlighting the recommended tier similarly with the purple accent.

5. **FAQ Accordion**: Items have a subtle left border that activates (becomes the accent green) when expanded. The chevron rotates 180° smoothly.

6. **CTA Section (Bottom)**: Shows a Figma/design tool screenshot on the LEFT (proving the product works) with a pill badge + headline + dual buttons on the RIGHT. This is an excellent pattern for VeilSub — show a testnet transaction screenshot next to the CTA.

7. **Hover Interactions I Observed**:
   - Cards: subtle `translateY(-4px)` lift + shadow deepens
   - Buttons: background shifts from lime to lighter lime (`rgb(243, 255, 155)`)
   - Nav links: `color` transition over 0.3s
   - Logo ticker: continuous CSS marquee animation (infinite scroll)

---

## 2. CORTADO (https://cortado.framer.website/)

### Exact Design Tokens Extracted from Live CSS:
```
Body background:       rgb(2, 0, 5)         — NOT black, it's a deep PURPLE-black
Card background:       rgb(8, 4, 18)        — subtle purple undertone
Heading font:          "Poppins", sans-serif
Heading size:          60px
Heading weight:        400 (light/regular, NOT bold)
Heading letter-spacing: -1.2px
Accent color:          rgba(136, 85, 255)   — medium purple (#8855FF)
Card borders:          rgba(255, 255, 255, 0.1) — 10% white border
Button bg:             transparent with white border
Button text:           white
```

### Key Patterns the Original Prompt Missed:

1. **Radial Gradient Hero Background**: The hero has a subtle RADIAL GRADIENT emanating from center — a soft purple glow (`rgba(136, 85, 255, ~0.15)`) that fades to the dark body color. This is NOT just a flat dark background. This is the most important atmospheric detail.

   **For VeilSub**: Add a radial gradient to the hero section:
   ```css
   background: radial-gradient(ellipse at 50% 30%, rgba(139, 92, 246, 0.12) 0%, transparent 70%);
   ```

2. **Sticky Navbar with Blur**: The nav becomes sticky on scroll with `backdrop-filter: blur(12px)` and a semi-transparent background. The original prompt may have missed that it TRANSITIONS from transparent to blurred.

3. **Feature Grid with Icon Badges**: 9 features arranged in a 3x3 grid. Each feature has a small icon in a dark rounded square badge (`rgb(8, 4, 18)` bg with white 10% border) followed by a single-line description. Very compact, no cards — just icon + text inline. This is a superior pattern for showing many features without visual bulk.

   **For VeilSub**: Apply this to the "How It Works" or features section — replace large cards with compact icon + text rows in a 3-column grid.

4. **Integration Tree Visualization**: Company logos at the top connect via CURVED purple SVG lines (like tree branches) down to the Cortado logo at the bottom. This creates a visual "hub-and-spoke" graphic. Very impressive and unique.

   **For VeilSub**: Consider a similar visual showing wallets (Shield, Leo, Fox, Puzzle, Soter) connecting via purple lines to VeilSub's logo. This would be unique in the buildathon.

5. **Pricing Cards**: Clean, minimal — no background color shift for the highlighted plan. Instead, both cards have the same dark bg with white border. The difference is in the button — "Start Now" (outlined) vs "Buy Now" (filled white). Subtlety over contrast.

6. **Footer**: 4-column link grid (Company, Account, More, Legal) with social icons (Dribbble-style circular icons) in the bottom-left. Very organized. The copyright is bottom-right.

7. **Purple Circle Logo**: The Cortado "O" is a circle with a purple gradient arc — it matches the accent color and creates brand consistency. VeilSub's purple "V" logo should similarly match the accent.

---

## 3. PORTFOLITE (https://portfolite.framer.website/)

### Exact Design Tokens Extracted from Live CSS:
```
Body background:       rgb(0, 0, 0)         — true black
Card background:       rgb(10, 10, 10)      — barely-off-black
Glassmorphism bg:      rgba(10, 10, 10, 0.4) + backdrop-filter
Heading font:          "Satoshi", sans-serif
Heading size:          74px (largest of all 3 sites)
Heading weight:        400 (regular)
Card border-radius:    40px (very generous, more than Setrex's 24px)
Pill radius:           120px
Button border:         rgba(255, 255, 255, 0.65)
Tag bg:                rgba(99, 99, 99, 0.3)
Prominent shadow:      rgba(92, 92, 92, 0.3) 0px 0px 20px 4px — soft gray glow
Deep shadow:           rgba(0, 0, 0, 0.4) 16px 24px 20px 8px
```

### Key Patterns the Original Prompt Missed:

1. **Organic Fluid/Smoke Background**: The hero and CTA footer both have an ANIMATED organic smoke/fluid mesh effect. This is the most visually distinctive element of all 3 sites. It's a CSS/canvas-based fluid distortion with soft white/gray wisps floating over the black background. This creates incredible depth and sophistication.

   **For VeilSub**: This is the single highest-impact addition. Options:
   - Use a CSS mesh gradient with animation: `background: conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.03), transparent, rgba(255,255,255,0.05), transparent)`
   - Or use a pre-rendered dark smoke video/image as a background with `mix-blend-mode: screen`
   - Or create a canvas-based fluid simulation (more complex but most impressive)

   Apply to: hero section AND the bottom CTA section for visual bookending.

2. **"Scroll Down" Indicator**: Between hero and content, there's a horizontal line with a mouse icon in the center and "Scroll down" text on the left, "to see projects" on the right. This is a clever way to guide users. VeilSub could use: "Scroll down — to explore privacy" with a lock icon.

3. **Glassmorphism "View Casestudy" Buttons**: Overlaid on project images at the bottom, these use:
   ```css
   background: rgba(255, 255, 255, 0.65);
   backdrop-filter: blur(8px);
   border-radius: 120px;
   color: black;
   ```
   They sit INSIDE the image card, not below it. This creates a sophisticated overlay effect.

4. **Skill Tags**: The "About" section uses rounded pill tags (`border-radius: 120px`, `background: rgba(99, 99, 99, 0.3)`) for listing skills. These are semi-transparent with white text.

   **For VeilSub**: Use this pattern for showing feature tags on the landing page (e.g., "Zero-Knowledge", "Private Subscriptions", "Encrypted Content", "Aleo Blockchain").

5. **Experience Table**: Work history displayed in a clean 3-column table format: Role | Company | Duration. Uses horizontal dividers (1px white lines at 10% opacity) between rows. No card wrappers — just clean tabular data.

6. **Numbered Process Steps**: Cards with a number badge (1, 2, 3) in the top-right corner using `background: rgb(59, 59, 59)` and `border-radius: 26px`. Each step has an icon, title, and description.

   **For VeilSub**: Apply numbered step badges to the "How It Works" section.

7. **Stats Row**: "180+", "96%", "15+" displayed in a single wide card with generous padding. Numbers are large (~48px) and white, labels are smaller and gray. The layout is a triangular pattern (2 on top, 1 centered below).

8. **Image Treatment**: ALL images are grayscale/desaturated, maintaining the monochrome aesthetic. They use `border-radius: 40px` matching the card radius. Images have a subtle glow: `rgba(92, 92, 92, 0.3) 0px 0px 20px 4px`.

9. **CTA Footer with Smoke**: The bottom CTA repeats the smoke effect from the hero, creating visual symmetry. It includes a pill badge ("Available For Work"), large text, a glassmorphism "Book a Free Call" button, and social icons separated by vertical dividers (`|`).

---

## COMBINED ACTION ITEMS FOR CLAUDE CODE CLI

### PRIORITY 1 — Highest Visual Impact

**A. Add Radial Gradient Glow to Hero** (from Cortado)
In the landing page hero section, add:
```css
.hero-section {
  position: relative;
}
.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 20%, rgba(139, 92, 246, 0.10) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}
```

**B. Add Organic Smoke/Fluid Effect** (from Portfolite)
Create a `SmokeBackground.tsx` component using CSS mesh gradients:
```css
.smoke-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.03) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.05) 0%, transparent 50%);
  filter: blur(40px);
  animation: smokeFloat 20s ease-in-out infinite alternate;
}
@keyframes smokeFloat {
  0% { transform: translateX(0) translateY(0) scale(1); }
  100% { transform: translateX(20px) translateY(-15px) scale(1.05); }
}
```
Use in BOTH hero and footer CTA sections.

**C. Increase Card Border-Radius** (from Portfolite)
Current VeilSub cards likely use `border-radius: 12px-16px`. Change to:
- Feature cards / GlassCard: `border-radius: 24px` (Setrex standard)
- Large wrapper cards: `border-radius: 40px` (Portfolite standard)
- Buttons/badges: `border-radius: 100px` or `120px` for full pill

**D. Card Shadows** (from Setrex + Portfolite)
Replace flat borders with layered shadows:
```css
.glass-card {
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 24px 48px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(92, 92, 92, 0.08);
}
.glass-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 0 0 1px rgba(139, 92, 246, 0.15),
    0 32px 64px rgba(0, 0, 0, 0.4),
    0 0 30px rgba(139, 92, 246, 0.08);
}
```

### PRIORITY 2 — Layout & Component Improvements

**E. Tighten Hero Typography** (from all 3 sites)
All three sites use VERY tight letter-spacing on headlines:
- Setrex: `-3.72px` on 62px font
- Cortado: `-1.2px` on 60px font
- Portfolite: `normal` but light weight (400)

Apply to VeilSub hero heading:
```css
h1 {
  letter-spacing: -2px;
  font-weight: 500;  /* medium, not bold */
  line-height: 1.1;
}
```

**F. Add Pill Badge Component** (from all 3 sites)
All 3 sites use a pill badge above the hero headline. VeilSub may already have this. Ensure it looks like:
```css
.pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  border-radius: 100px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}
.pill-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(139, 92, 246);
}
```

**G. Bento Grid for Stats** (from Setrex)
Replace the current stats row with an asymmetric bento layout:
```
┌──────────────────────┬───────────────┐
│                      │  27           │
│  "Zero-footprint     │  Transitions  │
│   verification       │  on-chain     │
│   means nobody       ├───────────────┤
│   sees your sub"     │  7            │
│                      │  Record Types │
│  — VeilSub Team      │  private      │
└──────────────────────┴───────────────┘
```

**H. Feature Grid — Compact Icon+Text Rows** (from Cortado)
Replace bulky feature cards with a 3×3 compact grid:
```
[🔒] Private Subscriptions    [🔗] On-Chain Verification    [🎁] Subscription Gifting
[👤] Creator Custom Tiers     [📱] 5-Wallet Support          [💰] Platform Fees
[🔄] Subscription Renewal     [🗑️] Content Lifecycle         [🛡️] Zero Footprint
```
Each item: small icon in a dark pill (32×32px), single-line text, no card wrapper.

**I. Scroll Indicator** (from Portfolite)
Add between hero and first content section:
```html
<div class="scroll-indicator">
  <span>Scroll down</span>
  <div class="line"></div>
  <svg><!-- mouse/lock icon --></svg>
  <div class="line"></div>
  <span>to explore privacy</span>
</div>
```
Style: `rgba(255,255,255,0.3)` text, 1px white line at 10% opacity.

**J. Wallet Connection Visualization** (inspired by Cortado's integration tree)
Create an SVG showing VeilSub logo at center with curved purple lines connecting to 5 wallet icons (Shield, Leo, Fox, Puzzle, Soter) arranged in an arc above. This is a unique visual that no buildathon competitor has.

### PRIORITY 3 — Micro-Interactions & Polish

**K. Logo Ticker**: Ensure the wallet/partner logo ticker uses CSS `animation: marquee 30s linear infinite` with seamless loop (duplicate the logos). Setrex's ticker runs continuously.

**L. FAQ Accordion Left Border**: Add a 2px left border that transitions from `transparent` to `rgba(139, 92, 246, 0.8)` when an item is expanded.

**M. Glassmorphism Action Buttons** (from Portfolite):
For overlay buttons (like "View" on content cards in the app):
```css
.glass-action-btn {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(8px);
  border-radius: 120px;
  color: black;
  font-weight: 500;
  padding: 12px 24px;
}
```

**N. Body Background**: Change from pure `#08080a` to `rgb(2, 0, 5)` (Cortado's purple-black) or `rgb(1, 1, 4)` (Setrex's blue-black). This subtle purple undertone makes the purple accent feel more cohesive.

**O. CTA Footer**: Add the smoke/fluid effect to the bottom CTA section, repeating the hero visual. Include a pill badge ("Built on Aleo") + large text + dual buttons.

**P. Card Padding**: Increase card padding from current values to 40-60px (Setrex uses 60px). Cards should breathe.

---

## WHAT NOT TO CHANGE

1. **Keep the purple accent** (#8b5cf6 / rgb(139, 92, 246)) — it's closer to Cortado's purple than Setrex's lime-green. VeilSub's brand is purple, don't switch to green.
2. **Keep Inter font** — it's a good modern sans-serif. Don't switch to BDO Grotesk, Poppins, or Satoshi unless you want to try Satoshi (it's very clean).
3. **Keep existing component structure** — enhance the existing GlassCard, Button, Badge, Container components rather than rewriting from scratch.
4. **Keep Framer Motion animations** — just ensure transitions are smooth (0.3s ease for hovers, 0.5s for page transitions).
5. **Don't add grayscale images** — VeilSub is a SaaS platform, not a portfolio. Color is fine.

---

## EXECUTION ORDER

1. Body background color tweak (30 seconds)
2. Hero radial gradient glow (5 minutes)
3. Smoke/fluid background component (15 minutes)
4. Card border-radius + shadow upgrade (10 minutes)
5. Hero typography tightening (5 minutes)
6. Pill badge upgrade (5 minutes)
7. Bento stats grid (15 minutes)
8. Scroll indicator (10 minutes)
9. Compact feature grid (15 minutes)
10. FAQ accordion border (5 minutes)
11. CTA footer smoke effect (5 minutes — reuse from #3)
12. Card padding increase (5 minutes)
13. Wallet visualization SVG (20 minutes — stretch goal)

**Total estimated time: ~2 hours**

---

## SUCCESS CRITERIA

After applying these changes, VeilSub's landing page should:
- Have visible atmospheric depth (radial glow + smoke effect) — NOT a flat dark page
- Cards should appear to float with shadow depth — NOT sit flat with borders
- Typography should feel premium (tight tracking, medium weight) — NOT heavy/bold
- There should be at least one unique visual element (wallet tree or smoke bg) that screenshots well
- The overall feel should be "high-end SaaS" not "crypto project"

**Test by comparing screenshots side-by-side with the 3 reference sites. If VeilSub looks flat by comparison, increase the radial gradient opacity and card shadows.**

---

## SCROLL EXPERIENCE & ANIMATION — THE MISSING PIECE

> **Why this section exists**: The original prompt and corrections above cover static design tokens (colors, radii, shadows). But what makes these sites FEEL premium is how content enters the viewport as you scroll. Every single section on all 3 sites animates in. Nothing is just "there" when you scroll to it. This is the #1 thing that separates a buildathon project from a real product.

---

### THE UNIVERSAL PATTERN (All 3 Sites Use This)

Every section, card, heading, paragraph, and image follows the same core reveal pattern:

```
Initial state:  opacity: 0  +  translateY(40-50px)
Final state:    opacity: 1  +  translateY(0)
Trigger:        Element enters viewport (IntersectionObserver / scroll-into-view)
Duration:       0.4s — 0.6s
Easing:         ease-out (or cubic-bezier(0.25, 0.1, 0.25, 1))
```

**This is NOT optional.** Without scroll-reveal animations, the page feels dead. With them, it feels alive and intentional.

---

### SITE-SPECIFIC SCROLL BEHAVIOR

#### SETREX — Webflow IX2 System
- **Engine**: Webflow Interactions 2.0 — 160 `SCROLL_INTO_VIEW` events, 7 `SCROLLING_IN_VIEW` (continuous parallax)
- **Reveal direction**: Elements slide UP from below (`translateY(50px) → translateY(0)`)
- **Reveal timing**: Each element starts `opacity: 0` and fades in over ~0.5s
- **Stagger pattern**: Sibling elements within a section stagger by ~150-200ms. Example: heading appears, then 150ms later the subtitle, then 150ms later the CTA button
- **Stat counter animation**: Numbers like "15+", "98%" don't just appear — they COUNT UP from 0 when scrolling into view (e.g., 0 → 4 → 9 → 12 → 15+). Duration ~1.5s
- **Continuous scroll effects** (7 events): Logo ticker marquee runs at constant speed. Some decorative elements have subtle parallax (move slower than scroll)
- **Hover interactions** (13 events): Cards lift `translateY(-4px)` on hover with shadow deepening. Buttons shift color. Nav links transition color over 0.3s
- **Section pacing**: ~100-120px of blank space between major sections. Content doesn't feel cramped — there's visual breathing room

#### CORTADO — Framer Appear System
- **Engine**: Framer's built-in appear animations — 8 `data-framer-appear-id` elements
- **Reveal direction**: Elements slide DOWN from above (`translateY(-11px) → translateY(0)`) — opposite of Setrex! This creates a "settling" feel rather than "rising"
- **Hero particles**: A component called "Particles" renders animated dots in the hero — subtle floating particles that move independently
- **Stagger pattern**: More generous delays than Setrex. Elements appear one-by-one with ~200-300ms gaps
- **Section spacing**: Very generous — ~120-150px between sections. The page breathes heavily. Scrolling feels relaxed, not rushed
- **Nav transition**: Nav background transitions from fully transparent to `backdrop-filter: blur(12px)` + semi-transparent bg as you scroll past the hero. Smooth 0.3s transition
- **Overall rhythm**: Cortado feels SLOWER and more deliberate than Setrex. Fewer elements per viewport, more whitespace, elements appear gently. Premium SaaS feel

#### PORTFOLITE — Framer Appear + Canvas
- **Engine**: Framer appear animations — 21 `data-framer-appear-id` elements, 128 `will-change` elements, 2 `<canvas>` elements for smoke
- **Reveal direction**: Elements slide UP (`translateY(40px) and translateY(50px) → translateY(0)`)
- **Opacity animation**: `opacity: 0.001 → opacity: 1` (uses 0.001 instead of 0 — prevents rendering optimization skipping)
- **Duration values**: `0.4s`, `0.5s`, `0.6s` — slightly faster than Setrex
- **Stagger delays**: `0s, 0.2s, 0.5s, 0.8s, 1.0s, 1.1s` — much longer stagger chain than other sites. The hero section takes over 1 full second to fully reveal all elements
- **Canvas smoke**: 2 `<canvas>` elements render continuously animated smoke/fluid wisps. These are NOT triggered by scroll — they animate perpetually. The smoke moves slowly and organically with no abrupt changes
- **Process step cards**: Cards 1, 2, 3 stagger in with ~200ms gaps between each card
- **Service detail cards**: Each card slides up and fades in as it enters the viewport. With 4-5 cards vertically, this creates a "cascade" effect as you scroll
- **Stats section**: Numbers (180+, 96%, 15+) appear to count up when scrolling into view, similar to Setrex
- **FAQ accordion items**: Each FAQ row staggers in one-by-one as you scroll, creating a "building" effect
- **CTA footer**: Smoke canvas renders again, "Available For Work" pill badge fades in first, then the heading, then the button — same stagger pattern as the hero
- **Overall rhythm**: Portfolite is the most animation-heavy of the 3. Nearly every element has a reveal animation. But the timing is well-calibrated — nothing feels janky or excessive

---

### IMPLEMENTATION FOR VEILSUB (Framer Motion)

VeilSub uses React 19 + Framer Motion. Here's exactly how to implement all of the above:

#### 1. Create a Reusable `ScrollReveal` Wrapper

```tsx
// components/ScrollReveal.tsx
'use client';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;        // stagger delay in seconds
  duration?: number;     // animation duration
  direction?: 'up' | 'down';  // slide direction
  distance?: number;     // px to travel
  once?: boolean;        // animate only once
  className?: string;
}

export function ScrollReveal({
  children,
  delay = 0,
  duration = 0.5,
  direction = 'up',
  distance = 40,
  once = true,
  className = ''
}: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: '-80px 0px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0.001,
        y: direction === 'up' ? distance : -distance,
      }}
      animate={isInView ? {
        opacity: 1,
        y: 0,
      } : undefined}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1.0],  // smooth ease-out
      }}
    >
      {children}
    </motion.div>
  );
}
```

#### 2. Create a `StaggerContainer` for Sibling Groups

```tsx
// components/StaggerContainer.tsx
'use client';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface StaggerContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;   // delay between each child (seconds)
  className?: string;
}

export function StaggerContainer({
  children,
  staggerDelay = 0.15,
  className = ''
}: StaggerContainerProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px 0px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Use with motion.div children that have variants:
export const staggerChildVariants = {
  hidden: { opacity: 0.001, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] },
  },
};
```

#### 3. Create a `CountUp` Component for Stats

```tsx
// components/CountUp.tsx
'use client';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

interface CountUpProps {
  target: number;
  suffix?: string;  // "+", "%", etc.
  duration?: number;
}

export function CountUp({ target, suffix = '', duration = 1.5 }: CountUpProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px 0px' });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v).toString()),
    });
    return () => controls.stop();
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>{display}{suffix}</span>
  );
}
```

#### 4. Apply to Every Section on the Landing Page

**CRITICAL**: Wrap EVERY section's content in `ScrollReveal`. The pattern is:

```tsx
{/* Hero section — use stagger for pill, heading, subtitle, buttons */}
<section className="hero">
  <StaggerContainer staggerDelay={0.2}>
    <motion.div variants={staggerChildVariants}>
      <PillBadge>Built on Aleo</PillBadge>
    </motion.div>
    <motion.div variants={staggerChildVariants}>
      <h1>Private Creator Subscriptions</h1>
    </motion.div>
    <motion.div variants={staggerChildVariants}>
      <p>Subscribe. Verify. Stay invisible.</p>
    </motion.div>
    <motion.div variants={staggerChildVariants}>
      <ButtonGroup />
    </motion.div>
  </StaggerContainer>
</section>

{/* Feature cards — stagger the cards */}
<section className="features">
  <ScrollReveal>
    <SectionHeader />
  </ScrollReveal>
  <StaggerContainer staggerDelay={0.15} className="grid grid-cols-3">
    <motion.div variants={staggerChildVariants}><FeatureCard /></motion.div>
    <motion.div variants={staggerChildVariants}><FeatureCard /></motion.div>
    <motion.div variants={staggerChildVariants}><FeatureCard /></motion.div>
  </StaggerContainer>
</section>

{/* Stats — use CountUp for numbers */}
<ScrollReveal>
  <div className="stats-grid">
    <CountUp target={29} suffix="+" /> {/* Transitions */}
    <CountUp target={7} suffix="" />   {/* Record Types */}
    <CountUp target={22} suffix="+" /> {/* Mappings */}
  </div>
</ScrollReveal>

{/* FAQ items — stagger each accordion item */}
<StaggerContainer staggerDelay={0.1}>
  {faqItems.map(item => (
    <motion.div key={item.id} variants={staggerChildVariants}>
      <AccordionItem />
    </motion.div>
  ))}
</StaggerContainer>
```

#### 5. Section Spacing

Add generous vertical spacing between ALL major sections:

```css
section, [data-section] {
  padding-top: 100px;
  padding-bottom: 100px;
}

/* Even more space before/after hero and CTA */
.hero-section { padding-bottom: 120px; }
.cta-section { padding-top: 140px; }
```

This spacing is essential — it creates the "breathing room" that makes the scroll feel luxurious rather than cramped.

#### 6. Nav Blur Transition on Scroll

```tsx
// In Header component
const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 80);
  window.addEventListener('scroll', onScroll);
  return () => window.removeEventListener('scroll', onScroll);
}, []);

// Apply classes:
<nav className={cn(
  'fixed top-0 w-full z-50 transition-all duration-300',
  scrolled
    ? 'bg-black/60 backdrop-blur-xl border-b border-white/5'
    : 'bg-transparent'
)}>
```

---

### SCROLL ANIMATION CHECKLIST

Before considering the frontend done, verify ALL of these animate on scroll:

- [ ] Hero pill badge — fades in first
- [ ] Hero heading — fades in 0.2s after pill
- [ ] Hero subtitle — fades in 0.4s after pill
- [ ] Hero CTA buttons — fade in 0.6s after pill
- [ ] Scroll indicator — fades in 0.8s after pill
- [ ] Logo ticker — continuous marquee, no scroll trigger
- [ ] Stats section — numbers count up from 0
- [ ] Feature cards — stagger in with 0.15s gaps
- [ ] How It Works steps — stagger in with 0.2s gaps
- [ ] Pricing cards — stagger in with 0.15s gaps
- [ ] FAQ accordion items — stagger in with 0.1s gaps
- [ ] CTA footer — repeats hero stagger pattern
- [ ] Nav — transitions from transparent to blur on scroll
- [ ] Smoke/fluid background — animates continuously (not scroll-triggered)
- [ ] Cards on hover — `translateY(-4px)` lift with shadow change over 0.3s

**If ANY content appears without animating, it's a bug. Every visible element should have a scroll-reveal.**

---

### TIMING REFERENCE TABLE

| Element Type | Duration | Delay (stagger) | Distance | Easing |
|-------------|----------|-----------------|----------|--------|
| Section heading | 0.5s | 0s | 40px up | ease-out |
| Section subtitle | 0.5s | 0.15s | 40px up | ease-out |
| CTA buttons | 0.5s | 0.3s | 40px up | ease-out |
| Feature cards | 0.5s | 0.15s between | 40px up | ease-out |
| Process steps | 0.5s | 0.2s between | 40px up | ease-out |
| FAQ items | 0.4s | 0.1s between | 30px up | ease-out |
| Stat numbers | 1.5s count | 0s | n/a (count) | ease-out |
| Images | 0.6s | 0s | 50px up | ease-out |
| Pill badges | 0.4s | 0s (first item) | 30px up | ease-out |
| Nav blur | 0.3s | n/a | n/a | ease |
| Card hover lift | 0.3s | n/a | -4px up | ease |
| Smoke animation | 20s loop | n/a | continuous | ease-in-out |

---

### THE FEEL TEST

After implementation, scroll through the ENTIRE page slowly. Ask yourself:
1. Does content **reveal** as I scroll, or does it just sit there? → It MUST reveal
2. Do sibling elements appear **one after another** with slight delays? → They MUST stagger
3. Is there **enough breathing room** between sections (~100px+)? → There MUST be
4. Do stat numbers **count up** when I reach them? → They MUST count
5. Does the nav **blur** when I scroll past the hero? → It MUST blur
6. Does the smoke/fluid **move continuously** in hero and CTA? → It MUST move
7. Do cards **lift** when I hover? → They MUST lift

If the answer to ANY of these is "no", the scroll experience is incomplete.

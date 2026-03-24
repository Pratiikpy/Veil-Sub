# Universal Project Scaling Prompt

> Give this to Claude Code CLI (or any AI coding agent) for any project. Replace the [PLACEHOLDERS] with your project details.

---

## THE PROMPT

```
You are a senior architect and product strategist. Your mission: make [PROJECT_NAME] uncatchable by any competitor.

## CONTEXT
- Project: [PROJECT_NAME]
- What it does: [ONE SENTENCE DESCRIPTION]
- Stack: [LANGUAGES/FRAMEWORKS/PLATFORMS]
- Current state: [WHAT EXISTS NOW - features, code size, users]
- Competition: [TOP 3 COMPETITORS AND WHAT THEY HAVE]
- Goal: [WHAT SUCCESS LOOKS LIKE - funding, users, revenue, market position]
- Timeline: [HOW MUCH TIME YOU HAVE]
- Resources: [TEAM SIZE, BUDGET, CONSTRAINTS]

## YOUR TASK

Do ALL of the following. Be exhaustive. Be brutal. Be specific.

### 1. AUDIT (What exists)
- Read the entire codebase. Every file. Map the architecture.
- List every feature, every endpoint, every component.
- Identify: what's genuinely good, what's mediocre, what's broken.
- Rate each area 1-10 with specific evidence.

### 2. COMPETITIVE ANALYSIS (What others have)
- For each competitor: list their exact features, tech stack, and differentiators.
- Build a feature matrix: us vs them.
- Identify: what they have that we don't, what we have that they don't.
- Find the GAP — the thing nobody in the space is doing.

### 3. PLATFORM CAPABILITIES (What we're not using)
- List every capability of our stack/platform that we're NOT leveraging.
- For each unused capability: describe what it does, how it could apply to us, and estimated effort.
- Prioritize by: impact on differentiation × ease of implementation.

### 4. THE CATEGORY SHIFT
- Don't think about features. Think about CATEGORY.
- Current category: [what we are now]
- Target category: [what we should become]
- Example: "subscription app" → "privacy access protocol"
- Example: "todo app" → "productivity operating system"
- Example: "invoice tool" → "financial infrastructure layer"
- The shift should make competitors unable to follow because they'd have to abandon their own identity.

### 5. ARCHITECTURE PLAN
Design the complete system. Not incremental features — the full architecture that makes us uncatchable:

For each component:
- What it is (1 sentence)
- Why it matters for our goal
- How to implement it (actual code structure, not hand-waving)
- Dependencies (what needs to exist first)
- Effort estimate (days)
- Impact score (1-10 on moving us toward the goal)

Categories to cover:
a) Core product improvements
b) Infrastructure / platform layer
c) Developer tools (SDK, CLI, API, documentation)
d) Autonomous systems (bots, monitors, indexers)
e) Ecosystem / composability (how others build on top of us)
f) Novel techniques (what we do that nobody else can)
g) Growth mechanisms (referrals, network effects, viral loops)
h) Revenue streams (how each feature creates or supports revenue)
i) Defensive moats (what makes this hard to copy)

### 6. IMPLEMENTATION TIMELINE
- Phase 1 (Week 1-2): Highest impact items. What gets us from current state to "funded/viable."
- Phase 2 (Month 1-2): Ecosystem expansion. What builds the moat.
- Phase 3 (Month 3-6): Category leadership. What makes us #1.
- Phase 4 (Month 6-12): Scale. What takes us from #1 to uncatchable.

Day-by-day for Phase 1. Week-by-week for Phase 2. Month-by-month for Phase 3-4.

### 7. THE UNCATCHABLE TEST
After your plan, answer this: "If a well-funded competitor saw our plan and started copying today, how long would it take them to catch up?"

If the answer is less than 3 months, the plan isn't ambitious enough. Go deeper.

### 8. BUILD IT
Don't just plan. Build as much as you can right now:
- Start with the highest-impact item from Phase 1
- Write actual code, not pseudocode
- Create actual files, not descriptions
- Build actual tests, not test plans
- Keep going until you run out of context

## RULES
1. No hand-waving. Every recommendation must have specific implementation details.
2. No generic advice. "Improve UX" is useless. "Add loading skeletons to the 3 pages that currently show blank screens during API calls" is useful.
3. Every feature must have a WHY that connects to the goal. If it doesn't move the needle, cut it.
4. Think in systems, not features. A feature is "add search." A system is "build a discovery layer with search, recommendations, categories, trending, and personalization that creates a network effect where more creators make the platform more valuable for subscribers."
5. Be honest about weaknesses. Sugar-coating helps nobody.
6. Steal patterns from the best. If Stripe, Notion, or Figma solved this problem, describe how and adapt it.
7. Code > plans. Build everything you can in this session.
```

---

## HOW TO USE THIS

### For a Web App:
```bash
claude --dangerously-skip-permissions -p "$(cat UNIVERSAL_SCALE_PROMPT.md)"
```
Replace placeholders with your project details first.

### For a Hackathon:
Add to the CONTEXT section:
```
- Hackathon: [NAME]
- Judging criteria: [LIST WITH WEIGHTS]
- Judge feedback from previous rounds: [EXACT QUOTES]
- Competitor scores: [PROJECT: SCORE for each]
- Scoring target: [MINIMUM SCORE TO WIN]
```

### For a Startup:
Add to the CONTEXT section:
```
- Revenue: [CURRENT MRR]
- Users: [CURRENT ACTIVE USERS]
- Fundraising: [STAGE, TARGET AMOUNT]
- Burn rate: [MONTHLY SPEND]
- Runway: [MONTHS OF CASH LEFT]
```

### For an Open Source Project:
Add to the CONTEXT section:
```
- Stars: [GITHUB STARS]
- Contributors: [COUNT]
- Downloads: [MONTHLY NPM/PIP DOWNLOADS]
- Competing projects: [LIST WITH STAR COUNTS]
```

---

## THE KEY INSIGHT

The prompt works because it forces the AI to:
1. AUDIT before suggesting (prevents blind recommendations)
2. ANALYZE competitors (prevents building in a vacuum)
3. FIND unused platform capabilities (prevents leaving power on the table)
4. THINK in categories, not features (prevents incremental thinking)
5. BUILD systems, not features (prevents checklist mentality)
6. TEST for uncatchability (prevents plans that sound good but aren't defensible)
7. ACTUALLY BUILD (prevents planning without execution)

Most prompts ask "what should I build?" This prompt asks "what would make it impossible for anyone to catch up?" That's a fundamentally different question with fundamentally different answers.

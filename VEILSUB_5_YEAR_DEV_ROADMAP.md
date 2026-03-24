# VeilSub: 5-Year Developer Roadmap
### Pure code. No money. No meetings. No marketing. Just building.

---

## Current State (March 2026)

```
7 Leo programs, 57 transitions, 30 mappings
8 crypto primitives (Poseidon2, BHP256, Pedersen, group ops, ECDSA, signatures, ChaCha, sealed commits)
3 token standards (Credits, USDCx, USAD)
@veilsub/sdk (111 tests), @veilsub/cli (11 commands), monitor bot
15 pages, 85 components, 21 hooks, 509 tests
Design system with 130+ tokens, command palette, content encryption
```

Everything below is pure coding work. No fundraising, no partnerships, no hiring. One developer with unlimited time.

---

## YEAR 1: Complete the Product (Months 1-12)

### Month 1: Deploy & Prove

**Week 1-2: Testnet Deployment**
- `leo build` all 7 programs
- `leo deploy` all 7 programs to Aleo testnet
- Write deployment scripts (bash) that execute every transition type
- Execute 50+ transactions across all programs (subscribe with Credits, USDCx, USAD, blind subscribe, tip, commit-reveal tip, gift, redeem, verify, create audit token, publish content, publish encrypted content, dispute, prove threshold, trial, transfer pass, create tier, update tier, deprecate tier, withdraw fees, withdraw revenue, lottery, review, ECDSA identity link, signature verify)
- Screenshot every AleoScan transaction page
- Write `scripts/deploy.sh` and `scripts/execute-all.sh` for repeatable deployment

**Week 3-4: SDK Polish & Publish**
- Run `npm publish` for @veilsub/sdk on npmjs.com
- Write real integration examples that actually work (not pseudo-code)
- Add JSDoc comments to every exported function
- Add `examples/` directory with 5 runnable Node.js scripts:
  - `subscribe.js` — subscribe to a creator
  - `verify.js` — verify an AccessPass
  - `query.js` — query on-chain mappings
  - `tip.js` — send a private tip
  - `audit.js` — create a scoped audit token
- Publish @veilsub/cli to npm
- Write man pages / help text for all CLI commands

### Month 2: Frontend Missing Flows

**The 5 flows that don't exist yet:**

1. **My Feed page** (`/feed`)
   - Aggregated content from all subscribed creators
   - Sorted by recency
   - Blur-locked posts with "Subscribe to read" CTA
   - Infinite scroll with skeleton loading
   - Filter by creator
   - This is the Patreon Home page. The most-used feature on any subscription platform. It doesn't exist in VeilSub.

2. **Post-subscription redirect flow**
   - After successful subscription: modal closes → redirect to creator's content tab → newly unlocked posts highlighted with subtle glow → toast "You're subscribed! Here's your exclusive content."
   - Currently: modal shows hash, user is stranded.

3. **Post-verification redirect flow**
   - After successful verification: show list of unlocked content → "Go to Feed" button → redirect to /feed with this creator's content
   - Currently: shows "Verified!" and nothing else.

4. **One-click renewal**
   - On /subscriptions page: "Renew" button pre-fills tier, amount, duration from existing pass
   - Currently: links to /creator/[address] where user has to manually find their tier.

5. **Content unlock animation**
   - When a blur-locked post gets unlocked (after subscription or verification): blur dissolves with a 0.5s animation, content fades in
   - Currently: page refreshes and shows unblurred content with no transition.

### Month 3: Content System

**Rich content features that make creators actually want to use VeilSub:**

- **Image uploads** — Upload images to Supabase Storage, embed in posts via the Tiptap editor. Resize, crop, alt text.
- **Video embeds** — YouTube, Vimeo, and direct video URL support. Lazy-loaded with poster images.
- **Content scheduling** — Set publish date/time. Stored in Redis, published by a cron job or serverless function.
- **Draft system** — Save drafts, edit later, preview before publishing. Drafts stored in Redis with TTL.
- **Content categories/tags** — Creators tag posts (art, tutorial, update, exclusive). Subscribers filter by tag in /feed.
- **Reading time estimate** — Word count / 200 = minutes. Shown on every post card.
- **Content search** — Full-text search across subscriber's accessible posts. Client-side with Fuse.js (no server needed, privacy preserved).

### Month 4: Notifications & Real-time

- **Email notifications via Resend or Postmark** (free tier):
  - New subscriber notification (to creator)
  - Content published notification (to subscribers)
  - Subscription expiring in 3 days (to subscriber)
  - Subscription expired (to subscriber)
  - Tip received (to creator)
  - Dispute filed (to creator)
- **In-app notification center** (NotificationBell component already exists):
  - Wire to Supabase Realtime (already set up)
  - Show unread count badge
  - Click to see notification list
  - Mark as read, mark all as read
  - Notification preferences page (which emails to receive)

### Month 5: Creator Analytics Dashboard

**Real analytics, not demo data:**

- **Subscriber growth chart** — Line chart showing subscriber count over time. Data from on-chain subscriber_count mapping, polled daily by the monitor bot and stored in Supabase.
- **Revenue chart** — Bar chart showing revenue by day/week/month. Data from total_revenue mapping.
- **Revenue by tier** — Pie chart showing which tiers earn the most.
- **Content performance** — Table showing each post's view count (from API logs), subscriber unlocks, and time spent.
- **Churn tracking** — How many subscriptions expired without renewal this month.
- **Geographic heat map** — Anonymous, aggregated. Based on API request origins (country-level, not IP-level).
- All charts built with Recharts (already a dependency).

### Month 6: Mobile App

- **React Native app** using Expo
- Screens: Feed, Explore, Creator Profile, Subscriptions, Verify, Settings
- Wallet connection via WalletConnect or deep link to Shield Wallet mobile
- Push notifications via Expo Notifications
- Biometric lock (FaceID/TouchID) for wallet access
- Offline mode: cache feed content, sync when online
- App Store + Play Store submission (free accounts sufficient for testing)

### Month 7: Fiat On-Ramp

- **Integrate MoonPay, Transak, or Ramp** (all have free sandbox/testnet modes):
  - User clicks "Subscribe with Card"
  - On-ramp widget opens
  - User pays with credit card → receives ALEO credits
  - Credits auto-sent to subscription transaction
  - All in one flow, no manual token management
- **Alternative: Stripe Checkout → Bridge**
  - Stripe processes fiat payment
  - Backend converts to ALEO via bridge API
  - Sends subscription transaction on behalf of user
  - User never touches crypto directly

### Month 8: Content Import

- **Patreon import tool**:
  - User exports Patreon data (available via Patreon settings)
  - Upload JSON/CSV to VeilSub
  - Parser creates: creator profile, tiers (mapped from Patreon tiers), posts (mapped from Patreon posts)
  - Images downloaded and re-uploaded to Supabase Storage
  - One-click migration

- **Substack import tool**:
  - Parse Substack RSS feed
  - Extract posts, images, categories
  - Create as VeilSub content

- **WordPress import**:
  - Parse WordPress export XML (WXR format)
  - Map categories → tags, posts → content, pages → about section

### Month 9: "Login with VeilSub"

**The composability play — pure code, no partnerships needed:**

- **React component library**: `@veilsub/react`
  ```tsx
  import { VeilSubGate, VeilSubButton } from '@veilsub/react'

  // Gate content behind VeilSub subscription
  <VeilSubGate creatorHash="..." minTier={2} fallback={<PaywallUI />}>
    <ExclusiveContent />
  </VeilSubGate>

  // Add subscribe button to any site
  <VeilSubButton creatorHash="..." tier={1} />
  ```

- **Next.js middleware**: check VeilSub subscription server-side
  ```ts
  import { withVeilSub } from '@veilsub/next'
  export default withVeilSub({ creatorHash: '...', minTier: 2 })
  ```

- **Express middleware**: same for Node.js backends
  ```ts
  import { requireVeilSub } from '@veilsub/express'
  app.get('/premium', requireVeilSub({ creatorHash: '...' }), handler)
  ```

- **WordPress plugin**: PHP plugin that adds VeilSub paywall shortcode
  ```
  [veilsub_gate creator="..." tier="2"]Premium content here[/veilsub_gate]
  ```

- **Discord bot**: Node.js bot that verifies VeilSub subscriptions for role assignment
  ```
  /verify → connects wallet → checks AccessPass → assigns "Subscriber" role
  ```

### Month 10: Performance & Testing

- **Lighthouse score 95+** on all pages
- **Bundle analysis**: identify and code-split heavy imports
  - Dynamic import for Tiptap editor (only on /dashboard)
  - Dynamic import for Recharts (only on /analytics, /dashboard)
  - Dynamic import for modals (lazy-loaded on open)
  - Tree-shake unused Framer Motion features
- **Target: <300KB initial JS bundle** (gzipped)
- **E2E tests with Playwright**:
  - Test every page loads without errors
  - Test subscription flow (mock wallet)
  - Test content creation flow
  - Test verification flow
  - Test all modals open and close
  - Run in CI on every PR
- **Visual regression tests**:
  - Screenshot every page at 1280px and 390px
  - Compare against baseline
  - Flag visual differences in PR
- **Accessibility tests**:
  - axe-core integration in CI
  - WCAG AA compliance verified on every build
  - Keyboard navigation tested for all interactive elements

### Month 11: Security Hardening

- **Contract security audit** (self-performed):
  - Fuzz test every transition with random inputs
  - Test every error code path
  - Verify all Mapping::get_or_use fallbacks are correct
  - Check for integer overflow in fee calculations
  - Verify nonce replay prevention is complete
  - Test revocation enforcement across all verify transitions
  - Document threat model in SECURITY.md
- **Frontend security**:
  - CSP headers (remove unsafe-inline if possible with Next.js 16)
  - CORS configuration audit
  - Rate limiting on all API routes
  - Input sanitization on all user inputs (Tiptap content, form fields)
  - XSS prevention audit
  - Supabase RLS policies review
- **SDK security**:
  - No secrets in published package
  - All user inputs validated before transaction construction
  - Error messages don't leak sensitive information

### Month 12: Developer Documentation Site

- **docs.veilsub.com** (Next.js static site, deployed on Vercel):
  - Getting Started (5-minute quickstart)
  - SDK Reference (auto-generated from TypeScript types using TypeDoc)
  - CLI Reference (all commands with examples)
  - Contract Reference (all 57 transitions across 7 programs)
  - Integration Guides:
    - "Add VeilSub paywall to your Next.js app"
    - "Gate Discord channels with VeilSub"
    - "Add VeilSub to WordPress"
    - "Build a custom integration with the SDK"
  - Privacy Model (technical deep-dive for developers)
  - Architecture Overview (system diagram, data flow)
  - API Reference (all REST endpoints)
  - Changelog (auto-generated from git tags)
- **Interactive playground**:
  - Embedded CodeSandbox/StackBlitz with @veilsub/sdk pre-installed
  - "Try it" buttons next to every code example
  - Live testnet queries (query mappings from the browser)

---

## YEAR 2: Platform Infrastructure (Months 13-24)

### Month 13-14: GraphQL API

- **Apollo Server or Yoga** on top of existing Next.js API routes
- Schema covering:
  - Creators (profile, tiers, content, stats)
  - Subscriptions (active, expired, renewal status)
  - Content (posts, comments, tags)
  - Governance (proposals, votes, results)
  - Marketplace (auctions, bids, reputation)
  - On-chain data (mapping queries, transaction history)
- **Subscriptions** (WebSocket) for real-time updates:
  - New content published
  - Subscription status changes
  - Governance vote updates
  - Auction bid updates
- **Rate limiting per API key** (free tier: 1000 req/day, paid: unlimited)
- **API key management** in developer dashboard

### Month 15-16: Multi-Chain Payments

- **Ethereum bridge**:
  - Smart contract on Ethereum that accepts ETH/USDC
  - Relayer service watches Ethereum events, triggers Aleo subscription
  - User pays on Ethereum, receives AccessPass on Aleo
  - Bridge contract: Solidity, deployed to testnet (Sepolia)
  - Relayer: Node.js service using ethers.js

- **Solana bridge** (same pattern):
  - Anchor program on Solana accepting SOL/USDC
  - Relayer triggers Aleo subscription
  - User pays on Solana, receives AccessPass on Aleo

- **Frontend integration**:
  - Wallet selector: "Pay with Aleo | Ethereum | Solana"
  - MetaMask/Phantom wallet connection
  - Bridge status shown in transaction stepper

### Month 17-18: Content Delivery Network

- **Encrypted CDN for media content**:
  - Images and videos encrypted with AES-256-GCM before upload
  - Stored on Cloudflare R2 or AWS S3 (both have free tiers)
  - CDN serves encrypted blobs
  - Client decrypts in browser using key derived from AccessPass
  - Server never sees plaintext media
  - On-chain encryption_commitment verifies integrity

- **IPFS integration** (optional, for decentralization):
  - Content CID stored on-chain in content_hashes mapping
  - Encrypted content pinned to IPFS via Pinata (free tier: 1GB)
  - Client fetches from IPFS gateway, decrypts locally
  - Fully decentralized content delivery

### Month 19-20: Creator Token Framework

- **New Leo program: `veilsub_tokens_v1.aleo`**
  - Creators mint custom ARC-20 tokens
  - Tokens distributed to subscribers as rewards
  - Token-gated content (hold X creator tokens to access)
  - Token marketplace (trade creator tokens)
  - Revenue sharing (token holders get % of creator revenue)

- **Frontend**:
  - Token balance display on subscriber dashboard
  - Token claim interface ("You earned 50 $CREATOR tokens this month")
  - Token-gated content badges on posts
  - Creator token settings (supply, distribution rate, name, symbol)

### Month 21-22: DAO Governance v2

- **Upgrade veilsub_governance from demo to production**:
  - Real on-chain proposals (not hardcoded)
  - Voting weight based on subscription duration (longer subscribers have more weight)
  - Proposal types: fee change, feature request, content policy, treasury allocation
  - Quorum requirements (minimum votes for proposal to pass)
  - Time-locked execution (48h delay after passing before effect)
  - Delegation (delegate your vote to another subscriber)

- **Frontend**:
  - Proposal creation form with rich text description
  - Voting interface with real-time tallying
  - Proposal discussion (comments, linked to proposal ID)
  - Historical results with charts
  - Delegation management

### Month 23-24: AI Features (Local, Privacy-Preserving)

- **Content recommendation engine**:
  - Run entirely in the browser using TensorFlow.js
  - Model trained on user's own subscription/reading patterns
  - No data ever sent to server
  - Suggests: creators to subscribe to, content to read, optimal tier
  - "Because you subscribed to [Creator A], you might like [Creator B]"

- **Smart content assistant for creators**:
  - Local LLM (Llama via WebLLM or similar) running in browser
  - Suggests: post titles, content structure, optimal posting times
  - Grammar and style suggestions
  - All processing happens client-side

- **Churn prediction**:
  - Local model predicts which subscribers are likely to churn
  - Based on: last login, content views, time since last renewal
  - Creator dashboard shows "At Risk" subscribers (anonymized)
  - Suggests actions: "Post new content" or "Create a promotion"

---

## YEAR 3: Ecosystem (Months 25-36)

### Month 25-27: Plugin Architecture

- **Plugin system for the frontend**:
  - Plugins are React components loaded dynamically
  - Plugin manifest (JSON) defines: name, version, entry point, permissions
  - Plugin store page in the app
  - Built-in plugins:
    - Analytics widget
    - Social share buttons
    - Comment system
    - Poll/survey widget
    - Merch store widget (link to external store)
  - Plugin SDK: `@veilsub/plugin-sdk`
    - Hooks: `useCreatorData()`, `useSubscriberData()`, `useOnChainData()`
    - Components: `PluginCard`, `PluginModal`, `PluginSettings`
    - API: `registerPlugin()`, `getPluginSettings()`

### Month 28-30: Collaboration Features

- **Multi-creator content**:
  - Invite co-creators to a post
  - Revenue split defined at publish time (e.g., 60/40)
  - Each creator gets proportional CreatorReceipt on-chain
  - Co-creator approval workflow before publishing

- **Creator communities**:
  - Discussion threads per post (encrypted, subscriber-only)
  - Community polls (on-chain voting using governance contracts)
  - Subscriber badges (based on subscription duration, tier, engagement)
  - Leaderboard (most active subscribers — anonymized via hashes)

### Month 31-33: Advanced Subscription Models

- **Pay-per-view**:
  - New transition: `purchase_content(content_id, amount)` → AccessToken for single post
  - Frontend: "Buy this post for 500 ALEO" button on blur-locked content
  - Different from subscription: one-time payment for one piece of content

- **Metered access**:
  - Free tier: 3 posts per month
  - Premium tier: unlimited
  - Tracked via new mapping: `content_views[subscriber_hash + creator_hash]` → count
  - Monthly reset via block height calculation

- **Bundle subscriptions**:
  - New transition: `subscribe_bundle(creators[], tier, amount)` — atomic multi-creator subscription
  - One payment, multiple AccessPasses
  - Discounted vs individual subscriptions
  - Frontend: "Subscribe to 5 creators for 20% less"

- **Streaming payments**:
  - Per-block payment stream: `start_stream(creator, rate_per_block, total_blocks)`
  - Subscriber can cancel anytime, recover remaining funds
  - Creator can claim accrued payments at any time
  - Real-time balance display: "Streaming 0.1 ALEO/block to @creator"

### Month 34-36: White-Label Infrastructure

- **VeilSub Pro**: white-label subscription platform
  - Same technology, custom branding
  - Creator provides: domain, logo, colors, content
  - VeilSub provides: infrastructure, smart contracts, SDK
  - Deployed as separate Next.js instance pointing to same Aleo contracts
  - Configuration: `veilsub.config.ts` with theme, creator whitelist, features toggle
  - Docker image for self-hosting
  - Terraform/Pulumi scripts for cloud deployment

---

## YEAR 4: Cross-Chain & Scale (Months 37-48)

### Month 37-39: Cross-Chain Proofs

- **Aleo → Ethereum proof verification**:
  - Verify VeilSub AccessPass on Ethereum
  - Solidity contract that accepts Aleo ZK proof
  - Use case: gate Ethereum DeFi features behind VeilSub subscription
  - Use case: gate NFT minting behind subscription tier

- **Aleo → Solana proof verification**:
  - Same concept on Solana
  - Anchor program verifying Aleo proofs

- **Universal AccessPass**:
  - One subscription, provable on any chain
  - "I subscribed on Aleo, prove it on Ethereum, access content on Solana"

### Month 40-42: Scalability

- **Indexer service**:
  - Custom indexer that watches all 7 VeilSub programs
  - Stores decoded events in PostgreSQL
  - Exposes REST + GraphQL + WebSocket APIs
  - Handles 10K+ concurrent subscribers
  - Replaces direct Aleo API polling (which doesn't scale)

- **Caching layer**:
  - Redis cache for frequently queried mappings
  - Cache invalidation on new block
  - 100ms response times for all queries

- **Database optimization**:
  - Content stored in PostgreSQL (encrypted at rest) instead of Redis (for durability)
  - Full-text search via PostgreSQL tsvector
  - Connection pooling via PgBouncer
  - Read replicas for query scaling

### Month 43-45: Developer Ecosystem Tools

- **Rust SDK**: `veilsub-rs`
  - For Aleo developers building on-chain integrations
  - Transaction builders for all 57 transitions
  - Mapping query utilities
  - Type-safe record parsing

- **Python SDK**: `veilsub-py`
  - For data analysis and bot development
  - Mapping query utilities
  - Transaction monitoring
  - Analytics helpers

- **Go SDK**: `veilsub-go`
  - For backend service development
  - High-performance mapping queries
  - Webhook receiver utilities

- **GitHub Actions**:
  - `veilsub/deploy-action` — deploy Leo programs in CI
  - `veilsub/test-action` — run Leo tests in CI
  - `veilsub/verify-action` — verify AccessPass in CI (for gated releases)

### Month 46-48: Advanced Crypto

- **Threshold encryption for group content**:
  - Content encrypted with threshold key (k-of-n scheme)
  - Any k subscribers can collectively decrypt
  - No single subscriber has the full key
  - Use case: collaborative content access for teams

- **Accumulator-based revocation**:
  - Replace boolean `access_revoked` mapping with RSA accumulator
  - Subscriber proves non-membership in revocation set
  - More efficient than per-pass mapping lookups at scale (O(1) vs O(n))
  - Novel cryptographic contribution

- **Range proofs for revenue**:
  - Creator proves "my monthly revenue is between $1K and $10K" without revealing exact amount
  - Use case: creator verification for partnerships, brand deals
  - Implemented via Bulletproofs or group-operation range checks

---

## YEAR 5: The Standard (Months 49-60)

### Month 49-51: Protocol Specification

- **Write the VeilSub Protocol Specification (VPS)**:
  - Formal specification of all protocol rules
  - Record formats, mapping schemas, transition semantics
  - Cryptographic proofs and security properties
  - Versioning and upgrade procedures
  - Interoperability requirements
  - Published as a living document (like the Ethereum Yellow Paper)

- **Reference implementation verification**:
  - Formal verification of critical transitions using Leo's built-in checks
  - Property-based testing with 10,000+ random inputs per transition
  - Invariant testing: "subscriber_count never decreases" (except through specific admin actions)

### Month 52-54: Multi-Frontend Architecture

- **Headless CMS mode**:
  - VeilSub as pure API + smart contracts
  - Any frontend can be built on top
  - Official frontend becomes one of many
  - Other developers build: mobile-first frontend, minimal frontend, enterprise frontend

- **Embeddable widgets**:
  - `<script src="veilsub.js">` — drop-in JavaScript widget
  - Configurable: subscribe button, content gate, verification badge
  - Works on any website without React dependency
  - 50KB total bundle size

- **Static site generator integration**:
  - Gatsby plugin: `gatsby-plugin-veilsub`
  - Hugo shortcode: `{{< veilsub_gate >}}`
  - Astro integration: `@veilsub/astro`

### Month 55-57: Research & Publication

- **Academic paper: "Blind Subscription Protocol: Privacy-Preserving Recurring Payments on Zero-Knowledge Chains"**
  - Formal security proofs
  - Comparison with existing approaches (Tornado Cash, Zcash, Aztec)
  - Performance benchmarks
  - Submit to: Financial Cryptography (FC), IEEE S&P, or USENIX Security

- **Second paper: "Homomorphic Subscriber Counting via Pedersen Commitments on Aleo"**
  - Novel application of additively homomorphic commitments
  - Threshold proofs without revealing exact counts
  - Privacy-preserving analytics framework
  - Submit to: CCS, NDSS, or a ZK-focused workshop

- **Open-source all crypto libraries**:
  - `@veilsub/pedersen` — homomorphic Pedersen commitment library for Leo
  - `@veilsub/merkle` — Merkle tree utilities for Leo
  - `@veilsub/nullifier` — nullifier-based anonymous voting/reviewing for Leo
  - These become standard libraries used by other Aleo developers

### Month 58-60: The Complete Stack

By month 60, VeilSub is:

**On-Chain:**
- 10+ deployed programs (core, extras, identity, access, governance, marketplace, oracle, tokens, streaming, bundles)
- 80+ transitions
- 50+ mappings
- 10+ record types
- Cross-chain verification on Ethereum and Solana

**SDKs:**
- TypeScript (@veilsub/sdk)
- React (@veilsub/react)
- Next.js (@veilsub/next)
- Express (@veilsub/express)
- Rust (veilsub-rs)
- Python (veilsub-py)
- Go (veilsub-go)
- WordPress plugin
- Discord bot
- Embeddable widgets

**Infrastructure:**
- Custom indexer (PostgreSQL-backed)
- GraphQL API with WebSocket subscriptions
- Encrypted CDN (Cloudflare R2 or IPFS)
- Monitor bot, oracle bot, bridge relayer
- CI/CD with GitHub Actions
- Docker images for self-hosting

**Frontend:**
- 20+ pages
- 100+ components
- Mobile app (iOS + Android)
- Documentation site
- Plugin marketplace
- Developer playground
- White-label infrastructure

**Research:**
- 2 published academic papers
- 3+ open-source crypto libraries
- Protocol specification document
- Formal verification of critical paths

**Tests:**
- 1000+ tests across all codebases
- E2E tests with Playwright
- Visual regression tests
- Property-based Leo tests
- Cross-chain integration tests

---

## The Total Count

| Category | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Total |
|----------|--------|--------|--------|--------|--------|-------|
| Leo programs | 7 | 8 | 10 | 10 | 10+ | 10+ |
| Transitions | 57 | 65 | 80 | 80 | 80+ | 80+ |
| npm packages | 3 | 5 | 7 | 10 | 12+ | 12+ |
| SDKs (languages) | 1 | 1 | 2 | 5 | 7 | 7 |
| Frontend pages | 15 | 20 | 25 | 25 | 25+ | 25+ |
| Components | 85 | 120 | 150 | 160 | 170+ | 170+ |
| Tests | 509 | 800 | 1000 | 1200 | 1500+ | 1500+ |
| Integrations | 0 | 5 | 10 | 15 | 20+ | 20+ |
| Research papers | 0 | 0 | 0 | 1 | 2 | 2 |
| Chains supported | 1 | 1 | 1 | 3 | 3 | 3 |

---

## Priority Order (If You Have to Choose)

If you can't do everything, do these in order. Each one independently makes VeilSub better:

1. Deploy all 7 programs to testnet (Day 1)
2. Publish SDK to npm (Day 2)
3. Build /feed page (Week 1)
4. Fix post-subscription redirect (Week 1)
5. Fix post-verification redirect (Week 1)
6. Add image uploads to content editor (Week 2)
7. Add email notifications (Week 3)
8. Build creator analytics dashboard with real data (Week 4)
9. React Native mobile app (Month 2)
10. "Login with VeilSub" React component library (Month 3)
11. Documentation site (Month 4)
12. GraphQL API (Month 5)
13. Ethereum bridge (Month 6)
14. Plugin architecture (Month 9)
15. Creator tokens (Month 10)
16. White-label infrastructure (Month 12)
17. Rust/Python/Go SDKs (Year 2)
18. Cross-chain proof verification (Year 2)
19. Formal specification (Year 3)
20. Academic papers (Year 3)

Every single item on this list is pure code. No meetings, no money, no marketing. Just `git commit`.

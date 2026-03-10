'use client'

import { useState, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Code,
  Shield,
  Cpu,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import { DEPLOYED_PROGRAM_ID } from '@/lib/config'

const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'contract', label: 'Smart Contract', icon: Code },
  { id: 'privacy', label: 'Privacy Model', icon: Shield },
  { id: 'api', label: 'API / Integration', icon: Cpu },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
]

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false) // silently fail — text is still selectable
    }
  }

  return (
    <div className="relative group rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-border">
        <span className="text-xs text-subtle">{lang}</span>
        <button
          onClick={copy}
          className="text-xs text-subtle hover:text-white flex items-center gap-1 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 bg-surface-1 overflow-x-auto text-sm font-mono text-muted leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function OverviewTab() {
  return (
    <div className="space-y-8">
      {/* Quick Links for Judges */}
      <div className="p-4 rounded-sm bg-violet-500/[0.06] border border-violet-500/[0.12]">
        <h3 className="text-sm font-semibold text-violet-300 mb-3">Quick Links</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: 'Testnet Explorer', href: `https://testnet.aleoscan.io/program?id=${DEPLOYED_PROGRAM_ID}` },
            { label: 'On-Chain Queries', href: '/explorer' },
            { label: 'Privacy Model', href: '/privacy' },
            { label: 'Verify Access', href: '/verify' },
            { label: 'GitHub Repo', href: 'https://github.com/Pratiikpy/Veil-Sub' },
            { label: 'FAQ', href: '#faq' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-border/75 text-xs text-muted hover:text-white hover:border-violet-500/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">What is VeilSub?</h3>
        <p className="text-muted leading-relaxed">
          VeilSub is a privacy-first creator subscription platform built on the Aleo blockchain.
          Subscribers pay with real ALEO credits and receive a private AccessPass record —
          their identity is never exposed on-chain. Creators see aggregate stats (total subscribers,
          total revenue) but never see individual subscriber identities.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Video Demo</h3>
        <p className="text-muted leading-relaxed mb-3">
          Watch the full end-to-end walkthrough showing wallet connection, creator registration,
          private subscription, and on-chain verification.
        </p>
        <div className="p-4 rounded-sm bg-white/[0.04] border border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-muted" />
          </div>
          <div>
            <p className="text-sm text-white font-medium">Video Demo</p>
            <p className="text-xs text-muted">
              See the project README for the latest demo video link and walkthrough instructions.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Architecture</h3>
        <CodeBlock
          lang="plaintext"
          code={`┌──────────────┐     ┌─────────────┐     ┌───────────────────┐
│  Subscriber   │────>│   VeilSub   │────>│   Aleo Network    │
│  (Leo Wallet)  │    │  Program    │     │                   │
│               │    │             │     │  PRIVATE:          │
│ 1. Pick tier  │    │ subscribe() │     │  - AccessPass      │
│ 2. Pay ALEO   │    │ renew()     │     │  - Payment details │
│ 3. Get pass   │    │ verify()    │     │  - Subscriber ID   │
│               │    │ tip()       │     │                   │
│               │    │ publish()   │     │  PUBLIC:           │
│               │    │             │     │  - Subscriber count│
└──────────────┘     └─────────────┘     │  - Total revenue   │
                                         │  - Tier prices     │
                                         │  - Content meta    │
        ┌──────────────┐                 └───────────────────┘
        │   Creator     │
        │ Sees: 47 subs │
        │ Sees: 235 ALEO│
        │ Never sees WHO│
        └──────────────┘`}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Tech Stack</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'Smart Contract', value: 'Leo 3.4.0 on Aleo Testnet' },
            { label: 'Frontend', value: 'Next.js 16, React 19, TypeScript' },
            { label: 'Styling', value: 'Tailwind CSS 4, Framer Motion' },
            { label: 'Wallet', value: '@provablehq/aleo-wallet-adaptor' },
            { label: 'Chain Queries', value: 'Provable API (REST)' },
            { label: 'Hosting', value: 'Vercel' },
          ].map((item) => (
            <div
              key={item.label}
              className="p-3 rounded-lg bg-surface-1 border border-border"
            >
              <span className="text-xs text-subtle">{item.label}</span>
              <p className="text-sm text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ContractTab() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Program ID</h3>
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-white/[0.04] border border-border flex items-center justify-between">
            <div>
              <span className="text-xs text-subtle">Deployed (testnet)</span>
              <code className="block text-muted text-sm font-mono">{DEPLOYED_PROGRAM_ID}</code>
            </div>
            <a
              href={`https://testnet.aleoscan.io/program?id=${DEPLOYED_PROGRAM_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-white flex items-center gap-1"
            >
              View on Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.04] border border-border flex items-center justify-between">
            <div>
              <span className="text-xs text-subtle">Source (latest)</span>
              <code className="block text-muted text-sm font-mono">{DEPLOYED_PROGRAM_ID}</code>
            </div>
            <span className="text-xs text-subtle">27 transitions · 25 mappings</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Record Type (Private)</h3>
        <CodeBlock
          lang="leo"
          code={`record AccessPass {
    owner: address,         // subscriber (private—only they can see)
    creator: address,       // which creator (private)
    tier: u8,               // custom tier ID (private)
    pass_id: field,         // unique identifier (private)
    expires_at: u32,        // block height when pass expires (private)
    privacy_level: u8,      // 0=standard, 1=blind, 2=trial (private)
}`}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Mappings (Public)—25 Total</h3>
        <CodeBlock
          lang="leo"
          code={`// v27: ALL mapping keys are Poseidon2 field hashes—ZERO raw addresses in finalize
// Core mappings
mapping tier_prices: field => u64;             // hash(creator) => base price (microcredits)
mapping subscriber_count: field => u64;        // hash(creator) => total subscribers
mapping total_revenue: field => u64;           // hash(creator) => total earned
mapping platform_revenue: u8 => u64;          // key 0 = total platform earnings
mapping content_count: field => u64;           // hash(creator) => number of posts
mapping content_meta: field => u8;             // hash(content_id) => min tier required
// Dynamic Tiers
mapping creator_tiers: field => u64;            // hash(creator, tier_id) => custom tier price
mapping tier_count: field => u64;               // hash(creator) => number of custom tiers
mapping tier_deprecated: field => bool;        // hash(creator, tier_id) => is tier deprecated
// Content Management
mapping content_deleted: field => bool;        // hash(content_id) => is deleted
mapping content_hashes: field => field;        // hash(content_id) => content metadata hash
mapping content_creator: field => field;       // hash(content_id) => hash(creator) for auth
mapping encryption_commits: field => field;    // hash(content_id) => encryption commitment
// Subscriptions & Access
mapping gift_redeemed: field => bool;          // gift_token_id => is redeemed
mapping nonce_used: field => bool;             // nonce_hash => is nonce consumed (blind renewal)
mapping access_revoked: field => bool;         // pass_id => is access revoked
mapping pass_creator: field => field;           // pass_id => hash(creator) for revocation auth
// Disputes
mapping content_disputes: field => u64;         // hash(content_id) => dispute count
mapping dispute_count_by_caller: field => u64;  // hash(caller, content) => dispute count
// Tipping
mapping tip_commitments: field => bool;         // hash(creator, caller) => has commitment
mapping tip_revealed: field => bool;            // hash(creator, caller) => tip already revealed
// Analytics
mapping subscription_by_tier: field => u64;     // hash(creator, tier) => tier sub count
// Platform Stats (v25)
mapping total_creators: u8 => u64;              // key=0 => total registered creators
mapping total_content: u8 => u64;               // key=0 => total published content items
// Trial Rate Limiting (v27)
mapping trial_used: field => bool;               // hash(caller, creator) => already trialed`}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Transitions</h3>
        <div className="space-y-3">
          {[
            {
              name: 'register_creator(price: u64)',
              type: 'async',
              desc: 'Creator sets tier price and initializes counters. Price is in microcredits (1 ALEO = 1,000,000).',
            },
            {
              name: 'subscribe(payment, creator, tier, amount, pass_id)',
              type: 'async',
              desc: 'Pay with private credits, get a private AccessPass. Finalize enforces tier-based pricing via creator_tiers mapping. Subscriber identity never enters finalize.',
            },
            {
              name: 'verify_access(pass, creator)',
              type: 'async',
              desc: 'Consume and re-create AccessPass to prove access. Finalize checks revocation and expiry (v24+) via pass_id and expires_at—subscriber address never reaches public state.',
            },
            {
              name: 'tip(payment, creator, amount)',
              type: 'async',
              desc: 'Private tip to creator. Only aggregate revenue updated. Tipper identity stays private.',
            },
            {
              name: 'renew(old_pass, payment, new_tier, amount, pass_id, expires_at)',
              type: 'async',
              desc: 'Consumes expired (or active) pass, pays again, and creates a new AccessPass with extended expiry. Allows tier changes. Revenue updated, subscriber_count NOT incremented (renewal, not new sub).',
            },
            {
              name: 'publish_content(content_id, min_tier)',
              type: 'async',
              desc: 'Creator publishes content metadata on-chain. Records content existence and minimum tier required for access. Content body stays off-chain—only tier-gating is enforced on-chain.',
            },
            {
              name: 'create_custom_tier(creator, tier_id, price, max_subscribers)',
              type: 'async',
              desc: 'Creator dynamically creates custom tiers (replaces hardcoded 1x/2x/5x). Stores tier metadata in creator_tiers mapping. Enables unlimited tier flexibility.',
            },
            {
              name: 'update_tier_price(creator, tier_id, new_price)',
              type: 'async',
              desc: 'Update the price of an existing custom tier. Price changes apply only to new subscriptions.',
            },
            {
              name: 'deprecate_tier(creator, tier_id)',
              type: 'async',
              desc: 'Mark a tier as deprecated—prevents new subscriptions, but existing subscribers retain access.',
            },
            {
              name: 'update_content(content_id, new_min_tier)',
              type: 'async',
              desc: 'Creator updates the tier requirement for published content. Does not delete—only updates access level.',
            },
            {
              name: 'delete_content(content_id)',
              type: 'async',
              desc: 'Creator marks content as deleted on-chain. Records proof of deletion in content_deleted mapping.',
            },
            {
              name: 'gift_subscription(recipient, creator, tier_id, expires_at)',
              type: 'async',
              desc: 'Creator or subscriber gifts a subscription to another address. Creates a GiftToken record.',
            },
            {
              name: 'redeem_gift(gift_token)',
              type: 'async',
              desc: 'Recipient redeems a GiftToken to receive an AccessPass. Records redemption in gift_redeemed mapping.',
            },
            {
              name: 'withdraw_platform_fees()',
              type: 'async',
              desc: 'Platform owner withdraws accumulated platform fees from all subscriptions.',
            },
            {
              name: 'withdraw_creator_rev(amount)',
              type: 'async',
              desc: 'Creator withdraws accumulated subscription revenue (decrements total_revenue mapping).',
            },
            {
              name: 'subscribe_blind(payment, creator, tier_id, amount, nonce)',
              type: 'async',
              desc: 'Subscribe using nonce-based blinding—generates blind subscriber hash. Prevents subscription pattern tracking.',
            },
            {
              name: 'renew_blind(old_pass, payment, new_tier_id, amount, nonce)',
              type: 'async',
              desc: 'Renew subscription with new nonce—each renewal uses unique nonce, preventing creator from tracking renewal patterns.',
            },
            {
              name: 'verify_tier_access(pass, creator, required_tier)',
              type: 'async',
              desc: 'Verify that AccessPass grants access to required_tier without revealing subscriber identity or full tier.',
            },
            {
              name: 'publish_encrypted_content(content_id, min_tier, encryption_commitment)',
              type: 'async',
              desc: 'Publish content with encryption commitment on-chain. Proves encryption without revealing content body.',
            },
            {
              name: 'revoke_access(pass_id)',
              type: 'async',
              desc: 'Creator revokes an AccessPass (e.g., for ToS violation). Only affects that specific pass.',
            },
            {
              name: 'dispute_content(content_id, reason_hash)',
              type: 'async',
              desc: 'Subscriber disputes content quality/copyright. Creates dispute record for platform review.',
            },
            {
              name: 'transfer_pass(pass, recipient)',
              type: 'async',
              desc: 'Transfer an AccessPass to another address. The original pass is consumed and a new one is created for the recipient. Checks revocation before allowing transfer.',
            },
            {
              name: 'commit_tip(creator, amount, salt)',
              type: 'async',
              desc: 'Phase 1 of commit-reveal tipping. Commits to a tip amount using BHP256 commitment scheme. The tip value is hidden on-chain until voluntary reveal.',
            },
            {
              name: 'reveal_tip(payment, creator, amount, salt)',
              type: 'async',
              desc: 'Phase 2—reveals the committed tip and executes the transfer. Recomputes the commitment, verifies it matches, then transfers credits to the creator.',
            },
            {
              name: 'create_audit_token(pass, verifier, scope_mask)',
              type: 'sync',
              desc: 'v27: Creates a scoped AuditToken for third-party verification. scope_mask bitfield controls which fields the verifier can see (bit 0=creator, 1=tier, 2=expiry, 3=subscriber). Zero finalize footprint.',
            },
            {
              name: 'prove_subscriber_threshold(threshold)',
              type: 'async',
              desc: 'v25: Privacy-preserving reputation proof. Proves a creator has at least N subscribers without revealing exact count. Uses Poseidon2 creator hash.',
            },
            {
              name: 'subscribe_trial(payment, creator, tier, amount, pass_id, expires_at)',
              type: 'async',
              desc: 'Ephemeral trial at 20% of tier price, ~12hr/1000 blocks. v27 adds one-per-creator rate limiting via trial_used mapping. Creates AccessPass with privacy_level=2.',
            },
          ].map((t) => (
            <div
              key={t.name}
              className="p-4 rounded-sm bg-surface-1 border border-border"
            >
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm text-muted font-mono">{t.name}</code>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    t.type === 'async'
                      ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                      : 'bg-green-500/10 text-green-300 border border-green-500/20'
                  }`}
                >
                  {t.type}
                </span>
              </div>
              <p className="text-sm text-muted">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Error Codes (v27)</h3>
        <p className="text-sm text-muted mb-4">
          Every <code className="px-1 py-0.5 rounded bg-white/10 text-muted text-xs">assert</code> in the contract has a unique error code (ERR_001–ERR_119) for debugging and frontend error mapping. Key ranges:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { range: 'ERR_001–009', desc: 'Tier creation & management' },
            { range: 'ERR_010–017', desc: 'Content lifecycle (update, delete)' },
            { range: 'ERR_018–027', desc: 'Registration, subscribe, verify' },
            { range: 'ERR_028–038', desc: 'Tips, renewals, content publish' },
            { range: 'ERR_039–054', desc: 'Gifting, escrow, refunds' },
            { range: 'ERR_055–060', desc: 'Fee withdrawal (platform + creator)' },
            { range: 'ERR_061–077', desc: 'Blind subscriptions & tier verify' },
            { range: 'ERR_078–088', desc: 'Encrypted content, disputes, transfer' },
            { range: 'ERR_089–098', desc: 'Referral subscriptions' },
            { range: 'ERR_099–103', desc: 'Commit-reveal tips (BHP256 commitments)' },
            { range: 'ERR_104–110', desc: 'Subscriber threshold proofs, platform stats' },
            { range: 'ERR_111–117', desc: 'Trial subscriptions' },
            { range: 'ERR_118–119', desc: 'Scoped audit tokens, trial rate-limiting (v27)' },
          ].map((e) => (
            <div key={e.range} className="p-2 rounded-lg bg-white/[0.03] border border-border/75">
              <code className="text-xs text-violet-300/80 font-mono">{e.range}</code>
              <p className="text-xs text-subtle mt-0.5">{e.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PrivacyModelTab() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Privacy Architecture</h3>
        <p className="text-muted leading-relaxed mb-4">
          VeilSub&apos;s privacy model is enforced at the program level. The Leo smart contract
          is designed so that subscriber addresses physically cannot enter the finalize scope
          (the only part of a transaction that writes to public state).
        </p>
      </div>

      <div className="p-4 rounded-sm bg-green-500/5 border border-green-500/20">
        <h4 className="text-green-300 font-semibold mb-2">Minimal-Footprint Access Verification</h4>
        <p className="text-sm text-muted leading-relaxed">
          <code className="px-1 py-0.5 rounded bg-white/10 text-muted text-xs">verify_access</code> has
          a <strong className="text-white">minimal finalize</strong> that only checks revocation status via pass_id.
          The subscriber address never enters finalize—no identity-linked mapping writes, no counter increments,
          no on-chain evidence of <em>who</em> verified. This is a deliberate privacy design: the finalize only
          reads <code className="px-1 py-0.5 rounded bg-white/10 text-muted text-xs">access_revoked</code> to
          enforce pass revocation, without exposing subscriber identity. Access proof relies on Aleo&apos;s native
          record ownership system—no manual nullifiers or ZK proof verification needed.
        </p>
      </div>

      <div className="p-4 rounded-sm bg-violet-500/5 border border-violet-500/20">
        <h4 className="text-violet-300 font-semibold mb-2">v23: ZERO Addresses in Finalize—Full Poseidon2 Privacy Overhaul</h4>
        <p className="text-sm text-muted leading-relaxed mb-3">
          v23 represents a fundamental privacy overhaul: <strong className="text-white">no raw addresses appear in any
          finalize block</strong>. Every mapping key that previously used a plain address is now a Poseidon2
          field hash. This means on-chain observers cannot correlate mapping reads with wallet addresses —
          even public aggregate data like subscriber counts and revenue are keyed by opaque field values.
        </p>
        <p className="text-sm text-muted leading-relaxed mb-3">
          The Pedersen proof transitions (<code className="px-1 py-0.5 rounded bg-white/10 text-muted text-xs">subscribe_private_count</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-white/10 text-muted text-xs">prove_sub_count</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-white/10 text-muted text-xs">prove_revenue_range</code>) were removed
          in favor of the more comprehensive Poseidon2 approach, which provides stronger privacy guarantees
          across all transitions without requiring separate proof circuits. Analytics-only mappings
          (<code className="px-1 py-0.5 rounded bg-white/10 text-muted text-xs">content_version</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-white/10 text-muted text-xs">subscription_epoch</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-white/10 text-muted text-xs">creator_last_active</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-white/10 text-muted text-xs">total_subscriptions</code>) were also removed to reduce the variable count.
        </p>
        <p className="text-sm text-muted leading-relaxed">
          The result: 27 transitions, 25 mappings, 6 record types, 5 structs, 866 statements,
          and 119 error codes—a leaner, more private contract that fits within testnet deployment limits.
          Commit-reveal tipping uses{' '}
          <code className="px-1 py-0.5 rounded bg-white/10 text-muted text-xs">BHP256::commit_to_field</code> —
          a novel cryptographic commitment scheme for hidden tip amounts.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Key Guarantees</h3>
        <div className="space-y-3">
          {[
            {
              title: 'No subscriber address in finalize',
              detail: 'The subscribe() transition only passes creator (already public) and amount to finalize. The caller\'s address is used only to create the private AccessPass record.',
            },
            {
              title: 'Private credit transfers',
              detail: 'All payments use credits.aleo/transfer_private, not transfer_public. This ensures payment amounts and sender addresses are hidden.',
            },
            {
              title: 'UTXO access proof pattern',
              detail: 'verify_access() consumes the AccessPass record and re-creates it. Finalize only checks revocation via pass_id—subscriber address never reaches public state.',
            },
            {
              title: 'No records to program addresses',
              detail: 'Records are created with owner: self.caller (the subscriber). No records are ever sent to the program address, which would make them publicly visible.',
            },
            {
              title: 'Aggregate-only public data',
              detail: 'Public mappings only store aggregate counters: total subscriber count and total revenue per creator. No individual subscriber data appears anywhere public.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-4 rounded-sm bg-surface-1 border border-border"
            >
              <h4 className="text-white font-medium mb-1">{item.title}</h4>
              <p className="text-sm text-muted">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">What Can&apos;t Be Inferred?</h3>
        <p className="text-muted leading-relaxed">
          Even with full access to the Aleo blockchain, an observer cannot determine:
        </p>
        <ul className="mt-3 space-y-2">
          {[
            'Which addresses subscribe to which creators',
            'How much any individual subscriber paid',
            'Whether a specific address holds an AccessPass',
            'The relationship between a subscriber and creator',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-muted">
              <Shield className="w-4 h-4 text-muted shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ApiTab() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Reading Public Mappings</h3>
        <p className="text-muted mb-4">
          Public mapping data (tier prices, subscriber counts, revenue) can be read via the
          Provable REST API without any authentication.
        </p>
        <CodeBlock
          lang="bash"
          code={`# Get creator's tier price
curl https://api.explorer.provable.com/v1/testnet/program/${DEPLOYED_PROGRAM_ID}/mapping/tier_prices/<creator_address>

# Get subscriber count
curl https://api.explorer.provable.com/v1/testnet/program/${DEPLOYED_PROGRAM_ID}/mapping/subscriber_count/<creator_address>

# Get total revenue
curl https://api.explorer.provable.com/v1/testnet/program/${DEPLOYED_PROGRAM_ID}/mapping/total_revenue/<creator_address>`}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Wallet Integration</h3>
        <p className="text-muted mb-4">
          Use the Aleo wallet adapter to interact with VeilSub transitions.
        </p>
        <CodeBlock
          lang="typescript"
          code={`import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'

const { executeTransaction } = useWallet()

// Execute a subscribe transaction (v27—returns AccessPass)
const result = await executeTransaction({
  program: '${DEPLOYED_PROGRAM_ID}',
  function: 'subscribe',
  inputs: [
    paymentRecord,              // single credits record (must have >= amount)
    creatorAddress,             // creator's address
    '1u8',                      // tier (custom tier ID)
    '5000000u64',               // amount in microcredits (5 ALEO)
    passIdField,                // unique pass_id (field)
    expiresAtU32,               // expiry block height (u32)
  ],
  fee: 300_000,                // fee in microcredits
  privateFee: false,
})

const txId = result?.transactionId`}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Microcredits Conversion</h3>
        <div className="p-4 rounded-sm bg-surface-1 border border-border">
          <p className="text-sm text-muted mb-2">
            1 ALEO = 1,000,000 microcredits
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted">
              <span>0.5 ALEO</span>
              <span className="text-subtle">500,000 microcredits</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>5 ALEO</span>
              <span className="text-subtle">5,000,000 microcredits</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>25 ALEO</span>
              <span className="text-subtle">25,000,000 microcredits</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-sm bg-surface-1 border border-border overflow-hidden transition-colors hover:border-glass-hover">
      <button
        id={`docs-faq-${index}`}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
        aria-expanded={open}
        aria-controls={`docs-faq-answer-${index}`}
      >
        <h4 className="text-white font-medium pr-4">{q}</h4>
        <ChevronDown className={`w-4 h-4 text-subtle shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={`docs-faq-answer-${index}`}
            role="region"
            aria-labelledby={`docs-faq-${index}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-sm text-muted leading-relaxed">{a}</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FaqTab() {
  const faqs = [
    {
      q: 'Can the creator see who subscribes?',
      a: 'No. The creator only sees aggregate statistics—total subscriber count and total revenue. Individual subscriber identities are never exposed on-chain or off-chain.',
    },
    {
      q: 'What wallet do I need?',
      a: 'VeilSub supports 5 Aleo wallets: Shield (recommended), Leo Wallet, Fox Wallet, Puzzle Wallet, and Soter Wallet. Install any of them as a browser extension and get testnet credits from faucet.aleo.org.',
    },
    {
      q: 'How does the AccessPass work?',
      a: 'When you subscribe, a private AccessPass record is created in your wallet. This record is encrypted and only you can see it. To prove access, the verify_access transition consumes and re-creates the record—proving ownership cryptographically without revealing your identity.',
    },
    {
      q: 'What if I lose my AccessPass?',
      a: 'Your AccessPass is stored as an encrypted record on the Aleo blockchain. As long as you have access to your wallet (private key), you can always recover it. If you lose your wallet key, the pass is unrecoverable—this is the trade-off for privacy.',
    },
    {
      q: 'Is this on mainnet?',
      a: 'VeilSub is currently deployed on Aleo Testnet. Mainnet deployment is planned for a future phase after thorough security auditing.',
    },
    {
      q: 'How much does it cost to subscribe?',
      a: 'The subscription price is set by each creator. Creators define custom tiers with any price (minimum 100 microcredits). Plus a small network fee for ZK proof generation.',
    },
    {
      q: 'Can I tip a creator without subscribing?',
      a: 'Yes! The tip() transition lets you send a private tip to any registered creator. The creator receives the ALEO credits but never sees your address.',
    },
    {
      q: 'How can I test subscribing?',
      a: 'Connect your Leo Wallet on the app, then visit a creator page. If no creator is registered yet, register yourself on the Dashboard page first (costs a small network fee). Then open the creator page in a different browser or wallet to test subscribing. You can also use the Verify page to check on-chain mapping data.',
    },
    {
      q: 'Is there a pre-registered test creator?',
      a: 'Yes! The platform account (aleo1hp9m...epyxsprk5wk) is registered with base price 1000 microcredits, 3 custom tiers (Supporter @ 500, Premium @ 2000, VIP @ 5000), and 5+ published content pieces. Visit the Explore page to find it, or use the On-Chain Explorer to query mappings directly.',
    },
    {
      q: 'How did VeilSub evolve from v15 to v27?',
      a: 'v15 was the first testnet deployment (security hardening, subscription transfer). Subsequent versions (v16–v21) added features like referrals, Pedersen commitments, and analytics — but v21 exceeded testnet\'s ~2.1M variable limit. v23 was a privacy overhaul: all finalize mapping keys use Poseidon2 field hashes instead of raw addresses. v24 adds content_creator mapping for auth and on-chain expiry enforcement. v25 adds prove_subscriber_threshold and platform analytics. v26 adds ephemeral trial passes (subscribe_trial). v27 adds scoped audit tokens (scope_mask bitfield), trial rate-limiting (one trial per creator per subscriber), and gift revocation fix. The result: 27 transitions, 25 mappings, 866 statements — deployed on testnet.',
    },
  ]

  return (
    <div className="space-y-2">
      {faqs.map((faq, index) => (
        <FaqItem key={faq.q} q={faq.q} a={faq.a} index={index} />
      ))}
    </div>
  )
}

type TabId = 'overview' | 'contract' | 'privacy' | 'api' | 'faq'

const TAB_COMPONENTS: Record<TabId, React.FC> = {
  overview: OverviewTab,
  contract: ContractTab,
  privacy: PrivacyModelTab,
  api: ApiTab,
  faq: FaqTab,
}

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as TabId
      if (hash && hash in TAB_COMPONENTS) return hash
    }
    return 'overview'
  })
  const switchTab = useCallback((tab: TabId) => {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tab}`)
    }
  }, [])
  const ActiveContent = TAB_COMPONENTS[activeTab]

  return (
    <PageTransition>
      <div className="min-h-screen relative">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.05) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-serif italic text-white mb-2" style={{ letterSpacing: '-0.03em' }}>Documentation</h1>
            <p className="text-muted">
              Everything you need to understand and integrate with VeilSub.
            </p>
          </m.div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Tab Navigation */}
            <div className="lg:w-56 shrink-0">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => switchTab(tab.id)}
                      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'text-white bg-violet-500/[0.08] border border-violet-500/[0.15] shadow-accent-sm'
                          : 'text-muted hover:text-white hover:bg-white/[0.03] border border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <m.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ActiveContent />
                </m.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

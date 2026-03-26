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
  Fingerprint,
  Zap,
  Lock,
  Database,
  Eye,
  Gift,
  Coins,
  Users,
  FileText,
  ArrowRight,
  Layers,
  Hash,
  KeyRound,
  ShieldCheck,
  EyeOff,
  Blocks,
  Terminal,
  Globe,
  Bell,
  Send,
  CheckCircle2,
} from 'lucide-react'
import PageTransition from '@/components/PageTransition'
import { DEPLOYED_PROGRAM_ID } from '@/lib/config'

// ─── Types ───────────────────────────────────────────────
type TabId = 'overview' | 'contract' | 'privacy' | 'api' | 'developer' | 'faq'

interface TransitionItem {
  name: string
  type: 'async' | 'sync'
  desc: string
}

interface TransitionGroupData {
  title: string
  color: string
  bgColor: string
  borderColor: string
  icon: typeof Zap
  transitions: TransitionItem[]
}

// ─── Constants ───────────────────────────────────────────
const HERO_GLOW_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)',
} as const

const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'contract', label: 'Smart Contract', icon: Code },
  { id: 'privacy', label: 'Privacy Model', icon: Shield },
  { id: 'api', label: 'API / Integration', icon: Cpu },
  { id: 'developer', label: 'Developer', icon: Terminal },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
]

const HERO_STATS = [
  { label: 'Transitions', value: '27', color: 'text-violet-400' },
  { label: 'Mappings', value: '25', color: 'text-blue-400' },
  { label: 'Records', value: '6', color: 'text-emerald-400' },
  { label: 'Statements', value: '866', color: 'text-amber-400' },
  { label: 'Tests', value: '279', color: 'text-pink-400' },
]

const TRANSITION_GROUPS: TransitionGroupData[] = [
  {
    title: 'Subscription Core',
    color: 'text-violet-300',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    icon: Users,
    transitions: [
      { name: 'register_creator(price)', type: 'async', desc: 'Creator sets tier price and initializes counters.' },
      { name: 'subscribe(payment, creator, tier, amount, pass_id, expires_at)', type: 'async', desc: 'Pay with private credits, get AccessPass. Subscriber identity never enters finalize.' },
      { name: 'renew(old_pass, payment, new_tier, amount, pass_id, expires_at)', type: 'async', desc: 'Consume and re-create AccessPass with extended expiry. Allows tier changes.' },
      { name: 'verify_access(pass, creator)', type: 'async', desc: 'Minimal-footprint verification — finalize only checks revocation via pass_id.' },
      { name: 'verify_tier_access(pass, creator, required_tier)', type: 'async', desc: 'Verify AccessPass grants access to required tier without revealing subscriber identity.' },
      { name: 'subscribe_trial(payment, creator, tier, amount, pass_id, expires_at)', type: 'async', desc: 'Ephemeral trial at 20% tier price, ~50 min (1,000 blocks). One per creator via trial_used mapping.' },
    ],
  },
  {
    title: 'Privacy & BSP',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    icon: ShieldCheck,
    transitions: [
      { name: 'subscribe_blind(payment, creator, tier_id, amount, nonce)', type: 'async', desc: 'Nonce-based blinding — generates unique subscriber hash to prevent tracking.' },
      { name: 'renew_blind(old_pass, payment, new_tier_id, amount, nonce)', type: 'async', desc: 'Each renewal uses unique nonce — unlinkable identity rotation.' },
      { name: 'create_audit_token(pass, verifier, scope_mask)', type: 'sync', desc: 'Scoped AuditToken for third-party verification. Zero finalize footprint.' },
      { name: 'prove_subscriber_threshold(threshold)', type: 'async', desc: 'Prove creator has N+ subscribers without revealing exact count.' },
    ],
  },
  {
    title: 'Tiers & Pricing',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    icon: Layers,
    transitions: [
      { name: 'create_custom_tier(tier_id, price, name_hash)', type: 'async', desc: 'Creators dynamically define custom tiers (up to 20). Replaces hardcoded pricing.' },
      { name: 'update_tier_price(creator, tier_id, new_price)', type: 'async', desc: 'Update tier price. Changes apply only to new subscriptions.' },
      { name: 'deprecate_tier(creator, tier_id)', type: 'async', desc: 'Mark tier as deprecated. Existing subscribers retain access.' },
    ],
  },
  {
    title: 'Content Management',
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    icon: FileText,
    transitions: [
      { name: 'publish_content(content_id, min_tier)', type: 'async', desc: 'Publish content metadata on-chain with tier gating.' },
      { name: 'publish_encrypted_content(content_id, min_tier, commitment)', type: 'async', desc: 'Publish with encryption commitment hash on-chain.' },
      { name: 'update_content(content_id, new_min_tier)', type: 'async', desc: 'Update tier requirement for published content.' },
      { name: 'delete_content(content_id)', type: 'async', desc: 'Mark content as deleted with ContentDeletion proof.' },
      { name: 'dispute_content(content_id, reason_hash)', type: 'async', desc: 'Subscriber disputes content. Requires AccessPass + per-caller rate limiting.' },
    ],
  },
  {
    title: 'Tipping',
    color: 'text-pink-300',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    icon: Coins,
    transitions: [
      { name: 'tip(payment, creator, amount)', type: 'async', desc: 'Private tip to creator. Only aggregate revenue updated.' },
      { name: 'commit_tip(creator, amount, salt)', type: 'async', desc: 'Phase 1: commit to tip amount using BHP256 commitment.' },
      { name: 'reveal_tip(payment, creator, amount, salt)', type: 'async', desc: 'Phase 2: reveal and execute committed tip transfer.' },
    ],
  },
  {
    title: 'Gifting & Transfer',
    color: 'text-indigo-300',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    icon: Gift,
    transitions: [
      { name: 'gift_subscription(payment, creator, recipient, ...)', type: 'async', desc: 'Gift subscription to another address. Creates GiftToken for recipient.' },
      { name: 'redeem_gift(gift_token)', type: 'async', desc: 'Recipient redeems GiftToken to receive AccessPass.' },
      { name: 'transfer_pass(pass, recipient)', type: 'async', desc: 'Transfer AccessPass to new owner. Checks revocation first.' },
    ],
  },
  {
    title: 'Admin',
    color: 'text-zinc-300',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/20',
    icon: KeyRound,
    transitions: [
      { name: 'withdraw_platform_fees()', type: 'async', desc: 'Platform owner withdraws accumulated fees.' },
      { name: 'withdraw_creator_rev(amount)', type: 'async', desc: 'Creator withdraws accumulated subscription revenue.' },
      { name: 'revoke_access(pass_id)', type: 'async', desc: 'Creator revokes an AccessPass. Only affects that specific pass.' },
    ],
  },
]

// ─── Utility Components ──────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setCopyError(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyError(true)
      setTimeout(() => setCopyError(false), 3000)
    }
  }

  return (
    <div className="relative group rounded-xl overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-border">
        <span className="text-xs text-white/50 font-mono">{lang}</span>
        <button
          onClick={copy}
          aria-label={copyError ? 'Clipboard unavailable' : copied ? 'Copied' : 'Copy code'}
          className={`text-xs flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none rounded px-2 py-1 ${
            copyError ? 'text-red-400' : copied ? 'text-green-400' : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          {copied ? <Check className="w-3 h-3" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
          {copyError ? 'Failed' : copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 bg-surface-1 overflow-x-auto text-sm font-mono text-white/70 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function TransitionGroup({ group, defaultOpen = false }: { group: TransitionGroupData; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const Icon = group.icon

  return (
    <div className={`rounded-xl border ${open ? group.borderColor : 'border-border'} overflow-hidden transition-colors`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <div className={`w-8 h-8 rounded-lg ${group.bgColor} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${group.color}`} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-semibold ${group.color}`}>{group.title}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs ${group.bgColor} ${group.color}`}>
          {group.transitions.length}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/50 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {group.transitions.map((t) => (
                <div key={t.name} className="p-3 rounded-lg bg-white/[0.02] border border-border/50 hover:border-border transition-colors">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <code className="text-xs text-white/80 font-mono">{t.name}</code>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      t.type === 'async'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>{t.type}</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl bg-surface-1 border border-border overflow-hidden transition-colors hover:border-glass-hover">
      <button
        id={`docs-faq-${index}`}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
        aria-expanded={open}
        aria-controls={`docs-faq-answer-${index}`}
      >
        <h4 className="text-white font-medium pr-4 text-sm">{q}</h4>
        <ChevronDown className={`w-4 h-4 text-white/60 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
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
            <p className="px-4 pb-4 text-sm text-white/70 leading-relaxed">{a}</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Tab: Overview ───────────────────────────────────────

function OverviewTab() {
  return (
    <div className="space-y-10">
      {/* Quick Links */}
      <div className="relative rounded-xl overflow-hidden">
        <div className="gradient-border-accent" />
        <div className="relative p-5 bg-surface-1">
          <h3 className="text-sm font-semibold text-violet-300 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" aria-hidden="true" />
            Quick Links
          </h3>
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
                className="group/link flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-border/50 text-xs text-white/70 hover:text-white hover:border-violet-500/30 hover:bg-violet-500/[0.04] transition-all"
              >
                <ExternalLink className="w-3 h-3 shrink-0 text-white/50 group-hover/link:text-violet-400 transition-colors" aria-hidden="true" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* What is VeilSub */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">What is VeilSub?</h3>
        <p className="text-white/70 leading-relaxed mb-6">
          VeilSub is a privacy-first creator subscription platform where the Aleo blockchain enforces
          zero-footprint subscriptions via the Blind Subscription Protocol (BSP) — a novel three-layer
          architecture combining identity rotation, Poseidon2 field-hashed mapping keys, and selective
          disclosure. Subscriber addresses are physically impossible to reach finalize due to Leo&apos;s
          static analysis.
        </p>

        {/* Architecture - Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Subscriber */}
          <div className="relative rounded-xl overflow-hidden group/arch">
            <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.06] to-transparent opacity-0 group-hover/arch:opacity-100 transition-opacity" />
            <div className="relative p-5 border border-border rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-violet-400" aria-hidden="true" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-2">Subscriber</h4>
              <ul className="space-y-1.5 text-xs text-white/60">
                <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-violet-400 shrink-0" />Pick tier & pay ALEO</li>
                <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-violet-400 shrink-0" />Get encrypted AccessPass</li>
                <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-violet-400 shrink-0" />Verify with zero trace</li>
              </ul>
            </div>
          </div>

          {/* Contract */}
          <div className="relative rounded-xl overflow-hidden group/arch">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.06] to-transparent opacity-0 group-hover/arch:opacity-100 transition-opacity" />
            <div className="relative p-5 border border-border rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                <Blocks className="w-5 h-5 text-blue-400" aria-hidden="true" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-2">VeilSub Contract</h4>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['31 transitions', '30 mappings', '6 records'].map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20">{s}</span>
                ))}
              </div>
              <p className="text-xs text-white/60">ZK proofs generated locally. Identity never leaves your device.</p>
            </div>
          </div>

          {/* Data Split */}
          <div className="relative rounded-xl overflow-hidden group/arch">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.06] to-transparent opacity-0 group-hover/arch:opacity-100 transition-opacity" />
            <div className="relative p-5 border border-border rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-2">On-Chain State</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] font-medium text-emerald-400">PRIVATE (records)</span>
                  <p className="text-xs text-white/60">AccessPass, payments, subscriber ID</p>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-amber-400">PUBLIC (mappings)</span>
                  <p className="text-xs text-white/60">Counts, revenue, tier prices — all field-keyed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zero-Footprint Verification */}
      <div className="relative rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.04] to-transparent pointer-events-none" />
        <div className="relative p-5 border border-emerald-500/20 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Fingerprint className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white mb-2">Zero-Footprint Verification</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                <code className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-xs">verify_access</code> finalize
                performs a single read of <code className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-xs">access_revoked</code> keyed
                by pass_id — no subscriber address, no identity-linked writes, zero on-chain footprint. The entire lifecycle stays private:
                subscribe uses transfer_private, renew supports nonce-based blinding, and verify never increments subscriber-linked counters.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Tech Stack</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Smart Contract', value: 'Leo 3.4.0 (v27)', icon: Code },
            { label: 'Frontend', value: 'Next.js 16, React 19, TypeScript', icon: Blocks },
            { label: 'Styling', value: 'Tailwind CSS 4, Framer Motion', icon: Layers },
            { label: 'Wallet', value: 'Shield, Leo, Fox, Puzzle, Soter', icon: KeyRound },
            { label: 'Chain Queries', value: 'Provable REST API', icon: Database },
            { label: 'Hosting', value: 'Vercel (frontend), Supabase, Upstash', icon: Zap },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="p-3 rounded-lg bg-white/[0.02] border border-border/50 hover:border-border transition-colors flex items-center gap-3"
              >
                <Icon className="w-4 h-4 text-white/50 shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-[11px] text-white/50 uppercase tracking-wider">{item.label}</span>
                  <p className="text-xs text-white/80">{item.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Contract ───────────────────────────────────────

function ContractTab() {
  return (
    <div className="space-y-8">
      {/* Program ID */}
      <div className="relative rounded-xl overflow-hidden">
        <div className="gradient-border-accent" />
        <div className="relative p-5 bg-surface-1">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-[11px] text-white/50 uppercase tracking-wider">Deployed on testnet</span>
              <code className="block text-white/80 text-sm font-mono mt-1">{DEPLOYED_PROGRAM_ID}</code>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50">31 transitions &middot; 30 mappings</span>
              <a
                href={`https://testnet.aleoscan.io/program?id=${DEPLOYED_PROGRAM_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-shimmer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/15 transition-colors"
              >
                View on Explorer <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* AccessPass Record */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          Record Type (Private)
        </h3>
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

      {/* Mappings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" aria-hidden="true" />
          Mappings (Public) — 25 Total
        </h3>
        <CodeBlock
          lang="leo"
          code={`// ALL mapping keys are Poseidon2 field hashes—ZERO raw addresses in finalize

// Core
mapping tier_prices: field => u64;              // hash(creator) => base price
mapping subscriber_count: field => u64;         // hash(creator) => total subscribers
mapping total_revenue: field => u64;            // hash(creator) => total earned
mapping platform_revenue: u8 => u64;           // key=0 => platform earnings
mapping content_count: field => u64;            // hash(creator) => post count
mapping content_meta: field => u8;              // hash(content_id) => min tier

// Dynamic Tiers
mapping creator_tiers: field => u64;            // hash(creator, tier_id) => price
mapping tier_count: field => u64;               // hash(creator) => tier count
mapping tier_deprecated: field => bool;         // hash(creator, tier_id) => deprecated

// Content
mapping content_deleted: field => bool;         // hash(content_id) => deleted
mapping content_hashes: field => field;         // hash(content_id) => metadata hash
mapping content_creator: field => field;        // hash(content_id) => hash(creator)
mapping encryption_commits: field => field;     // hash(content_id) => encryption hash

// Subscriptions & Access
mapping gift_redeemed: field => bool;           // gift_token_id => redeemed
mapping nonce_used: field => bool;              // nonce_hash => consumed (BSP)
mapping access_revoked: field => bool;          // pass_id => revoked
mapping pass_creator: field => field;           // pass_id => hash(creator)

// Disputes
mapping content_disputes: field => u64;         // hash(content_id) => dispute count
mapping dispute_count_by_caller: field => u64;  // hash(caller, content) => count

// Tipping
mapping tip_commitments: field => bool;         // hash(creator, caller) => committed
mapping tip_revealed: field => bool;            // hash(creator, caller) => revealed

// Analytics
mapping subscription_by_tier: field => u64;     // hash(creator, tier) => count

// Platform Stats (v25)
mapping total_creators: u8 => u64;              // key=0 => total creators
mapping total_content: u8 => u64;               // key=0 => total content

// Trial Rate Limiting (v27)
mapping trial_used: field => bool;              // hash(caller, creator) => trialed`}
        />
      </div>

      {/* Transitions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" aria-hidden="true" />
          Transitions — 27 Total
        </h3>
        <p className="text-xs text-white/50 mb-4">Click to expand each category.</p>
        <div className="space-y-3">
          {TRANSITION_GROUPS.map((group, i) => (
            <TransitionGroup key={group.title} group={group} defaultOpen={i === 0} />
          ))}
        </div>
      </div>

      {/* Error Codes */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-amber-400" aria-hidden="true" />
          Error Codes (102 unique)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { range: 'ERR_001–009', desc: 'Tier creation & management', color: 'text-blue-400/70' },
            { range: 'ERR_010–017', desc: 'Content lifecycle', color: 'text-amber-400/70' },
            { range: 'ERR_018–027', desc: 'Registration, subscribe, verify', color: 'text-violet-400/70' },
            { range: 'ERR_028–038', desc: 'Tips, renewals, content publish', color: 'text-pink-400/70' },
            { range: 'ERR_039–054', desc: 'Gifting, escrow, refunds', color: 'text-indigo-400/70' },
            { range: 'ERR_055–060', desc: 'Fee withdrawal', color: 'text-zinc-400/70' },
            { range: 'ERR_061–077', desc: 'Blind subscriptions & tier verify', color: 'text-emerald-400/70' },
            { range: 'ERR_078–088', desc: 'Encrypted content, disputes, transfer', color: 'text-amber-400/70' },
            { range: 'ERR_089–098', desc: 'Referral subscriptions', color: 'text-blue-400/70' },
            { range: 'ERR_099–103', desc: 'Commit-reveal tips (BHP256)', color: 'text-pink-400/70' },
            { range: 'ERR_104–110', desc: 'Threshold proofs, platform stats', color: 'text-violet-400/70' },
            { range: 'ERR_111–117', desc: 'Trial subscriptions', color: 'text-emerald-400/70' },
            { range: 'ERR_118–119', desc: 'Scoped audit tokens (v27)', color: 'text-indigo-400/70' },
          ].map((e) => (
            <div key={e.range} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-border/50">
              <code className={`text-xs font-mono shrink-0 ${e.color}`}>{e.range}</code>
              <span className="text-xs text-white/60">{e.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Privacy Model ──────────────────────────────────

function PrivacyModelTab() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Privacy Architecture</h3>
        <p className="text-white/70 leading-relaxed">
          VeilSub&apos;s privacy is enforced by the Blind Subscription Protocol (BSP) at the program level.
          Subscriber addresses physically cannot enter finalize. All mapping keys are Poseidon2 field hashes (v23+),
          preventing address-to-data correlation even when examining public on-chain state.
        </p>
      </div>

      {/* Key Callouts */}
      <div className="grid gap-4">
        {/* Minimal-Footprint Verification */}
        <div className="relative rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.05] to-transparent pointer-events-none" />
          <div className="relative p-5 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              </div>
              <h4 className="text-emerald-300 font-semibold text-sm">Minimal-Footprint Verification</h4>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              <code className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-xs">verify_access</code> has
              a minimal finalize that only checks revocation via pass_id. No subscriber address, no identity-linked
              mapping writes, no counter increments — zero on-chain evidence of <em>who</em> verified.
            </p>
          </div>
        </div>

        {/* v23 Privacy Overhaul */}
        <div className="relative rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.05] to-transparent pointer-events-none" />
          <div className="relative p-5 border border-violet-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                <Hash className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
              </div>
              <h4 className="text-violet-300 font-semibold text-sm">v23: Full Poseidon2 Privacy Overhaul</h4>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              No raw addresses appear in any finalize block. Every mapping key is a Poseidon2 field hash.
              On-chain observers cannot correlate mapping reads with wallet addresses — even aggregate data
              like subscriber counts and revenue are keyed by opaque field values. Commit-reveal tipping uses{' '}
              <code className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-xs">BHP256::commit_to_field</code>{' '}
              for hidden tip amounts.
            </p>
          </div>
        </div>
      </div>

      {/* Key Guarantees */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Key Guarantees</h3>
        <div className="grid gap-3">
          {[
            {
              icon: EyeOff,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10',
              title: 'No subscriber address in finalize',
              detail: 'subscribe() only passes creator hash and amount to finalize. The caller\'s address creates the private AccessPass record.',
            },
            {
              icon: Lock,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
              title: 'Private credit transfers',
              detail: 'All payments use credits.aleo/transfer_private, not transfer_public. Payment amounts and sender addresses stay hidden.',
            },
            {
              icon: Fingerprint,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
              title: 'UTXO access proof pattern',
              detail: 'verify_access() consumes and re-creates the AccessPass. Finalize only checks revocation — subscriber address never reaches public state.',
            },
            {
              icon: ShieldCheck,
              color: 'text-pink-400',
              bg: 'bg-pink-500/10',
              title: 'No records to program addresses',
              detail: 'Records are created with owner: self.caller (the subscriber). No records are sent to the program address.',
            },
            {
              icon: Database,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
              title: 'Aggregate-only public data',
              detail: 'Public mappings only store aggregate counters: total subscriber count and revenue per creator. No individual data anywhere public.',
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-border/50 hover:border-border transition-colors">
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className={`w-4 h-4 ${item.color}`} aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm text-white font-medium mb-1">{item.title}</h4>
                  <p className="text-xs text-white/60 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* What Can't Be Inferred */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">What Can&apos;t Be Inferred?</h3>
        <p className="text-sm text-white/60 mb-4">
          Even with full access to the Aleo blockchain, an observer cannot determine:
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            'Which addresses subscribe to which creators',
            'How much any individual subscriber paid',
            'Whether a specific address holds an AccessPass',
            'The relationship between a subscriber and creator',
            'Who renewed or transferred a subscription',
            'Tip amounts before voluntary reveal',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5 p-3 rounded-lg bg-white/[0.02] border border-border/50">
              <Shield className="w-4 h-4 text-emerald-400/70 shrink-0" aria-hidden="true" />
              <span className="text-xs text-white/70">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: API / Integration ──────────────────────────────

function ApiTab() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" aria-hidden="true" />
          Reading Public Mappings
        </h3>
        <p className="text-sm text-white/70 mb-4">
          Public mapping data can be read via the Provable REST API without authentication.
        </p>
        <CodeBlock
          lang="bash"
          code={`# Get creator's tier price
curl https://api.explorer.provable.com/v1/testnet/program/${DEPLOYED_PROGRAM_ID}/mapping/tier_prices/<creator_hash>

# Get subscriber count
curl https://api.explorer.provable.com/v1/testnet/program/${DEPLOYED_PROGRAM_ID}/mapping/subscriber_count/<creator_hash>

# Get total revenue
curl https://api.explorer.provable.com/v1/testnet/program/${DEPLOYED_PROGRAM_ID}/mapping/total_revenue/<creator_hash>`}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Code className="w-4 h-4 text-violet-400" aria-hidden="true" />
          Wallet Integration
        </h3>
        <CodeBlock
          lang="typescript"
          code={`import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'

const { executeTransaction } = useWallet()

// Subscribe to a creator (v27)
const result = await executeTransaction({
  program: '${DEPLOYED_PROGRAM_ID}',
  function: 'subscribe',
  inputs: [
    paymentRecord,              // credits record (>= amount)
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
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" aria-hidden="true" />
          Microcredits Conversion
        </h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-2 text-xs">
            <div className="px-4 py-2.5 bg-white/[0.03] border-b border-r border-border font-medium text-white/60">ALEO</div>
            <div className="px-4 py-2.5 bg-white/[0.03] border-b border-border font-medium text-white/60">Microcredits</div>
            {[
              ['0.5', '500,000'],
              ['1', '1,000,000'],
              ['5', '5,000,000'],
              ['25', '25,000,000'],
            ].map(([aleo, micro]) => (
              <div key={aleo} className="contents">
                <div className="px-4 py-2 border-b border-r border-border/50 text-white/80">{aleo}</div>
                <div className="px-4 py-2 border-b border-border/50 text-white/60 font-mono">{micro}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Developer ──────────────────────────────────────

function DeveloperTab() {
  return (
    <div className="space-y-10">
      {/* Quick Start */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-violet-400" aria-hidden="true" />
          Quick Start
        </h3>
        <p className="text-sm text-white/60 mb-4">
          Interact with the VeilSub contract from Node.js using the Provable SDK.
        </p>
        <CodeBlock
          lang="typescript"
          code={`// Install
npm install @provablehq/sdk

// Subscribe to a creator
const tx = await programManager.execute(
  '${DEPLOYED_PROGRAM_ID}',
  'subscribe',
  [paymentRecord, creatorAddress, '1u8', '10900001u64', passId, expiresAt],
  300_000 // fee in microcredits
)`}
        />
      </div>

      {/* API Reference */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" aria-hidden="true" />
          API Reference
        </h3>
        <p className="text-sm text-white/60 mb-4">
          REST endpoints for querying creators, content, and analytics.
        </p>
        <div className="space-y-2">
          {[
            { method: 'GET', path: '/api/creators/list', desc: 'List all creators' },
            { method: 'GET', path: '/api/posts?creator=aleo1...', desc: "Get creator's posts" },
            { method: 'POST', path: '/api/posts/unlock', desc: 'Unlock gated content' },
            { method: 'GET', path: '/api/tiers?address=aleo1...', desc: "Get creator's tiers" },
            { method: 'GET', path: '/api/analytics/summary?address=aleo1...', desc: 'Creator analytics' },
          ].map((endpoint) => (
            <div
              key={endpoint.path}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-border/50 hover:border-border transition-colors"
            >
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold shrink-0 ${
                endpoint.method === 'GET'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {endpoint.method}
              </span>
              <code className="text-xs text-white/70 font-mono truncate">{endpoint.path}</code>
              <span className="ml-auto text-xs text-white/50 shrink-0 hidden sm:block">{endpoint.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Events */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <Bell className="w-5 h-5 text-pink-400" aria-hidden="true" />
          Webhook Events
        </h3>
        <p className="text-sm text-white/60 mb-4">
          Subscribe to real-time notifications for platform activity.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { event: 'new_subscriber', desc: 'When someone subscribes to a creator', icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { event: 'new_tip', desc: 'When someone tips a creator', icon: Coins, color: 'text-pink-400', bg: 'bg-pink-500/10' },
            { event: 'content_published', desc: 'When a creator publishes new content', icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { event: 'subscription_expiring', desc: 'Before a subscription expires', icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((hook) => {
            const Icon = hook.icon
            return (
              <div key={hook.event} className="p-4 rounded-xl bg-white/[0.02] border border-border/50 hover:border-border transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg ${hook.bg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${hook.color}`} aria-hidden="true" />
                  </div>
                  <code className="text-xs text-white/80 font-mono">{hook.event}</code>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{hook.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Contract Transitions */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <Code className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          Contract Transitions
        </h3>
        <p className="text-sm text-white/60 mb-4">
          Key transitions with their parameters for direct contract interaction.
        </p>
        <div className="space-y-3">
          {[
            {
              name: 'subscribe',
              params: 'payment, creator, tier, amount, pass_id, expires_at',
              desc: 'Subscribe to a creator. Payment is private credits, tier is a u8 ID, pass_id is a unique field.',
            },
            {
              name: 'tip',
              params: 'payment, creator, amount',
              desc: 'Send a private tip. Only aggregate revenue is updated publicly.',
            },
            {
              name: 'publish_content',
              params: 'content_id, min_tier, content_hash',
              desc: 'Publish content gated by minimum tier. Hash stored on-chain for integrity.',
            },
            {
              name: 'verify_access',
              params: 'pass, creator',
              desc: 'Prove subscription ownership. Finalize only checks revocation via pass_id.',
            },
          ].map((transition) => (
            <div key={transition.name} className="rounded-xl bg-white/[0.04] border border-border/50 overflow-hidden">
              <div className="px-4 py-3 bg-white/[0.03] border-b border-border/50 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <code className="text-sm text-white/90 font-mono">
                  {transition.name}(<span className="text-white/50">{transition.params}</span>)
                </code>
              </div>
              <p className="px-4 py-3 text-xs text-white/60 leading-relaxed">{transition.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: FAQ ────────────────────────────────────────────

function FaqTab() {
  const faqs = [
    { q: 'Can the creator see who subscribes?', a: 'No. The creator only sees aggregate statistics — total subscriber count and total revenue. Individual subscriber identities are never exposed on-chain or off-chain.' },
    { q: 'What wallet do I need?', a: 'VeilSub supports 5 Aleo wallets: Shield (recommended), Leo Wallet, Fox Wallet, Puzzle Wallet, and Soter Wallet. Install any of them as a browser extension and get testnet credits from faucet.aleo.org.' },
    { q: 'How does the AccessPass work?', a: 'When you subscribe, a private AccessPass record is created in your wallet. This record is encrypted and only you can see it. To prove access, verify_access consumes and re-creates the record — proving ownership cryptographically without revealing your identity.' },
    { q: 'What if I lose my AccessPass?', a: 'Your AccessPass is stored as an encrypted record on the Aleo blockchain. As long as you have access to your wallet (private key), you can always recover it. If you lose your wallet key, the pass is unrecoverable — this is the trade-off for privacy.' },
    { q: 'Is this on mainnet?', a: 'VeilSub is currently deployed on Aleo Testnet. Mainnet deployment is planned after thorough security auditing.' },
    { q: 'How much does it cost to subscribe?', a: 'The subscription price is set by each creator. Creators define custom tiers with any price (minimum 100 microcredits). Plus a small network fee for ZK proof generation.' },
    { q: 'Can I tip a creator without subscribing?', a: 'Yes! The tip() transition lets you send a private tip to any registered creator. The creator receives ALEO credits but never sees your address.' },
    { q: 'How can I test subscribing?', a: 'Connect your wallet on the app, visit a creator page, and subscribe. If no creator is registered, register yourself on the Dashboard page first. Then open the creator page in a different browser/wallet to test subscribing. Use the Verify page to check on-chain data.' },
    { q: 'Is there a pre-registered test creator?', a: 'Yes! The platform account (aleo1hp9m...sprk5wk) is registered with base price 1000 microcredits, 3 custom tiers (Supporter @ 500, Premium @ 2000, VIP @ 5000), and 5+ published content pieces. Visit Explore to find it.' },
    { q: 'How did VeilSub evolve from v15 to v29?', a: 'v15 was the first testnet deploy (security hardening). v16–v21 added features but exceeded testnet limits. v23 was a privacy overhaul: all mapping keys use Poseidon2 field hashes. v24 added content auth. v25 added threshold proofs. v26 added trial passes. v27 added scoped audit tokens and trial rate-limiting. v28 added stablecoin support (USDCx + USAD). v29 added Pedersen commitment mappings. Result: 31 transitions, 30 mappings.' },
  ]

  return (
    <div className="space-y-2">
      {faqs.map((faq, index) => (
        <FaqItem key={faq.q} q={faq.q} a={faq.a} index={index} />
      ))}
    </div>
  )
}

// ─── Tab Component Map ───────────────────────────────────

const TAB_COMPONENTS: Record<TabId, React.FC> = {
  overview: OverviewTab,
  contract: ContractTab,
  privacy: PrivacyModelTab,
  api: ApiTab,
  developer: DeveloperTab,
  faq: FaqTab,
}

// ─── Main Page ───────────────────────────────────────────

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
      <div className="min-h-screen relative overflow-x-hidden">
        {/* Background glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
          style={HERO_GLOW_STYLE}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* ─── Hero Header ─── */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl sm:text-4xl font-serif italic bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent"
                style={{ letterSpacing: '-0.03em' }}
              >
                Documentation
              </h1>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/[0.06] text-white/60 border border-white/10">
                v27
              </span>
            </div>

            <p className="text-sm text-white/60 mb-6">
              Everything you need to understand and integrate with{' '}
              <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/70 text-xs font-mono">{DEPLOYED_PROGRAM_ID}</code>
            </p>

            {/* Stat Pills */}
            <div className="flex flex-wrap gap-2">
              {HERO_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-border/50"
                >
                  <span className={`text-sm font-semibold font-mono ${stat.color}`}>{stat.value}</span>
                  <span className="text-[11px] text-white/50 uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>
          </m.div>

          {/* ─── Content Layout ─── */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:w-56 shrink-0">
              <nav className="lg:sticky lg:top-24 flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 snap-x snap-mandatory" role="tablist" aria-label="Documentation sections">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => switchTab(tab.id)}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls="docs-tabpanel"
                      id={`tab-${tab.id}`}
                      tabIndex={isActive ? 0 : -1}
                      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs lg:text-sm whitespace-nowrap snap-start transition-all duration-200 shrink-0 ${
                        isActive
                          ? 'text-white bg-violet-500/[0.08] border border-violet-500/[0.15] shadow-accent-sm'
                          : 'text-white/60 hover:text-white/80 hover:bg-white/[0.03] border border-transparent'
                      }`}
                    >
                      {/* Active indicator line */}
                      {isActive && (
                        <m.div
                          layoutId="docs-active-tab"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-violet-400 hidden lg:block"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${isActive ? 'text-violet-400' : ''}`} aria-hidden="true" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-w-0" role="tabpanel" id="docs-tabpanel" aria-labelledby={`tab-${activeTab}`}>
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

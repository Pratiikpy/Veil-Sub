'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Code,
  Shield,
  Cpu,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'

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
      // Clipboard API not available
    }
  }

  return (
    <div className="relative group rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/[0.06]">
        <span className="text-xs text-slate-500">{lang}</span>
        <button
          onClick={copy}
          className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 bg-white/[0.02] overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function OverviewTab() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-white mb-3">What is VeilSub?</h3>
        <p className="text-slate-400 leading-relaxed">
          VeilSub is a privacy-first creator subscription platform built on the Aleo blockchain.
          Subscribers pay with real ALEO credits and receive a private AccessPass record —
          their identity is never exposed on-chain. Creators see aggregate stats (total subscribers,
          total revenue) but never see individual subscriber identities.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Video Demo</h3>
        <p className="text-slate-400 leading-relaxed mb-3">
          Watch the full end-to-end walkthrough showing wallet connection, creator registration,
          private subscription, and on-chain verification.
        </p>
        <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-sm text-white font-medium">Video Demo</p>
            <p className="text-xs text-slate-400">
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
│ (Shield Wallet)│    │  Program    │     │                   │
│               │    │             │     │  PRIVATE:          │
│ 1. Pick tier  │    │ subscribe() │     │  - AccessPass      │
│ 2. Pay ALEO   │    │             │     │  - Payment details │
│ 3. Get pass   │    │ verify()    │     │  - Subscriber ID   │
│               │    │             │     │                   │
│               │    │ tip()       │     │  PUBLIC:           │
│               │    │             │     │  - Subscriber count│
└──────────────┘     └─────────────┘     │  - Total revenue   │
                                         │  - Tier prices     │
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
            { label: 'Wallet', value: '@demox-labs/aleo-wallet-adapter' },
            { label: 'Chain Queries', value: 'Provable API (REST)' },
            { label: 'Hosting', value: 'Vercel' },
          ].map((item) => (
            <div
              key={item.label}
              className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
            >
              <span className="text-xs text-slate-500">{item.label}</span>
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
        <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 flex items-center justify-between">
          <code className="text-violet-300 text-sm font-mono">veilsub_v4.aleo</code>
          <a
            href="https://explorer.aleo.org/testnet/program/veilsub_v4.aleo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            View on Explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Record Type (Private)</h3>
        <CodeBlock
          lang="leo"
          code={`record AccessPass {
    owner: address,    // subscriber (private — only they can see)
    creator: address,  // which creator (private)
    tier: u8,          // 1=basic, 2=premium, 3=vip (private)
    pass_id: field,    // unique identifier (private)
}`}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Mappings (Public)</h3>
        <CodeBlock
          lang="leo"
          code={`mapping tier_prices: address => u64;      // creator => base price (microcredits)
mapping subscriber_count: address => u64; // creator => total subscribers
mapping total_revenue: address => u64;    // creator => total earned`}
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
              desc: 'Pay with private credits, get a private AccessPass. Finalize enforces tier-based pricing (1x/2x/5x). Subscriber identity never enters finalize.',
            },
            {
              name: 'verify_access(pass, creator)',
              type: 'sync',
              desc: 'Consume and re-create AccessPass to prove access. No finalize — zero public footprint.',
            },
            {
              name: 'tip(payment, creator, amount)',
              type: 'async',
              desc: 'Private tip to creator. Only aggregate revenue updated. Tipper identity stays private.',
            },
          ].map((t) => (
            <div
              key={t.name}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
            >
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm text-violet-300 font-mono">{t.name}</code>
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
              <p className="text-sm text-slate-400">{t.desc}</p>
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
        <p className="text-slate-400 leading-relaxed mb-4">
          VeilSub&apos;s privacy model is enforced at the program level. The Leo smart contract
          is designed so that subscriber addresses physically cannot enter the finalize scope
          (the only part of a transaction that writes to public state).
        </p>
      </div>

      <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
        <h4 className="text-green-300 font-semibold mb-2">Zero-Footprint Access Verification</h4>
        <p className="text-sm text-slate-400 leading-relaxed">
          <code className="px-1 py-0.5 rounded bg-white/10 text-violet-300 text-xs">verify_access</code> is
          a pure transition with <strong className="text-white">no finalize block</strong>. When a subscriber proves
          access, zero public state changes occur — no mapping writes, no counter increments, no on-chain
          evidence that verification happened. This is a deliberate privacy design: adding a finalize block
          (e.g., for tracking verification count) would create a public record of <em>when</em> access was
          verified, enabling timing correlation attacks. Access proof relies entirely on Aleo&apos;s native
          record ownership system — no manual nullifiers or ZK proof verification needed.
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
              detail: 'verify_access() consumes the AccessPass record and re-creates it. This proves ownership without any public state change — the transition has no finalize block.',
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
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
            >
              <h4 className="text-white font-medium mb-1">{item.title}</h4>
              <p className="text-sm text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">What Can&apos;t Be Inferred?</h3>
        <p className="text-slate-400 leading-relaxed">
          Even with full access to the Aleo blockchain, an observer cannot determine:
        </p>
        <ul className="mt-3 space-y-2">
          {[
            'Which addresses subscribe to which creators',
            'How much any individual subscriber paid',
            'Whether a specific address holds an AccessPass',
            'The relationship between a subscriber and creator',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
              <Shield className="w-4 h-4 text-violet-400 shrink-0" />
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
        <p className="text-slate-400 mb-4">
          Public mapping data (tier prices, subscriber counts, revenue) can be read via the
          Provable REST API without any authentication.
        </p>
        <CodeBlock
          lang="bash"
          code={`# Get creator's tier price
curl https://api.explorer.provable.com/v1/testnet/program/veilsub_v4.aleo/mapping/tier_prices/<creator_address>

# Get subscriber count
curl https://api.explorer.provable.com/v1/testnet/program/veilsub_v4.aleo/mapping/subscriber_count/<creator_address>

# Get total revenue
curl https://api.explorer.provable.com/v1/testnet/program/veilsub_v4.aleo/mapping/total_revenue/<creator_address>`}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Wallet Integration</h3>
        <p className="text-slate-400 mb-4">
          Use the Aleo wallet adapter to interact with VeilSub transitions.
        </p>
        <CodeBlock
          lang="typescript"
          code={`import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base'

// Create a subscribe transaction (v4: 2 credit records)
const tx = Transaction.createTransaction(
  publicKey,                    // your wallet address
  WalletAdapterNetwork.Testnet,
  'veilsub_v4.aleo',          // program ID
  'subscribe',                  // transition name
  [
    creatorPaymentRecord,       // credits record for creator (95%)
    platformPaymentRecord,      // credits record for platform fee (5%)
    creatorAddress,             // creator's address
    '1u8',                      // tier (1=Supporter, 2=Premium, 3=VIP)
    '5000000u64',               // amount in microcredits (5 ALEO)
    passIdField,                // unique pass_id (field)
    expiresAtU32,               // expiry block height (u32)
  ],
  5_000_000,                    // fee in microcredits
  false                         // public fee
)

const txId = await requestTransaction(tx)`}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Microcredits Conversion</h3>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-sm text-slate-400 mb-2">
            1 ALEO = 1,000,000 microcredits
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>0.5 ALEO</span>
              <span className="text-slate-500">500,000 microcredits</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>5 ALEO</span>
              <span className="text-slate-500">5,000,000 microcredits</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>25 ALEO</span>
              <span className="text-slate-500">25,000,000 microcredits</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FaqTab() {
  const faqs = [
    {
      q: 'Can the creator see who subscribes?',
      a: 'No. The creator only sees aggregate statistics — total subscriber count and total revenue. Individual subscriber identities are never exposed on-chain or off-chain.',
    },
    {
      q: 'What wallet do I need?',
      a: 'You need Shield Wallet (formerly Leo Wallet) — a browser extension for Aleo. Install it from leo.app and get testnet credits from faucet.aleo.org.',
    },
    {
      q: 'How does the AccessPass work?',
      a: 'When you subscribe, a private AccessPass record is created in your wallet. This record is encrypted and only you can see it. To prove access, the verify_access transition consumes and re-creates the record — proving ownership cryptographically without revealing your identity.',
    },
    {
      q: 'What if I lose my AccessPass?',
      a: 'Your AccessPass is stored as an encrypted record on the Aleo blockchain. As long as you have access to your wallet (private key), you can always recover it. If you lose your wallet key, the pass is unrecoverable — this is the trade-off for privacy.',
    },
    {
      q: 'Is this on mainnet?',
      a: 'VeilSub is currently deployed on Aleo Testnet. Mainnet deployment is planned for a future phase after thorough security auditing.',
    },
    {
      q: 'How much does it cost to subscribe?',
      a: 'The subscription price is set by each creator. There are three tiers: Supporter (1x base price), Premium (2x), and VIP (5x). Plus a small network fee for the ZK proof generation.',
    },
    {
      q: 'Can I tip a creator without subscribing?',
      a: 'Yes! The tip() transition lets you send a private tip to any registered creator. The creator receives the ALEO credits but never sees your address.',
    },
    {
      q: 'How can I test subscribing?',
      a: 'Connect your Shield Wallet on the app, then visit a creator page. If no creator is registered yet, register yourself on the Dashboard page first (costs a small network fee). Then open the creator page in a different browser or wallet to test subscribing. You can also use the Verify page to check on-chain mapping data.',
    },
  ]

  return (
    <div className="space-y-3">
      {faqs.map((faq) => (
        <div
          key={faq.q}
          className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
        >
          <h4 className="text-white font-medium mb-2">{faq.q}</h4>
          <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
        </div>
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
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const ActiveContent = TAB_COMPONENTS[activeTab]

  return (
    <PageTransition>
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-white mb-2">Documentation</h1>
            <p className="text-slate-400">
              Everything you need to understand and integrate with VeilSub.
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Tab Navigation */}
            <div className="lg:w-56 shrink-0">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? 'text-white bg-white/[0.06] border border-white/[0.08]'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
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
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ActiveContent />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

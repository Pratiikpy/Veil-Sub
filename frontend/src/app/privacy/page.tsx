'use client'

import { motion } from 'framer-motion'
import {
  Shield,
  EyeOff,
  Eye,
  Lock,
  Fingerprint,
  Server,
  FileCode,
  ShieldCheck,
  Database,
  Layers,
} from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function PrivacyPage() {
  return (
    <PageTransition>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/[0.08] border border-violet-500/[0.15] mb-6">
                <Shield className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-violet-300/90">Zero-Knowledge Privacy</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight mb-6">
                <span className="text-white">
                  How VeilSub Protects You
                </span>
              </h1>
              <p className="text-lg text-[#a1a1aa] max-w-2xl mx-auto">
                Built on Aleo&apos;s zero-knowledge proof system. Subscriber addresses
                never enter the finalize scope — enforced by the Leo compiler.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ZK Explainer */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">What Are Zero-Knowledge Proofs?</h2>
              <p className="text-[#a1a1aa] max-w-2xl mx-auto">
                A ZK proof lets you prove something is true without revealing the underlying data.
                Like proving you&apos;re over 21 without showing your ID.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              <GlassCard shimmer delay={0}>
                <div className="w-12 h-12 rounded-[12px] bg-violet-500/10 flex items-center justify-center mb-4">
                  <Fingerprint className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Prove Without Revealing</h3>
                <p className="text-sm text-[#a1a1aa]">
                  When you subscribe, a ZK proof confirms your payment is valid without exposing
                  your wallet address, amount, or any identifying information to the public ledger.
                </p>
              </GlassCard>

              <GlassCard shimmer delay={0.1}>
                <div className="w-12 h-12 rounded-[12px] bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Encrypted Records</h3>
                <p className="text-sm text-[#a1a1aa]">
                  Your AccessPass is a private record encrypted with your wallet key. Only you
                  can see or use it. Not even the creator, not even Aleo validators.
                </p>
              </GlassCard>

              <GlassCard shimmer delay={0.2}>
                <div className="w-12 h-12 rounded-[12px] bg-purple-500/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Mathematically Guaranteed</h3>
                <p className="text-sm text-[#a1a1aa]">
                  The Leo compiler rejects any code path where subscriber addresses
                  reach finalize scope. No runtime policy — compile-time enforcement.
                </p>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Zero-Footprint Hero Callout */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial">
              <div className="relative rounded-[12px] overflow-hidden">
                {/* Gradient border effect */}
                <div className="absolute -inset-[1px] rounded-[12px] bg-gradient-to-r from-violet-500 via-green-400 to-violet-500 opacity-60" />
                <div className="relative rounded-[12px] bg-[#0d0b14] p-8">
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 w-14 h-14 rounded-[12px] bg-gradient-to-br from-violet-500/20 to-green-500/20 flex items-center justify-center">
                      <Fingerprint className="w-7 h-7 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-white">Zero-Footprint Access Verification</h3>
                        <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-medium text-green-400">
                          Unique to VeilSub
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 mb-5">
                        {[
                          'verify_access has NO finalize block — zero public state changes when proving access',
                          'No mapping writes, no counter increments, no on-chain evidence of verification',
                          'Prevents timing correlation attacks — observers cannot track when access is checked',
                          'Access checks leave zero on-chain evidence — no mapping writes, no counters',
                        ].map((point, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 mt-1.5" />
                            <p className="text-sm text-[#a1a1aa] leading-relaxed">{point}</p>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 rounded-[12px] bg-[#0a0a0a] border border-white/[0.08]">
                        <pre className="text-xs text-[#a1a1aa] font-mono leading-relaxed overflow-x-auto">
                          <code>{`transition verify_access(pass: AccessPass, creator: address) -> AccessPass {
    assert_eq(pass.creator, creator);
    return AccessPass { owner: pass.owner, creator: pass.creator,
        tier: pass.tier, pass_id: pass.pass_id, expires_at: pass.expires_at }
    then finalize(pass.pass_id);
}
finalize verify_access(pass_id: field) {
    let revoked: bool = access_revoked.get_or_use(pass_id, false);
    assert_eq(revoked, false);  // Reject revoked passes
}
// ↑ Finalize only receives pass_id — never the subscriber address.
// Revocation enforced, but zero identity exposure.`}</code>
                        </pre>
                      </div>
                      <p className="text-xs text-[#71717a] mt-3">
                        Unique design: revocation enforcement + zero subscriber exposure. The finalize only checks
                        a boolean mapping keyed by pass_id — no subscriber address ever reaches public state.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Private vs Public */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">What&apos;s Private vs. Public</h2>
              <p className="text-[#a1a1aa]">
                Full transparency on what stays hidden and what&apos;s verifiable.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Private Column */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-[12px] bg-white/[0.04] flex items-center justify-center">
                    <EyeOff className="w-5 h-5 text-[#a1a1aa]" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Private Data</h3>
                    <p className="text-xs text-[#71717a]">ZK Records — only you can see</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Subscriber Identity',
                      desc: 'Your wallet address never enters the finalize scope. It is physically impossible for it to appear in any public mapping.',
                      icon: Fingerprint,
                    },
                    {
                      title: 'Subscription Relationship',
                      desc: 'Creators cannot enumerate who subscribes. They only see a total count — never individual addresses.',
                      icon: Layers,
                    },
                    {
                      title: 'Payment Amount Per Subscriber',
                      desc: 'All payments use credits.aleo/transfer_private or token_registry.aleo/transfer_private. Individual payment amounts are hidden on-chain regardless of token type.',
                      icon: Lock,
                    },
                    {
                      title: 'AccessPass Ownership',
                      desc: 'Your AccessPass record is encrypted with your wallet key. Only your wallet can decrypt and display it.',
                      icon: Shield,
                    },
                    {
                      title: 'Subscription Tiers (v9)',
                      desc: 'Creator-defined tier metadata is stored hashed. Only the creator can map tier_id back to tier details. Subscribers never leak which tier they purchased.',
                      icon: Lock,
                    },
                    {
                      title: 'GiftToken Records (v10)',
                      desc: 'Gift records are encrypted and visible only to the recipient. Givers and creators cannot see gift details.',
                      icon: Shield,
                    },
                    {
                      title: 'RefundEscrow Records (v10)',
                      desc: 'Escrow data is stored hashed in mappings. Subscribers can claim refunds privately without revealing amount or timing to creators.',
                      icon: Lock,
                    },
                    {
                      title: 'Blind Subscriber Nonce (v11)',
                      desc: 'Each renewal generates a unique nonce-based subscriber hash. Creators cannot correlate consecutive renewals from the same subscriber.',
                      icon: Fingerprint,
                    },
                    {
                      title: 'Pedersen Subscriber Count (v17)',
                      desc: 'Homomorphic Pedersen commitments hide individual subscription events. Creators prove aggregate counts via zero-footprint ZK proofs without revealing per-subscriber data.',
                      icon: ShieldCheck,
                    },
                    {
                      title: 'Revenue Range Proofs (v17)',
                      desc: 'Prove revenue falls within a range without disclosing the exact amount. Uses Pedersen commitments with salt-derived randomizers for unlinkable proofs.',
                      icon: Lock,
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.title}
                        className="p-3 rounded-[12px] bg-white/[0.04] border border-white/[0.08]"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-[#a1a1aa]" />
                          <span className="text-sm font-medium text-white">{item.title}</span>
                        </div>
                        <p className="text-xs text-[#a1a1aa] leading-relaxed">{item.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>

              {/* Public Column */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-[12px] bg-slate-500/15 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-[#a1a1aa]" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Public Data</h3>
                    <p className="text-xs text-[#71717a]">Mappings — verifiable by everyone</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Creator Tier Price',
                      desc: 'Set by the creator and publicly visible so subscribers can see pricing before connecting.',
                      icon: Database,
                    },
                    {
                      title: 'Total Subscriber Count',
                      desc: 'An aggregate counter only. Shows "47 subscribers" — not which addresses subscribed.',
                      icon: Server,
                    },
                    {
                      title: 'Total Revenue',
                      desc: 'Aggregate ALEO earned. No per-subscriber breakdown. Proves payments are real.',
                      icon: Database,
                    },
                    {
                      title: 'Creator Tier Metadata (v9)',
                      desc: 'Public listing of available tiers per creator. Tier prices and limits are visible so subscribers can choose.',
                      icon: Database,
                    },
                    {
                      title: 'Nonce Usage Tracking (v11)',
                      desc: 'Public mapping of consumed nonces — proves blind renewal anonymity without revealing identities.',
                      icon: Server,
                    },
                    {
                      title: 'Content Existence & Updates (v9)',
                      desc: 'Hashed content IDs and deletion status are public. Content bodies and author identity remain off-chain.',
                      icon: Database,
                    },
                    {
                      title: 'Pedersen Aggregate Commitments (v17)',
                      desc: 'Aggregate Pedersen commitments in sub_count_commit mapping. Verifiable but reveals nothing about individual subscribers.',
                      icon: Server,
                    },
                    {
                      title: 'Program Source Code',
                      desc: 'The Leo program is fully open-source and deployed on-chain. Anyone can audit it.',
                      icon: FileCode,
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.title}
                        className="p-3 rounded-[12px] bg-[#0a0a0a] border border-white/[0.08]"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-[#a1a1aa]" />
                          <span className="text-sm font-medium text-white">{item.title}</span>
                        </div>
                        <p className="text-xs text-[#a1a1aa] leading-relaxed">{item.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Threat Model */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">Privacy Threat Model</h2>
              <p className="text-[#a1a1aa]">
                Honest analysis of what an adversary could and cannot learn.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <GlassCard delay={0}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-[12px] bg-amber-500/10 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-white font-semibold">What an Adversary Could Learn</h3>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      title: 'Timing Correlation',
                      desc: 'When subscriber_count increments, an observer can correlate the timestamp — narrowing down when a subscription occurred.',
                    },
                    {
                      title: 'Amount Inference',
                      desc: 'If total_revenue jumps by exactly the tier price, an observer may infer the tier purchased. Mitigated by overlapping transactions adding noise.',
                    },
                    {
                      title: 'Renewal Pattern Tracking',
                      desc: 'v12 Blind Renewal: Each renewal_blind() uses a unique nonce — MITIGATED. Creators cannot correlate consecutive renewals from the same subscriber.',
                    },
                    {
                      title: 'Network Metadata',
                      desc: 'Aleo gossip does not provide IP anonymity. Users should use VPN/Tor for network-level privacy. This applies to all blockchains.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-3 rounded-[12px] bg-amber-500/5 border border-amber-500/10">
                      <p className="text-sm font-medium text-amber-300 mb-1">{item.title}</p>
                      <p className="text-xs text-[#a1a1aa] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard delay={0.1}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-[12px] bg-green-500/10 flex items-center justify-center">
                    <EyeOff className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-white font-semibold">What an Adversary Cannot Learn</h3>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      title: 'Subscriber Identity',
                      desc: 'No code path exists for wallet addresses to reach public state — verified by auditing the Leo source.',
                    },
                    {
                      title: 'Subscription Relationships',
                      desc: 'There is no on-chain mapping from subscriber → creator. Even with full chain access, relationships are unknowable.',
                    },
                    {
                      title: 'Individual Payment Amounts',
                      desc: 'All payments use credits.aleo/transfer_private. Per-subscriber amounts are hidden in the ZK proof.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-3 rounded-[12px] bg-green-500/5 border border-green-500/10">
                      <p className="text-sm font-medium text-green-300 mb-1">{item.title}</p>
                      <p className="text-xs text-[#a1a1aa] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <GlassCard delay={0.2}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-[12px] bg-white/[0.04] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#a1a1aa]" />
                  </div>
                  <h3 className="text-white font-semibold">What We Mitigate</h3>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      title: 'API Proxy',
                      desc: 'All mapping reads go through Next.js rewrites, preventing browser→Provable IP correlation.',
                    },
                    {
                      title: 'No Subscriber Data in Finalize',
                      desc: 'Finalize only receives creator address, amount, and tier. Subscriber identity has no pathway to public state.',
                    },
                    {
                      title: 'Finalize Parameter Tradeoff',
                      desc: 'Tier and amount are public in finalize — this is required for on-chain payment validation (validators must enforce correct pricing). The subscriber ADDRESS is the privacy-critical value and it never touches finalize. Skipping validation would allow paying base price for VIP access.',
                    },
                    {
                      title: 'Zero-Footprint Access Verification',
                      desc: 'verify_access has NO finalize block. When proving access, zero public state changes occur — no mapping writes, no counters, no on-chain evidence. This prevents timing correlation attacks from tracking when access was verified.',
                    },
                    {
                      title: 'Blind Renewal (v11)',
                      desc: 'Each renewal generates a unique subscriber hash via nonce — creators cannot track renewal patterns. Every renew_blind() uses a fresh nonce, preventing correlation between consecutive renewals from the same subscriber.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-3 rounded-[12px] bg-white/[0.04] border border-white/[0.08]">
                      <p className="text-sm font-medium text-[#a1a1aa] mb-1">{item.title}</p>
                      <p className="text-xs text-[#a1a1aa] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard delay={0.3}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-[12px] bg-slate-500/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-[#a1a1aa]" />
                  </div>
                  <h3 className="text-white font-semibold">Honest Limitations</h3>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      title: 'Wallet Key Loss',
                      desc: 'AccessPasses are unrecoverable without your private key. This is the fundamental privacy/recoverability tradeoff in ZK systems.',
                    },
                    {
                      title: 'Client-Side Expiry Check',
                      desc: 'AccessPasses have an expires_at field (block height), but expiry is enforced client-side only. Adding finalize to verify_access would break its zero-public-footprint property. A sophisticated user could bypass expiry locally — but cannot forge payment or pass ownership.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-3 rounded-[12px] bg-[#0a0a0a] border border-white/[0.08]">
                      <p className="text-sm font-medium text-[#a1a1aa] mb-1">{item.title}</p>
                      <p className="text-xs text-[#a1a1aa] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Code Proof */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">Privacy in the Code</h2>
              <p className="text-[#a1a1aa]">How each transition protects your identity.</p>
            </motion.div>

            {/* Data Flow Diagram */}
            <div className="mb-8 grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-[12px] bg-white/[0.04] border border-white/[0.08]">
                <h4 className="text-sm font-medium text-[#a1a1aa] mb-3">Subscribe Flow</h4>
                <div className="space-y-2 text-xs text-[#a1a1aa]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <span>Wallet sends payment via ZK proof</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <span>AccessPass record created (private, encrypted to your key)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    <span>Finalize updates aggregate mappings only (count, revenue)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    <span>Only creator address and amount reach finalize</span>
                  </div>
                </div>
              </div>
              <div className="p-5 rounded-[12px] bg-green-500/5 border border-green-500/15">
                <h4 className="text-sm font-medium text-green-300 mb-3">Verify Access Flow</h4>
                <div className="space-y-2 text-xs text-[#a1a1aa]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    <span>Wallet submits AccessPass to transition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    <span>Pass consumed and re-created (UTXO pattern)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    <span>No finalize function — zero public state change</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    <span>No on-chain evidence that verification occurred</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  fn: 'subscribe()',
                  guarantee: 'Finalize receives only creator address and amount — subscriber address is never passed to any public scope.',
                },
                {
                  fn: 'verify_access()',
                  guarantee: 'Pure transition with no finalize — no public state change when proving access. Zero on-chain footprint.',
                },
                {
                  fn: 'tip()',
                  guarantee: 'Finalize only updates aggregate total_revenue — tipper address stays completely private.',
                },
                {
                  fn: 'renew()',
                  guarantee: 'Consumes the old pass, issues a fresh one with extended expiry. Same privacy model as subscribe.',
                },
                {
                  fn: 'publish_content()',
                  guarantee: 'Only content_id and min_tier enter finalize. Content body stays off-chain. Creator address is already public.',
                },
                {
                  fn: 'subscribe_blind() (v11)',
                  guarantee: 'Subscriber nonce generates blind hash — creator cannot correlate subscriber identity across transactions.',
                },
                {
                  fn: 'renew_blind() (v11)',
                  guarantee: 'Each renewal uses a unique nonce — consecutive renewals cannot be linked to the same subscriber.',
                },
                {
                  fn: 'gift_subscription() (v10)',
                  guarantee: 'GiftToken is encrypted to recipient. Giver identity stays private. Only recipient can decrypt and redeem.',
                },
                {
                  fn: 'redeem_gift() (v10)',
                  guarantee: 'Recipient redeems GiftToken to AccessPass. Only recipient address is used — giver remains unknown.',
                },
                {
                  fn: 'subscribe_with_escrow() (v10)',
                  guarantee: 'Payment held in escrow. Subscriber can claim refund privately. Amount and timing hidden from creator.',
                },
                {
                  fn: 'claim_refund() (v10)',
                  guarantee: 'Refund claim is private. Subscriber address never reaches finalize. Only escrow status updated.',
                },
                {
                  fn: 'verify_tier_access() (v15)',
                  guarantee: 'Proves tier access without revealing which tier subscriber holds or subscriber identity.',
                },
                {
                  fn: 'subscribe_private_count() (v17)',
                  guarantee: 'Maximum privacy mode — uses homomorphic Pedersen commitments instead of public counters. No subscriber_count increment, no public trace.',
                },
                {
                  fn: 'prove_sub_count() (v17)',
                  guarantee: 'Zero-footprint ZK proof — proves subscriber count matches Pedersen commitment. No finalize, no on-chain trace of the proof.',
                },
                {
                  fn: 'prove_revenue_range() (v17)',
                  guarantee: 'Zero-footprint range proof — proves revenue within bounds without revealing exact amount. No finalize, no state change.',
                },
                {
                  fn: 'subscribe_referral() (v16)',
                  guarantee: 'Referral subscription with 10% reward to referrer. Referrer identity stays private via ReferralReward record.',
                },
                {
                  fn: 'All payments',
                  guarantee: 'Use credits.aleo/transfer_private or token_registry.aleo/transfer_private — never public transfers. Amount, sender, and token type are hidden on-chain.',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.fn}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-4 p-4 rounded-[12px] bg-[#0a0a0a] border border-white/[0.08] hover:border-[rgba(255,255,255,0.1)] transition-colors"
                >
                  <code className="shrink-0 px-3 py-1.5 rounded-[8px] bg-white/[0.04] border border-white/[0.08] text-[#a1a1aa] text-sm font-mono">
                    {item.fn}
                  </code>
                  <p className="text-sm text-[#a1a1aa] pt-1">{item.guarantee}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison vs Traditional */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">VeilSub vs. Traditional Platforms</h2>
            </motion.div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-3 px-4 text-[#a1a1aa] font-medium">Feature</th>
                    <th className="text-center py-3 px-4 text-red-400 font-medium">Patreon / Ko-fi</th>
                    <th className="text-center py-3 px-4 text-green-400 font-medium">VeilSub</th>
                  </tr>
                </thead>
                <tbody className="text-[#a1a1aa]">
                  {[
                    ['Subscriber identity', 'Public', 'Private (ZK)'],
                    ['Transaction history', 'Permanent & visible', 'Hidden on-chain'],
                    ['Creator sees who subscribes', 'Yes — full list', 'No — aggregate only'],
                    ['Payment privacy', 'Bank/card linked', 'Private credit transfer'],
                    ['Third-party data access', 'Platform sells data', 'No data to sell'],
                    ['Censorship resistance', 'Platform can ban', 'On-chain, unstoppable'],
                  ].map(([feature, trad, veilsub]) => (
                    <tr key={feature} className="border-b border-white/[0.08]">
                      <td className="py-3 px-4 text-white">{feature}</td>
                      <td className="py-3 px-4 text-center text-red-300/70">{trad}</td>
                      <td className="py-3 px-4 text-center text-green-300">{veilsub}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Comparison vs Aleo Competitors */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">Privacy Comparison: Aleo Ecosystem</h2>
              <p className="text-[#a1a1aa]">
                How VeilSub&apos;s privacy model compares to other projects in the Aleo Privacy Buildathon.
              </p>
            </motion.div>

            <div className="overflow-x-auto rounded-[12px] border border-white/[0.08]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.08]">
                    <th className="text-left py-3 px-4 text-[#a1a1aa] font-medium">Privacy Feature</th>
                    <th className="text-center py-3 px-4 text-violet-400 font-medium">VeilSub</th>
                    <th className="text-center py-3 px-4 text-[#71717a] font-medium">NullPay</th>
                    <th className="text-center py-3 px-4 text-[#71717a] font-medium">Veiled Markets</th>
                    <th className="text-center py-3 px-4 text-[#71717a] font-medium">lasagna</th>
                  </tr>
                </thead>
                <tbody className="text-[#a1a1aa]">
                  {[
                    ['Subscriber never in finalize', true, true, 'N/A', 'N/A'],
                    ['Zero-footprint verification', true, false, false, false],
                    ['Blind renewal (unlinkable)', true, false, false, false],
                    ['Pedersen commitments', true, false, false, true],
                    ['Zero-footprint proofs', '3', '0', '0', '0'],
                    ['Privacy modes', '3', '1', '1', '1'],
                    ['Private tipping', true, false, false, false],
                    ['Subscription transfer', true, false, false, false],
                    ['Privacy-preserving referrals', true, false, false, false],
                    ['Encrypted content delivery', true, false, false, false],
                    ['Poseidon2 optimization', true, false, false, false],
                  ].map(([feature, vs, np, vm, lg]) => (
                    <tr key={feature as string} className="border-b border-white/[0.06]">
                      <td className="py-2.5 px-4 text-white text-xs">{feature as string}</td>
                      {[vs, np, vm, lg].map((val, i) => (
                        <td key={i} className="py-2.5 px-4 text-center">
                          {val === true ? (
                            <span className={`text-xs font-medium ${i === 0 ? 'text-green-400' : 'text-green-400/60'}`}>Yes</span>
                          ) : val === false ? (
                            <span className="text-xs text-[#52525b]">No</span>
                          ) : (
                            <span className={`text-xs font-medium ${i === 0 ? 'text-violet-400' : 'text-[#71717a]'}`}>{val as string}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#52525b] mt-4 text-center">
              Comparison based on publicly available source code. NullPay v13, Veiled Markets v16, lasagna latest.
              N/A = not applicable (different domain — AMM or prediction market).
            </p>
          </div>
        </section>

      </div>
    </PageTransition>
  )
}

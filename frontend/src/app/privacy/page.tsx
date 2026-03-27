'use client'

import { m } from 'framer-motion'
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
import Tooltip from '@/components/ui/Tooltip'
import { DEPLOYED_PROGRAM_ID } from '@/lib/config'

// Static styles to prevent re-renders
const HERO_GLOW_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
} as const

const LETTER_SPACING_STYLE = { letterSpacing: '-0.03em' } as const

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function PrivacyPage() {
  return (
    <PageTransition>
      <div className="min-h-screen overflow-x-hidden">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[800px] h-[200px] sm:h-[400px] pointer-events-none"
            style={HERO_GLOW_STYLE}
          />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-8 lg:px-8 pt-12 sm:pt-20 pb-8 sm:pb-16">
            <m.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/[0.08] border border-violet-500/[0.15] mb-8">
                <Shield className="w-4 h-4 text-violet-400" aria-hidden="true" />
                <span className="text-sm text-violet-300/90">Zero-Knowledge Privacy</span>
              </div>
              <h1
                className="text-3xl sm:text-4xl font-serif italic text-white mb-6"
                style={LETTER_SPACING_STYLE}
              >
                How VeilSub Protects You
              </h1>
              <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8">
                Built on Aleo&apos;s zero-knowledge proof system. The Blind Subscription Protocol (BSP)
                prevents subscriber addresses from reaching finalize layer through three isolation mechanisms:
                (1) private AccessPass records owned only by subscribers, (2) Poseidon2 field-hashed mapping keys
                for aggregate-only finalize writes, (3) pass_id-based verification with zero finalize footprint.
                Enforced at compile time, not runtime policy.
              </p>
              <a
                href={`https://testnet.aleoscan.io/program?id=${DEPLOYED_PROGRAM_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 hover:bg-violet-500/20 transition-all"
              >
                <Shield className="w-4 h-4" aria-hidden="true" />
                Verify on Aleoscan—audit the deployed contract yourself
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </m.div>
          </div>
        </section>

        {/* Section Navigation */}
        <nav className="sticky top-16 z-30 bg-black/80 backdrop-blur-xl border-b border-border/75 overflow-x-auto hidden md:block">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-8 flex gap-1 py-2">
            {[
              { id: 'bsp', label: 'BSP Framework' },
              { id: 'zk-proofs', label: 'ZK Proofs' },
              { id: 'private-vs-public', label: 'Private vs Public' },
              { id: 'threat-model', label: 'Threat Model' },
              { id: 'code-privacy', label: 'In the Code' },
              { id: 'vs-traditional', label: 'vs Traditional' },
              { id: 'vs-aleo', label: 'vs Web2 Platforms' },
            ].map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-4 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-all whitespace-nowrap"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Privacy in Plain English */}
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-8 pt-8 sm:pt-12">
          <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 mb-8">
            <h3 className="text-sm font-semibold text-emerald-400 mb-2">Privacy in Plain English</h3>
            <ul className="text-sm text-white/70 space-y-1.5">
              <li>Your name is never linked to which creator you support.</li>
              <li>No payment history connects you to creators.</li>
              <li>Even we (the VeilSub team) cannot see who subscribed to whom.</li>
              <li>Your subscription pass is stored only in your wallet — nowhere else.</li>
            </ul>
          </div>
        </div>

        {/* Blind Subscription Protocol (BSP) */}
        <section id="bsp" className="py-8 sm:py-16 scroll-mt-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-8">
            <m.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-6 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/[0.08] border border-violet-500/[0.15] mb-4">
                <Layers className="w-4 h-4 text-violet-400" aria-hidden="true" />
                <span className="text-sm text-violet-300/90">Novel Privacy Framework</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-4">
                Blind Subscription Protocol
                <span className="ml-2 text-violet-400">(BSP)</span>
              </h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                A three-layer privacy architecture that makes the entire subscriber lifecycle
                unlinkable—from first subscription through every renewal, tip, and verification.
              </p>
            </m.div>

            {/* Visual BSP Data Flow Diagram */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <div className="relative rounded-xl border border-violet-500/30 bg-gradient-to-b from-violet-500/[0.08] to-transparent p-6 sm:p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                <h3 className="text-center text-lg font-semibold text-white mb-2">
                  BSP Data Flow: Subscribe Transaction
                </h3>
                <p className="text-center text-xs text-white/60 mb-8">
                  See how subscriber identity is protected at each layer
                </p>

                {/* Desktop Flowchart */}
                <div className="hidden sm:flex items-center justify-between gap-2 md:gap-4">
                  {/* Box 1: User */}
                  <div className="flex-1 text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-xl bg-white/10 border-2 border-white/30 flex items-center justify-center mb-4">
                      <Fingerprint className="w-8 h-8 md:w-10 md:h-10 text-white/80" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium text-white">Subscriber</p>
                    <p className="text-xs text-white/60 font-mono">aleo1abc...xyz</p>
                  </div>

                  {/* Arrow 1 */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="flex items-center gap-1 text-violet-400">
                      <div className="w-8 md:w-12 h-0.5 bg-violet-400/60" />
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                    <p className="text-xs text-violet-300 mt-1">ZK Proof</p>
                  </div>

                  {/* Box 2: Transition Layer */}
                  <div className="flex-1 text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-xl bg-violet-500/20 border-2 border-violet-400 flex items-center justify-center mb-4">
                      <Lock className="w-8 h-8 md:w-10 md:h-10 text-violet-400" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium text-white">Transition</p>
                    <p className="text-xs text-white/60">Creates AccessPass</p>
                    <p className="text-xs text-violet-400 font-medium mt-1">Private Record</p>
                  </div>

                  {/* Arrow 2 */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="flex items-center gap-1 text-green-400">
                      <div className="w-8 md:w-12 h-0.5 bg-green-400/60" />
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                    <p className="text-xs text-green-300 mt-1">Hashed Keys</p>
                  </div>

                  {/* Box 3: Finalize Layer */}
                  <div className="flex-1 text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-xl bg-green-500/20 border-2 border-green-400 flex items-center justify-center mb-4">
                      <Database className="w-8 h-8 md:w-10 md:h-10 text-green-400" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium text-white">Finalize</p>
                    <p className="text-xs text-white/60">Public State</p>
                    <p className="text-xs text-green-400 font-medium mt-1">Poseidon2(creator)</p>
                  </div>
                </div>

                {/* Mobile Flowchart - Vertical */}
                <div className="sm:hidden space-y-4">
                  {[
                    { icon: Fingerprint, label: 'Subscriber', sub: 'aleo1abc...xyz', color: 'white', arrow: 'ZK Proof' },
                    { icon: Lock, label: 'Transition', sub: 'Creates AccessPass', color: 'violet', arrow: 'Hashed Keys' },
                    { icon: Database, label: 'Finalize', sub: 'Public State', color: 'green', arrow: null },
                  ].map((step, i) => {
                    const Icon = step.icon
                    return (
                      <div key={step.label}>
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-xl ${step.color === 'violet' ? 'bg-violet-500/20 border-violet-400' : step.color === 'green' ? 'bg-green-500/20 border-green-400' : 'bg-white/10 border-white/30'} border-2 flex items-center justify-center`}>
                            <Icon className={`w-7 h-7 ${step.color === 'violet' ? 'text-violet-400' : step.color === 'green' ? 'text-green-400' : 'text-white/80'}`} aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{step.label}</p>
                            <p className="text-xs text-white/60">{step.sub}</p>
                          </div>
                        </div>
                        {step.arrow && (
                          <div className="ml-7 my-2 flex items-center gap-2">
                            <div className={`w-0.5 h-6 ${i === 0 ? 'bg-violet-400/60' : 'bg-green-400/60'}`} />
                            <span className={`text-xs ${i === 0 ? 'text-violet-300' : 'text-green-300'}`}>{step.arrow}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Key Insight */}
                <div className="mt-8 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-start gap-4">
                    <ShieldCheck className="w-5 h-5 text-green-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-green-300">
                        Subscriber address NEVER reaches finalize
                      </p>
                      <p className="text-xs text-white/60 mt-1">
                        Enforced at compile time by Leo. No runtime policy—mathematically impossible to leak.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </m.div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-8">
              {/* Layer 1 */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0 }}
                className="h-full"
              >
                <div className="relative h-full rounded-xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.06] to-transparent p-4 sm:p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-400">1</span>
                    <h3 className="text-white font-semibold">Blind Identity Rotation</h3>
                  </div>
                  <p className="text-sm text-white/70 mb-4 icon-container">
                    Each subscription generates a unique subscriber hash via nonce-rotated
                    Poseidon2. Creators cannot correlate renewals to the same person.
                  </p>
                  <div className="p-4 rounded-xl bg-black/40 border border-border">
                    <code className="text-xs text-violet-300 font-mono leading-relaxed">
                      hash = Poseidon2(BlindKey{'{'} subscriber, nonce {'}'})
                    </code>
                    <p className="text-xs text-white/60 mt-1.5">Different nonce per renewal = different hash = unlinkable identity</p>
                  </div>
                </div>
              </m.div>

              {/* Layer 2 */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="h-full"
              >
                <div className="relative h-full rounded-xl border border-green-500/20 bg-gradient-to-b from-green-500/[0.06] to-transparent p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-sm font-bold text-green-400">2</span>
                    <h3 className="text-white font-semibold">Zero-Address Finalize</h3>
                  </div>
                  <p className="text-sm text-white/70 mb-4">
                    All 30 mappings use Poseidon2 field-hashed keys. No raw address appears
                    in any finalize function—compiler-enforced, not policy.
                  </p>
                  <div className="p-4 rounded-xl bg-black/40 border border-border">
                    <code className="text-xs text-green-300 font-mono leading-relaxed">
                      mapping key = Poseidon2(address) -&gt; field
                    </code>
                    <p className="text-xs text-white/60 mt-1.5">Irreversible hash—cannot recover wallet address from on-chain data</p>
                  </div>
                </div>
              </m.div>

              {/* Layer 3 */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="h-full"
              >
                <div className="relative h-full rounded-xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/[0.06] to-transparent p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400">3</span>
                    <h3 className="text-white font-semibold">Selective Disclosure</h3>
                  </div>
                  <p className="text-sm text-white/70 mb-4">
                    Audit tokens reveal tier and expiry without subscriber identity.
                    Commit-reveal tipping hides amounts. Reputation proofs without counts.
                  </p>
                  <div className="p-4 rounded-xl bg-black/40 border border-border">
                    <code className="text-xs text-indigo-300 font-mono leading-relaxed">
                      AuditToken: tier + expiry (no subscriber addr)
                    </code>
                    <p className="text-xs text-white/60 mt-1.5">Prove membership without revealing who you are</p>
                  </div>
                </div>
              </m.div>
            </div>

            {/* BSP vs Competitors */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              <div className="rounded-xl overflow-hidden border border-border">
                <div className="px-4 py-4 bg-white/[0.02] border-b border-border">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-violet-400" aria-hidden="true" />
                    <h4 className="text-sm font-semibold text-white">BSP vs Other Privacy Approaches</h4>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 px-4 text-white/60 font-medium">Capability</th>
                        <th className="text-center py-2.5 px-4 text-violet-400 font-medium">VeilSub BSP</th>
                        <th className="text-center py-2.5 px-4 text-white/60 font-medium">lasagna DAR</th>
                        <th className="text-center py-2.5 px-4 text-white/60 font-medium">NullPay Dual-Record</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/70">
                      {[
                        ['Identity rotation across txns', true, false, false],
                        ['Zero addresses in finalize', true, false, true],
                        ['Selective disclosure (audit tokens)', true, false, false],
                        ['Commit-reveal amount hiding', true, false, false],
                        ['Subscriber lifecycle unlinkability', true, false, false],
                        ['Named multi-layer framework', true, true, false],
                        ['Zero-footprint verification', true, false, false],
                      ].map(([feature, bsp, dar, np]) => (
                        <tr key={feature as string} className="border-b border-border/75">
                          <td className="py-2 px-4 text-white/80">{feature as string}</td>
                          <td className="py-2 px-4 text-center">
                            {bsp ? <span className="text-green-400 font-medium">Yes</span> : <span className="text-white/60">No</span>}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {dar ? <span className="text-green-400/80">Yes</span> : <span className="text-white/60">No</span>}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {np ? <span className="text-green-400/80">Yes</span> : <span className="text-white/60">No</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-4 bg-white/[0.01] border-t border-border">
                  <p className="text-xs text-white/60">
                    BSP is the only multi-layer privacy framework in the Aleo buildathon that addresses
                    identity rotation, finalize isolation, and selective disclosure simultaneously.
                  </p>
                </div>
              </div>
            </m.div>
          </div>
        </section>

        {/* ZK Explainer */}
        <section id="zk-proofs" className="py-8 sm:py-12 scroll-mt-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-8">
            <m.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-6 sm:mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">What Are Zero-Knowledge Proofs?</h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                VeilSub&apos;s ZK privacy is enforced at the language level: Leo compiles away subscriber
                addresses from finalize blocks, and Poseidon2 hashing makes mapping keys irreversible.
                Like proving you&apos;re a club member without revealing your name—your AccessPass proves
                tier access without exposing who you are.
              </p>
            </m.div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-8">
              <GlassCard shimmer delay={0}>
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                  <Fingerprint className="w-6 h-6 text-violet-400" aria-hidden="true" />
                </div>
                <h3 className="text-white font-semibold mb-2">Prove Without Revealing</h3>
                <p className="text-sm text-white/70">
                  When you subscribe, a <Tooltip content="Zero-knowledge proof: cryptographic method to prove a statement is true without revealing the underlying data">
                    <span className="border-b border-dotted border-subtle cursor-help">ZK proof</span>
                  </Tooltip> confirms your payment is valid without exposing
                  your wallet address, amount, or any identifying information to the public ledger.
                </p>
              </GlassCard>

              <GlassCard shimmer delay={0.1}>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-indigo-400" aria-hidden="true" />
                </div>
                <h3 className="text-white font-semibold mb-2">Encrypted Records</h3>
                <p className="text-sm text-white/70">
                  Your <Tooltip content="AccessPass: a private Aleo record proving your subscription. Only visible to your wallet.">
                    <span className="border-b border-dotted border-subtle cursor-help">AccessPass</span>
                  </Tooltip> is a private record encrypted with your wallet key. Only you
                  can see or use it. Not even the creator, not even Aleo validators.
                </p>
              </GlassCard>

              <GlassCard shimmer delay={0.2}>
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-violet-400" aria-hidden="true" />
                </div>
                <h3 className="text-white font-semibold mb-2">Mathematically Guaranteed</h3>
                <p className="text-sm text-white/70">
                  The <Tooltip content="Leo: the programming language for Aleo smart contracts, with built-in privacy constraints">
                    <span className="border-b border-dotted border-subtle cursor-help">Leo compiler</span>
                  </Tooltip> rejects any code path where subscriber addresses
                  reach <Tooltip content="Finalize: the public execution layer of Aleo. Code in finalize blocks is visible to everyone on-chain.">
                    <span className="border-b border-dotted border-subtle cursor-help">finalize scope</span>
                  </Tooltip>. No runtime policy—compile-time enforcement.
                </p>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Zero-Footprint Hero Callout */}
        <section className="py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-8">
            <m.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial">
              <div className="relative rounded-xl overflow-hidden">
                {/* Gradient border effect */}
                <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-violet-500 via-green-400 to-violet-500 opacity-80" />
                <div className="relative rounded-xl bg-gradient-to-b from-violet-500/[0.08] to-green-500/[0.04] p-8">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-green-500/20 flex items-center justify-center">
                      <Fingerprint className="w-7 h-7 text-green-400" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4 flex-wrap">
                        <h3 className="text-xl font-semibold text-white">Zero-Footprint Access Verification</h3>
                        <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-medium text-green-400">
                          Unique to VeilSub
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        {[
                          'verify_access finalize only checks revocation via pass_id—subscriber address never enters public state',
                          'No subscriber-identifying mapping writes, no counter increments tied to identity',
                          'Prevents timing correlation attacks—observers cannot link verification to any subscriber',
                          'Revocation enforcement is the only finalize action—zero identity exposure',
                        ].map((point, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 mt-1.5" />
                            <p className="text-sm text-white/70 leading-relaxed">{point}</p>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 rounded-xl bg-black/60 border border-border">
                        <pre className="text-xs text-white/80 font-mono leading-relaxed overflow-x-auto">
                          <code>{`async transition verify_access(pass: AccessPass, creator: address) -> (AccessPass, Future) {
    assert_eq(pass.creator, creator);
    let new_pass: AccessPass = AccessPass { owner: pass.owner, creator: pass.creator,
        tier: pass.tier, pass_id: pass.pass_id, expires_at: pass.expires_at,
        privacy_level: pass.privacy_level };
    return (new_pass, finalize_verify_access(pass.pass_id, pass.expires_at));
}
async function finalize_verify_access(pass_id: field, expires_at: u32) {
    let revoked: bool = Mapping::get_or_use(access_revoked, pass_id, false);
    assert(!revoked);                  // ERR_027: Access revoked
    assert(expires_at > block.height); // ERR_104: Subscription expired
}
// ↑ Finalize receives pass_id + expires_at (opaque values)—never the subscriber address.
// Revocation + expiry enforced on-chain, zero identity exposure.`}</code>
                        </pre>
                      </div>
                      <p className="text-xs text-white/60 mt-4">
                        Unique design: revocation enforcement + zero subscriber exposure. The finalize only checks
                        a boolean mapping keyed by pass_id—no subscriber address ever reaches public state.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </m.div>
          </div>
        </section>

        {/* Private vs Public */}
        <section id="private-vs-public" className="py-8 sm:py-12 scroll-mt-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-8">
            <m.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-6 sm:mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">What&apos;s Private vs. Public</h2>
              <p className="text-white/70">
                Full transparency on what stays hidden and what&apos;s verifiable.
              </p>
            </m.div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-8">
              {/* Private Column */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <EyeOff className="w-5 h-5 text-white/70" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Private Data</h3>
                    <p className="text-xs text-white/60">ZK records—only you can see</p>
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
                      desc: 'Creators cannot enumerate who subscribes. They only see a total count—never individual addresses.',
                      icon: Layers,
                    },
                    {
                      title: 'Payment Amount Per Subscriber',
                      desc: 'All payments use credits.aleo/transfer_private. Individual payment amounts and sender addresses are hidden on-chain.',
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
                      title: 'Double-Hash Subscriber Identity (v23)',
                      desc: 'Subscriber hashes in CreatorReceipt records use Poseidon2(Poseidon2(caller))—making rainbow table attacks infeasible even with known address sets.',
                      icon: Lock,
                    },
                    {
                      title: 'Blind Subscriber Nonce (v11)',
                      desc: 'Each renewal generates a unique nonce-based subscriber hash. Creators cannot correlate consecutive renewals from the same subscriber.',
                      icon: Fingerprint,
                    },
                    {
                      title: 'BHP256 Commit-Reveal Tipping (v14)',
                      desc: 'Tip amounts hidden behind BHP256 commitments until voluntary reveal. Prevents observers from seeing tip amounts before the creator chooses to reveal.',
                      icon: ShieldCheck,
                    },
                    {
                      title: 'Poseidon2 Field-Key Mappings (v23)',
                      desc: 'All mapping keys are Poseidon2 field hashes of addresses. On-chain observers cannot link mapping reads to wallet addresses—full address unlinkability.',
                      icon: Lock,
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.title}
                        className="p-4 rounded-xl bg-white/[0.04] border border-border"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-white/70" aria-hidden="true" />
                          <span className="text-sm font-medium text-white">{item.title}</span>
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed">{item.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>

              {/* Public Column */}
              <GlassCard hover={false}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white/70" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Public Data</h3>
                    <p className="text-xs text-white/60">Mappings—verifiable by everyone</p>
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
                      desc: 'An aggregate counter only. Shows "47 subscribers"—not which addresses subscribed.',
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
                      desc: 'Public mapping of consumed nonces—proves blind renewal anonymity without revealing identities.',
                      icon: Server,
                    },
                    {
                      title: 'Content Existence & Updates (v9)',
                      desc: 'Hashed content IDs and deletion status are public. Content bodies and author identity remain off-chain.',
                      icon: Database,
                    },
                    {
                      title: 'BHP256 Commit-Reveal Tipping (v23)',
                      desc: 'Tip amounts are hidden behind BHP256 commitments until reveal. Commitment stored in tip_commitments mapping—amount stays private until creator reveals.',
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
                        className="p-4 rounded-xl bg-surface-1 border border-border"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-white/70" aria-hidden="true" />
                          <span className="text-sm font-medium text-white">{item.title}</span>
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed">{item.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Threat Model */}
        <section id="threat-model" className="py-8 sm:py-12 scroll-mt-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-8">
            <m.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-6 sm:mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">Privacy Threat Model</h2>
              <p className="text-white/70">
                Honest analysis of what an adversary could and cannot learn.
              </p>
            </m.div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-8 mb-8">
              <GlassCard delay={0}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-amber-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-white font-semibold">What an Adversary Could Learn</h3>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Timing Correlation',
                      desc: 'When subscriber_count increments, an observer can correlate the timestamp—narrowing down when a subscription occurred.',
                    },
                    {
                      title: 'Amount Inference',
                      desc: 'If total_revenue jumps by exactly the tier price, an observer may infer the tier purchased. Mitigated by overlapping transactions adding noise.',
                    },
                    {
                      title: 'Renewal Pattern Tracking',
                      desc: 'Blind Subscription Protocol (BSP): Each renewal uses a unique nonce—MITIGATED. Creators cannot correlate consecutive renewals from the same subscriber.',
                    },
                    {
                      title: 'Network Metadata',
                      desc: 'Aleo gossip does not provide IP anonymity. Users should use VPN/Tor for network-level privacy. This applies to all blockchains.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <p className="text-sm font-medium text-amber-300 mb-1">{item.title}</p>
                      <p className="text-xs text-white/70 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard delay={0.1}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <EyeOff className="w-5 h-5 text-green-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-white font-semibold">What an Adversary Cannot Learn</h3>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Subscriber Identity',
                      desc: 'No code path exists for wallet addresses to reach public state—verified by auditing the Leo source.',
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
                    <div key={item.title} className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                      <p className="text-sm font-medium text-green-300 mb-1">{item.title}</p>
                      <p className="text-xs text-white/70 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-8">
              <GlassCard delay={0.2}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-white/70" aria-hidden="true" />
                  </div>
                  <h3 className="text-white font-semibold">What We Mitigate</h3>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: 'API Proxy',
                      desc: 'All mapping reads go through Next.js rewrites, preventing browser→Provable IP correlation.',
                    },
                    {
                      title: 'Browsing Interest Protection',
                      desc: 'Creator profiles are bulk-fetched and cached in your browser when you visit the Explore page. Individual creator page visits read from this local cache — no new server requests are generated, so Supabase logs cannot reveal which creators you are interested in.',
                    },
                    {
                      title: 'No Subscriber Data in Finalize',
                      desc: 'Finalize only receives creator_hash (Poseidon2 field), amount, and tier. No raw address—not even the creator—enters finalize. Subscriber identity has no pathway to public state.',
                    },
                    {
                      title: 'Finalize Parameter Tradeoff',
                      desc: 'Tier and amount are public in finalize—this is required for on-chain payment validation (validators must enforce correct pricing). The subscriber ADDRESS is the privacy-critical value and it never touches finalize. Skipping validation would allow paying base price for VIP access.',
                    },
                    {
                      title: 'Minimal-Footprint Access Verification',
                      desc: 'verify_access finalize only checks revocation status via pass_id—subscriber identity never enters finalize. No subscriber-identifying mapping writes, no counters tied to identity. This prevents timing correlation attacks from linking verification to any subscriber.',
                    },
                    {
                      title: 'Blind Subscription Protocol (BSP)',
                      desc: 'Each subscription and renewal generates a unique subscriber hash via nonce rotation—creators cannot track renewal patterns or link transactions to the same person. BSP makes the entire subscriber lifecycle unlinkable.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-4 rounded-xl bg-white/[0.04] border border-border">
                      <p className="text-sm font-medium text-white/70 mb-1">{item.title}</p>
                      <p className="text-xs text-white/70 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard delay={0.3}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white/70" aria-hidden="true" />
                  </div>
                  <h3 className="text-white font-semibold">Honest Limitations</h3>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Wallet Key Loss',
                      desc: 'AccessPasses are unrecoverable without your private key. This is the fundamental privacy/recoverability tradeoff in ZK systems.',
                    },
                    {
                      title: 'On-Chain Expiry Enforcement',
                      desc: 'Since v24, verify_access and verify_tier_access enforce expires_at > block.height in finalize. This means expired passes are rejected on-chain. The tradeoff: finalize now receives pass_id + expires_at (both opaque values), but subscriber identity still never enters public state.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-4 rounded-xl bg-surface-1 border border-border">
                      <p className="text-sm font-medium text-white/70 mb-1">{item.title}</p>
                      <p className="text-xs text-white/70 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Code Proof */}
        <section id="code-privacy" className="py-8 sm:py-12 scroll-mt-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-8">
            <m.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-6 sm:mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">Privacy in the Code</h2>
              <p className="text-white/70">How each transition protects your identity.</p>
            </m.div>

            {/* Before vs After: What an Observer Sees */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h3 className="text-lg font-semibold text-white mb-4 text-center">
                What an On-Chain Observer Sees
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Traditional Platform */}
                <div className="rounded-xl border border-red-500/20 overflow-hidden">
                  <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-red-400" aria-hidden="true" />
                    <span className="text-sm font-medium text-red-300">Traditional Platform</span>
                  </div>
                  <div className="p-4 bg-black/40">
                    <pre className="text-xs font-mono leading-relaxed overflow-x-auto">
                      <code className="text-red-300/80">{`// On-chain (public):
subscriber: aleo1abc...xyz     // ← EXPOSED
creator:    aleo1def...uvw     // ← EXPOSED
amount:     5_000_000u64       // ← EXPOSED
tier:       2u8                // ← EXPOSED
timestamp:  block.height       // ← EXPOSED

// Anyone can query:
mapping subscribers[aleo1abc] → creator
mapping payments[aleo1abc]   → 5 ALEO
// Full relationship graph: visible`}</code>
                    </pre>
                  </div>
                </div>
                {/* VeilSub */}
                <div className="rounded-xl border border-green-500/20 overflow-hidden">
                  <div className="px-4 py-2.5 bg-green-500/10 border-b border-green-500/20 flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-green-400" aria-hidden="true" />
                    <span className="text-sm font-medium text-green-300">VeilSub (BSP)</span>
                  </div>
                  <div className="p-4 bg-black/40">
                    <pre className="text-xs font-mono leading-relaxed overflow-x-auto">
                      <code className="text-green-300/80">{`// On-chain (public):
creator_hash: 1234field        // Poseidon2(addr)
amount:       5_000_000u64     // tier price
tier:         2u8              // tier level

// Hidden (ZK proof):
subscriber:   ████████████     // NEVER in finalize
relationship: ████████████     // no sub→creator map
identity:     ████████████     // Poseidon2(BlindKey)

// Observer sees: "someone subscribed"
// Observer CANNOT see: "who subscribed"`}</code>
                    </pre>
                  </div>
                </div>
              </div>
              <p className="text-xs text-white/60 text-center mt-4">
                Left: typical on-chain subscription. Right: VeilSub&apos;s BSP—subscriber address never enters any public mapping.
              </p>
            </m.div>

            {/* Data Flow Diagram */}
            <div className="mb-8 grid md:grid-cols-2 gap-4">
              <div className="p-4 sm:p-8 rounded-xl bg-white/[0.04] border border-border">
                <h4 className="text-sm font-medium text-white/70 mb-4">Subscribe Flow</h4>
                <div className="space-y-2 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <span>Wallet sends payment via ZK proof</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <span>AccessPass record created (private, encrypted to your key)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                    <span>Finalize updates aggregate mappings only (count, revenue)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    <span>Only creator address and amount reach finalize</span>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-8 rounded-xl bg-green-500/5 border border-green-500/15">
                <h4 className="text-sm font-medium text-green-300 mb-4">Verify Access Flow</h4>
                <div className="space-y-2 text-xs text-white/70">
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
                    <span>Finalize checks revocation + expiry—zero identity exposure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    <span>Only pass_id and expires_at reach finalize—subscriber address never exposed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  fn: 'subscribe()',
                  guarantee: 'Finalize receives only creator_hash (Poseidon2 field) and amount—no raw address, including subscriber, is ever passed to any public scope.',
                },
                {
                  fn: 'verify_access()',
                  guarantee: 'Finalize only checks revocation via pass_id—subscriber address never reaches public state. Minimal on-chain footprint.',
                },
                {
                  fn: 'tip()',
                  guarantee: 'Finalize only updates aggregate total_revenue—tipper address stays completely private.',
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
                  guarantee: 'Subscriber nonce generates blind hash—creator cannot correlate subscriber identity across transactions.',
                },
                {
                  fn: 'renew_blind() (v11)',
                  guarantee: 'Each renewal uses a unique nonce—consecutive renewals cannot be linked to the same subscriber.',
                },
                {
                  fn: 'gift_subscription() (v10)',
                  guarantee: 'GiftToken is encrypted to recipient. Giver identity stays private. Only recipient can decrypt and redeem.',
                },
                {
                  fn: 'redeem_gift() (v10)',
                  guarantee: 'Recipient redeems GiftToken to AccessPass. Only recipient address is used—giver remains unknown.',
                },
                {
                  fn: 'verify_tier_access()',
                  guarantee: 'Proves tier access without revealing which tier subscriber holds or subscriber identity.',
                },
                {
                  fn: 'commit_tip()',
                  guarantee: 'BHP256 commitment hides tip amount. Commitment stored on-chain, amount stays private until reveal.',
                },
                {
                  fn: 'reveal_tip()',
                  guarantee: 'Reveals committed tip to creator. Only aggregate revenue updated—tipper identity stays private.',
                },
                {
                  fn: 'transfer_pass()',
                  guarantee: 'Transfer AccessPass to another address. Original holder identity not linked to new holder on-chain.',
                },
                {
                  fn: 'subscribe_trial()',
                  guarantee: 'Ephemeral trial pass (~50 minutes) at 20% cost. Same privacy model as subscribe—short duration enforced on-chain.',
                },
                {
                  fn: 'All payments',
                  guarantee: 'Use credits.aleo/transfer_private—never public transfers. Amount and sender are hidden on-chain.',
                },
              ].map((item, i) => (
                <m.div
                  key={item.fn}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4 p-4 rounded-xl bg-surface-1 border border-border hover:border-[rgba(255,255,255,0.1)] transition-colors"
                >
                  <code className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white/[0.04] border border-border text-white/70 text-xs sm:text-sm font-mono">
                    {item.fn}
                  </code>
                  <p className="text-sm text-white/70 pt-1">{item.guarantee}</p>
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison vs Traditional */}
        <section id="vs-traditional" className="py-8 sm:py-12 scroll-mt-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-8">
            <m.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-6 sm:mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">VeilSub vs. Traditional Platforms</h2>
            </m.div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 text-white/70 font-medium">Feature</th>
                    <th className="text-center py-4 px-4 text-rose-400 font-medium">Patreon / Ko-fi</th>
                    <th className="text-center py-4 px-4 text-green-400 font-medium">VeilSub</th>
                  </tr>
                </thead>
                <tbody className="text-white/70">
                  {[
                    ['Subscriber identity', 'Public', 'Private (ZK)'],
                    ['Transaction history', 'Permanent & visible', 'Hidden on-chain'],
                    ['Creator sees who subscribes', 'Yes—full list', 'No—aggregate only'],
                    ['Payment privacy', 'Bank/card linked', 'Private credit transfer'],
                    ['Third-party data access', 'Platform sells data', 'No data to sell'],
                    ['Censorship resistance', 'Platform can ban', 'On-chain, unstoppable'],
                  ].map(([feature, trad, veilsub]) => (
                    <tr key={feature} className="border-b border-border">
                      <td className="py-4 px-4 text-white">{feature}</td>
                      <td className="py-4 px-4 text-center text-rose-300">{trad}</td>
                      <td className="py-4 px-4 text-center text-green-300">{veilsub}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Comparison vs Web2 Platforms */}
        <section id="vs-aleo" className="py-8 sm:py-12 scroll-mt-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-8">
            <m.div {...fadeUp} viewport={{ once: true }} whileInView="animate" initial="initial" className="text-center mb-6 sm:mb-12">
              <h2 className="text-3xl font-semibold text-white mb-4">VeilSub vs the World</h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                Existing creator platforms leak your identity by design. VeilSub is the first subscription platform where subscriber privacy is cryptographically guaranteed — not a policy.
              </p>
            </m.div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-border">
                    <th className="text-left py-4 px-4 text-white/70 font-medium">Feature</th>
                    <th className="text-center py-4 px-4 text-violet-400 font-medium">VeilSub</th>
                    <th className="text-center py-4 px-4 text-white/60 font-medium">Patreon</th>
                    <th className="text-center py-4 px-4 text-white/60 font-medium">Substack</th>
                    <th className="text-center py-4 px-4 text-white/60 font-medium">Mirror.xyz</th>
                  </tr>
                </thead>
                <tbody className="text-white/70">
                  {[
                    ['Subscriber identity hidden', true, false, false, false],
                    ['No platform fee on identity', true, false, false, false],
                    ['Verifiable without a server', true, false, false, false],
                    ['Self-custodial payments', true, false, false, true],
                    ['Censorship resistant', true, false, false, true],
                    ['Subscriber list not visible', true, false, false, false],
                    ['ZK access proof (offline)', true, false, false, false],
                    ['Encrypted content delivery', true, false, false, false],
                    ['Subscription transferable', true, false, false, false],
                    ['No email required', true, false, false, true],
                    ['Platform fee', '5%', '8–12%', '10%', '0%'],
                  ].map(([feature, vs, pt, ss, mx]) => (
                    <tr key={feature as string} className="border-b border-border/75">
                      <td className="py-2.5 px-4 text-white text-xs">{feature as string}</td>
                      {[vs, pt, ss, mx].map((val, i) => (
                        <td key={i} className="py-2.5 px-4 text-center">
                          {val === true ? (
                            <span className={`text-xs font-medium ${i === 0 ? 'text-green-400' : 'text-green-400/80'}`}>Yes</span>
                          ) : val === false ? (
                            <span className="text-xs text-red-400/70">No</span>
                          ) : (
                            <span className={`text-xs font-medium ${i === 0 ? 'text-violet-400' : 'text-white/60'}`}>{val as string}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-white/60 mt-4 text-center">
              Privacy claims based on published platform policies and on-chain data transparency. VeilSub runs on Aleo testnet.
            </p>
          </div>
        </section>

      </div>
    </PageTransition>
  )
}

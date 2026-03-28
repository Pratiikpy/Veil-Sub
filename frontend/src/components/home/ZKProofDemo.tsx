'use client'

import { useState, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { spring } from '@/lib/motion'
import Container from '@/components/ui/Container'
import ScrollReveal from '@/components/ScrollReveal'

type Step = 'pick' | 'committed' | 'result'

const HEADING_STYLE = { letterSpacing: '-0.03em', lineHeight: 1.1 } as const

const slideVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
}

async function hashNumber(n: number): Promise<string> {
  const data = new TextEncoder().encode(String(n))
  const buffer = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export default function ZKProofDemo() {
  const [step, setStep] = useState<Step>('pick')
  const [secret, setSecret] = useState<string>('42')
  const [hash, setHash] = useState<string>('')
  const [isGreater, setIsGreater] = useState<boolean>(false)
  const [isHashing, setIsHashing] = useState(false)
  const [isProving, setIsProving] = useState(false)

  const handleCommit = useCallback(async () => {
    const num = parseInt(secret, 10)
    if (isNaN(num) || num < 1 || num > 100) return
    setIsHashing(true)
    const h = await hashNumber(num)
    setHash(h)
    setIsHashing(false)
    setStep('committed')
  }, [secret])

  const handleProve = useCallback(async () => {
    setIsProving(true)
    // Simulate proof generation delay
    await new Promise((r) => setTimeout(r, 800))
    const num = parseInt(secret, 10)
    setIsGreater(num > 50)
    setIsProving(false)
    setStep('result')
  }, [secret])

  const handleReset = useCallback(() => {
    setStep('pick')
    setSecret('42')
    setHash('')
    setIsGreater(false)
  }, [])

  const truncatedHash = hash ? `${hash.slice(0, 32)}...` : ''

  return (
    <section className="py-20 lg:py-28 section-divider">
      <Container>
        <ScrollReveal>
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">
              Interactive demo
            </p>
            <h2
              className="text-3xl sm:text-4xl lg:text-[44px] font-serif italic text-white"
              style={HEADING_STYLE}
            >
              Prove Without Revealing
            </h2>
            <p className="mt-4 text-base text-white/70 max-w-xl mx-auto leading-relaxed">
              Experience zero-knowledge proofs in 10 seconds. No wallet needed.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="max-w-lg mx-auto rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {/* --- Step 1: Pick a Secret --- */}
              {step === 'pick' && (
                <m.div
                  key="pick"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={spring.gentle}
                >
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-violet-400 text-lg" aria-hidden="true">&#x1F52E;</span>
                    <h3 className="text-white font-semibold text-lg">Pick a Secret</h3>
                  </div>

                  <label htmlFor="zk-secret" className="block text-sm text-white/60 mb-3">
                    Choose a secret number (1-100):
                  </label>
                  <input
                    id="zk-secret"
                    type="number"
                    min={1}
                    max={100}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] text-white text-center text-2xl font-mono py-3 px-4 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-colors"
                  />

                  <button
                    onClick={handleCommit}
                    disabled={isHashing || !secret || parseInt(secret, 10) < 1 || parseInt(secret, 10) > 100 || isNaN(parseInt(secret, 10))}
                    className="mt-6 w-full py-3 rounded-full bg-white text-black font-medium text-sm hover:bg-white/90 transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isHashing ? 'Hashing...' : 'Commit Secret'}
                  </button>
                </m.div>
              )}

              {/* --- Step 2: See the Hash --- */}
              {step === 'committed' && (
                <m.div
                  key="committed"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={spring.gentle}
                >
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-violet-400 text-lg" aria-hidden="true">&#x1F52E;</span>
                    <h3 className="text-white font-semibold text-lg">Your Secret is Committed</h3>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white/50 shrink-0">You chose:</span>
                      <span className="font-mono text-white text-sm tracking-widest" aria-label="Hidden secret">
                        &#x2588;&#x2588;&#x2588;&#x2588;
                      </span>
                      <span className="text-xs text-white/30">(hidden)</span>
                    </div>
                    <div>
                      <span className="text-sm text-white/50">Hash:</span>
                      <p className="font-mono text-green-400 text-sm break-all mt-1 leading-relaxed">
                        {truncatedHash}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-white/60 mb-6 leading-relaxed">
                    Now prove your number is <span className="text-white font-medium">greater than 50</span> without
                    revealing what it is:
                  </p>

                  <button
                    onClick={handleProve}
                    disabled={isProving}
                    className="w-full py-3 rounded-full bg-violet-600 text-white font-medium text-sm hover:bg-violet-500 transition-all duration-300 active:scale-[0.98] disabled:opacity-60"
                  >
                    {isProving ? 'Generating ZK Proof...' : 'Generate ZK Proof'}
                  </button>
                </m.div>
              )}

              {/* --- Step 3: Proof Result --- */}
              {step === 'result' && (
                <m.div
                  key="result"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={spring.gentle}
                >
                  <div className="flex items-center gap-2 mb-6">
                    {isGreater ? (
                      <span className="text-emerald-400 text-lg" aria-hidden="true">&#x2705;</span>
                    ) : (
                      <span className="text-red-400 text-lg" aria-hidden="true">&#x274C;</span>
                    )}
                    <h3 className="text-white font-semibold text-lg">
                      {isGreater ? 'Proof Verified!' : 'Proof Complete'}
                    </h3>
                  </div>

                  <div
                    className={`rounded-xl p-4 mb-6 border ${
                      isGreater
                        ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                        : 'bg-red-500/[0.06] border-red-500/20'
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        isGreater ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {isGreater
                        ? '"Your number IS greater than 50"'
                        : '"Your number is NOT greater than 50"'}
                    </p>
                  </div>

                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white/50">Hash matches:</span>
                      <span className="font-mono text-green-400 text-xs">{hash.slice(0, 16)}...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/50">Secret revealed:</span>
                      <span className="text-white font-semibold">NEVER</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-6">
                    <p className="text-xs text-white/50 leading-relaxed">
                      This is how VeilSub proves your subscription without revealing your identity.
                      Real zero-knowledge proofs on the Aleo blockchain make this mathematically
                      guaranteed.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleReset}
                      className="flex-1 py-3 rounded-full bg-transparent border border-white/20 text-white font-medium text-sm hover:border-white/40 hover:bg-white/[0.04] transition-all duration-300 active:scale-[0.98]"
                    >
                      Try Again
                    </button>
                    <Link
                      href="/explore"
                      className="flex-1 py-3 rounded-full bg-white text-black font-medium text-sm hover:bg-white/90 transition-all duration-300 active:scale-[0.98] inline-flex items-center justify-center gap-1"
                    >
                      Subscribe Privately
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  )
}

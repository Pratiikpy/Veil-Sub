'use client'

import React, { useState, useCallback, useRef, useMemo } from 'react'
import { m } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import ScrollReveal from '@/components/ScrollReveal'

/* ─── FAQ Accordion Item (private to this module) ─── */
const FAQItem = React.memo(function FAQItem({
  question,
  answer,
  index,
  onNavigate,
  totalItems,
}: {
  question: string
  answer: string
  index: number
  onNavigate: (direction: 'up' | 'down') => void
  totalItems: number
}) {
  const [open, setOpen] = useState(false)
  const answerId = `faq-answer-${index}`

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && index < totalItems - 1) {
      e.preventDefault()
      onNavigate('down')
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault()
      onNavigate('up')
    }
  }, [index, totalItems, onNavigate])

  return (
    <div className="rounded-2xl glass overflow-hidden hover:border-border-hover transition-colors">
      <button
        id={`faq-question-${index}`}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        aria-expanded={open}
        aria-controls={answerId}
        className="w-full flex items-center justify-between gap-4 px-4 sm:px-8 py-4 sm:py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-inset"
      >
        <span className="text-[15px] font-medium text-white">{question}</span>
        <m.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronRight className={`w-4 h-4 transition-colors ${open ? 'text-violet-400' : 'text-white/60'}`} aria-hidden="true" />
        </m.span>
      </button>
      <m.div
        id={answerId}
        role="region"
        aria-labelledby={`faq-question-${index}`}
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="overflow-hidden"
      >
        <p className="px-4 sm:px-8 pb-5 text-sm text-white/80 leading-relaxed">
          {answer}
        </p>
      </m.div>
    </div>
  )
})

const FAQ_DATA = [
  {
    q: 'How does VeilSub keep subscriber identity private?',
    a: 'All subscription payments use Aleo records (private state). Your identity is never passed to the public finalize layer. Mapping keys are Poseidon2 hashes of addresses, so even on-chain data cannot be traced back to you. Zero raw addresses appear in any public execution.',
  },
  {
    q: 'What is zero-footprint verification?',
    a: 'When you verify your access, the verify_access transition has a minimal finalize that only checks revocation status via pass_id—your subscriber address never reaches the finalize layer. No mappings are updated beyond the revocation check, so nobody can tell you checked your subscription status.',
  },
  {
    q: 'How do custom creator tiers work?',
    a: 'Creators call create_custom_tier with their desired price (in microcredits). VeilSub supports up to 255 tiers per creator, each with independent pricing. Subscribers pick any active tier when subscribing.',
  },
  {
    q: 'What is blind renewal?',
    a: 'Each renew_blind call generates a unique subscriber hash via Poseidon2(caller, nonce). The creator sees "different" subscribers each time—they cannot link renewals to the same person. Combined with zero-address finalize, even the blockchain cannot correlate renewal patterns.',
  },
  {
    q: 'How are payments handled?',
    a: 'Payments use credits.aleo transfer_private—a single private transfer from subscriber to creator. The platform tracks a 5% fee in an on-chain mapping (using hashed keys), but the actual payment is a direct private credit transfer.',
  },
  {
    q: 'Is VeilSub deployed on testnet?',
    a: `Yes. veilsub_v27.aleo is deployed with 27 transitions, 25 mappings, and 6 record types. v27 adds scoped audit tokens, trial rate-limiting, and gift revocation fixes, building on v26's trial passes and v25's threshold proofs.`,
  },
  {
    q: 'What wallets are supported?',
    a: 'VeilSub integrates Shield Wallet (recommended), Leo Wallet, Fox Wallet, Puzzle Wallet, and Soter Wallet via the official Aleo wallet adapter.',
  },
  {
    q: 'Can I try before subscribing?',
    a: 'Yes. VeilSub supports trial passes—ephemeral subscriptions at 20% of the tier price, lasting ~50 minutes (1,000 blocks). Trials use the same privacy model as full subscriptions. Choose "Trial" mode when subscribing.',
  },
  {
    q: 'Can I gift a subscription to someone?',
    a: 'Yes. Use "Gift Subscription" on any creator page to send a private GiftToken to another Aleo address. The recipient redeems it for a full AccessPass. Your identity is hashed—the recipient and creator cannot see who gifted it.',
  },
  {
    q: 'What makes this different from other subscription platforms?',
    a: 'VeilSub is the only subscription platform where nobody—not even the platform itself—can see who subscribes to whom. Traditional platforms like Patreon collect and expose subscriber lists. VeilSub uses zero-knowledge proofs so subscribers can prove access without revealing identity.',
  },
]

export default function FAQ() {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleNavigate = useCallback((currentIndex: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'down' ? currentIndex + 1 : currentIndex - 1
    const nextButton = document.getElementById(`faq-question-${nextIndex}`) as HTMLButtonElement | null
    nextButton?.focus()
  }, [])

  // Memoize navigation callbacks for each FAQ item to prevent re-renders
  const navigationCallbacks = useMemo(() =>
    FAQ_DATA.map((_, index) => (dir: 'up' | 'down') => handleNavigate(index, dir)),
    [handleNavigate]
  )

  return (
    <section className="py-12 sm:py-24 lg:py-36 section-divider">
      <Container>
        <ScrollReveal>
          <SectionHeader
            badge="FAQ"
            title="Common Questions"
            subtitle="Technical details for curious builders."
          />
        </ScrollReveal>
        <div className="mt-8 sm:mt-16 max-w-3xl mx-auto space-y-4">
          {FAQ_DATA.map((item, index) => (
            <FAQItem
              key={item.q}
              question={item.q}
              answer={item.a}
              index={index}
              onNavigate={navigationCallbacks[index]}
              totalItems={FAQ_DATA.length}
            />
          ))}
        </div>
      </Container>
    </section>
  )
}

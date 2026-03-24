'use client'

import React, { useState, useCallback, useRef, useMemo } from 'react'
import { m } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import Container from '@/components/ui/Container'
import SectionHeader from '@/components/ui/SectionHeader'
import ScrollReveal from '@/components/ScrollReveal'

/* --- FAQ Accordion Item (private to this module) --- */
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
        className="w-full flex items-center justify-between gap-4 px-4 sm:px-8 py-4 sm:py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-inset"
      >
        <span className="text-[15px] font-medium text-white">{question}</span>
        <m.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronRight className={`w-4 h-4 transition-colors ${open ? 'text-white/60' : 'text-white/60'}`} aria-hidden="true" />
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
    q: 'What can someone see about my subscription?',
    a: 'Nothing. Not the creator you subscribe to, not when you subscribed, not how much you paid. The data simply does not exist on the blockchain in any form that can be traced back to you.',
  },
  {
    q: 'How is this different from just using a private browser?',
    a: 'A private browser hides your activity from your device. VeilSub hides your activity from everyone — including the platform, the blockchain, and the creator. There is no subscriber list to hack, subpoena, or leak.',
  },
  {
    q: 'How do creators know I have a valid subscription?',
    a: 'You can prove you have access without revealing who you are. Think of it like showing a valid ticket at the door without your name on it. The math guarantees the ticket is real.',
  },
  {
    q: 'What wallets are supported?',
    a: 'Shield Wallet (recommended), Leo Wallet, Fox Wallet, Puzzle Wallet, and Soter Wallet. All connect directly in your browser — no sign-up or email required.',
  },
  {
    q: 'Can I try before subscribing?',
    a: 'Yes. VeilSub offers trial passes at 20% of the regular price, lasting about 50 minutes. Trials have the same privacy protections as full subscriptions.',
  },
  {
    q: 'Can I gift a subscription to someone?',
    a: 'Yes. You can send a private gift to any wallet address. The recipient redeems it for a full subscription. Neither the creator nor the recipient can see who sent it.',
  },
  {
    q: 'How much does VeilSub charge creators?',
    a: 'A flat 5% platform fee. That is less than half of what Patreon (8-12%) and Substack (10%) charge. Creators keep more of what they earn.',
  },
  {
    q: 'Is this live right now?',
    a: 'VeilSub is deployed on Aleo testnet. You can connect a wallet, subscribe to creators, and use all features today. Mainnet launch will follow once Aleo mainnet is live.',
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
            subtitle="Everything you need to know, in plain English."
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

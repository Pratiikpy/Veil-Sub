'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { m, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Code, ChevronDown } from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import DotGrid from '@/components/home/DotGrid'
import HeroMockup from '@/components/home/HeroMockup'
import { FEATURED_CREATORS } from '@/lib/config'

export default function HeroSection() {
  const { connected } = useWallet()
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  // Parallax: heading moves slower, description and buttons move faster
  const headingY = useTransform(scrollYProgress, [0, 1], [0, -60])
  const descY = useTransform(scrollYProgress, [0, 1], [0, -30])
  const diagramY = useTransform(scrollYProgress, [0, 1], [0, 40])
  const opacityFade = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* Dot grid — animated background texture */}
      <DotGrid />

      {/* Hero ambient glow — layered for depth */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, rgba(139,92,246,0.02) 40%, transparent 70%)',
        }}
      />
      <div
        className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none blur-3xl"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.05) 0%, transparent 70%)',
        }}
      />

      <Container className="relative pt-20 sm:pt-40 lg:pt-44 pb-16 sm:pb-28 lg:pb-36">
        <m.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
          style={{ opacity: opacityFade }}
        >
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center mb-10"
          >
            <Badge variant="accent">Privacy-First Protocol</Badge>
          </m.div>

          <m.h1 style={{ lineHeight: 1.05, y: headingY }}>
            <m.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="block text-5xl sm:text-7xl lg:text-[88px] font-semibold text-white"
              style={{ letterSpacing: '-0.035em' }}
            >
              Subscribe
            </m.span>
            <m.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="block text-5xl sm:text-7xl lg:text-[88px] font-serif italic bg-gradient-to-r from-white via-violet-200 to-violet-400 bg-clip-text text-transparent"
              style={{ letterSpacing: '-0.025em' }}
            >
              Privately.
            </m.span>
          </m.h1>

          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-8 text-base sm:text-lg text-white/70 max-w-[520px] mx-auto leading-relaxed"
            style={{ y: descY }}
          >
            Subscribe to creators without anyone knowing. Prove your access
            with zero-knowledge proofs—no trace left on-chain.
          </m.p>

          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="flex items-center justify-center gap-3 flex-wrap mt-12"
            style={{ y: descY }}
          >
            {connected ? (
              <>
                <Link href="/dashboard">
                  <Button variant="accent" size="lg" className="rounded-full shadow-accent-lg">
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href={`/creator/${FEATURED_CREATORS[0]?.address || ''}`}>
                  <Button variant="secondary" size="lg" className="rounded-full">
                    Try as Subscriber
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href={`/creator/${FEATURED_CREATORS[0]?.address || ''}`}>
                  <Button variant="accent" size="lg" className="rounded-full shadow-accent-lg">
                    Start Subscribing
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <a
                  href="https://github.com/Pratiikpy/Veil-Sub"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="lg" className="rounded-full">
                    <Code className="w-4 h-4" />
                    View Source
                  </Button>
                </a>
              </>
            )}
          </m.div>
          {!connected && (
            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              className="mt-3 text-xs text-white/60 text-center"
            >
              No wallet needed to browse—connect when you're ready to subscribe
            </m.p>
          )}

          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="mt-8 text-xs inline-flex items-center gap-3 justify-center flex-wrap"
          >
            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-violet-400/80 bg-violet-500/[0.08] border border-violet-500/[0.15] rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              testnet
            </span>
            <span className="text-white/50">•</span>
            <span className="text-white/70 font-medium">Zero-Knowledge Proofs</span>
            <span className="text-white/50">•</span>
            <span className="text-white/70 font-medium">v27 Deployed</span>
          </m.p>
        </m.div>

        {/* Product mockup — visual "wow" element */}
        <m.div style={{ y: diagramY }} className="relative">
          <HeroMockup />
        </m.div>

        <div className="flex justify-center mt-10 sm:mt-16">
          <ChevronDown className="w-5 h-5 text-violet-400/60 animate-scroll-bounce" aria-hidden="true" />
        </div>
      </Container>
    </section>
  )
}

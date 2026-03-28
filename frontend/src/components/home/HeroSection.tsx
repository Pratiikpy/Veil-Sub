'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { m, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Shield, Lock, Eye } from 'lucide-react'
import { spring } from '@/lib/motion'
import Container from '@/components/ui/Container'
import DotGrid from '@/components/home/DotGrid'
import HeroAnimation from '@/components/home/HeroAnimation'

// Extracted style constants to prevent re-renders
const HERO_GLOW_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 40%, transparent 70%)',
} as const

const HERO_BLUR_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
} as const

const LETTER_SPACING_TIGHT = { letterSpacing: '-0.035em' } as const
const LETTER_SPACING_MEDIUM = { letterSpacing: '-0.025em' } as const

const FEATURES = [
  {
    icon: Shield,
    title: 'Zero-Knowledge Subscriptions',
    description: 'Your identity is mathematically impossible to expose. Not encrypted -- nonexistent.',
  },
  {
    icon: Lock,
    title: 'Private Payments',
    description: 'No payment trail connects you to any creator. Your wallet, your business.',
  },
  {
    icon: Eye,
    title: 'Anonymous Engagement',
    description: 'Tip, subscribe, and support creators without leaving a trace.',
  },
] as const

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  // Parallax: heading moves slower, description and buttons move faster
  // Disabled when user prefers reduced motion
  const headingY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -60])
  const descY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -30])
  const animY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 40])
  const opacityFade = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* Dot grid -- animated background texture */}
      <DotGrid />

      {/* Hero ambient glow -- layered for depth (responsive) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] sm:w-[1100px] h-[350px] sm:h-[700px] pointer-events-none"
        style={HERO_GLOW_STYLE}
      />
      <div
        className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[150px] sm:h-[300px] pointer-events-none blur-3xl"
        style={HERO_BLUR_STYLE}
      />

      <Container className="relative pt-16 sm:pt-32 lg:pt-40 pb-16 sm:pb-24 lg:pb-32">
        {/* Desktop: side-by-side layout. Mobile: stacked. */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 xl:gap-16">
          {/* -- Left: text content -- */}
          <m.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.gentle}
            className="lg:flex-1 lg:max-w-[560px] text-center lg:text-left"
            style={{ opacity: opacityFade }}
          >
            <m.h1 style={{ lineHeight: 1.05, y: headingY }}>
              <m.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.gentle, delay: 0.3 }}
                className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold text-white"
                style={LETTER_SPACING_TIGHT}
              >
                Subscribe privately.
              </m.span>
              <m.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.gentle, delay: 0.5 }}
                className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif italic bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent"
                style={LETTER_SPACING_MEDIUM}
              >
                Support freely.
              </m.span>
            </m.h1>

            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...spring.soft, delay: 0.7 }}
              className="mt-6 sm:mt-8 text-base sm:text-lg text-white/70 max-w-[480px] mx-auto lg:mx-0 leading-relaxed"
              style={{ y: descY }}
            >
              The first subscription platform where your identity is mathematically impossible to expose. Built on zero-knowledge proofs.
            </m.p>

            {/* CTA buttons */}
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.gentle, delay: 0.9 }}
              className="flex items-center justify-center lg:justify-start gap-3 flex-wrap mt-8 sm:mt-10"
              style={{ y: descY }}
            >
              <Link href="/explore" className="px-7 py-3 rounded-full bg-white text-black font-medium text-sm hover:bg-white/90 transition-all duration-300 active:scale-[0.98] inline-flex items-center justify-center">
                Get Started
              </Link>
              <Link href="/explore" className="px-7 py-3 rounded-full bg-transparent border border-white/20 text-white font-medium text-sm hover:border-white/40 hover:bg-white/[0.04] transition-all duration-300 active:scale-[0.98] inline-flex items-center justify-center gap-2">
                Explore Creators
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </m.div>

            {/* Stats row */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...spring.soft, delay: 1.1 }}
              className="flex items-center justify-center lg:justify-start gap-6 sm:gap-8 mt-10 sm:mt-12"
              style={{ y: descY }}
            >
              {[
                { value: '15+', label: 'Creators' },
                { value: '50+', label: 'Subscribers' },
                { value: 'Private', label: 'Earned privately' },
              ].map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <p className="text-xl sm:text-2xl font-semibold text-white">{stat.value}</p>
                  <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </m.div>
          </m.div>

          {/* -- Right: animated demo -- */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.5 }}
            className="mt-12 lg:mt-0 lg:flex-1"
            style={{ y: animY }}
          >
            <HeroAnimation />
          </m.div>
        </div>

        {/* Feature cards */}
        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 1.2 }}
          className="grid sm:grid-cols-3 gap-4 mt-16 sm:mt-24"
        >
          {FEATURES.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.title}
                className="animated-border p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-white/60" aria-hidden="true" />
                </div>
                <h3 className="text-white font-medium text-sm mb-1.5">{feat.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{feat.description}</p>
              </div>
            )
          })}
        </m.div>
      </Container>
    </section>
  )
}

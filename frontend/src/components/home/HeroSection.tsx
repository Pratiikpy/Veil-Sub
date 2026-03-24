'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { m, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { spring } from '@/lib/motion'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import DotGrid from '@/components/home/DotGrid'
import HeroAnimation from '@/components/home/HeroAnimation'

// Extracted style constants to prevent re-renders
const HERO_GLOW_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, rgba(139,92,246,0.02) 40%, transparent 70%)',
} as const

const HERO_BLUR_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.05) 0%, transparent 70%)',
} as const

const LETTER_SPACING_TIGHT = { letterSpacing: '-0.035em' } as const
const LETTER_SPACING_MEDIUM = { letterSpacing: '-0.025em' } as const

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
      {/* Dot grid — animated background texture */}
      <DotGrid />

      {/* Hero ambient glow — layered for depth (responsive) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] sm:w-[1100px] h-[350px] sm:h-[700px] pointer-events-none"
        style={HERO_GLOW_STYLE}
      />
      <div
        className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[150px] sm:h-[300px] pointer-events-none blur-3xl"
        style={HERO_BLUR_STYLE}
      />

      <Container className="relative pt-12 sm:pt-32 lg:pt-40 pb-16 sm:pb-24 lg:pb-32">
        {/* Desktop: side-by-side layout. Mobile: stacked. */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 xl:gap-16">
          {/* ── Left: text content ── */}
          <m.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.gentle}
            className="lg:flex-1 lg:max-w-[540px] text-center lg:text-left"
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
                Subscribe to anyone.
              </m.span>
              <m.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.gentle, delay: 0.3 }}
                className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif italic bg-gradient-to-r from-white via-violet-200 to-violet-400 bg-clip-text text-transparent"
                style={LETTER_SPACING_MEDIUM}
              >
                Nobody will ever know.
              </m.span>
            </m.h1>

            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...spring.soft, delay: 0.7 }}
              className="mt-6 sm:mt-8 text-base sm:text-lg text-white/80 max-w-[480px] mx-auto lg:mx-0 leading-relaxed"
              style={{ y: descY }}
            >
              The first subscription platform where your identity is mathematically impossible to expose. Support any creator. Stay invisible.
            </m.p>

            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.gentle, delay: 0.9 }}
              className="flex items-center justify-center lg:justify-start gap-4 flex-wrap mt-8 sm:mt-10"
              style={{ y: descY }}
            >
              <div className="relative inline-flex rounded-full p-[1.5px] overflow-hidden">
                <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,#8B5CF6_80deg,#3B82F6_160deg,#10B981_220deg,#3B82F6_280deg,#8B5CF6_330deg,transparent_360deg)]" />
                <Link href="/explore">
                  <Button variant="accent" size="lg" className="relative rounded-full shadow-accent-lg">
                    Explore Creators
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </m.div>

          </m.div>

          {/* ── Right: animated demo ── */}
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
      </Container>
    </section>
  )
}

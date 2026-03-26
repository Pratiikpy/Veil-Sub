'use client'

import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { ChevronUp } from 'lucide-react'

export default function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <m.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          onClick={() => {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
          }}
          aria-label="Back to top"
          className="fixed bottom-20 md:bottom-8 right-4 z-40 w-11 h-11 rounded-full bg-surface-1 border border-border flex items-center justify-center text-white/60 hover:text-white hover:border-white/15 active:scale-[0.9] focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none transition-all duration-200 shadow-lg"
        >
          <ChevronUp className="w-4 h-4" aria-hidden="true" />
        </m.button>
      )}
    </AnimatePresence>
  )
}

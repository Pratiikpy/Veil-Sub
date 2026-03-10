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
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="fixed bottom-20 md:bottom-8 right-4 z-40 w-10 h-10 rounded-full bg-surface-1 border border-border flex items-center justify-center text-subtle hover:text-white hover:border-violet-500/30 active:scale-[0.9] transition-all duration-200 shadow-lg"
        >
          <ChevronUp className="w-4 h-4" />
        </m.button>
      )}
    </AnimatePresence>
  )
}

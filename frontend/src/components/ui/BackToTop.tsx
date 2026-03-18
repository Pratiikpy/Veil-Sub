'use client'

import { useEffect, useState } from 'react'

export default function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setShow(window.scrollY > window.innerHeight * 2))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '1px solid rgba(139,92,246,0.25)',
        background: 'rgba(15,15,20,0.85)',
        color: 'rgba(255,255,255,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        opacity: show ? 1 : 0,
        pointerEvents: show ? 'auto' : 'none',
        transform: show ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 300ms ease, transform 300ms ease, border-color 200ms ease, color 200ms ease',
        zIndex: 50,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12V4M4 7l4-4 4 4" />
      </svg>
    </button>
  )
}

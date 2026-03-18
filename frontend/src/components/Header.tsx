'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'
import { Menu, X, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import NotificationBell from '@/components/NotificationBell'
import { CommandPaletteTrigger } from '@/components/CommandPalette'
import { ThemeToggle } from '@/components/ThemeToggle'

const NAV_ITEMS = [
  { href: '/explore', label: 'Explore' },
]

const FEED_ITEM = { href: '/feed', label: 'Feed' }
const DASHBOARD_ITEM = { href: '/dashboard', label: 'Dashboard' }

// Extracted static style to prevent re-renders
const NAV_ACTIVE_GLOW_STYLE = { boxShadow: '0 0 12px rgba(139, 92, 246, 0.1)' } as const

export default function Header() {
  const { connected } = useWallet()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const hidden = false // Header always visible for better navigation

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Escape key closes mobile nav
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const allItems = connected
    ? [FEED_ITEM, ...NAV_ITEMS, DASHBOARD_ITEM]
    : NAV_ITEMS

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        hidden && !mobileOpen ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div
        className={`transition-all duration-500 ${
          scrolled
            ? 'bg-black/80 backdrop-blur-xl border-b border-border/75'
            : 'bg-black/20 backdrop-blur-md border-b border-transparent'
        }`}
      >
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
          <div className="relative flex items-center h-16">
            {/* Logo with subtle glow on hover */}
            <Link
              href="/"
              aria-label="VeilSub home"
              className="group relative flex items-center gap-2 text-xl font-serif italic text-white transition-all duration-300"
            >
              <span className="relative z-10">VeilSub</span>
              <span className="absolute -inset-2 rounded-lg bg-violet-500/0 group-hover:bg-violet-500/[0.06] transition-colors duration-300" />
              <span className="relative z-10 text-[9px] font-sans not-italic font-medium text-white/30 ml-1.5">
                testnet
              </span>
            </Link>

            {/* Desktop nav — centered pill floating over header */}
            <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 rounded-full bg-white/[0.03] border border-border/75 px-1 py-1">
              {allItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-1.5 text-sm font-medium transition-colors duration-200 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black ${
                    isActive(item.href)
                      ? 'text-white'
                      : 'text-white/60 hover:text-white/70'
                  }`}
                >
                  {isActive(item.href) && (
                    <m.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-white/[0.08] border border-border"
                      style={NAV_ACTIVE_GLOW_STYLE}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-3" aria-live="polite">
              <ThemeToggle />
              <CommandPaletteTrigger />
              {connected && <NotificationBell />}
              {connected && (
                <Link
                  href="/settings"
                  aria-label="Settings"
                  className={`p-2 rounded-lg transition-colors ${
                    pathname.startsWith('/settings')
                      ? 'bg-white/[0.08] text-white'
                      : 'hover:bg-white/5 text-white/50 hover:text-white/70'
                  }`}
                >
                  <Settings size={16} />
                </Link>
              )}
              <WalletMultiButton />
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileOpen}
                className="md:hidden p-2 rounded-lg hover:bg-white/[0.04] text-white/60 active:scale-[0.9] transition-all"
              >
                {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border/75 bg-black/95 backdrop-blur-xl overflow-hidden"
          >
            <nav aria-label="Mobile navigation" className="px-6 py-4 space-y-2">
              {allItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                    isActive(item.href)
                      ? 'text-white bg-violet-500/[0.08] border border-violet-500/[0.12]'
                      : 'text-white/60 hover:text-white/70 hover:bg-white/[0.02]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {connected && (
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                    isActive('/settings')
                      ? 'text-white bg-violet-500/[0.08] border border-violet-500/[0.12]'
                      : 'text-white/60 hover:text-white/70 hover:bg-white/[0.02]'
                  }`}
                >
                  <Settings className="w-4 h-4" aria-hidden="true" />
                  Settings
                </Link>
              )}
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </header>
    </>
  )
}

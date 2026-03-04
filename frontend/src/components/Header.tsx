'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/verify', label: 'Verify' },
  { href: '/docs', label: 'Docs' },
  { href: '/analytics', label: 'Analytics' },
]

const DASHBOARD_ITEM = { href: '/dashboard', label: 'Dashboard' }

export default function Header() {
  const { connected } = useWallet()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const allItems = connected ? [...NAV_ITEMS, DASHBOARD_ITEM] : NAV_ITEMS

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className={`transition-all duration-500 ${
          scrolled
            ? 'bg-[rgb(2,0,5)]/80 backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo — plain text */}
            <Link href="/" className="text-lg font-semibold text-white tracking-tight">
              VeilSub
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {allItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-white'
                      : 'text-[#71717a] hover:text-[#a1a1aa]'
                  }`}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <span className="absolute bottom-0 left-4 right-4 h-px bg-white/40" />
                  )}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <WalletMultiButton />
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileOpen}
                className="md:hidden p-2 rounded-[8px] hover:bg-white/[0.04] text-[#71717a]"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-[rgba(255,255,255,0.06)] bg-[rgb(2,0,5)]/95 backdrop-blur-xl overflow-hidden"
          >
            <nav className="px-6 py-3 space-y-1">
              {allItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-[8px] text-sm transition-colors ${
                    isActive(item.href)
                      ? 'text-white bg-white/[0.04]'
                      : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.02]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

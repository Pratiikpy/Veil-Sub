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
            ? 'bg-black/80 backdrop-blur-xl border-b border-white/[0.06]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo with subtle glow on hover */}
            <Link
              href="/"
              className="group relative text-xl font-serif italic text-white transition-all duration-300"
            >
              <span className="relative z-10">VeilSub</span>
              <span className="absolute -inset-2 rounded-lg bg-violet-500/0 group-hover:bg-violet-500/[0.06] transition-colors duration-300" />
            </Link>

            {/* Desktop nav with spring-physics indicator */}
            <nav className="hidden md:flex items-center gap-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] px-1 py-1">
              {allItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-1.5 text-sm font-medium transition-colors duration-200 rounded-full ${
                    isActive(item.href)
                      ? 'text-white'
                      : 'text-[#525252] hover:text-[#a1a1aa]'
                  }`}
                >
                  {isActive(item.href) && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-white/[0.08] border border-white/[0.08]"
                      style={{ boxShadow: '0 0 12px rgba(139, 92, 246, 0.1)' }}
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

            <div className="flex items-center gap-3">
              <WalletMultiButton />
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileOpen}
                className="md:hidden p-2 rounded-lg hover:bg-white/[0.04] text-[#525252] transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-white/[0.06] bg-black/95 backdrop-blur-xl overflow-hidden"
          >
            <nav className="px-6 py-3 space-y-1">
              {allItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    isActive(item.href)
                      ? 'text-white bg-violet-500/[0.08] border border-violet-500/[0.12]'
                      : 'text-[#525252] hover:text-[#a1a1aa] hover:bg-white/[0.02]'
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

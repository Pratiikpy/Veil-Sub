'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui'
import { Shield, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_ITEMS = [
  { href: '/', label: 'Home', requiresWallet: false },
  { href: '/privacy', label: 'Privacy', requiresWallet: false },
  { href: '/docs', label: 'Docs', requiresWallet: false },
  { href: '/explorer', label: 'Explorer', requiresWallet: false },
  { href: '/verify', label: 'Verify', requiresWallet: true },
  { href: '/dashboard', label: 'Dashboard', requiresWallet: true },
]

export default function Header() {
  const { connected } = useWallet()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.requiresWallet || connected
  )

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5">
      <div className="backdrop-blur-xl bg-[#0a0a0f]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-shadow">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                VeilSub
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-lg bg-white/[0.06] border border-white/[0.08]"
                      style={{ zIndex: -1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <WalletMultiButton />

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileOpen}
                className="md:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400"
              >
                {mobileOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
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
            className="md:hidden border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl overflow-hidden"
          >
            <nav className="px-4 py-3 space-y-1">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive(item.href)
                      ? 'text-white bg-white/[0.06]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
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

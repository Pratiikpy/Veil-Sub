'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'
import { Home, Compass, Bell, LayoutDashboard, Search, Settings, LogOut } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

const NAV_ITEMS = [
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/notifications', label: 'Notifications', icon: Bell, requiresWallet: true, showBadge: true },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresWallet: true },
]

function openCommandPalette() {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true })
  )
}

export default function DesktopSidebar() {
  const { connected, address, disconnect } = useWallet()
  const pathname = usePathname()
  const { unreadCount } = useNotifications()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const truncatedAddress = address
    ? `${address.slice(0, 8)}...${address.slice(-4)}`
    : null

  // Show ALL nav items always — wallet-gated items appear dimmed when not connected
  const visibleNav = NAV_ITEMS

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-[220px] bg-[#050507] border-r border-white/[0.06] z-40">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link
          href="/"
          className="group flex items-center gap-2 transition-opacity duration-200 hover:opacity-80"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 font-serif italic text-lg font-bold">
            V
          </span>
          <span className="font-serif italic text-white text-lg">VeilSub</span>
          <span className="hidden text-[9px] font-sans not-italic font-medium text-white/25 ml-0.5">
            testnet
          </span>
        </Link>
      </div>

      {/* Main navigation — all items always visible */}
      <nav aria-label="Main navigation" className="flex-1 px-3 py-2 space-y-0.5">
        {visibleNav.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const needsWallet = item.requiresWallet && !connected

          if (needsWallet) {
            // Show item but dim — clicking opens wallet connect
            return (
              <button
                key={`${item.href}-${item.label}`}
                onClick={() => {
                  // Trigger the WalletMultiButton programmatically
                  const btn = document.querySelector('.wallet-sidebar-btn button') as HTMLButtonElement
                  btn?.click()
                }}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold w-full text-left text-white/25 hover:text-white/40 hover:bg-white/[0.02] transition-all duration-150"
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
                {item.label}
              </button>
            )
          }

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none ${
                active
                  ? 'text-white bg-white/[0.05]'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
              }`}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                {item.showBadge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-3 space-y-0.5">
        {/* Search trigger */}
        <button
          onClick={openCommandPalette}
          className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-semibold text-white/50 hover:text-white/80 hover:bg-white/[0.03] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
        >
          <Search size={18} strokeWidth={2} aria-hidden="true" />
          <span>Search</span>
          <kbd className="ml-auto text-[10px] font-mono text-white/25 bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5">
            /K
          </kbd>
        </button>

        {/* Settings — always visible */}
        {(
          <Link
            href="/settings"
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none ${
              isActive('/settings')
                ? 'text-white bg-white/[0.05]'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
            }`}
          >
            <Settings size={18} strokeWidth={isActive('/settings') ? 2.5 : 2} aria-hidden="true" />
            Settings
          </Link>
        )}

        {/* Wallet */}
        <div className="mt-2 mx-1">
          {connected ? (
            <button
              onClick={() => disconnect()}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all text-left group"
            >
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-white/70">Connected</p>
                <p className="text-[10px] font-mono text-white/35 truncate">{truncatedAddress}</p>
              </div>
              <LogOut size={14} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
            </button>
          ) : (
            <div className="wallet-sidebar-btn [&_button]:!w-full [&_button]:!rounded-xl [&_button]:!bg-white [&_button]:!text-black [&_button]:!text-sm [&_button]:!font-semibold [&_button]:!py-3 [&_button]:!border-0">
              <WalletMultiButton />
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { Compass, ShieldCheck, LayoutDashboard, Home } from 'lucide-react'

const MOBILE_NAV = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/verify', label: 'Verify', icon: ShieldCheck },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresWallet: true },
]

export default function MobileBottomNav() {
  const { connected } = useWallet()
  const pathname = usePathname()

  const items = MOBILE_NAV.filter(
    (item) => !item.requiresWallet || connected
  )

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-[#050507]/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-lg transition-colors ${
                active
                  ? 'text-violet-400'
                  : 'text-slate-500 active:text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-violet-400' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

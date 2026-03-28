'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { Search, Home, CreditCard, Bell, MessageCircle } from 'lucide-react'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'

const MOBILE_NAV = [
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/explore', label: 'Explore', icon: Search },
  { href: '/subscriptions', label: 'Subs', icon: CreditCard, requiresWallet: true },
  { href: '/notifications', label: 'Alerts', icon: Bell, requiresWallet: true },
  { href: '/messages', label: 'DMs', icon: MessageCircle, requiresWallet: true, showMessageBadge: true },
]

export default function MobileBottomNav() {
  const { connected } = useWallet()
  const pathname = usePathname()
  const { unreadCount: unreadMessageCount } = useUnreadMessages()

  const items = MOBILE_NAV.filter(
    (item) => !item.requiresWallet || connected
  )

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav aria-label="Bottom navigation" className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-black/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none ${
                active
                  ? 'text-white'
                  : 'text-white/60 active:text-white/70 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} aria-hidden="true" />
                {active && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white transition-all duration-200 scale-100" />
                )}
                {item.showMessageBadge && unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 text-[10px] font-bold text-white bg-violet-500 rounded-full">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

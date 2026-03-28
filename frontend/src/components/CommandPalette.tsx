'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { spring, modalVariants, modalTransition, backdropVariants } from '@/lib/motion'
import {
  Search, Home, Compass, LayoutDashboard, CreditCard, BarChart3,
  Shield, Vote, Store, Code, BookOpen, Wallet, PenTool, ArrowDownToLine,
  Layers, Eye, Sparkles, FileCheck, User,
} from 'lucide-react'
import { FEATURED_CREATORS } from '@/lib/config'

interface CommandItem {
  id: string
  label: string
  category: 'page' | 'action' | 'creator'
  icon: React.ReactNode
  href?: string
  shortcut?: string
}

const PAGES: CommandItem[] = [
  { id: 'home', label: 'Home', category: 'page', icon: <Home className="w-4 h-4" />, href: '/' },
  { id: 'explore', label: 'Explore Creators', category: 'page', icon: <Compass className="w-4 h-4" />, href: '/explore' },
  { id: 'dashboard', label: 'Dashboard', category: 'page', icon: <LayoutDashboard className="w-4 h-4" />, href: '/dashboard' },
  { id: 'subscriptions', label: 'My Subscriptions', category: 'page', icon: <CreditCard className="w-4 h-4" />, href: '/subscriptions' },
  { id: 'analytics', label: 'Analytics', category: 'page', icon: <BarChart3 className="w-4 h-4" />, href: '/analytics' },
  { id: 'privacy', label: 'Privacy Dashboard', category: 'page', icon: <Shield className="w-4 h-4" />, href: '/privacy-dashboard' },
  { id: 'governance', label: 'Governance', category: 'page', icon: <Vote className="w-4 h-4" />, href: '/governance' },
  { id: 'marketplace', label: 'Marketplace', category: 'page', icon: <Store className="w-4 h-4" />, href: '/marketplace' },
  { id: 'developers', label: 'Developers', category: 'page', icon: <Code className="w-4 h-4" />, href: '/developers' },
  { id: 'docs', label: 'Documentation', category: 'page', icon: <BookOpen className="w-4 h-4" />, href: '/docs' },
  { id: 'explorer', label: 'On-Chain Explorer', category: 'page', icon: <Eye className="w-4 h-4" />, href: '/explorer' },
  { id: 'vision', label: 'Vision', category: 'page', icon: <Sparkles className="w-4 h-4" />, href: '/vision' },
  { id: 'verify', label: 'Verify Access', category: 'page', icon: <FileCheck className="w-4 h-4" />, href: '/verify' },
]

const ACTIONS: CommandItem[] = [
  { id: 'connect', label: 'Connect Wallet', category: 'action', icon: <Wallet className="w-4 h-4" /> },
  { id: 'create-post', label: 'Create New Post', category: 'action', icon: <PenTool className="w-4 h-4" />, href: '/dashboard' },
  { id: 'create-tier', label: 'Create Tier', category: 'action', icon: <Layers className="w-4 h-4" />, href: '/dashboard' },
  { id: 'withdraw', label: 'Withdraw Revenue', category: 'action', icon: <ArrowDownToLine className="w-4 h-4" />, href: '/dashboard' },
]

const CREATOR_ITEMS: CommandItem[] = FEATURED_CREATORS.map((c) => ({
  id: `creator-${c.address}`,
  label: c.label,
  category: 'creator' as const,
  icon: <User className="w-4 h-4" />,
  href: `/creator/${c.address}`,
}))

const ALL_COMMANDS: CommandItem[] = [...PAGES, ...ACTIONS, ...CREATOR_ITEMS]

const CATEGORY_LABELS: Record<string, string> = {
  page: 'Pages',
  action: 'Actions',
  creator: 'Creators',
}

const RECENT_KEY = 'veilsub_cmd_recent'
const MAX_RECENT = 5

function getRecentIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function saveRecent(id: string): void {
  if (typeof window === 'undefined') return
  try {
    const prev = getRecentIds().filter((r) => r !== id)
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)))
  } catch { /* ignore */ }
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      // Small delay so the DOM is ready
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Filter results
  const filtered = useMemo(() => {
    if (!query.trim()) {
      const recentIds = getRecentIds()
      const recents = recentIds
        .map((id) => ALL_COMMANDS.find((c) => c.id === id))
        .filter(Boolean) as CommandItem[]
      return recents.length > 0 ? recents : PAGES.slice(0, 6)
    }
    const q = query.toLowerCase()
    return ALL_COMMANDS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    )
  }, [query])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filtered.length, query])

  // Group results by category for display
  const grouped = useMemo(() => {
    const groups: { category: string; items: CommandItem[] }[] = []
    const seen = new Set<string>()
    for (const item of filtered) {
      if (!seen.has(item.category)) {
        seen.add(item.category)
        groups.push({ category: item.category, items: [] })
      }
      groups.find((g) => g.category === item.category)!.items.push(item)
    }
    return groups
  }, [filtered])

  const executeItem = useCallback(
    (item: CommandItem) => {
      saveRecent(item.id)
      setOpen(false)
      if (item.id === 'connect') {
        // Click the wallet button in the header
        const walletBtn = document.querySelector('.wallet-adapter-button') as HTMLButtonElement | null
        walletBtn?.click()
        return
      }
      if (item.href) {
        router.push(item.href)
      }
    },
    [router]
  )

  // Keyboard navigation
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault()
        executeItem(filtered[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    },
    [filtered, selectedIndex, executeItem]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Track flat index across grouped items
  let flatIndex = -1

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={spring.snappy}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-lg mx-4 bg-[#12121A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={modalTransition}
            role="dialog"
            aria-label="Command palette"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
              <Search className="w-5 h-5 text-white/50 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search pages, actions, creators..."
                maxLength={100}
                className="flex-1 bg-transparent text-lg text-white placeholder:text-white/50 outline-none"
                aria-label="Search commands"
                aria-describedby="command-palette-hint"
                autoComplete="off"
                spellCheck={false}
              />
              <span id="command-palette-hint" className="sr-only">
                Press Escape to close, arrow keys to navigate, Enter to select
              </span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[11px] text-white/50 font-mono">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2 scroll-smooth">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-white/50">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.category}>
                    <div className="px-4 pt-2 pb-1 text-[11px] uppercase tracking-wider font-semibold text-white/50">
                      {!query.trim() && getRecentIds().length > 0
                        ? 'Recent'
                        : CATEGORY_LABELS[group.category] ?? group.category}
                    </div>
                    {group.items.map((item) => {
                      flatIndex++
                      const idx = flatIndex
                      const isSelected = idx === selectedIndex
                      return (
                        <button
                          key={item.id}
                          data-index={idx}
                          onClick={() => executeItem(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-inset focus-visible:outline-none ${
                            isSelected
                              ? 'bg-white/[0.04]'
                              : 'hover:bg-white/[0.03]'
                          }`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <span
                            className={`shrink-0 transition-colors duration-75 ${
                              isSelected ? 'text-white/60' : 'text-white/50'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="flex-1 text-sm text-white/90 truncate">
                            {item.label}
                          </span>
                          <span className="shrink-0 text-[11px] uppercase tracking-wide text-white/50 font-medium">
                            {item.category}
                          </span>
                          {item.shortcut && (
                            <kbd className="shrink-0 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[11px] text-white/50 font-mono">
                              {item.shortcut}
                            </kbd>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.06] text-[11px] text-white/50">
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded bg-white/[0.06] font-mono">&uarr;</kbd>
                <kbd className="px-1 rounded bg-white/[0.06] font-mono">&darr;</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded bg-white/[0.06] font-mono">&crarr;</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded bg-white/[0.06] font-mono">esc</kbd>
                close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Trigger button for Header — opens the command palette on click */
export function CommandPaletteTrigger() {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes('MAC'))
  }, [])

  return (
    <button
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true })
        )
      }}
      aria-label="Open command palette"
      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/50 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
    >
      <Search className="w-3 h-3" />
      <span className="font-mono text-[11px]">{isMac ? '\u2318K' : 'Ctrl+K'}</span>
    </button>
  )
}

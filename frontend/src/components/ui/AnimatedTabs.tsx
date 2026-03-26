'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface AnimatedTabsProps {
  tabs: { id: string; label: string; count?: number }[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export default function AnimatedTabs({ tabs, activeTab, onChange, className = '' }: AnimatedTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  const updateIndicator = useCallback(() => {
    const el = tabRefs.current.get(activeTab)
    const container = containerRef.current
    if (el && container) {
      const containerRect = container.getBoundingClientRect()
      const tabRect = el.getBoundingClientRect()
      setIndicator({
        left: tabRect.left - containerRect.left + container.scrollLeft,
        width: tabRect.width,
      })
    }
  }, [activeTab])

  useEffect(() => {
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [updateIndicator])

  return (
    <div
      ref={containerRef}
      className={`relative flex overflow-x-auto no-scrollbar ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => { if (el) tabRefs.current.set(tab.id, el) }}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
            activeTab === tab.id ? 'text-white' : 'text-white/50 hover:text-white/70'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold ${
                activeTab === tab.id
                  ? 'bg-white/[0.08] text-white/70'
                  : 'bg-white/[0.06] text-white/50'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
      {/* Sliding underline indicator */}
      <div
        className="absolute bottom-0 h-0.5 rounded-full bg-[var(--accent)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ left: indicator.left, width: indicator.width }}
        aria-hidden="true"
      />
    </div>
  )
}

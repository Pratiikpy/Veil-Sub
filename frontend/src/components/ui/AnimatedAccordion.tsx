'use client'

import { useState, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionItem {
  id: string
  title: string
  content: React.ReactNode
}

interface AnimatedAccordionProps {
  items: AccordionItem[]
  allowMultiple?: boolean
  className?: string
}

export default function AnimatedAccordion({ items, allowMultiple = false, className = '' }: AnimatedAccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(allowMultiple ? prev : [])
      if (prev.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [allowMultiple])

  return (
    <div className={`divide-y divide-border/50 ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id)
        return (
          <div key={item.id}>
            <button
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium text-white/90 hover:text-white transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-inset focus-visible:outline-none rounded-lg"
            >
              <span>{item.title}</span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 text-white/50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div className="pb-4 text-sm text-white/60 leading-relaxed">
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

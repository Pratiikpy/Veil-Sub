'use client'

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { AUCTION_STATUS } from './constants'
import type { AuctionStatus } from './constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuctionLifecycleStepperProps {
  currentStatus: AuctionStatus
}

interface StateNode {
  key: string
  label: string
  tooltip: string
}

// ─── State definitions ────────────────────────────────────────────────────────

const stateNodes: StateNode[] = [
  {
    key: 'created',
    label: 'Created',
    tooltip: 'Auction registered on-chain via create_auction',
  },
  {
    key: 'bidding',
    label: 'Bidding',
    tooltip: 'Accepting sealed BHP256 commitments — bid amounts are hidden',
  },
  {
    key: 'closed',
    label: 'Closed',
    tooltip: 'Bidding closed by creator — reveal phase begins',
  },
  {
    key: 'revealing',
    label: 'Revealing',
    tooltip: 'Bidders reveal amounts — contract verifies commitments',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    tooltip: 'Vickrey settlement — winner pays second-highest price',
  },
]

// ─── Map on-chain status to visual step index ─────────────────────────────────

function getActiveIndex(status: AuctionStatus): number {
  switch (status) {
    case AUCTION_STATUS.OPEN:
      return 1 // bidding
    case AUCTION_STATUS.CLOSED:
      return 2 // closed / revealing
    case AUCTION_STATUS.RESOLVED:
      return 4 // resolved
    default:
      return 0
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuctionLifecycleStepper({
  currentStatus,
}: AuctionLifecycleStepperProps) {
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null)
  const activeIndex = getActiveIndex(currentStatus)

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      {/* Accent line */}
      <div className="h-0.5 bg-gradient-to-r from-violet-500 via-blue-500 to-violet-500" />

      <div className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <h4 className="text-sm font-semibold text-white">
            Auction Lifecycle
          </h4>
        </div>

        {/* Stepper — horizontal with connector lines */}
        <div
          className="flex items-start justify-between relative px-1 overflow-x-auto pb-2 -mx-1"
          style={{ minWidth: 0 }}
        >
          {stateNodes.map((node, i) => {
            const isCompleted = activeIndex > i
            const isCurrent = activeIndex === i
            const isFuture = !isCompleted && !isCurrent

            return (
              <div
                key={node.key}
                className="flex items-start flex-1 min-w-0 last:flex-none"
              >
                {/* Node circle + label */}
                <div className="flex flex-col items-center relative">
                  <button
                    type="button"
                    onClick={() =>
                      setTooltipIndex(tooltipIndex === i ? null : i)
                    }
                    className="relative z-10 cursor-pointer focus:outline-none"
                    aria-label={`${node.label}: ${node.tooltip}`}
                  >
                    <m.div
                      initial={false}
                      animate={{
                        backgroundColor: isCompleted
                          ? 'rgb(139, 92, 246)' // violet-500
                          : isCurrent
                            ? 'rgb(167, 139, 250)' // violet-400
                            : 'rgba(255, 255, 255, 0.06)',
                      }}
                      transition={{ duration: 0.5 }}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={
                        isCurrent
                          ? {
                              boxShadow:
                                '0 0 16px rgba(139, 92, 246, 0.4), 0 0 32px rgba(139, 92, 246, 0.15)',
                            }
                          : isCompleted
                            ? {
                                boxShadow:
                                  '0 0 8px rgba(139, 92, 246, 0.2)',
                              }
                            : undefined
                      }
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : isCurrent ? (
                        <m.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                          className="w-2 h-2 rounded-full bg-white"
                        />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      )}
                    </m.div>
                  </button>

                  {/* Label under the node */}
                  <span
                    className={`text-[9px] mt-1.5 font-medium text-center whitespace-nowrap ${
                      isCurrent
                        ? 'text-violet-400'
                        : isCompleted
                          ? 'text-violet-300/70'
                          : 'text-white/25'
                    }`}
                  >
                    {node.label}
                  </span>

                  {/* Tooltip popover */}
                  <AnimatePresence>
                    {tooltipIndex === i && (
                      <m.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-11 z-20 w-36 sm:w-44 p-2.5 rounded-lg bg-black/90 border border-white/10 shadow-xl"
                        style={{
                          left: '50%',
                          transform: 'translateX(-50%)',
                          maxWidth: 'calc(100vw - 2rem)',
                        }}
                      >
                        <p className="text-[11px] text-white/70 leading-relaxed">
                          {node.tooltip}
                        </p>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 border-l border-t border-white/10 rotate-45" />
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Connector line between nodes */}
                {i < stateNodes.length - 1 && (
                  <div className="flex-1 flex items-center pt-3.5 px-0.5">
                    {isCompleted ? (
                      <div className="w-full h-0.5 rounded-full relative overflow-hidden bg-white/[0.06]">
                        <m.div
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{
                            duration: 0.6,
                            delay: i * 0.08,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="absolute inset-y-0 left-0 rounded-full bg-violet-500/60"
                        />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-full h-0.5 rounded-full relative overflow-hidden bg-white/[0.06]">
                        <m.div
                          initial={{ width: 0 }}
                          animate={{ width: '50%' }}
                          transition={{
                            duration: 0.6,
                            delay: i * 0.08,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="absolute inset-y-0 left-0 rounded-full bg-violet-400/40"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-full h-0"
                        style={{
                          borderTop: '2px dashed rgba(255,255,255,0.08)',
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

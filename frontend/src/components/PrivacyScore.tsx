'use client'

import { useState, useEffect } from 'react'
import { Shield, Check, X } from 'lucide-react'

interface PrivacyScoreProps {
  usesBlindSub: boolean        // +25 points
  usesCommitRevealTip: boolean // +20 points
  hasScopedAuditToken: boolean // +20 points
  usesTrialPass: boolean       // +15 points
  hasE2EContent: boolean       // +20 points
}

const FEATURES = [
  { key: 'usesBlindSub' as const, label: 'Blind Subscription (BSP)', points: 25 },
  { key: 'usesCommitRevealTip' as const, label: 'Commit-Reveal Tipping', points: 20 },
  { key: 'hasScopedAuditToken' as const, label: 'Scoped Audit Token', points: 20 },
  { key: 'usesTrialPass' as const, label: 'Trial Pass', points: 15 },
  { key: 'hasE2EContent' as const, label: 'E2E Encrypted Content', points: 20 },
] as const

function getScoreColor(score: number): { ring: string; text: string; label: string } {
  if (score >= 80) return { ring: 'stroke-emerald-400', text: 'text-emerald-400', label: 'Excellent' }
  if (score >= 50) return { ring: 'stroke-yellow-400', text: 'text-yellow-400', label: 'Moderate' }
  return { ring: 'stroke-red-400', text: 'text-red-400', label: 'Low' }
}

export default function PrivacyScore(props: PrivacyScoreProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const score = FEATURES.reduce(
    (total, feature) => total + (props[feature.key] ? feature.points : 0),
    0,
  )

  const { ring, text, label } = getScoreColor(score)
  const size = 80
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = mounted ? circumference * (1 - score / 100) : circumference

  return (
    <div className="rounded-xl border border-border bg-white/[0.02] p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-violet-400" aria-hidden="true" />
        <h4 className="text-sm font-semibold text-white">Privacy Score</h4>
      </div>

      {/* Ring + Score */}
      <div className="flex items-center gap-5 mb-5">
        <div
          className="relative shrink-0"
          style={{ width: size, height: size }}
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Privacy score: ${score} out of 100`}
        >
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className="stroke-white/10"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className={ring}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
          </svg>
          <span
            className={`absolute inset-0 flex items-center justify-center text-lg font-bold font-mono ${text}`}
          >
            {score}
          </span>
        </div>
        <div>
          <span className={`text-sm font-semibold ${text}`}>{label}</span>
          <p className="text-xs text-white/50 mt-0.5">out of 100</p>
        </div>
      </div>

      {/* Feature Checklist */}
      <ul className="space-y-2">
        {FEATURES.map((feature) => {
          const active = props[feature.key]
          return (
            <li
              key={feature.key}
              className="flex items-center gap-2.5"
              aria-label={`${feature.label}: ${active ? 'enabled' : 'disabled'}, ${feature.points} points`}
            >
              {active ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <X className="w-3.5 h-3.5 text-white/30 shrink-0" aria-hidden="true" />
              )}
              <span className={`text-xs ${active ? 'text-white/80' : 'text-white/60'}`}>
                {feature.label}
              </span>
              <span className={`ml-auto text-[11px] font-mono ${active ? 'text-emerald-400/70' : 'text-white/50'}`}>
                +{feature.points}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

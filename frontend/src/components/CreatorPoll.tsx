'use client'

import { useState, useMemo, useCallback } from 'react'

interface PollOption {
  id: string
  text: string
}

interface CreatorPollProps {
  pollId: string
  question: string
  options: PollOption[]
  isSubscribed: boolean
}

const POLL_KEY = 'veilsub_poll_'

function loadVotes(pollId: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(POLL_KEY + pollId) || '{}') } catch { return {} }
}

function loadMyVote(pollId: string): string | null {
  try { return localStorage.getItem(POLL_KEY + pollId + '_my') } catch { return null }
}

export default function CreatorPoll({ pollId, question, options, isSubscribed }: CreatorPollProps) {
  const [votes, setVotes] = useState(() => loadVotes(pollId))
  const [myVote, setMyVote] = useState(() => loadMyVote(pollId))

  const totalVotes = useMemo(() => Object.values(votes).reduce((a, b) => a + b, 0), [votes])
  const maxVotes = useMemo(() => Math.max(...Object.values(votes), 0), [votes])

  const castVote = useCallback((optionId: string) => {
    if (myVote || !isSubscribed) return
    const next = { ...votes, [optionId]: (votes[optionId] || 0) + 1 }
    setVotes(next)
    setMyVote(optionId)
    try {
      localStorage.setItem(POLL_KEY + pollId, JSON.stringify(next))
      localStorage.setItem(POLL_KEY + pollId + '_my', optionId)
    } catch { /* quota */ }
  }, [myVote, isSubscribed, votes, pollId])

  const hasVoted = myVote !== null

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 my-3">
      <p className="text-sm font-medium text-white mb-3">{question}</p>
      <div className="space-y-2">
        {options.map(opt => {
          const count = votes[opt.id] || 0
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const isWinner = hasVoted && count === maxVotes && maxVotes > 0
          const isMyChoice = myVote === opt.id

          return (
            <button
              key={opt.id}
              onClick={() => castVote(opt.id)}
              disabled={hasVoted || !isSubscribed}
              className={`relative w-full text-left rounded-lg px-3 py-2 text-sm transition-all overflow-hidden border ${
                !isSubscribed
                  ? 'border-white/[0.06] text-white/50 cursor-not-allowed'
                  : hasVoted
                    ? `border-white/[0.08] ${isMyChoice ? 'border-white/15' : ''}`
                    : 'border-white/[0.08] hover:border-white/10 hover:bg-white/[0.04] cursor-pointer'
              }`}
            >
              {hasVoted && (
                <div
                  className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ease-out ${
                    isWinner ? 'bg-white/[0.06]' : 'bg-white/[0.04]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between">
                <span className={isWinner ? 'text-white/70 font-medium' : 'text-white/70'}>{opt.text}</span>
                {hasVoted && <span className="text-xs text-white/50 ml-2">{pct}%</span>}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-2 text-xs text-white/50">
        {!isSubscribed ? 'Subscribe to vote' : hasVoted ? `${totalVotes} vote${totalVotes !== 1 ? 's' : ''}` : 'Tap to vote'}
      </div>
    </div>
  )
}

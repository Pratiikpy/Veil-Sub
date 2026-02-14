'use client'

import { AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react'
import { formatCredits } from '@/lib/utils'

interface Props {
  requiredAmount: number
  currentBalance: number
}

export default function BalanceConverter({
  requiredAmount,
  currentBalance,
}: Props) {
  const shortfall = requiredAmount - currentBalance
  const shortfallDisplay = formatCredits(shortfall > 0 ? shortfall : 0)

  return (
    <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-yellow-300 font-medium text-sm mb-1">
            Insufficient Private Balance
          </h4>
          <p className="text-xs text-slate-400">
            You need{' '}
            <strong className="text-white">{shortfallDisplay} ALEO</strong> more
            in private credits to complete this transaction.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-white font-medium">
              Convert Public → Private
            </span>
            <span className="text-xs text-violet-400">Recommended</span>
          </div>
          <p className="text-xs text-slate-400 mb-2.5">
            If you have public ALEO credits, convert them to private using your
            wallet&apos;s transfer_public_to_private feature.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ArrowRight className="w-3 h-3" />
            <span>Shield Wallet → Settings → Convert Credits</span>
          </div>
        </div>

        <a
          href="https://faucet.aleo.org"
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-white font-medium">
              Get Testnet Credits
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <p className="text-xs text-slate-400">
            Request free testnet ALEO from the official faucet.
          </p>
        </a>
      </div>

      <div className="p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/10">
        <p className="text-xs text-slate-400">
          <strong className="text-violet-300">Why private credits?</strong>{' '}
          VeilSub uses transfer_private to keep your subscription anonymous.
          Public transfers would expose your identity on-chain.
        </p>
      </div>
    </div>
  )
}

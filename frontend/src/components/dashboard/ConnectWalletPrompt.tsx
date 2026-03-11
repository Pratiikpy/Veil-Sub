'use client'

import { m } from 'framer-motion'
import { Shield, Wallet, Droplets, Plug, Users, Lock, FileCode, Zap } from 'lucide-react'
import PageTransition from '@/components/PageTransition'

const PLATFORM_STATS = [
  { icon: Users, value: '8', label: 'Creators' },
  { icon: Lock, value: '0', label: 'Identity Leaks' },
  { icon: FileCode, value: 'v27', label: 'Contract' },
]

const QUICK_START_STEPS = [
  {
    icon: Wallet,
    step: '1',
    text: <>Install <a href="https://www.leo.app/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline">Leo Wallet</a> or <a href="https://www.foxwallet.com/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline">Fox Wallet</a></>
  },
  {
    icon: Droplets,
    step: '2',
    text: <>Get testnet credits from the <a href="https://faucet.aleo.org/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline">Aleo Faucet</a></>
  },
  {
    icon: Plug,
    step: '3',
    text: <>Click <strong className="text-white">&quot;Select Wallet&quot;</strong> in the header to connect</>
  },
]

export default function ConnectWalletPrompt() {
  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full px-4">
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-2xl bg-violet-500/20 animate-pulse" />
              <div className="relative w-full h-full rounded-2xl bg-surface-1 border border-violet-500/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-violet-400" aria-hidden="true" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Creator Dashboard
            </h2>
            <p className="text-white/70 mb-8">
              Connect your wallet to register on veilsub_v27.aleo—your subscribers remain anonymous via BSP.
            </p>
          </m.div>

          {/* Platform Stats - Shows VeilSub is live */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-3 gap-3 mb-4"
          >
            {PLATFORM_STATS.map((stat, i) => (
              <div
                key={stat.label}
                className="p-3 rounded-xl bg-surface-1 border border-border text-center"
              >
                <stat.icon className="w-4 h-4 text-violet-400 mx-auto mb-1.5" aria-hidden="true" />
                <p className="text-lg font-semibold text-white">{stat.value}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl glass space-y-4"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" aria-hidden="true" />
              <p className="text-sm font-medium text-white">Quick Start</p>
            </div>
            <div className="space-y-3">
              {QUICK_START_STEPS.map((item) => (
                <div key={item.step} className="flex gap-3 items-start">
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                    <item.icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm text-white/70">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10"
          >
            <p className="text-xs text-white/60 text-center">
              Your identity stays private—creators only see aggregate subscriber counts and revenue. VeilSub never exposes who subscribes.
            </p>
          </m.div>
        </div>
      </div>
    </PageTransition>
  )
}

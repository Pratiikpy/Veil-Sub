'use client'

import { m } from 'framer-motion'
import { Shield } from 'lucide-react'
import PageTransition from '@/components/PageTransition'

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
                <Shield className="w-8 h-8 text-violet-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Creator Dashboard
            </h2>
            <p className="text-muted mb-8">
              Connect your wallet to register as a creator or manage your subscriptions.
            </p>
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl glass space-y-4"
          >
            <p className="text-sm font-medium text-white">Quick Start</p>
            <div className="space-y-3">
              {[
                { step: '1', text: <>Install <a href="https://www.leo.app/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline">Leo Wallet</a> or <a href="https://www.foxwallet.com/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline">Fox Wallet</a></> },
                { step: '2', text: <>Get testnet credits from the <a href="https://faucet.aleo.org/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline">Aleo Faucet</a></> },
                { step: '3', text: <>Click <strong className="text-white">&quot;Select Wallet&quot;</strong> in the header to connect</> },
              ].map((item) => (
                <div key={item.step} className="flex gap-3 items-start">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center">{item.step}</span>
                  <p className="text-sm text-muted">{item.text}</p>
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
            <p className="text-xs text-muted text-center">
              Your identity stays private—creators only see aggregate subscriber counts and revenue. VeilSub never exposes who subscribes.
            </p>
          </m.div>
        </div>
      </div>
    </PageTransition>
  )
}
